#!/bin/bash
set -e

cd "$(dirname "$0")"

echo "🛠  Rebuild Docker image..."
docker build -t torch-lambda .

echo "🧹  Remove previous container if exists..."
docker rm -f torch-lambda-test 2>/dev/null || true

echo "🚀  Run Docker container (port 9000)..."
docker run -d -p 9000:8080 --name torch-lambda-test torch-lambda

echo "⏳  Waiting for container to start..."
sleep 3

echo "📡  Sending test request..."
curl -X POST http://localhost:9000/2015-03-31/functions/function/invocations \
     -H "Content-Type: application/json" \
     -d '{"sentences": ["Bonjour", "Comment ça va?"]}'

echo -e "\n✅  Done."