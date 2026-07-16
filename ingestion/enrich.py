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


def _reorder_options(
    options: list[dict[str, Any]],
    order: list[Any],
    *,
    survey_id: str,
    variable: str,
) -> list[dict[str, Any]]:
    """Permute `options` selon `order` (liste de codes) — verbatim-safe.

    Les codes listés dans `order` viennent d'abord, dans l'ordre donné ; les codes
    NON listés (typiquement refus/NSP) conservent leur ordre d'origine, à la fin.
    On ne fait que RÉORDONNER des dicts existants : aucun label ni code n'est
    créé, modifié ou supprimé. Les codes se comparent en `str()` (int|str).

    Lève ValueError si un code de `order` est absent des options (typo d'author).
    """
    by_code: dict[str, dict[str, Any]] = {str(opt["code"]): opt for opt in options}

    missing = [c for c in order if str(c) not in by_code]
    if missing:
        raise ValueError(
            f"[{survey_id}] response_order de {variable!r} référence des codes "
            f"absents des options : {missing!r} (codes disponibles : "
            f"{sorted(by_code)})."
        )

    ordered_keys = [str(c) for c in order]
    seen = set(ordered_keys)
    # Codes non listés : préservent leur ordre d'origine, poussés à la fin.
    trailing = [opt for opt in options if str(opt["code"]) not in seen]
    return [by_code[k] for k in ordered_keys] + trailing


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
        if entry.get("is_ordinal"):
            question["is_ordinal"] = True
        # Réordonnancement verbatim-safe des options (rampe du gradient ordinal) :
        # on permute des dicts existants, sans toucher aux labels/codes.
        if entry.get("response_order"):
            question["response_options"] = _reorder_options(
                question.get("response_options", []),
                entry["response_order"],
                survey_id=survey_id,
                variable=question["variable"],
            )
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
