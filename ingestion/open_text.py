"""Qualification des colonnes texte — SOURCE UNIQUE de la règle (bead jsu.5).

`var_type == "open"` veut dire « colonne string », pas « verbatim ». Ce module
tranche, à partir des DONNÉES, ce qu'une colonne string contient réellement :

    prose    → vrai verbatim (réponse en phrases) — cible de l'epic jsu
    short    → réponse d'un ou deux mots, codable mais non analysable en prose
    numeric  → nombre stocké en string → la question est requalifiée `continuous`
    empty    → colonne string entièrement vide

Le résultat vit dans le champ `text_kind` (orthogonal à `var_type`, cf.
`ingestion/SCHEMA.md`). Prédicat verbatim : `is_verbatim(var_type, text_kind)`.

Aucun extracteur ne devine cette qualification : elle est dérivée au build, par
les deux rails (catalogue `run.py`, microdonnées `microdata.py`) qui appellent
`effective_var_type()`.

Audit reproductible du corpus :
    uv run python -m ingestion.open_text
"""

from __future__ import annotations

import logging
from typing import Any

import pandas as pd

logger = logging.getLogger("ingestion.open_text")

TEXT_KINDS = ("prose", "short", "numeric", "empty")

# Part MINIMALE de réponses de ≥ 3 mots pour qu'une colonne soit de la prose.
# Calibré sur les 110 colonnes `open` du corpus (2026-07-21) : le cas le plus
# proche par en dessous est M3_F_TEXT/M4_F_TEXT à 0.27 (noms de programmes),
# le plus proche par au-dessus K5_L_TEXT à 0.347 (commentaires libres).
PROSE_MIN_SHARE_3W = 0.30

# Longueur minimale (en mots) d'une réponse pour compter comme « en phrase ».
PROSE_MIN_WORDS = 3


def is_text_column(series: pd.Series) -> bool:
    """True si la colonne porte du texte — donc candidate à `var_type = "open"`.

    Remplace le test `str(series.dtype) == "object"` qu'utilisaient les
    extracteurs : pandas ≥ 2 expose désormais les colonnes chaîne de pyreadstat
    en dtype `str`, et le test échouait SILENCIEUSEMENT (les verbatims de
    cecd_elxn_qc_2007 tombaient en `continuous`).
    """
    return pd.api.types.is_string_dtype(series) or series.dtype == object


def _clean_values(series: pd.Series) -> list[str]:
    """Valeurs non-nulles, non-vides après strip, en str."""
    out: list[str] = []
    for v in series:
        if pd.isna(v):
            continue
        s = str(v).strip()
        if s:
            out.append(s)
    return out


def _is_numeric(value: str) -> bool:
    """True si la chaîne se lit comme un nombre (virgule décimale tolérée)."""
    try:
        float(value.replace(",", "."))
    except ValueError:
        return False
    return True


def qualify_text_column(series: pd.Series) -> str:
    """Retourne le `text_kind` d'une colonne string : prose | short | numeric | empty.

    Règle (unique, documentée) :
      - aucune valeur non-vide                       → "empty"
      - 100 % des valeurs se lisent comme un nombre  → "numeric"
      - part des réponses de ≥ 3 mots ≥ 0.30         → "prose"
      - sinon                                        → "short"

    Le seuil numérique est STRICT (100 %) à dessein : la requalification en
    `continuous` retype la colonne dans le Parquet, et un seuil strict garantit
    que la coercition ne perd aucune valeur (raw-first préservé).
    """
    values = _clean_values(series)
    if not values:
        return "empty"
    if all(_is_numeric(v) for v in values):
        return "numeric"
    share_3w = sum(len(v.split()) >= PROSE_MIN_WORDS for v in values) / len(values)
    return "prose" if share_3w >= PROSE_MIN_SHARE_3W else "short"


