"""Fetch hybrid-search candidates from the Azure AI Search index for eval labelling.

For a given query string, run a hybrid search (BM25 + vector) restricted to
question documents and return a manageable candidate list to hand-judge.

Reuses the ingestion package for config + embeddings so the query vector uses
the SAME model the index was built with (text-embedding-3-large, 3072 dims).

CLI:
    uv run python eval/fetch_candidates.py "soutien au fédéralisme canadien"
    uv run python eval/fetch_candidates.py "immigration" --top 40
"""

from __future__ import annotations

import argparse
import json

from azure.core.credentials import AzureKeyCredential
from azure.search.documents import SearchClient
from azure.search.documents.models import VectorizedQuery

from ingestion.config import get_settings
from ingestion.embed import embed_batch

SELECT_FIELDS = [
    "id",
    "survey_id",
    "survey_name",
    "variable",
    "question_text",
    "display_label",
    "survey_year",
    "pollster",
    "language",
    "is_sociodemo",
    "concepts",
    "themes",
]


def _client() -> SearchClient:
    cfg = get_settings()
    return SearchClient(
        cfg.search_endpoint,
        cfg.index_name,
        AzureKeyCredential(cfg.search_query_key),
    )


def fetch_candidates(
    query: str, top: int = 40, k: int = 50, mode: str = "hybrid"
) -> list[dict]:
    """Search for `query` and return up to `top` question candidates.

    mode:
      - "hybrid"  : BM25 (search_text) + vector (content_vector).
      - "vector"  : vector only (no search_text).
      - "bm25"    : keyword only (no vector).
    """
    client = _client()
    kwargs: dict = {
        "filter": "doc_type eq 'question'",
        "select": SELECT_FIELDS,
        "top": top,
    }
    if mode in ("hybrid", "vector"):
        vec = embed_batch([query])[0]
        kwargs["vector_queries"] = [
            VectorizedQuery(vector=vec, k_nearest_neighbors=k, fields="content_vector")
        ]
    kwargs["search_text"] = query if mode in ("hybrid", "bm25") else None
    return [dict(r) for r in client.search(**kwargs)]


def main() -> None:
    parser = argparse.ArgumentParser(description="Fetch eval candidates from Azure AI Search.")
    parser.add_argument("query", help="Search query string.")
    parser.add_argument("--top", type=int, default=40, help="Max candidates to return.")
    args = parser.parse_args()

    candidates = fetch_candidates(args.query, top=args.top)
    for c in candidates:
        print(json.dumps(c, ensure_ascii=False))


if __name__ == "__main__":
    main()
