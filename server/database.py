import os
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv()

mongo_url = os.getenv("MONGO_URI")

if not mongo_url:
    raise ValueError("MONGO_URI is missing.")

client = MongoClient(mongo_url)
db = client["zs_pharma_db"]
collection = db["hcp_data"]