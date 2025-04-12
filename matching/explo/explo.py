import sqlite3
import pandas as pd
import numpy as np
import os
os.environ["TRANSFORMERS_NO_TF"] = "1"
from sentence_transformers import SentenceTransformer, util

# --- Chargement du modèle ---
model = SentenceTransformer("all-mpnet-base-v2", cache_folder="./matching/models", use_auth_token=False)

# --- Chargement et préparation du corpus ---
def normalize(text):
    return text.lower().strip().replace("\n", " ")

def load_corpus(conn):
    cur = conn.cursor()
    cur.execute("""
        SELECT survey_id, variable_id, label, question_label, label
        FROM codebook_variables
    """)
    rows = cur.fetchall()

    corpus_info = []
    corpus_texts = []

    for row in rows:
        survey_id, var_id, var_label, question_label, value_label = row
        full_text = normalize(f"{question_label}. {var_label}. {value_label}")
        corpus_info.append((survey_id, var_id))
        corpus_texts.append(full_text)

    return corpus_info, corpus_texts

# --- Recherche sémantique avec cutoff dynamique ---
def semantic_search(query, corpus_texts, corpus_info, top_k=15, cutoff_strategy="gap"):
    query_embedding = model.encode(query, convert_to_tensor=True)
    corpus_embeddings = model.encode(corpus_texts, convert_to_tensor=True)
    cos_scores = util.cos_sim(query_embedding, corpus_embeddings)[0]
    top_results = cos_scores.topk(k=top_k)

    scores = top_results.values.cpu().numpy()
    indices = top_results.indices.cpu().numpy()
    
    if cutoff_strategy == "gap":
        score_diffs = np.abs(np.diff(scores))
        #min_gap = np.quantile(score_diffs, 0.6)
        #print(min_gap)
        min_gap = 0.001  # ou un paramètre si tu veux le rendre dynamique

        idx = np.where(score_diffs < min_gap)[0]
        if idx.size > 0:
            last_idx = idx[0]
        else:
            last_idx = len(scores)

        filtered_indices = indices[:last_idx]
        filtered_scores = scores[:last_idx]
    else:
        filtered_indices = indices
        filtered_scores = scores



    results = []
    for score, idx in zip(filtered_scores, filtered_indices):
        survey_id, variable_id = corpus_info[idx]
        text = corpus_texts[idx]
        results.append({
            "survey_id": survey_id,
            "variable_id": variable_id,
            "match_text": text,
            "similarity_score": float(score)
        })

    return pd.DataFrame(results)

# --- Exécution principale ---
if __name__ == "__main__":
    conn = sqlite3.connect("surveys_bd.sqlite")
    corpus_info, corpus_texts = load_corpus(conn)

    query = "carbon tax"
    query = "institutions, democracy, politics"

    df_results = semantic_search(query, corpus_texts, corpus_info, top_k=7)
    print(df_results)
