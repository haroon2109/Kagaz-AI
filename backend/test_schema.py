import os
from google import genai
from app.services.ocr import WorksheetSchema

genai.configure(api_key='mock')
model = genai.GenerativeModel('gemini-1.5-flash')

try:
    model.generate_content('test', generation_config=genai.types.GenerationConfig(
        response_mime_type='application/json',
        response_schema=WorksheetSchema
    ))
except Exception as e:
    print(type(e), e)
