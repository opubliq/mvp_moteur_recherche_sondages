# test_hf_api.py
import requests
import numpy as np
import streamlit as st

# --- Utilise le token Hugging Face depuis Streamlit secrets ---
HF_TOKEN = st.secrets["HF_TOKEN"]
API_URL = "https://api-inference.huggingface.co/pipeline/feature-extraction/sentence-transformers/all-MiniLM-L6-v2"
HEADERS = {"Authorization": f"Bearer {HF_TOKEN}"}

def embed_text_hf(text):
    response = requests.post(API_URL, headers=HEADERS, json={"inputs": text})
    response.raise_for_status()
    json_response = response.json()
    st.write("Réponse brute :", json_response)
    # Si json_response est déjà un array ou déjà dimensionné
    if isinstance(json_response, list):
        return np.array(json_response[0])
    else:
        # Si c'est un seul embedding, pas de besoin d'indexer avec [0]
        return np.array(json_response)


# --- Test simple ---
def main():
    test_text = "Quel est votre niveau de confiance envers le gouvernement ?"
    try:
        embedding = embed_text_hf(test_text)
        st.success("✅ API Hugging Face OK !")
        st.write(f"Embedding shape: {embedding.shape}")
        
        # Vérifier si l'embedding a une dimension avant d'essayer de le découper
        if embedding.ndim > 0:
            st.write(f"Premiers chiffres: {embedding[:5]}")
        else:
            st.write(f"Valeur d'embedding (scalaire): {embedding}")
    except Exception as e:
        st.error("❌ Erreur lors de l'appel à l'API Hugging Face :")
        st.write(e)

if __name__ == "__main__":
    main()
