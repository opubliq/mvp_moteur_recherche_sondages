import onnxruntime as ort
import numpy as np
import json

# Load ONNX model
session = ort.InferenceSession("all-MiniLM-L6-v2-onnx/model.onnx")

# Load tokenizer
from transformers import AutoTokenizer
tokenizer = AutoTokenizer.from_pretrained("sentence-transformers/all-MiniLM-L6-v2")

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
