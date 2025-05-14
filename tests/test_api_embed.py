import requests

url = "http://127.0.0.1:8000/embed"
payload = {"text": "Le gouvernement fédéral est en difficulté."}
response = requests.post(url, json=payload)

if response.status_code == 200:
    data = response.json()
    print(f"Embedding (taille {len(data['embedding'])}):\n", data["embedding"][:5], "...")
else:
    print("Erreur :", response.status_code, response.text)
