#!/bin/bash

# Connexion AWS avec lambda-user
aws ecr get-login-password --region ca-central-1 --profile lambda-user | docker login --username AWS --password-stdin 676206945358.dkr.ecr.ca-central-1.amazonaws.com

# Taguer l'image Docker
docker tag torch-lambda:latest 676206945358.dkr.ecr.ca-central-1.amazonaws.com/torch-lambda-repo:latest

echo "✅  Image Docker taguée avec succès !"

# Pousser l'image Docker
docker push 676206945358.dkr.ecr.ca-central-1.amazonaws.com/torch-lambda-repo:latest

echo "✅  Image Docker poussée dans ECR avec succès !"
