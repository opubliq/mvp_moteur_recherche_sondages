from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sentence_transformers import SentenceTransformer
import os
from sklearn.metrics.pairwise import cosine_similarity
from matching.semantic_search import load_corpus, semantic_search
from typing import List
import pandas as pd
from viz.functions import plot_variables_from_results

app = FastAPI()

# CORS doit être défini juste après l'instance FastAPI
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # autorise l'origine React
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

MODEL_PATH = "models/all-MiniLM-L6-v2"
if not os.path.exists(MODEL_PATH):
    raise RuntimeError(f"Modèle non trouvé à {MODEL_PATH}")
model = SentenceTransformer(MODEL_PATH)

class EmbedRequest(BaseModel):
    text: str

@app.get("/")
def root():
    return {"message": "API d'embedding Opubliq"}

@app.post("/embed")
def embed(req: EmbedRequest):
    if not req.text.strip():
        raise HTTPException(status_code=400, detail="Texte vide non autorisé")
    embedding = model.encode(req.text).tolist()
    return {"embedding": embedding}

class SearchRequest(BaseModel):
    query: str
    top_k: int = 5

@app.post("/search")
def search(req: SearchRequest):
    if not req.query.strip():
        raise HTTPException(status_code=400, detail="Requête vide non autorisée")

    corpus_info, corpus_texts = load_corpus()
    df = semantic_search(req.query, corpus_texts, corpus_info, model=model, top_k=req.top_k)

    results = df.to_dict(orient="records")
    return {"results": results}


class VizRequest(BaseModel):
    items: List[dict]  # chaque dict = {"survey_id": ..., "variable_id": ...}

@app.post("/viz")
def get_visualisation(req: VizRequest):
    try:
        df = pd.DataFrame(req.items)
        fig = plot_variables_from_results(df)

        # Extraire les données brutes du graphique (ex: barplot)
        if hasattr(fig, 'data') and fig.data:
            traces = []
            for trace in fig.data:
                traces.append({
                    "type": trace.type,
                    "name": trace.name,
                    "x": list(trace.x),
                    "y": list(trace.y),
                })
            return {"traces": traces}
        else:
            raise HTTPException(status_code=500, detail="Graphique vide")

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
