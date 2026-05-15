import os
import hashlib
import certifi  # <--- NEW: Imports the security certificates
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn
from google import genai
from google.genai import types

from pymongo import MongoClient
# from pymongo.server_api import ServerApi

app = FastAPI(title="Vision Engine")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from pymongo import MongoClient

# ==========================================
# 1. API & DATABASE CONFIGURATION
# ==========================================
client = genai.Client(api_key="AIzaSyBcg1XJE6WZCtRFwFgS5FbOXL0t5nhj1tI")

# UPDATED: Direct connection to your local MongoDB Community Server
MONGO_URI = "mongodb://localhost:27017/"

# ==========================================
# 2. MONGODB INITIALIZATION
# ==========================================
mongo_client = None
db = None
users_collection = None
history_collection = None

try:
    # UPDATED: Simplified for local use (Removed SSL/Atlas-specific settings)
    mongo_client = MongoClient(MONGO_URI)
    
    # Verify the connection
    mongo_client.admin.command('ping')
    print("✅ SUCCESS: Connected to Local MongoDB Community Server!")
    
    db = mongo_client["vision_chatbot"]
    users_collection = db["users"]
    history_collection = db["chat_history"]

except Exception as e:
    print(f"❌ DATABASE ERROR: Could not connect to Local MongoDB.\n{e}")
    print("💡 Tip: Make sure the 'MongoDB Server' service is running in Windows Services.")
# ==========================================
# 3. AUTHENTICATION ROUTES
# ==========================================
def hash_password(password: str):
    return hashlib.sha256(password.encode()).hexdigest()

class RegisterRequest(BaseModel):
    username: str
    email: str
    password: str

class LoginRequest(BaseModel):
    email: str
    password: str

@app.post("/api/v1/auth/register")
async def register_user(request: RegisterRequest):
    if users_collection is None:
        raise HTTPException(status_code=500, detail="Database not connected")
        
    if users_collection.find_one({"email": request.email}):
        raise HTTPException(status_code=400, detail="Email already registered")
        
    new_user = {
        "username": request.username,
        "email": request.email,
        "password": hash_password(request.password)
    }
    users_collection.insert_one(new_user)
    return {"status": "success", "username": request.username, "email": request.email}

@app.post("/api/v1/auth/login")
async def login_user(request: LoginRequest):
    if users_collection is None:
        raise HTTPException(status_code=500, detail="Database not connected")
        
    user = users_collection.find_one({"email": request.email})
    
    if not user or user["password"] != hash_password(request.password):
        raise HTTPException(status_code=401, detail="Invalid email or password")
        
    return {"status": "success", "username": user["username"], "email": user["email"]}

# ==========================================
# 4. CHAT & HISTORY ROUTES
# ==========================================
@app.post("/api/v1/chat")
async def multimodal_chat(
    message: str = Form(...), 
    username: str = Form("guest"),
    image: UploadFile = File(None)
):
    try:
        if not image:
            return {"reply": "Please upload an image.", "status": "error"}

        image_bytes = await image.read()
        
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=[types.Part.from_bytes(data=image_bytes, mime_type=image.content_type), message]
        )
        
        if history_collection is not None and username != "guest":
            history_collection.insert_one({
                "username": username,
                "user_query": message,
                "ai_reply": response.text
            })
        
        return {"reply": response.text, "status": "success"}

    except Exception as e:
        return {"reply": f"AI Error: {str(e)}", "status": "error"}

@app.get("/api/v1/history/{username}")
async def get_history(username: str):
    if history_collection is None:
        return {"history": []}
    
    user_chats = list(history_collection.find({"username": username}))
    
    history_list = []
    for chat in user_chats:
        words = chat["user_query"].strip().split()
        title = " ".join(words[:4]) + ("..." if len(words) > 4 else "")
        history_list.append({
            "id": str(chat["_id"]),
            "title": title.capitalize(),
            "query": chat["user_query"],
            "reply": chat["ai_reply"]
        })
        
    return {"history": history_list[::-1]}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)