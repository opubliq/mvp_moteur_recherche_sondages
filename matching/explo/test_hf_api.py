import requests
import numpy as np
import streamlit as st

# --- Utilise le token Hugging Face depuis Streamlit secrets ---
HF_TOKEN = st.secrets["HF_TOKEN"]
API_URL = "https://api-inference.huggingface.co/models/sentence-transformers/all-MiniLM-L6-v2"
HEADERS = {"Authorization": f"Bearer {HF_TOKEN}"}

def embed_text_hf(text):
    response = requests.post(API_URL, headers=HEADERS, json={"inputs": text})
    response.raise_for_status()
    
    # Afficher la réponse brute pour l'inspecter
    json_response = response.json()
    st.write("Réponse brute de l'API :", json_response)

    # Vérification du format de la réponse
    if isinstance(json_response, list):
        if json_response:
            # Si c'est une liste non vide
            st.write("C'est une liste d'embeddings. Premier embedding:", json_response[0])
            return np.array(json_response[0])  # Extraire le premier embedding
        else:
            st.warning("La liste est vide.")
            return None  # Si la liste est vide
    elif isinstance(json_response, dict):
        st.write("La réponse est un dictionnaire:", json_response)
        # Vérifier si l'API renvoie un dictionnaire avec les embeddings
        if 'embeddings' in json_response:
            return np.array(json_response['embeddings'][0])
        else:
            st.warning("Aucun embedding trouvé dans la réponse.")
            return None
    else:
        st.warning("Format inconnu de la réponse.")
        return None

# --- Test simple ---
def main():
    test_text = "Quel est votre niveau de confiance envers le gouvernement ?"
    try:
        embedding = embed_text_hf(test_text)
        
        if embedding is not None:
            st.success("✅ API Hugging Face OK !")
            st.write(f"Embedding shape: {embedding.shape}")
        
            # Vérifier si l'embedding a une dimension avant d'essayer de le découper
            if embedding.ndim > 0:
                st.write(f"Premiers chiffres: {embedding[:5]}")
            else:
                st.write(f"Valeur d'embedding (scalaire): {embedding}")
        else:
            st.error("❌ Aucun embedding n'a été retourné.")
    except Exception as e:
        st.error("❌ Erreur lors de l'appel à l'API Hugging Face :")
        st.write(e)

if __name__ == "__main__":
    main()
