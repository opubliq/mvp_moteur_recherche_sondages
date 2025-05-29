import sqlite3
import numpy as np
import pandas as pd
from sklearn.metrics.pairwise import cosine_similarity

def load_metadata_tables(db_path="surveys_bd.sqlite"):
    conn = sqlite3.connect(db_path)
    codebook_variables = pd.read_sql_query("SELECT * FROM codebook_variables", conn)
    surveys_metadata = pd.read_sql_query("SELECT * FROM surveys_metadata", conn)
    conn.close()
    return codebook_variables, surveys_metadata


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
        raise RuntimeError(f"Erreur lors du chargement du corpus: {str(e)}")


# --- Recherche sémantique avec similarité cosinus ---
def semantic_search(query, corpus_texts, corpus_info, model, codebook_variables, surveys_metadata, top_k=15):
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

            # Recherche des labels dans codebook_variables
            row_var = codebook_variables[
                (codebook_variables['survey_id'] == sid) &
                (codebook_variables['variable_id'] == vid)
            ]
            label = row_var['label'].values[0] if not row_var.empty else None
            question_label = row_var['question_label'].values[0] if not row_var.empty else None

            # Recherche des metadata dans surveys_metadata
            row_survey = surveys_metadata[surveys_metadata['survey_id'] == sid]
            title = row_survey['title'].values[0] if not row_survey.empty else None
            year = row_survey['year'].values[0] if not row_survey.empty else None

            results.append({
                "survey_id": sid,
                "variable_id": vid,
                "similarity_score": float(sims[idx]),
                "text": corpus_texts[idx],
                "label": label,
                "question_label": question_label,
                "title": title,
                "year": year
            })

        return pd.DataFrame(results)

    except Exception as e:
        raise RuntimeError(f"Erreur lors de la recherche sémantique: {str(e)}")


