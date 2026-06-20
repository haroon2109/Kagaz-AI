import os
import json
import logging
import mimetypes
from typing import Dict, Any
from app.core.config import settings
import typing_extensions as typing
from google.generativeai.types import GenerationConfig
import google.generativeai as genai

class ExtractedItem(typing.TypedDict):
    question_no: str
    question_text: str
    student_answer: str
    correct_answer: str
    confidence: float

class WorksheetSchema(typing.TypedDict):
    student_name: str
    roll_no: str
    extracted_items: typing.List[ExtractedItem]

logger = logging.getLogger(__name__)

class OCRService:
  def __init__(self):
    self.configured = False
    self._init_ocr()

  def _init_ocr(self):
    """
    Initializes the Gemini SDK.
    """
    if settings.GEMINI_API_KEY:
      genai.configure(api_key=settings.GEMINI_API_KEY)
      self.configured = True
    else:
      logger.warning("[OCR] GEMINI_API_KEY not set. OCR will fallback to mock.")

  def process_worksheet(self, image_path: str) -> Dict[str, Any]:
    """
    Core entrypoint reading the raw bytes of the image and sending it to Gemini Vision.
    """
    if not self.configured or not os.path.exists(image_path):
      raise ValueError(f"[OCR] Real extraction skipped due to missing config or file. (configured={self.configured}, exists={os.path.exists(image_path)})")

    # Verify sandbox confinement to prevent path traversal
    base_upload_dir = os.path.abspath(settings.UPLOAD_DIR)
    image_abs_path = os.path.abspath(image_path)
    if not (image_abs_path.startswith(base_upload_dir + os.sep) or image_abs_path == base_upload_dir):
      raise ValueError("Unauthorized path traversal detected in image processing")

    try:
      # Read raw bytes to maintain a flat memory curve
      with open(image_abs_path, "rb") as f:
        image_bytes = f.read()

      mime_type, _ = mimetypes.guess_type(image_abs_path)
      if not mime_type:
        mime_type = "image/jpeg"

      image_part = {
        "mime_type": mime_type,
        "data": image_bytes
      }

      model = genai.GenerativeModel("gemini-1.5-flash")

      prompt = """
      You are an advanced document intelligence system analyzing a student's handwritten math worksheet.
      1. Transcribe the handwritten text from this document accurately.
      2. Extract the student's name and roll number if present.
      3. For each distinct math problem (e.g., column addition, subtraction), extract it as a separate item.
      4. The `question_text` should be the mathematical expression (e.g., "24 + 17" or "27 - 14").
      5. The `student_answer` should be the result written below the line (e.g., "31" or "13").
      6. Solve the mathematical expression and provide the mathematically `correct_answer`.
      
      If no text or problems are visible, return an empty array for extracted_items. Do not make up facts or use placeholder data.
      """

      response = model.generate_content(
          [image_part, prompt],
          generation_config=GenerationConfig(
              response_mime_type="application/json",
              response_schema=WorksheetSchema,
              temperature=0.1
          )
      )
      
      # Clean potential markdown string tags from response
      json_text = response.text.strip()
      if json_text.startswith("```json"):
          json_text = json_text[7:]
      elif json_text.startswith("```"):
          json_text = json_text[3:]
      if json_text.endswith("```"):
          json_text = json_text[:-3]
          
      parsed = json.loads(json_text.strip())
      
      # Clean fallback defaults
      if not parsed.get("student_name"):
        parsed["student_name"] = "Unknown Student"
      if not parsed.get("roll_no"):
        parsed["roll_no"] = "N/A"
        
      return parsed

    except Exception as e:
      logger.error(f"[OCR] Gemini Vision API extraction failed: {str(e)}.")
      raise e

ocr_service = OCRService()
