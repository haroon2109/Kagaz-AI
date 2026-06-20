import urllib.request, json, os

try:
    req1 = urllib.request.Request('https://kagaz-ai-1.onrender.com/api/v1/auth/mock_signup', method='POST', headers={'Content-Type': 'application/json'}, data=json.dumps({'email': 'test_up3@example.com', 'password': 'test', 'name': 'test'}).encode('utf-8'))
    with urllib.request.urlopen(req1) as res1:
        token = json.loads(res1.read().decode('utf-8'))['access_token']
        
    boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW'
    body = (
        '--' + boundary + '\r\n'
        'Content-Disposition: form-data; name="file"; filename="test.jpg"\r\n'
        'Content-Type: image/jpeg\r\n\r\n'
        'fake_image_content_12345\r\n'
        '--' + boundary + '--\r\n'
    ).encode('utf-8')
    
    req2 = urllib.request.Request('https://kagaz-ai-1.onrender.com/api/v1/worksheets/upload', method='POST', data=body)
    req2.add_header('Authorization', 'Bearer ' + token)
    req2.add_header('Content-Type', 'multipart/form-data; boundary=' + boundary)
    req2.add_header('Content-Length', str(len(body)))
    
    with urllib.request.urlopen(req2) as res2:
        print('Upload Status:', res2.status)
        print('Response:', res2.read().decode('utf-8'))

except urllib.error.HTTPError as e:
    print('HTTP Error:', e.code, e.read().decode('utf-8'))
except Exception as e:
    print('Error:', e)
