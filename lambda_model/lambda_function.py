from sentence_transformers import SentenceTransformer
import json

model = SentenceTransformer("all-MiniLM-L6-v2")

def lambda_handler(event, context):
    body = json.loads(event["body"])
    sentences = body.get("sentences", [])
    embeddings = model.encode(sentences).tolist()
    return {
        "statusCode": 200,
        "body": json.dumps({"embeddings": embeddings})
    }
