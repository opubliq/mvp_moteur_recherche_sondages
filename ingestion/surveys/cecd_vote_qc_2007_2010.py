"""Extraction normalisée — cecd_vote_qc_2007_2010.

Source : intvotetotal_juin2007_jan2010.sav (SPSS)
         Sondages CROP sur l'intention de vote au Québec (juin 2007 - janvier 2010),
         firme CROP. 24 027 répondants, 24 vagues mensuelles d'environ 1000
         répondants administrées par téléphone.
         Cf. « LivredeCodes_SondagesCROP_2007-2010.pdf ».

Encodage : le fichier SAV est lu avec l'encodage par défaut de pyreadstat
(latin-1/cp1252 inféré par SPSS) ; les accents sont correctement restitués.
Un octet non-imprimable U+0090 présent dans l'étiquette de choix 'RESTE DU QUÉBEC'
de REG est nettoyé.

Usage :
    uv run python ingestion/surveys/cecd_vote_qc_2007_2010.py
    → écrit ingestion/normalized/cecd_vote_qc_2007_2010.json
"""

from __future__ import annotations

import json
from pathlib import Path

import pyreadstat

from ingestion.canonical import canonical_sociodemo_text
from ingestion.models import SurveyFile
from ingestion.open_text import is_text_column
from ingestion.validate import fabrication_reason

# ---------------------------------------------------------------------------
# Chemins
# ---------------------------------------------------------------------------

_HERE = Path(__file__).parent
REPO_ROOT = _HERE.parent.parent
DATA_DIR = REPO_ROOT / "data" / "cecd_vote_qc_2007_2010"
SAV_FILE = DATA_DIR / "intvotetotal_juin2007_jan2010.sav"
WEIGHT_VAR = "XPOND"  # pondération statistique
OUT_FILE = REPO_ROOT / "ingestion" / "normalized" / "cecd_vote_qc_2007_2010.json"

# ---------------------------------------------------------------------------
# Constantes du sondage
# ---------------------------------------------------------------------------

SURVEY_ID = "cecd_vote_qc_2007_2010"
SURVEY_NAME = "Sondages CROP-CECD sur l'intention de vote au Québec (juin 2007 - janvier 2010)"
YEAR = 2007
POLLSTER = "CROP"
LANGUAGE = "fr"

# ---------------------------------------------------------------------------
# Variables « rating scale » (échelles numériques)
# ---------------------------------------------------------------------------
SCALE_VARS: set[str] = set()

# ---------------------------------------------------------------------------
# Variables EXCLUES (techniques, pondérations, ou dérivées/recodées)
# ---------------------------------------------------------------------------
EXCLUDED_VARS: dict[str, str] = {
    # --- Administration / identifiants ---
    "QUEST": "identifiant répondant (technique)",
    "projet": (
        "métadonnée d'administration terrain (code de vague / mois de collecte "
        "de 1=juin 2007 à 24=janvier 2010, pas une question)"
    ),
    # --- Pondérations statistiques ---
    "XPOND": "pondération statistique",
    # --- Combinaisons / recodages dérivés d'une question substantielle ---
    "intvoteprov": (
        "combinaison synthétique dérivée de intvoteprova (question principale) "
        "et intvoteprovb (relance / leaner)"
    ),
    "intvoteref": (
        "combinaison synthétique dérivée de intvoterefa (question principale) "
        "et intvoterefb (relance / leaner)"
    ),
    "voteprec": "recodage dérivé de QP4 (filtré sur les votants aux dernières élections)",
}

# ---------------------------------------------------------------------------
# Classification des variables socio-démographiques
# ---------------------------------------------------------------------------
SOCIODEMO_VARS: dict[str, str] = {
    "REG": "region",
    "SEXE": "gender",
    "Occup": "occupation",
    "scol": "education",
    "revenu": "income",
    "QAGE": "age",
    "lmat": "language",
}


def _clean_text(s: str) -> str:
    """Nettoie les caractères non-imprimables et espaces superflus."""
    s = s.replace("\x90", "É")
    return s.strip()


