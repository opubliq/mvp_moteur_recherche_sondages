# Makefile

.PHONY: help run test freeze

help:  ## Affiche cette aide
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

run:  ## Démarre l'API FastAPI localement
	. .venv-api-embedding/bin/activate && uvicorn api.main:app --reload

test:  ## Lance le script de test simple
	python tests/test_api_embed.py

freeze:  ## Sauvegarde les dépendances dans requirements.txt
	pip freeze > requirements.txt

savetree: ## Enregistre l'arborescence du projet dans le fichier arborescence.txt
	@echo "Arborescence du projet : " > arborescence.txt
	@tree -L 3 >> arborescence.txt
	@echo "Arborescence enregistrée dans le fichier arborescence.txt"

dev:  ## Lance le projet en mode développement via npm
	cd ui/ && npm run dev