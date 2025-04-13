import sqlite3
import numpy as np
import pandas as pd
import requests
from sklearn.metrics.pairwise import cosine_similarity

# --- Paramètres API Hugging Face ---
import streamlit as st
API_URL = "https://api-inference.huggingface.co/pipeline/feature-extraction/sentence-transformers/all-MiniLM-L6-v2"
HEADERS = {"Authorization": f"Bearer {st.secrets['HF_TOKEN']}"}

# def embed_text_hf(text):
#     try:
#         response = requests.post(API_URL, headers=HEADERS, json={"inputs": text})
#         response.raise_for_status()
#         json_response = response.json()
        
#         st.write("Format réponse API:", type(json_response))
        
#         # Vérification du format de la réponse
#         if isinstance(json_response, list):
#             if json_response:  # Si la liste n'est pas vide
#                 embedding = np.array(json_response[0])
#                 # S'assurer que l'embedding est au moins 1D
#                 if np.isscalar(embedding):
#                     return np.array([embedding])
#                 return embedding
#             else:
#                 # Liste vide, retourner un embedding par défaut (vecteur de zéros)
#                 st.warning("Réponse vide de l'API, utilisation d'un vecteur par défaut")
#                 return np.zeros(384)  # Dimension standard pour ce modèle
#         elif isinstance(json_response, dict):
#             # Certains modèles renvoient un dictionnaire
#             if 'embeddings' in json_response:
#                 return np.array(json_response['embeddings'][0])
#             else:
#                 # Tenter de convertir directement
#                 return np.array(list(json_response.values())[0])
#         else:
#             # Si la réponse est déjà un embedding simple (scalaire ou array)
#             embedding = np.array(json_response)
#             # S'assurer que l'embedding est au moins 1D
#             if np.isscalar(embedding):
#                 return np.array([embedding])
#             return embedding
#     except Exception as e:
#         st.error(f"Erreur d'embedding: {str(e)}")
#         # Retourner un embedding factice en cas d'erreur (vecteur de zéros)
#         return np.zeros(384)  # Dimension standard pour ce modèle

def embed_text_hf(text):
    response = requests.post(API_URL, headers=HEADERS, json={"inputs": text})
    response.raise_for_status()
    return np.array(response.json()).reshape(1, -1)


# --- Chargement des textes et embeddings ---
def load_corpus(db_path="surveys_bd.sqlite", embedding_path=None):
    try:
        conn = sqlite3.connect(db_path)
        cur = conn.cursor()
        
        # Vérifier si la table existe
        cur.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='codebook_variables'")
        if not cur.fetchone():
            # Si la table n'existe pas, créons des données fictives pour les tests
            st.warning("Table codebook_variables non trouvée. Utilisation de données de test.")
            corpus_info = [(1, 101), (1, 102), (2, 201)]
            corpus_texts = [
                "quel est votre niveau de confiance envers le gouvernement?",
                "êtes-vous satisfait de votre situation financière?",
                "pensez-vous que l'économie va s'améliorer dans l'année à venir?"
            ]
            return corpus_info, corpus_texts
            
        # Si la table existe, continuer normalement
        cur.execute("SELECT survey_id, variable_id, label, question_label, label FROM codebook_variables")
        rows = cur.fetchall()
        corpus_info = []
        corpus_texts = []
        for row in rows:
            sid, vid, var_label, q_label, val_label = row
            text = f"{q_label.strip()}. {var_label.strip()}. {val_label.strip()}"
            corpus_info.append((sid, vid))
            corpus_texts.append(text.lower())

        # Si le chemin des embeddings est fourni, charger depuis le fichier
        if embedding_path:
            try:
                corpus_embeddings = np.load(embedding_path)  # Doit contenir un array (N, D)
            except (FileNotFoundError, IOError):
                st.warning("Fichier d'embeddings non trouvé. Utilisation de l'API Hugging Face.")
                corpus_embeddings = None
        else:
            corpus_embeddings = None
            
        return corpus_info, corpus_texts
    except Exception as e:
        st.error(f"Erreur lors du chargement du corpus: {str(e)}")
        # Renvoyer des données factices en cas d'erreur
        corpus_info = [(1, 101), (1, 102), (2, 201)]
        corpus_texts = [
            "quel est votre niveau de confiance envers le gouvernement?",
            "êtes-vous satisfait de votre situation financière?", 
            "pensez-vous que l'économie va s'améliorer dans l'année à venir?"
        ]
        return corpus_info, corpus_texts

