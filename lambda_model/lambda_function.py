import onnxruntime as ort
import numpy as np
import json
from transformers import AutoTokenizer

# Charger modèle ONNX
session = ort.InferenceSession("all-MiniLM-L6-v2-onnx/model.onnx")

# Charger tokenizer depuis chemin local
tokenizer = AutoTokenizer.from_pretrained("all-MiniLM-L6-v2-onnx/tokenizer")

def lambda_handler(event, context):
    data = json.loads(event["body"])
    sentences = data.get("sentences", [])

    tokens = tokenizer(sentences, return_tensors="np", padding=True, truncation=True)
    ort_inputs = {
        "input_ids": tokens["input_ids"],
        "attention_mask": tokens["attention_mask"]
    }

    ort_outputs = session.run(None, ort_inputs)
    embeddings = ort_outputs[0].mean(axis=1).tolist()

    return {
        "statusCode": 200,
        "body": json.dumps({"embeddings": embeddings})
    }
