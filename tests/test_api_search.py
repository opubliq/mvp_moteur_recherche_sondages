import requests

url = "http://127.0.0.1:8000/search"
payload = {
    "query": "élections fédérales",
    "documents": [
        "Le gouvernement propose une réforme.",
        "Les élections fédérales auront lieu en octobre.",
        "Le climat économique est instable."
    ],
    "top_k": 2
}

response = requests.post(url, json=payload)
print(response.json())
