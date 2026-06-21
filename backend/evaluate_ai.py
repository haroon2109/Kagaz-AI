import os
import json
import time
import requests
from PIL import Image, ImageDraw, ImageFont, ImageFilter
from pprint import pprint

# --- CONFIGURATION ---
API_URL = "https://kagaz-ai-backend-62218171814.us-central1.run.app/api/grade"
OUTPUT_DIR = "eval_images"

# --- TEST DATASET GROUND TRUTH ---
# We define what the image will say, and what we expect the API to extract and grade.
TEST_CASES = [
    {
        "id": "tc_1_simple_correct",
        "text_to_draw": "1) 5 + 7\nAns: 12",
        "expected": [
            {"question": "5 + 7", "student_answer": "12", "correct_answer": "12", "status": "Correct"}
        ],
        "noise": False
    },
    {
        "id": "tc_2_simple_incorrect",
        "text_to_draw": "2) 15 - 8\nAnswer: 6",
        "expected": [
            {"question": "15 - 8", "student_answer": "6", "correct_answer": "7", "status": "Incorrect"}
        ],
        "noise": False
    },
    {
        "id": "tc_3_algebra_correct",
        "text_to_draw": "Solve for x:\n3x = 21\nx = 7",
        "expected": [
            {"question": "3x = 21", "student_answer": "x = 7", "correct_answer": "7", "status": "Correct"}
        ],
        "noise": True
    },
    {
        "id": "tc_4_missing_answer",
        "text_to_draw": "What is 9 * 6?",
        "expected": [
            {"question": "9 * 6", "student_answer": "", "correct_answer": "54", "status": "Incorrect"}
        ],
        "noise": False
    },
    {
        "id": "tc_5_noisy_complex",
        "text_to_draw": "Q5: 144 / 12\nAns = 11",
        "expected": [
            {"question": "144 / 12", "student_answer": "11", "correct_answer": "12", "status": "Incorrect"}
        ],
        "noise": True
    }
]

def generate_image(case):
    """Generates a synthetic image simulating a handwritten worksheet."""
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    img_path = os.path.join(OUTPUT_DIR, f"{case['id']}.jpg")
    
    # Create white background
    img = Image.new('RGB', (400, 200), color=(255, 255, 255))
    d = ImageDraw.Draw(img)
    
    # Try to load a generic font, fallback to default
    try:
        font = ImageFont.truetype("arial.ttf", 24)
    except IOError:
        font = ImageFont.load_default()
        
    d.text((20, 20), case['text_to_draw'], fill=(0, 0, 0), font=font)
    
    # Add noise if specified
    if case['noise']:
        # Draw some random lines to simulate scribbles/noise
        d.line([(0,0), (400,200)], fill=(200,200,200), width=3)
        d.line([(0,200), (400,0)], fill=(200,200,200), width=3)
        img = img.filter(ImageFilter.GaussianBlur(1))
        
    img.save(img_path)
    return img_path

def run_evaluation():
    print("Starting Kagaz AI Model Evaluation Suite...")
    print(f"Targeting API: {API_URL}")
    print("-" * 50)
    
    results = []
    total_latency = 0
    
    for case in TEST_CASES:
        print(f"Generating image for {case['id']}...")
        img_path = generate_image(case)
        
        print(f"Sending {case['id']} to API...")
        start_time = time.time()
        
        try:
            with open(img_path, 'rb') as f:
                files = {'file': (os.path.basename(img_path), f, 'image/jpeg')}
                response = requests.post(API_URL, files=files)
                
            latency = time.time() - start_time
            total_latency += latency
            
            if response.status_code == 200:
                api_result = response.json().get('results', [])
                
                # Compare extraction
                extracted_count = len(api_result)
                expected_count = len(case['expected'])
                
                if extracted_count > 0 and expected_count > 0:
                    api_status = api_result[0].get('status', '').lower()
                    expected_status = case['expected'][0].get('status', '').lower()
                    status_match = (api_status == expected_status)
                else:
                    status_match = False
                
                results.append({
                    "id": case["id"],
                    "latency_sec": round(latency, 2),
                    "extraction_successful": extracted_count == expected_count,
                    "grading_accurate": status_match,
                    "raw_output": api_result
                })
                print(f"[OK] Success ({latency:.2f}s) | Extracted: {extracted_count}/{expected_count}")
            else:
                print(f"[FAIL] Failed: HTTP {response.status_code}")
                results.append({
                    "id": case["id"],
                    "latency_sec": round(latency, 2),
                    "extraction_successful": False,
                    "grading_accurate": False,
                    "error": response.text
                })
                
        except Exception as e:
            print(f"[FAIL] Exception: {str(e)}")
    
    # Calculate metrics
    success_rate = sum(1 for r in results if r['extraction_successful']) / len(TEST_CASES) * 100
    grading_acc = sum(1 for r in results if r['grading_accurate']) / len(TEST_CASES) * 100
    avg_latency = total_latency / len(TEST_CASES)
    
    print("\n" + "=" * 50)
    print("EVALUATION METRICS SUMMARY")
    print("=" * 50)
    print(f"Total Test Cases: {len(TEST_CASES)}")
    print(f"Extraction Success Rate: {success_rate:.1f}%")
    print(f"Grading Accuracy: {grading_acc:.1f}%")
    print(f"Average Processing Latency: {avg_latency:.2f} seconds")
    
    # Save report
    with open("ai_evaluation_report.json", "w") as f:
        json.dump(results, f, indent=2)
    print("\nDetailed results saved to ai_evaluation_report.json")

if __name__ == "__main__":
    run_evaluation()