# ---------------------------------------------------------------------------
# Fonction principale
# ---------------------------------------------------------------------------


def extract() -> dict:
    """Lit le fichier SAV et retourne le dict SurveyFile normalisé.

    Aucun accès réseau, aucun embedding — pure extraction de structure.
    """
    df, meta = pyreadstat.read_sav(str(SAV_FILE))

    var_labels: dict[str, str] = dict(meta.column_names_to_labels or {})
    val_labels: dict[str, dict] = dict(meta.variable_value_labels or {})

    questions = []
    for col in df.columns:
        if col in EXCLUDED_VARS:
            continue

        raw_label = _clean_text(var_labels.get(col) or "")
        sociodemo_type = SOCIODEMO_VARS.get(col)

        if sociodemo_type and (not raw_label or fabrication_reason(col, raw_label)):
            question_text = canonical_sociodemo_text(sociodemo_type)
            if question_text is None:
                continue  # sociodemo_type sans wording canonique → exclu
        else:
            question_text = raw_label
            if not question_text:
                continue

        # Construire les options de réponse depuis les value labels SAV
        raw_opts: dict = val_labels.get(col, {})
        response_options = []
        for code, label in sorted(raw_opts.items(), key=lambda kv: float(kv[0])):
            if isinstance(code, float) and code == int(code):
                code = int(code)
            clean_label = _clean_text(str(label))
            response_options.append({"code": code, "label": clean_label})

        # Inférer le type de variable
        if is_text_column(df[col]):
            var_type = "open"
        elif col in SCALE_VARS:
            var_type = "scale"
        elif raw_opts:
            var_type = "single"
        else:
            var_type = "continuous"

        is_sociodemo = sociodemo_type is not None

        questions.append(
            {
                "variable": col,
                "question_text": question_text,
                "response_options": response_options,
                "var_type": var_type,
                "is_sociodemo": is_sociodemo,
                "sociodemo_type": sociodemo_type,
                "concepts": [],
                "themes": [],
            }
        )

    result: dict = {
        "survey": {
            "survey_id": SURVEY_ID,
            "survey_name": SURVEY_NAME,
            "year": YEAR,
            "pollster": POLLSTER,
            "language": LANGUAGE,
            "n_respondents": len(df),
            "raw_data_file": SAV_FILE.name,
            "tags": [
                "electoral",
                "provincial",
                "québec",
                "intention_de_vote",
                "référendum",
                "crop",
                "2007-2010",
            ],
        },
        "questions": questions,
    }
    return result


# ---------------------------------------------------------------------------
# Point d'entrée CLI
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    data = extract()

    # Validation Pydantic
    validated = SurveyFile.model_validate(data)

    # Écriture JSON
    OUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    OUT_FILE.write_text(
        json.dumps(validated.model_dump(), ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    n_q = len(validated.questions)
    n_sd = sum(1 for q in validated.questions if q.is_sociodemo)
    n_with_opts = sum(1 for q in validated.questions if q.response_options)
    non_empty_text = sum(1 for q in validated.questions if q.question_text.strip())

    print(f"Sondage   : {validated.survey.survey_id}")
    print(f"Répondants: {validated.survey.n_respondents}")
    print(f"Questions : {n_q} total, {n_with_opts} avec options de réponse")
    print(f"Socio-démo: {n_sd}")
    print(f"question_text non vides : {non_empty_text}/{n_q}")
    print(f"Fichier JSON : {OUT_FILE}")

    # Aperçu des socio-démos
    print("\nSocio-démo flaggées :")
    for q in validated.questions:
        if q.is_sociodemo:
            print(f"  {q.variable} ({q.sociodemo_type}): {q.question_text!r}")
            if q.response_options:
                print(f"    options: {[o.label for o in q.response_options[:4]]}")

    # Vérification des accents
    print("\nSpot-check accents :")
    for q in validated.questions:
        for o in q.response_options:
            if any(c in o.label for c in "éèêàùîôûç"):
                print(f"  {q.variable} → {o.label!r}")
                break
