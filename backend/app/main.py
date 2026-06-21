from fastapi import FastAPI, Depends, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os
import logging
from contextlib import asynccontextmanager
import google.generativeai as genai
import json

genai.configure(api_key=os.environ.get("GEMINI_API_KEY"))

from app.core.config import settings
from app.core.database import engine, Base
from app.api.v1 import api_router
from app.core.middleware import SecurityHeaderMiddleware
from app.core.rate_limit import global_rate_limiter



@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize database tables
    Base.metadata.create_all(bind=engine)
    
    # Ensure local uploads directory exists
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    
    # Validate production secrets
    pass
    yield

# Instantiate application with global rate limiting dependency
app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    dependencies=[Depends(global_rate_limiter)],
    lifespan=lifespan
)

# Register secure header injection and error-logging middleware
app.add_middleware(SecurityHeaderMiddleware)

# Serve upload folder statically
app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

# CORS configurations using ALLOWED_ORIGINS from settings instead of wildcard * with credentials
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include main router mapping to API endpoints
app.include_router(api_router, prefix=settings.API_V1_STR)

@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "project": settings.PROJECT_NAME,
        "version": settings.VERSION
    }

@app.post("/api/grade")
async def grade_document(file: UploadFile = File(...)):
    # 1. Read raw image file bytes directly into memory (prevents Render memory crashes)
    image_bytes = await file.read()
    
    if not image_bytes:
        raise HTTPException(status_code=400, detail="Empty file uploaded.")

    # 2. Package the raw image bytes into the format Gemini expects
    image_payload = {
        "mime_type": file.content_type, # Handles image/jpeg, image/png, etc.
        "data": image_bytes
    }

    # 3. Create a strict, unbiased prompt forcing a JSON format
    prompt = """
    You are an automated grading system. Analyze the handwritten document image provided.
    Extract every visible math problem or question written on the page. 
    Evaluate the student's handwritten answer against the true mathematical answer.
    
    Return a strict raw JSON array of objects. Do not include markdown wraps like ```json.
    Each object must have these exact keys:
    [
      {
        "id": 1,
        "question": "The handwritten problem text (e.g., '24 + 17')",
        "student_answer": "The written answer beneath the problem line",
        "correct_answer": "The mathematically correct answer",
        "status": "Correct or Incorrect"
      }
    ]
    If no text or problems are visible, return an empty array []. Do not make up facts or use placeholder data.
    """

    try:
        # 4. Use the multimodal flash model for fast, low-overhead vision extraction
        model = genai.GenerativeModel(settings.GEMINI_MODEL)
        response = model.generate_content([image_payload, prompt])
        
        # Clean potential markdown string tags from response
        json_text = response.text.strip().replace("```json", "").replace("```", "")
        parsed_data = json.loads(json_text)
        
        return {
            "status": "success",
            "results": parsed_data
        }
        
    except json.JSONDecodeError:
        return {"status": "error", "message": "AI returned invalid layout formatting."}
    except Exception as e:
        return {"status": "error", "message": f"Processing failed: {str(e)}"}

