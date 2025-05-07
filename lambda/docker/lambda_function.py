from sentence_transformers import SentenceTransformer

model = SentenceTransformer("all-MiniLM-L6-v2")

def lambda_handler(event, context):
    if "body" in event:
        data = json.loads(event["body"])
    else:
        data = event

    sentences = data.get("sentences", [])
    embeddings = model.encode(sentences).tolist()

    return {
        "statusCode": 200,
        "body": json.dumps({"embeddings": embeddings})
    }
