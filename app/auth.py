from fastapi import FastAPI, HTTPException, Header
import os

app = FastAPI()

API_KEY = os.getenv("SECRET_KEY")
API_KEY_NAME = "X-API-KEY"

async def verify_api_key(x_api_key: str = Header(...)):
    if x_api_key != API_KEY:
        raise HTTPException(status_code=403, detail="Unauthorized")
