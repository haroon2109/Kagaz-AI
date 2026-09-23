import sys
import os
sys.path.append(os.path.abspath("."))
from app.core.config import settings
from google import genai

genai.configure(api_key=settings.GEMINI_API_KEY)
try:
    models = genai.list_models()
    for m in models:
        print(m.name)
except Exception as e:
    print("ERROR:", e)
