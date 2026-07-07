"""Garde-fou ingestion : interdire la fabrication de `question_text`.

Ce module détecte les libellés de question (`question_text`) et les libellés
de choix (`response_options[].label`) manifestement *fabriqués* — c.-à-d. qui
ne proviennent PAS du raw (var labels SAV/DTA, dictionnaire XLSX, codebook
PDF/DOCX) mais ont été inventés ou bricolés à partir du seul nom de variable.

Contexte (pilote u5o.4) : un extracteur a INVENTÉ les `question_text` d'un
sondage dont le raw n'était qu'une liste de codes (variable → code → label),
sans aucun wording de question. Résultat rejeté. Ce module rend la règle
systémique et automatiquement détectable.

Voir `ingestion/CONVENTIONS.md` pour la règle écrite et `ingestion/COUVERTURE.md`
pour le recensement des sondages ingérables vs. « nécessite le questionnaire ».

Usage typique (dans l'orchestrateur) :

    from ingestion.validate import assert_no_fabricated_text
    survey_file = SurveyFile.model_validate(raw)
    assert_no_fabricated_text(survey_file)   # lève si fabrication détectée
"""

from __future__ import annotations

import re
import unicodedata

from ingestion.canonical import CANONICAL_SOCIODEMO
from ingestion.models import SurveyFile


class FabricatedTextError(ValueError):
    """Levée quand un `question_text` (ou un label) semble fabriqué/vide."""


# ---------------------------------------------------------------------------
# Détection
# ---------------------------------------------------------------------------

# Placeholders explicites souvent laissés par un extracteur paresseux ou un LLM.
_PLACEHOLDER_PATTERNS: tuple[re.Pattern[str], ...] = (
    re.compile(r"^<?\s*none\s*>?$", re.IGNORECASE),
    re.compile(r"^n/?a$", re.IGNORECASE),
    re.compile(r"^(null|nan|none|todo|tbd|xxx+|\?+|-+|\.+)$", re.IGNORECASE),
    re.compile(r"^(question|variable|var|item|champ|field)\s*[-_:#]?\s*\d*$", re.IGNORECASE),
    re.compile(r"^sans\s+(libell[ée]|label|titre|nom)$", re.IGNORECASE),
    re.compile(r"^(label|libell[ée])\s+(manquant|inconnu|absent)$", re.IGNORECASE),
)


def _squash(text: str) -> str:
    """Minuscule, sans accents ni ponctuation NI espaces — comparaison « collée »."""
    text = unicodedata.normalize("NFKD", text)
    text = "".join(c for c in text if not unicodedata.combining(c))
    return re.sub(r"[^a-z0-9]", "", text.lower())


def _loose(text: str) -> str:
    """Minuscule, ponctuation de bordure retirée, espaces internes PRÉSERVÉS.

    Permet de distinguer une COPIE verbatim de l'identifiant ('VOT1', 'Q3.')
    d'un libellé authoré qui reformate le nom ('MENTION 1', 'Question 3 : …').
    """
    text = unicodedata.normalize("NFKD", text)
    text = "".join(c for c in text if not unicodedata.combining(c))
    text = text.lower().strip()
    return re.sub(r"^\W+|\W+$", "", text)


def fabrication_reason(variable: str, question_text: str) -> str | None:
    """Retourne une raison (str) si `question_text` semble fabriqué, sinon None.

    Heuristiques honnêtes et conservatrices (préfèrent les faux négatifs aux
    faux positifs, pour ne jamais bloquer un wording réel mais court) :

    * vide / espaces uniquement ;
    * placeholder explicite (`<none>`, `n/a`, `Question 1`, `TODO`…) ;
    * égal au nom de variable (à la casse/accents/ponctuation près) ;
    * aucun caractère alphabétique (p.ex. uniquement un code numérique) ;
    * un seul « mot » qui se réduit au nom de variable (p.ex. `VOT1`, `Q3.`).
    """
    stripped = question_text.strip()
    if not stripped:
        return "question_text vide"

    for pat in _PLACEHOLDER_PATTERNS:
        if pat.match(stripped):
            return f"placeholder détecté : {stripped!r}"

    if not any(c.isalpha() for c in stripped):
        return f"aucun caractère alphabétique (code brut ?) : {stripped!r}"

    # Copie verbatim de l'identifiant : on préserve les espaces internes, donc
    # un libellé reformaté ('MENTION 1' pour la variable 'mention1') N'est PAS
    # flaggé, alors que 'VOT1' / 'Q3.' le sont.
    loose_var = _loose(variable)
    if loose_var and _loose(stripped) == loose_var:
        return (
            f"question_text identique au nom de variable {variable!r} "
            "→ wording probablement fabriqué (le raw ne contient qu'un code)"
        )

    # Un seul token (pas d'espace) qui se réduit au nom de variable, à un
    # caractère près : p.ex. variable=VOT1, question_text='_VOT1' ou 'VOT1x'.
    squash_text = _squash(stripped)
    squash_var = _squash(variable)
    if (
        " " not in stripped
        and squash_var
        and squash_var in squash_text
        and len(squash_text) <= len(squash_var) + 1
    ):
        return f"question_text {stripped!r} se réduit au nom de variable {variable!r} → fabriqué"

    return None


def find_issues(survey_file: SurveyFile, *, check_labels: bool = True) -> list[str]:
    """Liste les problèmes de fabrication détectés dans un `SurveyFile`.

    Vérifie chaque `question_text` et — si `check_labels` — chaque label de
    choix de réponse. Retourne une liste de messages (vide si tout est sain).
    """
    issues: list[str] = []
    for q in survey_file.questions:
        # Whitelist : wording sociodémo canonique (auditable, cf. canonical.py).
        # Toléré même s'il ressemble au nom de variable, à condition qu'il
        # corresponde EXACTEMENT à la paire (sociodemo_type, texte) déclarée.
        if (
            q.is_sociodemo
            and q.sociodemo_type in CANONICAL_SOCIODEMO
            and q.question_text.strip() == CANONICAL_SOCIODEMO[q.sociodemo_type]
        ):
            continue
        reason = fabrication_reason(q.variable, q.question_text)
        if reason:
            issues.append(f"[{q.variable}] question_text : {reason}")
        if check_labels:
            for opt in q.response_options:
                if not str(opt.label).strip():
                    issues.append(f"[{q.variable}] label vide pour le code {opt.code!r}")
    return issues


def assert_no_fabricated_text(survey_file: SurveyFile, *, check_labels: bool = True) -> None:
    """Lève `FabricatedTextError` si un `question_text`/label semble fabriqué.

    À appeler dans l'orchestrateur après `SurveyFile.model_validate`, avant
    de construire et d'indexer les documents. Garantit qu'aucun wording inventé
    n'atteint l'index Azure AI Search.
    """
    issues = find_issues(survey_file, check_labels=check_labels)
    if issues:
        sid = survey_file.survey.survey_id
        raise FabricatedTextError(
            f"[{sid}] {len(issues)} libellé(s) suspecté(s) de fabrication. "
            "Les question_text et labels DOIVENT provenir du raw "
            "(cf. ingestion/CONVENTIONS.md). Détails :\n  - " + "\n  - ".join(issues)
        )
