# Dockerfile
FROM python:3.11-slim

RUN apt-get update && \
    apt-get install -y \
    ca-certificates \
    poppler-utils \
    tesseract-ocr \
    tesseract-ocr-eng \
    libgl1

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .

ENV PORT=8000
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT}"]