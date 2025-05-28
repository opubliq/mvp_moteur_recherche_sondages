# Makefile

.PHONY: help run test freeze

help:  ## Affiche cette aide
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

run-fastapi:  ## Démarre l'API FastAPI localement
	. .venv-api-embedding/bin/activate && uvicorn api.main:app --reload

test-fastapi-embed:  ## Lance le script de test simple
	python tests/test_api_embed.py

test-fastapi-search:  ## Teste l'endpoint /search
	python tests/test_api_search.py

test-fastapi-viz: ## Teste l'endpoint /viz
	python tests/test_api_viz.py

freeze:  ## Sauvegarde les dépendances dans requirements.txt
	pip freeze > requirements.txt

save-tree: ## Enregistre l'arborescence du projet dans le fichier arborescence.txt
	@echo "Arborescence du projet : " > arborescence.txt
	@tree -L 3 >> arborescence.txt
	@echo "Arborescence enregistrée dans le fichier arborescence.txt"

dev-react:  ## Lance l'interface React en mode développement via npm
	cd ui/ && npm run dev

build-react:  ## Compile l'interface React pour la production
	cd ui/ && npm run build

deploy-react:  ## Déploie l'interface React sur le serveur
	netlify build              # build local
	netlify deploy --prod      # déploie en prod