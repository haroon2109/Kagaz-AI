import sys
import os
sys.path.append(os.path.abspath("."))
from app.services.ocr import ocr_service
from PIL import Image, ImageDraw

img = Image.new('RGB', (200, 100), color = (255, 255, 255))
d = ImageDraw.Draw(img)
d.text((10,10), "Name: John", fill=(0,0,0))
d.text((10,30), "Roll: 12", fill=(0,0,0))
d.text((10,50), "2+2=4", fill=(0,0,0))
os.makedirs("uploads", exist_ok=True)
img.save("uploads/test_img.jpg")

try:
    res = ocr_service.process_worksheet("uploads/test_img.jpg")
    print("OCR SUCCESS:", res)
except Exception as e:
    import traceback
    print("OCR ERROR:", type(e).__name__, str(e))
    traceback.print_exc()