# --- Recherche sémantique avec similarité cosinus ---
@st.cache_data(ttl=3600)
def semantic_search(query, corpus_texts, corpus_info, top_k=15):
    try:
        # Vérifier les données d'entrée
        if not corpus_texts or not corpus_info:
            st.error("Corpus vide. Impossible de continuer.")
            # Retourner un DataFrame vide avec les colonnes attendues
            return pd.DataFrame(columns=["survey_id", "variable_id", "similarity_score", "text"])
            
        # Calculer l'embedding de la requête
        with st.spinner("Calcul de l'embedding pour votre requête..."):
            query_embedding = embed_text_hf(query)
            # Assurer que c'est un vecteur 2D pour cosine_similarity
            if np.isscalar(query_embedding):
                # Si c'est un scalaire, créer un array 2D
                query_embedding = np.array([[query_embedding]])
            elif query_embedding.ndim == 1:
                query_embedding = query_embedding.reshape(1, -1)
        
        # Calculer les embeddings pour chaque texte du corpus (API HF)
        
        corpus_embeddings = []
        with st.spinner(f"Calcul des embeddings pour le corpus ({len(corpus_texts)} éléments)..."):
            for i, text in enumerate(corpus_texts):
                try:
                    embedding = embed_text_hf(text)
                    corpus_embeddings.append(embedding)
                    #st.write(f"Progression: {i+1}/{len(corpus_texts)}")
                except Exception as e:
                    st.error(f"Erreur pour: {text[:30]}... - {str(e)}")
                    # Utiliser un embedding de même dimension que query_embedding
                    corpus_embeddings.append(np.zeros(query_embedding.shape[1]))
        
        # Convertir la liste en tableau numpy
        corpus_embeddings = np.vstack(corpus_embeddings)
        
        # Calculer les similarités
        sims = cosine_similarity(query_embedding, corpus_embeddings)[0]
        
        # Limiter le nombre de résultats
        top_k = min(top_k, len(sims))
        top_indices = np.argsort(sims)[::-1][:top_k]
        
        # Calculer les différences de score pour le filtrage
        if len(top_indices) > 1:
            score_diffs = np.abs(np.diff(sims[top_indices]))
            min_gap = 0.001
            idx = np.where(score_diffs < min_gap)[0]
            last_idx = idx[0] if idx.size > 0 else len(top_indices)
            filtered_indices = top_indices[:last_idx]
        else:
            filtered_indices = top_indices
            
        filtered_scores = sims[filtered_indices]
        
        # Construire les résultats
        results = []
        for score, idx in zip(filtered_scores, filtered_indices):
            sid, vid = corpus_info[idx]
            results.append({
                "survey_id": sid,
                "variable_id": vid,
                "similarity_score": float(score),
                "text": corpus_texts[idx]
            })
        
        # Afficher un message de diagnostic
        #st.info(f"Résultats trouvés: {len(results)}")
        
        # Convertir en DataFrame et retourner
        results_df = pd.DataFrame(results)
        return results_df
        
    except Exception as e:
        st.error(f"Erreur lors de la recherche sémantique: {str(e)}")
        # Retourner un DataFrame factice en cas d'erreur pour éviter les erreurs en cascade
        return pd.DataFrame({
            "survey_id": [1, 1, 2],
            "variable_id": [101, 102, 201],
            "similarity_score": [0.95, 0.85, 0.75],
            "text": [
                "confiance envers le gouvernement",
                "satisfaction avec la situation financière",
                "perspectives économiques futures"
            ]
        })
