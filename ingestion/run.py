"""Orchestrateur d'ingestion déterministe (aucun LLM dans la boucle).

Pipeline pour chaque sondage :
    extract() / JSON  →  SurveyFile.model_validate  →  build_docs
    →  embeddings (children seulement)  →  merge_or_upload vers Azure AI Search

Découverte des sondages :
  1. modules `ingestion/surveys/*.py` exposant une fonction `extract() -> dict` ;
  2. fallback : fichiers `ingestion/normalized/*.json` (un par survey_id) pour
     les sondages sans module extracteur.

L'opération est idempotente : `merge_or_upload_documents` réécrit les mêmes
documents (mêmes `id`) → le nombre de documents reste stable entre deux runs.

Usage :
    uv run python -m ingestion.run                    # ingère tous les sondages
    uv run python -m ingestion.run --recreate-index   # recrée l'index d'abord
    uv run python -m ingestion.run --only eeq_2014     # un seul sondage
"""

from __future__ import annotations

import argparse
import importlib
import json
import logging
import pkgutil
from pathlib import Path
from typing import Any, Callable

from azure.core.credentials import AzureKeyCredential
from azure.search.documents import SearchClient

from ingestion import surveys as surveys_pkg
from ingestion.build_docs import build_docs, embed_text
from ingestion.config import get_settings
from ingestion.create_index import create_index
from ingestion.embed import embed_batch
from ingestion.models import SurveyFile

logger = logging.getLogger("ingestion.run")

NORMALIZED_DIR = Path(__file__).parent / "normalized"

# Taille de batch pour l'upload vers Azure AI Search (limite service : 1000).
UPLOAD_BATCH_SIZE = 500


def _discover_sources() -> dict[str, Callable[[], dict[str, Any]]]:
    """Retourne {survey_id: loader} pour chaque sondage découvert.

    Priorité aux modules `ingestion/surveys/*.py` exposant `extract()`.
    Les fichiers `ingestion/normalized/*.json` sans module correspondant sont
    ajoutés en fallback.
    """
    sources: dict[str, Callable[[], dict[str, Any]]] = {}

    # 1. Modules extracteurs.
    for mod_info in pkgutil.iter_modules(surveys_pkg.__path__):
        name = mod_info.name
        if name.startswith("_"):
            continue
        module = importlib.import_module(f"{surveys_pkg.__name__}.{name}")
        extract = getattr(module, "extract", None)
        if callable(extract):
            sources[name] = extract
        else:
            logger.warning("Module surveys.%s sans extract() — ignoré.", name)

    # 2. Fallback JSON normalisés (pour les survey_id sans module).
    if NORMALIZED_DIR.is_dir():
        for json_path in sorted(NORMALIZED_DIR.glob("*.json")):
            survey_id = json_path.stem
            if survey_id in sources:
                continue
            sources[survey_id] = lambda p=json_path: json.loads(
                p.read_text(encoding="utf-8")
            )

    return sources


def _ingest_survey(
    survey_id: str,
    loader: Callable[[], dict[str, Any]],
    client: SearchClient,
) -> int:
    """Ingère un sondage : extraction → docs → embeddings → upload.

    Retourne le nombre de documents poussés (parent + children).
    """
    logger.info("[%s] extraction…", survey_id)
    raw = loader()
    survey_file = SurveyFile.model_validate(raw)

    docs = build_docs(survey_file)
    children = [d for d in docs if d.get("doc_type") == "question"]
    logger.info(
        "[%s] %d documents (1 parent + %d questions)",
        survey_id,
        len(docs),
        len(children),
    )

    # Embeddings sur les children uniquement (le parent n'a pas de vecteur).
    if children:
        texts = [embed_text(q) for q in survey_file.questions]
        logger.info("[%s] calcul de %d embeddings…", survey_id, len(texts))
        vectors = embed_batch(texts)
        if len(vectors) != len(children):
            raise RuntimeError(
                f"[{survey_id}] désynchronisation embeddings/children : "
                f"{len(vectors)} vecteurs pour {len(children)} questions."
            )
        for child, vector in zip(children, vectors):
            child["content_vector"] = vector
            child["embedding_model"] = get_settings().aoai_embed_deployment

    # Upload idempotent (merge-or-upload sur la clé `id`).
    logger.info("[%s] upload de %d documents vers Azure…", survey_id, len(docs))
    for i in range(0, len(docs), UPLOAD_BATCH_SIZE):
        batch = docs[i : i + UPLOAD_BATCH_SIZE]
        results = client.merge_or_upload_documents(documents=batch)
        failed = [r for r in results if not r.succeeded]
        if failed:
            raise RuntimeError(
                f"[{survey_id}] {len(failed)} document(s) en échec à l'upload : "
                + ", ".join(f"{r.key} ({r.error_message})" for r in failed[:5])
            )

    logger.info("[%s] OK — %d documents indexés.", survey_id, len(docs))
    return len(docs)


def run(only: str | None = None, recreate_index: bool = False) -> None:
    """Point d'entrée programmatique de l'orchestrateur."""
    settings = get_settings()

    if recreate_index:
        logger.info("Recréation de l'index '%s'…", settings.index_name)
        create_index(recreate=True)

    sources = _discover_sources()
    if only is not None:
        if only not in sources:
            raise SystemExit(
                f"Sondage '{only}' introuvable. Disponibles : "
                + ", ".join(sorted(sources)) or "(aucun)"
            )
        sources = {only: sources[only]}

    if not sources:
        raise SystemExit("Aucun sondage à ingérer (ni module ni JSON normalisé).")

    logger.info("Sondages à ingérer : %s", ", ".join(sorted(sources)))

    client = SearchClient(
        endpoint=settings.search_endpoint,
        index_name=settings.index_name,
        credential=AzureKeyCredential(settings.search_admin_key),
    )

    total = 0
    for survey_id in sorted(sources):
        total += _ingest_survey(survey_id, sources[survey_id], client)

    logger.info(
        "Terminé : %d documents poussés sur %d sondage(s). "
        "Doc count index : %d.",
        total,
        len(sources),
        client.get_document_count(),
    )


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Orchestrateur d'ingestion idempotent (extraction → Azure AI Search)."
    )
    parser.add_argument(
        "--recreate-index",
        action="store_true",
        help="Supprime et recrée l'index avant l'ingestion.",
    )
    parser.add_argument(
        "--only",
        metavar="SURVEY_ID",
        default=None,
        help="N'ingère que ce survey_id.",
    )
    args = parser.parse_args()

    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(name)s | %(message)s",
        datefmt="%H:%M:%S",
    )
    # Le client Azure logge chaque requête HTTP en INFO : trop verbeux.
    logging.getLogger("azure").setLevel(logging.WARNING)

    run(only=args.only, recreate_index=args.recreate_index)


if __name__ == "__main__":
    main()
