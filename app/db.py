from motor.motor_asyncio import AsyncIOMotorClient
import os

client = AsyncIOMotorClient(os.getenv("MONGODB_URL"))
db = client[os.getenv("DB_NAME", "financial_ocr_db")]
users_collection = db.get_collection("users")
documents_collection = db.get_collection("documents")