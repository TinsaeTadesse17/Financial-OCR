from pymongo import MongoClient
from passlib.context import CryptContext
import os
from dotenv import load_dotenv

# Load environment variables from the .env file
load_dotenv()
# Replace this line
MONGO_URI = os.getenv("MONGO_URI", "mongodb://admin:password123@localhost:27017/financial_ocr_db?authSource=admin")

# With explicit parameters
MONGO_URI = (
    "mongodb://admin:password123@localhost:27017/"
    "financial_ocr_db?"
    "authSource=admin&"
    "retryWrites=true&"
    "w=majority"
)
client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000)  
db = client["financial_ocr_db"]
users_collection = db["users"]

# Set up password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Define admin user details
admin_user = {
    "username": "admin",
    "full_name": "Admin User",
    "hashed_password": pwd_context.hash("password123"),
    "disabled": False,
    "role": "admin"
}

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
    print("Admin user already exists.")
else:
    users_collection.insert_one(admin_user)
    print("Admin user seeded successfully.")
