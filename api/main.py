from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from sentence_transformers import SentenceTransformer
import os

app = FastAPI()

# Charger le modèle local
MODEL_PATH = "models/all-MiniLM-L6-v2"
if not os.path.exists(MODEL_PATH):
    raise RuntimeError(f"Modèle non trouvé à {MODEL_PATH}")
model = SentenceTransformer(MODEL_PATH)

# Schéma d'entrée
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
