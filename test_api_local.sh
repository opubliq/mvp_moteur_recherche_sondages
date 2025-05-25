#!/bin/bash
set -e

IMAGE_NAME="fullstack-embedding-app"

# Forcer la suppression du conteneur existant
docker rm -f test-api 2>/dev/null || true

echo "🔧 Build de l'image Docker..."
docker build -t $IMAGE_NAME .

echo "🚀 Lancement du conteneur..."
docker run -d -p 8000:8000 --name test-api $IMAGE_NAME

echo "⏳ Attente de l'API (max 5s)..."
success=false
for i in {1..5}; do
  if curl -s http://localhost:8000 > /dev/null; then
    echo "✅ API accessible."
    curl http://localhost:8000
    success=true
    break
  fi
  sleep 1
done

if [ "$success" = false ]; then
  echo "❌ Échec : l'API ne répond pas après 10s."
fi


echo -e "\n📄 Logs du conteneur :"
docker logs test-api

echo -e "\n🧹 Nettoyage..."
docker stop test-api > /dev/null
docker rm test-api > /dev/null

echo "✅ Test terminé."
