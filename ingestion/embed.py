"""Client embeddings Azure OpenAI réutilisable par le pipeline d'ingestion.

Expose une seule fonction publique :

    embed_batch(texts: list[str]) -> list[list[float]]

Caractéristiques :
- Découpe automatiquement en sous-batches (BATCH_SIZE items max par requête).
- Retry + backoff exponentiel via tenacity sur RateLimitError et erreurs
  transitoires (APIConnectionError, InternalServerError, APITimeoutError).
- L'ordre des vecteurs retournés correspond TOUJOURS à l'ordre des textes
  en entrée, même après batching.
"""

from __future__ import annotations

import logging
from typing import Final

import openai
from tenacity import (
    before_sleep_log,
    retry,
    retry_if_exception_type,
    stop_after_attempt,
    wait_exponential,
)

from ingestion.config import get_settings

logger = logging.getLogger(__name__)

# Limite conservative : l'API Azure OpenAI accepte jusqu'à 2 048 inputs par
# requête pour text-embedding-3-large, mais on reste bien en-dessous pour
# éviter les timeouts et les rate-limits en production.
BATCH_SIZE: Final[int] = 100

# Types d'erreurs OpenAI considérés comme transitoires → on réessaie.
_RETRYABLE = (
    openai.RateLimitError,
    openai.APIConnectionError,
    openai.InternalServerError,
    openai.APITimeoutError,
)


def _make_client() -> openai.AzureOpenAI:
    """Construit le client Azure OpenAI à partir des settings centralisés."""
    cfg = get_settings()
    return openai.AzureOpenAI(
        azure_endpoint=cfg.aoai_endpoint,
        api_key=cfg.aoai_key,
        api_version="2024-02-01",
    )


@retry(
    retry=retry_if_exception_type(_RETRYABLE),
    wait=wait_exponential(multiplier=1, min=2, max=60),
    stop=stop_after_attempt(6),
    before_sleep=before_sleep_log(logger, logging.WARNING),
    reraise=True,
)
def _embed_single_batch(
    client: openai.AzureOpenAI,
    texts: list[str],
    deployment: str,
) -> list[list[float]]:
    """Envoie UN sous-batch à l'API et retourne les vecteurs dans l'ordre.

    La réponse Azure OpenAI garantit que `data[i].index == i`, mais on trie
    explicitement par index pour être défensif.
    """
    response = client.embeddings.create(
        input=texts,
        model=deployment,
    )
    # Trier par index pour préserver l'ordre même si l'API réordonne les items.
    sorted_data = sorted(response.data, key=lambda item: item.index)
    return [item.embedding for item in sorted_data]


def embed_batch(texts: list[str]) -> list[list[float]]:
    """Retourne un vecteur de 3 072 floats pour chaque texte en entrée.

    Gère le découpage en sous-batches et les retries automatiquement.
    L'ordre des vecteurs correspond à l'ordre de `texts`.

    Args:
        texts: Liste de chaînes à encoder. Ne doit pas être vide.

    Returns:
        Liste de vecteurs (même longueur que `texts`), chacun de 3 072 floats.

    Raises:
        ValueError: Si `texts` est vide.
        openai.OpenAIError: Si toutes les tentatives échouent.
    """
    if not texts:
        raise ValueError("embed_batch: la liste de textes ne doit pas être vide.")

    cfg = get_settings()
    client = _make_client()
    deployment = cfg.aoai_embed_deployment

    all_embeddings: list[list[float]] = []

    for i in range(0, len(texts), BATCH_SIZE):
        chunk = texts[i : i + BATCH_SIZE]
        logger.debug(
            "Embeddings : sous-batch %d-%d sur %d textes total",
            i,
            i + len(chunk) - 1,
            len(texts),
        )
        batch_vectors = _embed_single_batch(client, chunk, deployment)
        all_embeddings.extend(batch_vectors)

    return all_embeddings
