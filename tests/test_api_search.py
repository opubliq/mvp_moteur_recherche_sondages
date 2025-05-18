import requests

url = "http://127.0.0.1:8000/search"
payload = {
    "query": "élections fédérales",
    "top_k": 3
}


response = requests.post(url, json=payload)
print(response.json())
