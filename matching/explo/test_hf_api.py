# test_hf_api.py
import requests
import numpy as np

# --- Remplace ici avec ton vrai token (ou utilise st.secrets ou un .env dans Spaces)
HF_TOKEN = "hf_..."  # ← remplace ça
API_URL = "https://api-inference.huggingface.co/pipeline/feature-extraction/sentence-transformers/all-MiniLM-L6-v2"
HEADERS = {"Authorization": f"Bearer {HF_TOKEN}"}

def embed_text_hf(text):
    response = requests.post(API_URL, headers=HEADERS, json={"inputs": text})
    response.raise_for_status()
    return np.array(response.json()[0])

# --- Test simple ---
if __name__ == "__main__":
    test_text = "Quel est votre niveau de confiance envers le gouvernement ?"
    try:
        embedding = embed_text_hf(test_text)
        print("✅ API Hugging Face OK !")
        print(f"Embedding shape: {embedding.shape}")
        print(f"Premiers chiffres: {embedding[:5]}")
    except Exception as e:
        print("❌ Erreur lors de l'appel à l'API Hugging Face :")
        print(e)
