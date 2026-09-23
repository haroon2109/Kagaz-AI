import requests
import time
import base64

BASE_URL = "https://kagaz-ai-1.onrender.com/api/v1"

def check_worksheets():
    # 1. Register
    email = f"test_error_{int(time.time())}@example.com"
    res = requests.post(f"{BASE_URL}/auth/mock_signup", json={
        "email": email,
        "password": "password123",
        "name": "Test User"
    })
    if res.status_code != 200:
        print("Register failed:", res.text)
        return
        
    token = res.json().get("access_token")
    headers = {"Authorization": f"Bearer {token}"}
    
    b64_img = "/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA="
    
    with open("test.jpg", "wb") as f:
        f.write(base64.b64decode(b64_img))
        
    with open("test.jpg", "rb") as f:
        res = requests.post(f"{BASE_URL}/upload/image", files={"file": f}, headers=headers)
        if res.status_code != 200:
            print("Upload failed:", res.text)
            return
        image_url = res.json().get("image_url")
        print("Uploaded:", image_url)
    
    # 3. Create a worksheet
    res = requests.post(f"{BASE_URL}/worksheets/", headers=headers, json={
        "title": "Test Worksheet",
        "image_url": image_url,
        "student_id": None
    })
    ws_id = res.json().get("id")
    print(f"Created Worksheet: {ws_id}")
    
    # 4. Wait for OCR to fail
    for _ in range(15):
        time.sleep(2)
        res = requests.get(f"{BASE_URL}/worksheets/{ws_id}", headers=headers)
        data = res.json()
        print(f"Status: {data.get('status')}")
        if data.get('status') == 'failed':
            print("Feedback:", data.get('ai_feedback'))
            break

check_worksheets()
