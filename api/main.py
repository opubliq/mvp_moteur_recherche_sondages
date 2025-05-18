from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sentence_transformers import SentenceTransformer
import os
from sklearn.metrics.pairwise import cosine_similarity

app = FastAPI()

# CORS doit être défini juste après l'instance FastAPI
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Pour le développement
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
    documents: list[str]
    top_k: int = 5
    
@app.post("/search")
def search(req: SearchRequest):
    if not req.query.strip():
        raise HTTPException(status_code=400, detail="Requête vide non autorisée")
    if not req.documents:
        raise HTTPException(status_code=400, detail="Aucun document fourni pour la recherche")
    
    # Encoder la requête et les documents
    query_embedding = model.encode(req.query)
    document_embeddings = model.encode(req.documents)
    
    # Calculer les similarités
    similarities = cosine_similarity([query_embedding], document_embeddings)[0]
    
    # Trier les résultats
    results = []
    for i, score in enumerate(similarities):
        results.append({"document": req.documents[i], "score": float(score)})
    
    # Trier par score décroissant et limiter au top_k
    results.sort(key=lambda x: x["score"], reverse=True)
    results = results[:req.top_k]
    
    return {"results": results}