from sentence_transformers import SentenceTransformer
import os

print(f"Current working directory: {os.getcwd()}")

model = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")

# Sauvegarde locale
model.save("models/all-MiniLM-L6-v2")
