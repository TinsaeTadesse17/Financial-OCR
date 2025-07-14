from fastapi import FastAPI, File, UploadFile, HTTPException, Depends
from fastapi.responses import JSONResponse
from fastapi.security import OAuth2PasswordRequestForm
from tasks import process_pdf_task
from utils import image_to_pdf
from auth import (
    authenticate_user, create_access_token, get_current_active_user, User, Token
)
import uuid
import os
from PIL import Image
from io import BytesIO
from datetime import timedelta
from seed_admin import seed_admin
from contextlib import asynccontextmanager


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Seed the admin
    print("Seeding Admin...")
    seed_admin()
    yield
    # Cleanup code can go here if needed

app = FastAPI(lifespan=lifespan)

@app.post("/token", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    user = await authenticate_user(form_data.username, form_data.password)  # Added await
    if not user:
        raise HTTPException(status_code=400, detail="Incorrect username or password")
    access_token_expires = timedelta(minutes=30)
    access_token = create_access_token(
        data={"sub": user.username},
        expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@app.post("/process-pdf")
async def process_pdf(
    file: UploadFile = File(...),
):
    file_id = str(uuid.uuid4())
    temp_path = f"uploads/{file_id}.pdf"
    os.makedirs(os.path.dirname(temp_path), exist_ok=True)
    
    with open(temp_path, "wb") as f:
        content = await file.read()
        f.write(content)

    return process_pdf_task(temp_path)

@app.post("/process-img")
async def process_image(
    file: UploadFile = File(...),
):
    IMAGE_MIME_TYPES = {"image/png", "image/jpeg", "image/jpg", "image/gif", "image/webp"}
    if file.content_type not in IMAGE_MIME_TYPES:
        raise HTTPException(status_code=400, detail="Invalid file type. Only image files are allowed.")
    
    file_id = str(uuid.uuid4())
    extension = file.filename.split('.')[-1]
    temp_path = f"uploads/{file_id}.{extension}"

    os.makedirs(os.path.dirname(temp_path), exist_ok=True)

    content = await file.read()
    try:
        image = Image.open(BytesIO(content))
        image.verify()
    except Exception:
        raise HTTPException(status_code=400, detail="Uploaded file is not a valid image.")

    with open(temp_path, "wb") as f:
        f.write(content)
    
    pdf_temp_path = f"uploads/{file_id}.pdf"
    image_to_pdf(image_path=temp_path, save_path=pdf_temp_path)

    return process_pdf_task(pdf_temp_path)

@app.get("/tasks/{task_id}")
async def get_task_status(task_id: str):
    task = process_pdf_task.AsyncResult(task_id)
    return {
        "task_id": task_id,
        "status": task.status,
        "result": task.result if task.ready() else None
    }
