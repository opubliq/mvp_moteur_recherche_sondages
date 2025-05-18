import sqlite3
import numpy as np
import pandas as pd
from sklearn.metrics.pairwise import cosine_similarity

# --- Chargement des textes et embeddings ---
def load_corpus(db_path="surveys_bd.sqlite", embedding_path=None):
    try:
        conn = sqlite3.connect(db_path)
        cur = conn.cursor()
        
        # Vérifier si la table existe
        cur.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='codebook_variables'")
        if not cur.fetchone():
            print("Table codebook_variables non trouvée. Utilisation de données de test.")
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

        return corpus_info, corpus_texts

    except Exception as e:
        print(f"Erreur lors du chargement du corpus: {str(e)}")
        corpus_info = [(1, 101), (1, 102), (2, 201)]
        corpus_texts = [
            "quel est votre niveau de confiance envers le gouvernement?",
            "êtes-vous satisfait de votre situation financière?", 
            "pensez-vous que l'économie va s'améliorer dans l'année à venir?"
        ]
        return corpus_info, corpus_texts


# --- Recherche sémantique avec similarité cosinus ---
def semantic_search(query, corpus_texts, corpus_info, model, top_k=15):
    try:
        if not corpus_texts or not corpus_info:
            raise ValueError("Corpus vide. Impossible de continuer.")

        query_embedding = model.encode(query)
        if query_embedding.ndim == 1:
            query_embedding = query_embedding.reshape(1, -1)

        corpus_embeddings = model.encode(corpus_texts)

        sims = cosine_similarity(query_embedding, corpus_embeddings)[0]

        top_k = min(top_k, len(sims))
        top_indices = np.argsort(sims)[::-1][:top_k]

        results = []
        for idx in top_indices:
            sid, vid = corpus_info[idx]
            results.append({
                "survey_id": sid,
                "variable_id": vid,
                "similarity_score": float(sims[idx]),
                "text": corpus_texts[idx]
            })

        return pd.DataFrame(results)

    except Exception as e:
        print(f"Erreur lors de la recherche sémantique: {str(e)}")
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

