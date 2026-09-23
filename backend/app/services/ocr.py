import os
import logging
from typing import Dict, Any

from app.core.config import settings
from app.services.ai_provider import ai_provider

logger = logging.getLogger(__name__)

SCHEMA_HINT = """{
  "student_name": "string or empty",
  "roll_no": "string or empty",
  "extracted_items": [
    {
      "question_no": "1",
      "question_text": "e.g. 24 + 17",
      "student_answer": "answer written by student",
      "correct_answer": "mathematically correct answer",
      "confidence": 0.95
    }
  ]
}"""

PROMPT = """
You are an advanced document intelligence system analyzing a student's handwritten math worksheet.
1. Transcribe the handwritten text from this document accurately.
2. Extract the student's name and roll number if present.
3. For each distinct math problem (e.g., column addition, subtraction), extract it as a separate item.
4. The `question_text` should be the mathematical expression (e.g., "24 + 17" or "27 - 14").
5. The `student_answer` should be the result written below the line (e.g., "31" or "13").
6. Solve the mathematical expression and provide the mathematically `correct_answer`.

If no text or problems are visible, return an empty array for extracted_items. Do not make up facts or use placeholder data.
"""


class OCRService:
    """
    Vision-based worksheet extraction running entirely on free/open models.
    Uses the unified AI provider: Ollama vision model locally, Groq fallback.
    """

    def __init__(self):
        self.configured = True

    def process_worksheet(self, image_path: str) -> Dict[str, Any]:
        """
        Core entrypoint: reads raw image bytes and extracts structured Q&A.
        Raises if no AI engine is reachable.
        """
        if not os.path.exists(image_path):
            raise ValueError(f"[OCR] Image file not found: {image_path}")

        # Verify sandbox confinement to prevent path traversal
        base_upload_dir = os.path.abspath(settings.UPLOAD_DIR)
        image_abs_path = os.path.abspath(image_path)
        if not (image_abs_path.startswith(base_upload_dir + os.sep) or image_abs_path == base_upload_dir):
            raise ValueError("Unauthorized path traversal detected in image processing")

        # Vision requests need a longer window — local models can take a while on CPU
        raw = ai_provider.chat(
            system_prompt="You are a precise document intelligence engine. Respond with only raw JSON.",
            user_prompt=PROMPT,
            image_path=image_abs_path,
            schema_hint=SCHEMA_HINT,
            temperature=0.1,
            timeout=settings.AI_VISION_TIMEOUT_SECONDS,
        )

        logger.info(f"[OCR] Raw model response: {raw[:500]}")
        parsed = ai_provider.extract_json(raw)
        if not isinstance(parsed, dict):
            raise ValueError("[OCR] Model returned unexpected JSON structure")

        # Clean fallback defaults
        if not parsed.get("student_name"):
            parsed["student_name"] = "Unknown Student"
        if not parsed.get("roll_no"):
            parsed["roll_no"] = "N/A"

        items = parsed.get("extracted_items", [])
        parsed["ocr_engine"] = ai_provider.last_engine  # transparency: which model read the page
        logger.info(f"[OCR] Extracted {len(items)} items via {parsed['ocr_engine']}")
        return parsed


ocr_service = OCRService()
