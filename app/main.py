from fastapi import FastAPI, File, UploadFile, HTTPException, Depends
from tasks import process_pdf_task
from utils import image_to_pdf
from auth import verify_api_key
import uuid
import os
from PIL import Image
from io import BytesIO
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

@app.post("/process-pdf")
async def process_pdf(
    file: UploadFile = File(...),
    _: str = Depends(verify_api_key)
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
    _: str = Depends(verify_api_key)
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
