#!/bin/bash
set -e

# === CONFIGURATION ===
IMAGE_NAME="embedding-api"
DOCKERHUB_USER="hubcad25"
DOCKERHUB_REPO="embedding-api"
TAG="latest"

# === BUILD ===
echo "🔧 Build de l'image Docker..."
docker build -t $IMAGE_NAME .

# === TAG ===
echo "🏷  Tag de l'image pour Docker Hub..."
docker tag $IMAGE_NAME $DOCKERHUB_USER/$DOCKERHUB_REPO:$TAG

# === LOGIN ===
echo "🔑 Connexion à Docker Hub (si besoin)..."
docker login

# === PUSH ===
echo "⬆️  Push de l'image sur Docker Hub..."
docker push $DOCKERHUB_USER/$DOCKERHUB_REPO:$TAG

echo "✅ Image pushée sur Docker Hub : $DOCKERHUB_USER/$DOCKERHUB_REPO:$TAG"
