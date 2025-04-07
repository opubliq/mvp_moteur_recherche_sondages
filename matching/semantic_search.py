import sqlite3
import numpy as np
import pandas as pd
from sentence_transformers import SentenceTransformer, util

def load_model():
    return SentenceTransformer("all-mpnet-base-v2", cache_folder="./matching/models", use_auth_token=False)

def load_corpus(db_path="surveys_bd.sqlite"):
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
    return corpus_info, corpus_texts

def semantic_search(query, model, corpus_texts, corpus_info, top_k=15):
    query_embedding = model.encode(query, convert_to_tensor=True)
    corpus_embeddings = model.encode(corpus_texts, convert_to_tensor=True)
    cos_scores = util.cos_sim(query_embedding, corpus_embeddings)[0]
    top_results = cos_scores.topk(k=top_k)

    scores = top_results.values.cpu().numpy()
    indices = top_results.indices.cpu().numpy()

    score_diffs = np.abs(np.diff(scores))
    #min_gap = max(0.01, np.quantile(score_diffs, 0.6))
    min_gap = 0.001
    idx = np.where(score_diffs < min_gap)[0]
    last_idx = idx[0] if idx.size > 0 else len(scores)

    filtered_indices = indices[:last_idx]
    filtered_scores = scores[:last_idx]

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