def effective_var_type(
    var_type: str | None, series: pd.Series
) -> tuple[str | None, str | None]:
    """(var_type effectif, text_kind) pour une question, d'après ses données.

    Ne touche QUE les questions `open` : tout le reste est retourné inchangé avec
    `text_kind=None`. Un `open` 100 % numérique est requalifié `continuous`.
    """
    if var_type != "open":
        return var_type, None
    kind = qualify_text_column(series)
    if kind == "numeric":
        return "continuous", kind
    return "open", kind


def is_verbatim(var_type: str | None, text_kind: str | None) -> bool:
    """Prédicat verbatim du corpus — le SEUL endroit où il est défini côté Python."""
    return var_type == "open" and text_kind == "prose"


# ---------------------------------------------------------------------------
# Audit du corpus (décompte reproductible)
# ---------------------------------------------------------------------------


def audit() -> list[dict[str, Any]]:
    """Qualifie toutes les questions `open` du corpus. Retourne une ligne par question.

    Passe par les MÊMES sources que l'orchestrateur (`run._discover_sources()` :
    extracteurs d'abord, JSON normalisés en repli) pour que le décompte reflète
    exactement ce qui sera indexé.
    """
    # Imports locaux : l'audit tire le rail microdonnées et l'orchestrateur, mais
    # les helpers ci-dessus doivent rester importables sans Azure ni cycle.
    from ingestion.microdata import _locate_raw, read_raw
    from ingestion.run import _discover_sources

    rows: list[dict[str, Any]] = []
    for survey_id, loader in sorted(_discover_sources().items()):
        data = loader()
        opens = [
            q["variable"] for q in data.get("questions", []) if q.get("var_type") == "open"
        ]
        if not opens:
            continue
        try:
            df = read_raw(_locate_raw(survey_id))
        except (FileNotFoundError, ValueError) as exc:
            logger.warning("[%s] brut illisible (%s) — sondage sauté.", survey_id, exc)
            continue
        for variable in opens:
            if variable not in df.columns:
                logger.warning("[%s] colonne %s absente du brut.", survey_id, variable)
                continue
            series = df[variable]
            values = _clean_values(series)
            new_type, kind = effective_var_type("open", series)
            n = len(values)
            rows.append(
                {
                    "survey_id": survey_id,
                    "variable": variable,
                    "text_kind": kind,
                    "var_type": new_type,
                    "n": n,
                    "p_numeric": (sum(_is_numeric(v) for v in values) / n) if n else 0.0,
                    "p_3w": (
                        sum(len(v.split()) >= PROSE_MIN_WORDS for v in values) / n
                    )
                    if n
                    else 0.0,
                    "example": values[0][:60] if values else "",
                }
            )
    return rows


def main() -> None:
    from collections import Counter

    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s | %(message)s")
    logging.getLogger("ingestion.microdata").setLevel(logging.WARNING)

    rows = audit()
    header = (
        f"{'survey_id':24s} {'variable':22s} {'text_kind':9s} "
        f"{'n':>6s} {'%num':>6s} {'%3mots':>7s}  exemple"
    )
    print(header)
    print("-" * len(header))
    for r in rows:
        print(
            f"{r['survey_id']:24s} {r['variable']:22s} {r['text_kind']:9s} "
            f"{r['n']:6d} {r['p_numeric']:6.3f} {r['p_3w']:7.3f}  {r['example']}"
        )

    counts = Counter(r["text_kind"] for r in rows)
    print()
    print(f"TOTAL colonnes `open` au catalogue : {len(rows)}")
    for kind in TEXT_KINDS:
        print(f"  {kind:8s} : {counts.get(kind, 0)}")
    verbatim_cells = sum(r["n"] for r in rows if r["text_kind"] == "prose")
    print(
        f"\nCorpus verbatim : {counts.get('prose', 0)} questions, "
        f"{verbatim_cells} réponses non-vides."
    )


if __name__ == "__main__":
    main()
