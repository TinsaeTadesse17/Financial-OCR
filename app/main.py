from fastapi import FastAPI, File, UploadFile, HTTPException, Depends, Request
from tasks import process_pdf_task
from utils import image_to_pdf
from auth import verify_api_key
import uuid
import os
from PIL import Image
from io import BytesIO
from seed_admin import seed_admin
from contextlib import asynccontextmanager
from fastapi.middleware.cors import CORSMiddleware
import logging
from datetime import datetime
from db import documents_collection


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Seed the admin
    print("Seeding Admin...")
    seed_admin()
    yield
    # Cleanup code can go here if needed

app = FastAPI(lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # allow all origins for debugging
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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

@app.post("/documents/upload")
async def upload_documents(files: list[UploadFile] = File(...)):
    logging.info(f"Received upload request with {len(files)} files")
    uploaded = []
    for file in files:
        file_id = str(uuid.uuid4())
        extension = file.filename.split('.')[-1]
        temp_path = f"uploads/{file_id}.{extension}"
        os.makedirs(os.path.dirname(temp_path), exist_ok=True)
        content = await file.read()
        with open(temp_path, "wb") as f:
            f.write(content)
        # Process the document synchronously
        result = process_pdf_task(temp_path)
        status = "completed" if result.get("success") else "failed"
        doc = {
            "id": file_id,
            "task_id": file_id,
            "filename": file.filename,
            "upload_timestamp": datetime.utcnow().isoformat(),
            "status": status,
            "result": result if result.get("success") else None,
            "error_message": None if result.get("success") else result.get("error")
        }
        await documents_collection.insert_one(doc)
        uploaded.append({"task_id": file_id, "filename": file.filename})
    return {"message": f"{len(uploaded)} files uploaded successfully", "documents": uploaded}

@app.get("/documents")
@app.get("/documents/")
async def list_documents():
    try:
        docs = []
        cursor = documents_collection.find({})
        async for document in cursor:
            # Remove Mongo internal ID
            document.pop("_id", None)
            # Ensure upload_timestamp is a string
            ts = document.get("upload_timestamp")
            if isinstance(ts, datetime):
                document["upload_timestamp"] = ts.isoformat()
            docs.append(document)
        return docs
    except Exception as e:
        logging.error("Failed to list documents", exc_info=True)
        raise HTTPException(status_code=500, detail="Error retrieving documents")

# Retrieve a single document by id
@app.get("/documents/{doc_id}")
async def get_document(doc_id: str):
    try:
        doc = await documents_collection.find_one({"id": doc_id})
        if not doc:
            raise HTTPException(status_code=404, detail="Document not found")
        doc.pop("_id", None)
        ts = doc.get("upload_timestamp")
        if isinstance(ts, datetime):
            doc["upload_timestamp"] = ts.isoformat()
        return doc
    except HTTPException:
        raise
    except Exception as e:
        logging.error("Failed to retrieve document %s", doc_id, exc_info=True)
        raise HTTPException(status_code=500, detail="Error retrieving document")

# Task status endpoint
@app.get("/tasks/{task_id}")
async def get_task_status(task_id: str):
    try:
        doc = await documents_collection.find_one({"task_id": task_id})
        if not doc:
            raise HTTPException(status_code=404, detail="Task not found")
        return {"task_id": task_id, "status": doc.get("status"), "result": doc.get("result")}
    except HTTPException:
        raise
    except Exception as e:
        logging.error("Failed to retrieve task status %s", task_id, exc_info=True)
        raise HTTPException(status_code=500, detail="Error retrieving task status")
