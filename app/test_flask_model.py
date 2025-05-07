from flask import Flask, request, jsonify
import onnxruntime as ort
import numpy as np
from transformers import AutoTokenizer

app = Flask(__name__)

# Charger tokenizer et modèle ONNX
tokenizer = AutoTokenizer.from_pretrained("sentence-transformers/all-MiniLM-L6-v2")
session = ort.InferenceSession("models/all-MiniLM-L6-v2-onnx/model.onnx")

@app.route("/embed", methods=["POST"])
def embed():
    data = request.json
    sentences = data.get("sentences", [])

    tokens = tokenizer(sentences, return_tensors="np", padding=True, truncation=True)
    inputs = {
        "input_ids": tokens["input_ids"],
        "attention_mask": tokens["attention_mask"]
    }

    outputs = session.run(None, inputs)
    embeddings = outputs[0].mean(axis=1).tolist()

    return jsonify({"embeddings": embeddings})

if __name__ == "__main__":
    app.run(debug=True)
