import sqlite3
import numpy as np
import pandas as pd
import requests
from sklearn.metrics.pairwise import cosine_similarity

# --- Paramètres API Hugging Face ---
API_URL = "https://api-inference.huggingface.co/pipeline/feature-extraction/sentence-transformers/all-MiniLM-L6-v2"
HF_TOKEN = "hf_..."  # Remplacer par ton vrai token, ou mieux : utiliser un secret dans Hugging Face Spaces

headers = {"Authorization": f"Bearer {HF_TOKEN}"}

def embed_text_hf(text):
    response = requests.post(API_URL, headers=headers, json={"inputs": text})
    response.raise_for_status()
    return np.array(response.json()[0])

# --- Chargement des textes et embeddings ---
def load_corpus(db_path="surveys_bd.sqlite", embedding_path="corpus_embeddings.npy"):
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    cur.execute("SELECT survey_id, variable_id, label, question_label, label FROM codebook_variables")
    rows = cur.fetchall()
    corpus_info = []
    corpus_texts = []
    for row in rows:
        sid, vid, var_label, q_label, val_label = row
        text = f"{q_label.strip()}. {var_label.strip()}. {val_label.strip()}"
        corpus_info.append((sid, vid))
        corpus_texts.append(text.lower())

    corpus_embeddings = np.load(embedding_path)  # Doit contenir un array (N, D)
    return corpus_info, corpus_texts, corpus_embeddings

# --- Recherche sémantique avec similarité cosinus ---
def semantic_search(query, corpus_texts, corpus_info, corpus_embeddings, top_k=15):
    query_embedding = embed_text_hf(query).reshape(1, -1)
    sims = cosine_similarity(query_embedding, corpus_embeddings)[0]
    top_indices = np.argsort(sims)[::-1][:top_k]

    score_diffs = np.abs(np.diff(sims[top_indices]))
    min_gap = 0.001
    idx = np.where(score_diffs < min_gap)[0]
    last_idx = idx[0] if idx.size > 0 else len(top_indices)

    filtered_indices = top_indices[:last_idx]
    filtered_scores = sims[filtered_indices]

    results = []
    for score, idx in zip(filtered_scores, filtered_indices):
        sid, vid = corpus_info[idx]
        results.append({
            "survey_id": sid,
            "variable_id": vid,
            "similarity_score": float(score),
            "text": corpus_texts[idx]
        })

    return pd.DataFrame(results)
