"""Configuration partagée : lit les secrets depuis `.env` (gitignored).

Toutes les valeurs Azure (AI Search + Azure OpenAI) transitent par ici pour
qu'aucun module d'ingestion n'ait à relire `.env` lui-même.
"""

from __future__ import annotations

import os
from functools import lru_cache

from dotenv import load_dotenv
from pydantic import BaseModel

load_dotenv()

INDEX_NAME = "survey-questions"
EMBEDDING_DIMS = 3072


def _require(key: str) -> str:
    val = os.environ.get(key)
    if not val:
        raise RuntimeError(
            f"Variable d'environnement manquante : {key}. "
            "Copier .env.example vers .env et remplir les valeurs."
        )
    return val


class Settings(BaseModel):
    search_endpoint: str
    search_admin_key: str
    search_query_key: str
    aoai_endpoint: str
    aoai_key: str
    aoai_embed_deployment: str
    index_name: str = INDEX_NAME
    embedding_dims: int = EMBEDDING_DIMS


@lru_cache
def get_settings() -> Settings:
    return Settings(
        search_endpoint=_require("SEARCH_ENDPOINT"),
        search_admin_key=_require("SEARCH_ADMIN_KEY"),
        search_query_key=_require("SEARCH_QUERY_KEY"),
        aoai_endpoint=_require("AOAI_ENDPOINT"),
        aoai_key=_require("AOAI_KEY"),
        aoai_embed_deployment=_require("AOAI_EMBED_DEPLOYMENT"),
    )
