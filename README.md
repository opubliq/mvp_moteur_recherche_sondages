# Moteur de recherche de questions de sondage

Catalogue de questions de sondage cherchable **au niveau de la question** : retrouver,
à travers des dizaines de sondages, chaque fois qu'un concept a été demandé — même quand
le wording change d'une étude à l'autre. Recherche mots-clés + sémantique. L'objectif
immédiat est une **démo** qui fait comprendre la valeur en 30 secondes à un prospect.

> **État : table rase.** L'ancien MVP a été retiré de `main` (récupérable sur la branche
> `archive/old-mvp`). L'architecture du nouveau moteur — schéma du catalogue, backend de
> recherche (**Azure AI Search** est la direction visée), UI de démo — reste à concevoir.
> Voir [`mega_refactor.md`](mega_refactor.md) pour le contexte complet.

## Données

Les ~58 sondages bruts vivent dans un dossier Google Drive partagé, **hors du repo**, et
sont exposés via un symlink `data/` (ignoré par git). Pour le recréer :

```bash
ln -s /home/hubcad25/opubliq/gdrive/_SharedFolder_data_produit data
```

L'ingestion et le nettoyage des fichiers bruts sont gérés dans un dépôt séparé
(`opubliq/pipeline_sondages`). Ce dépôt-ci se concentre sur la recherche et la démo.

## Configuration

Copier `.env.example` vers `.env` (gitignored) et remplir les valeurs. Variables requises :

| Variable | Description |
|----------|-------------|
| `SEARCH_ENDPOINT` | Endpoint du service Azure AI Search (`https://<service>.search.windows.net`) |
| `SEARCH_ADMIN_KEY` | Clé admin (ingestion / création d'index) |
| `SEARCH_QUERY_KEY` | Clé query (recherche en lecture seule, côté serveur) |
| `AOAI_ENDPOINT` | Endpoint Azure OpenAI |
| `AOAI_KEY` | Clé Azure OpenAI |
| `AOAI_EMBED_DEPLOYMENT` | Nom du déploiement d'embeddings (`text-embedding-3-large`, 3072 dims) |
| `AOAI_CHAT_DEPLOYMENT` | Nom du déploiement chat completion (`gpt-4o`) |
| `AZURE_STORAGE_ACCOUNT` | Compte Blob des microdonnées Parquet (`opubliqsondagesdata`) |
| `AZURE_STORAGE_KEY` | Clé du compte Blob — **serveur uniquement** |
| `AZURE_STORAGE_CONTAINER` | Container des Parquet répondant (`survey-responses`) |

## Installation

Prérequis : [`uv`](https://docs.astral.sh/uv/) (Python ≥ 3.11) et Node 22+.

```bash
uv sync          # crée .venv et installe les deps Python (dont ruff, pytest)
npm install      # installe les deps front + Netlify CLI local
```

## Ingestion

L'orchestrateur lit les modules `ingestion/surveys/*.py` (un `extract()` par sondage),
construit les documents parent-child, calcule les embeddings des questions et les
pousse vers l'index Azure AI Search. Idempotent (merge-or-upload sur la clé `id`).

```bash
uv run python -m ingestion.run                  # ingère tous les sondages
uv run python -m ingestion.run --recreate-index # supprime + recrée l'index d'abord
uv run python -m ingestion.run --only eeq_2014  # un seul survey_id
```

Requiert un `.env` complet (les clés `SEARCH_ADMIN_KEY` + `AOAI_*` sont utilisées ici).

## Front en local

Le backend API est maintenant **Azure Functions** (`azure-functions/`), pas Netlify
Functions (legacy, plus branché sur les comptes — voir `docs/azure_functions_migration.md`).
Le front (Vite) proxy `/search`, `/auth`, `/agent`, etc. vers `func start`
(`localhost:7071`, voir `vite.config.ts`).

Prérequis (une fois) :

```bash
npm install -g azure-functions-core-tools@4 azurite
cp azure-functions/local.settings.json.example azure-functions/local.settings.json
# puis remplir les clés dans azure-functions/local.settings.json (mêmes valeurs que .env)
```

Lancer toute la stack (Azurite + Azure Functions + Vite) en une commande :

```bash
npm run dev:all         # front sur http://localhost:5173, API sur :7071
```

Depuis f3i.19/f3i.20, il n'y a **plus de fallback Basic Auth** : toute route API exige
une session valide, même en local. Sans compte, tu obtiens des 401. Créer un compte
d'essai local (écrit dans le vrai Azure Table Storage, comme en prod — Azurite ne sert
qu'au storage interne du runtime Functions) :

```bash
npm run dev:account -- ton-email@exemple.com un-mot-de-passe
```

Puis se logger dans l'app avec ces identifiants. `npm run dev:all` build + démarre
`func start` à chaque lancement ; utiliser `npm run dev` (Vite seul) si l'API tourne
déjà dans un autre terminal (`cd azure-functions && npm start`).

## Déploiement (Netlify)

`netlify.toml` configure déjà le build (`npm run build` → `dist/`) et le bundling des
functions. Côté Netlify, configurer ces variables d'environnement (Site settings →
Environment variables) — **uniquement les clés serveur, jamais la clé admin** :

| Variable | Rôle |
|----------|------|
| `SEARCH_ENDPOINT` | Endpoint Azure AI Search |
| `SEARCH_QUERY_KEY` | Clé query (lecture seule) utilisée par les functions |
| `AOAI_ENDPOINT` | Endpoint Azure OpenAI |
| `AOAI_KEY` | Clé Azure OpenAI |
| `AOAI_EMBED_DEPLOYMENT` | Déploiement d'embeddings (doit matcher celui de l'ingestion) |
| `AOAI_CHAT_DEPLOYMENT` | Déploiement chat completion (GPT-4o) |
| `AZURE_STORAGE_ACCOUNT` | Compte Blob des Parquet répondant (lecture par la Function DuckDB) |
| `AZURE_STORAGE_KEY` | Clé du compte Blob (serveur uniquement — jamais exposée au client) |
| `AZURE_STORAGE_CONTAINER` | Container des Parquet (`survey-responses`) |

