"""One-off benchmark: qwen2.5vl:3b on the sample handwritten worksheet.

Run through the app's own OCRService code path (same prompt, schema hint,
temperature, JSON extraction) with OLLAMA_VISION_MODEL swapped via env.
"""
import json
import sys
import time

sys.path.insert(0, ".")

from app.services.ocr import ocr_service  # noqa: E402

IMAGE = "uploads/Sampla handwritten.jpeg"

print(f"Benchmarking OCR on: {IMAGE}", flush=True)
t0 = time.time()
try:
    result = ocr_service.process_worksheet(IMAGE)
except Exception as e:
    print(f"FAILED after {time.time() - t0:.1f}s: {type(e).__name__}: {e}")
    sys.exit(1)
elapsed = time.time() - t0

items = result.get("extracted_items", [])
print(f"\n=== RESULT ===")
print(f"student_name: {result.get('student_name')!r}")
print(f"roll_no: {result.get('roll_no')!r}")
print(f"items extracted: {len(items)}")
print(json.dumps(items, indent=2, ensure_ascii=False)[:2000])
print(f"\n=== TIMING ===")
print(f"total wall time: {elapsed:.1f}s")
print(f"per item: {elapsed / max(len(items), 1):.1f}s")
