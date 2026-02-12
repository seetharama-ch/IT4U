import urllib.request
import json

url = "http://localhost:8080/api/kb"
headers = {"Content-Type": "application/json"}
data = {
    "title": "Urllib Test Article",
    "content": "Content validated via Urllib.",
    "category": "Software"
}

try:
    req = urllib.request.Request(url, data=json.dumps(data).encode('utf-8'), headers=headers)
    with urllib.request.urlopen(req) as response:
        print(f"Status Code: {response.status}")
        print(f"Response: {response.read().decode('utf-8')}")
except Exception as e:
    print(f"Error: {e}")
