db = db.getSiblingDB('financial_ocr_db');
db.createUser({
  user: "admin",
  pwd: "admin123",
  roles: [{
    role: "readWrite",
    db: "financial_ocr_db"
  }]
});