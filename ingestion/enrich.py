"""Merge déterministe des champs « mous » authorés (LLM) sur l'extraction brute.

Les extracteurs `ingestion/surveys/*.py` produisent des champs VERBATIM du raw
(question_text, response_options, variable, métadonnées SAV). Les champs authorés
par un subagent LLM (display_label, concepts, themes, survey_description,
survey_month) vivent séparément dans `ingestion/enrichment/<survey_id>.py` sous
forme de dicts figés — versionnés, auditables, déterministes (« aucun LLM dans la
boucle » de run.py).

`apply_enrichment` superpose l'enrichment sur le dict d'extraction, SANS jamais
toucher aux champs verbatim. Si aucun module d'enrichment n'existe pour le
survey_id, l'extraction est retournée inchangée (no-op).
"""

from __future__ import annotations

import importlib
import logging
from typing import Any

logger = logging.getLogger(__name__)

# Champs verbatim protégés : l'enrichment ne doit JAMAIS les redéfinir.
_VERBATIM_QUESTION_FIELDS = {"variable", "question_text", "response_options"}


def apply_enrichment(data: dict[str, Any], survey_id: str) -> dict[str, Any]:
    """Superpose `ingestion/enrichment/<survey_id>.py` sur `data` (mutation + retour).

    - SURVEY.description → survey.survey_description
    - SURVEY.month       → survey.survey_month
    - QUESTIONS[var].{display_label, concepts, themes} → question correspondante

    Ne remplit un champ que si l'enrichment fournit une valeur non vide ; ne
    touche jamais aux champs verbatim. No-op si le module d'enrichment est absent.
    """
    try:
        mod = importlib.import_module(f"ingestion.enrichment.{survey_id}")
    except ModuleNotFoundError:
        logger.info("[%s] aucun enrichment — extraction brute conservée.", survey_id)
        return data

    survey_enr: dict[str, Any] = getattr(mod, "SURVEY", {}) or {}
    if survey_enr.get("description"):
        data["survey"]["survey_description"] = survey_enr["description"]
    if survey_enr.get("month") is not None:
        data["survey"]["survey_month"] = survey_enr["month"]

    q_enr: dict[str, Any] = getattr(mod, "QUESTIONS", {}) or {}
    enriched = 0
    for question in data.get("questions", []):
        entry = q_enr.get(question["variable"])
        if not entry:
            continue
        for field in _VERBATIM_QUESTION_FIELDS & entry.keys():
            raise ValueError(
                f"[{survey_id}] enrichment interdit sur champ verbatim "
                f"'{field}' (variable {question['variable']!r})."
            )
        if entry.get("display_label"):
            question["display_label"] = entry["display_label"]
        if entry.get("concepts"):
            question["concepts"] = entry["concepts"]
        if entry.get("themes"):
            question["themes"] = entry["themes"]
        enriched += 1

    logger.info(
        "[%s] enrichment appliqué : %d/%d question(s), description=%s, month=%s.",
        survey_id,
        enriched,
        len(data.get("questions", [])),
        bool(survey_enr.get("description")),
        survey_enr.get("month"),
    )
    return data
