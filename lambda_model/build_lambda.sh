#!/bin/bash

set -e

# Aller dans le dossier du script
cd "$(dirname "$0")"

echo "Nettoyage..."
rm -rf python lambda_package.zip

echo "Installation des dépendances..."
pip install -r requirements.txt -t python

echo "Copie des fichiers..."
cp -r ../models/all-MiniLM-L6-v2-onnx python/
cp lambda_function.py python/

echo "Compression..."
cd python
zip -r ../lambda_package.zip .
cd ..

echo "Contenu de python/ (non compressé) :"
du -sh python/* | sort -h | tail -n 10

echo "Contenu compressé le plus lourd :"
unzip -l lambda_package.zip | sort -k1 -n | tail -n 10

echo "✅ Fini. Taille zip :"
du -h lambda_package.zip
