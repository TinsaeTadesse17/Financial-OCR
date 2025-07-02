from pymongo import MongoClient
from passlib.context import CryptContext
import os
from dotenv import load_dotenv

# Load environment variables from the .env file
load_dotenv()

ADMIN_USERNAME = os.getenv("ADMIN_USERNAME", "admin")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "password123password")

MONGO_URI = os.getenv(
    "MONGODB_URL",
    "mongodb+srv://admin:password123password@cluster0.rfbjo.mongodb.net/financial_ocr_db?retryWrites=true&w=majority"
)

client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000)  
db = client["financial_ocr_db"]
users_collection = db["users"]

# Set up password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Define admin user details
admin_user = {
    "username": ADMIN_USERNAME,
    "full_name": "Admin User",
    "hashed_password": pwd_context.hash(ADMIN_PASSWORD),
    "disabled": False,
    "role": "admin"
}

def seed_admin():
    try:
        # Test the connection
        client.admin.command('ping')
        print("✅ Connected to MongoDB")
    except Exception as e:
        print("❌ MongoDB connection failed")
        raise e

    # Check if the admin user already exists and insert if not
    existing_user = users_collection.find_one({"username": admin_user["username"]})
    if existing_user:
        print("Admin username already exists. Updating Password")
        # Update the password if the user already exists
        users_collection.update_one(
            {"username": admin_user["username"]},
            {"$set": {"hashed_password": admin_user["hashed_password"]}}
        )
        print("Admin user password updated successfully.")
    else:
        users_collection.insert_one(admin_user)
        print("Admin user seeded successfully.")