`SEARCH_ADMIN_KEY` ne doit **pas** être configurée sur Netlify : les functions ne font
que lire. Pousser sur `main` déclenche le build/déploiement.

## Lint & CI

```bash
uv run ruff check .          # lint Python
uv run ruff format --check . # vérif formatage (sans --check pour reformater)
uv run pytest -q             # tests (pydantic/build_docs, aucun appel Azure)
npm run build                # build front (inclut tsc -b)
```

La CI GitHub Actions (`.github/workflows/ci.yml`) rejoue ces étapes sur chaque push /
PR, sans secret (aucun job n'appelle Azure). Avant d'ouvrir une PR, lancer
`uv run ruff format .` pour appliquer le formatage.

## Versioning des embeddings

Chaque document enfant porte le champ `embedding_model` (déploiement AOAI utilisé). En
cas de changement de modèle d'embeddings, suivre la procédure de migration **blue-green**
décrite dans [`docs/EMBEDDINGS.md`](docs/EMBEDDINGS.md).

## Infra Azure

Provisionnée dans l'abonnement « Azure subscription 1 », région **canadaeast** :

| Ressource | Nom | Tier |
|-----------|-----|------|
| Resource group | `rg-opubliq-sondages` | — |
| Azure AI Search | `opubliq-sondages-search` | **Basic** (50 index, 2 GB/partition) |
| Azure OpenAI | `opubliq-sondages-aoai` | S0 (facturé au token) |
| Déploiement embeddings | `text-embedding-3-large` (v1, 3072 dims) | Standard |
| Storage Account | `opubliqsondagesdata` | Standard_LRS, accès Hot |
| Container Blob | `survey-responses` | privé (aucun accès public anonyme) |

Le rerank (Cohere) et la décomposition de requête (Mistral) vivent sur une ressource
AI Foundry distincte (`info-4552-resource`, **eastus2** — seule région offrant Cohere
v4.0 pro) ; voir `.env.example`.

Recréer les clés / endpoints au besoin :

```bash
RG=rg-opubliq-sondages
az search admin-key show   --service-name opubliq-sondages-search -g $RG --query primaryKey -o tsv
az search query-key list   --service-name opubliq-sondages-search -g $RG --query "[0].key" -o tsv
az cognitiveservices account keys list -n opubliq-sondages-aoai -g $RG --query key1 -o tsv
az storage account keys list -n opubliqsondagesdata -g $RG --query "[0].value" -o tsv
```

### Blob : microdonnées répondant (Parquet)

Le container `survey-responses` porte les microdonnées répondant-niveau (epic v33). Contrat
complet : [`docs/DECISION_microdata_parquet.md`](docs/DECISION_microdata_parquet.md).

```
survey-responses/
  {survey_id}.parquet   ← 1 fichier par sondage (eeq_2014.parquet, …)
  _manifest.json        ← index : quels sondages ont des microdonnées + poids / ID répondant
```

- **Pas de partition Hive** : la granularité est le fichier ; `survey_id` est la clé de
  jointure avec le catalogue AI Search.
- **Accès serveur uniquement.** Le container n'a aucun accès public anonyme : la clé
  (`AZURE_STORAGE_KEY`) reste côté ingestion / Netlify Function, jamais côté client. La
  Function relaie les agrégats DuckDB — le Parquet n'est jamais exposé directement.
