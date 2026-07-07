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

Le front (Vite) appelle les Netlify Functions `/search` et `/survey`, qui ont besoin
des clés Azure. On lance donc le tout via la CLI Netlify (Vite seul ne sert pas les
functions) :

```bash
npx netlify dev        # front + functions sur http://localhost:8888
```

`netlify dev` charge le `.env` automatiquement et expose `/search` et `/survey` (voir
`netlify.toml`). Pour valider le rendu sans index Azure peuplé, lancer Vite seul avec
le flag mock : `VITE_USE_MOCK=true npm run dev`.

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
| Azure AI Search | `opubliq-sondages-728c` | **Free** (0 $/mois ; 50 MB, 3 index, ~10k docs, pas de semantic ranker) |
| Azure OpenAI | `opubliq-sondages-aoai-728c` | S0 (facturé au token) |
| Déploiement embeddings | `text-embedding-3-large` (v1, 3072 dims) | Standard |

Recréer les clés / endpoints au besoin :

```bash
RG=rg-opubliq-sondages
az search admin-key show   --service-name opubliq-sondages-728c -g $RG --query primaryKey -o tsv
az search query-key list   --service-name opubliq-sondages-728c -g $RG --query "[0].key" -o tsv
az cognitiveservices account keys list -n opubliq-sondages-aoai-728c -g $RG --query key1 -o tsv
```

> Le tier Free de AI Search suffit pour le proto. Passer à **Basic** (~75 $/mois) seulement si
> on dépasse 50 MB / 10k docs ou qu'on a besoin du semantic ranker.
