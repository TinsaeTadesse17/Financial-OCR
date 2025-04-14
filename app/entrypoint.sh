#!/bin/sh
# Wait for MongoDB to be available
until nc -z mongodb 27017; do
  echo "Waiting for MongoDB..."
  sleep 2
done

# Run the seeder, then start the app
python seed_admin.py
exec uvicorn main:app --host 0.0.0.0 --port 8000
