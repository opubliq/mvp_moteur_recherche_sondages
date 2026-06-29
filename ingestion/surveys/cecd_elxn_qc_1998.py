"""Extraction normalisée — cecd_elxn_qc_1998.

Source : Total_panel_election_QC1998.sav (SPSS)
         Panel électoral provincial Québec 1998, firmes Createc et CROP.

Encodage : le fichier SAV est lu avec l'encodage par défaut de pyreadstat
(latin-1/cp1252 inféré par SPSS) ; les accents sont correctement restitués
sans option supplémentaire.

Usage :
    uv run python ingestion/surveys/cecd_elxn_qc_1998.py
    → écrit ingestion/normalized/cecd_elxn_qc_1998.json
"""

from __future__ import annotations

import json
from pathlib import Path

import pyreadstat

from ingestion.models import SurveyFile

# ---------------------------------------------------------------------------
# Chemins
# ---------------------------------------------------------------------------

_HERE = Path(__file__).parent
REPO_ROOT = _HERE.parent.parent
DATA_DIR = REPO_ROOT / "data" / "cecd_elxn_qc_1998"
SAV_FILE = DATA_DIR / "Total_panel_election_QC1998.sav"
OUT_FILE = REPO_ROOT / "ingestion" / "normalized" / "cecd_elxn_qc_1998.json"

# ---------------------------------------------------------------------------
# Constantes du sondage
# ---------------------------------------------------------------------------

SURVEY_ID = "cecd_elxn_qc_1998"
SURVEY_NAME = "Panel électoral du Québec 1998 (CECD)"
YEAR = 1998
POLLSTER = "Createc / CROP"
LANGUAGE = "fr"

# ---------------------------------------------------------------------------
# Classification des variables socio-démographiques
# ---------------------------------------------------------------------------

# Les quatre variables socio-démo identifiées dans ce panel :
#   sexe_post → genre
#   age       → groupe d'âge
#   scol      → scolarité (éducation)
#   occup     → occupation (emploi)
SOCIODEMO_VARS: dict[str, str] = {
    "sexe_post": "gender",
    "age": "age",
    "scol": "education",
    "occup": "occupation",
}


# ---------------------------------------------------------------------------
# Fonction principale
# ---------------------------------------------------------------------------


def extract() -> dict:
    """Lit le fichier SAV et retourne le dict SurveyFile normalisé.

    Aucun accès réseau, aucun embedding — pure extraction de structure.
    """
    # L'encodage par défaut de pyreadstat (latin-1 inféré depuis SPSS) produit
    # des accents corrects pour ce fichier de 1998.
    df, meta = pyreadstat.read_sav(str(SAV_FILE))

    var_labels: dict[str, str] = dict(meta.column_names_to_labels or {})
    val_labels: dict[str, dict] = dict(meta.variable_value_labels or {})

    questions = []
    for col in df.columns:
        question_text = (var_labels.get(col) or "").strip() or col

        # Construire les options de réponse depuis les value labels SAV
        raw_opts: dict = val_labels.get(col, {})
        response_options = []
        for code, label in sorted(raw_opts.items(), key=lambda kv: float(kv[0])):
            # Convertir les codes float entiers (1.0, 2.0 …) en int
            if isinstance(code, float) and code == int(code):
                code = int(code)
            response_options.append({"code": code, "label": str(label)})

        # Inférer le type de variable
        dtype_str = str(df[col].dtype)
        if dtype_str == "object":
            var_type = "open"  # chaîne de caractères (mention1, mention2)
        elif raw_opts:
            var_type = "single"  # numérique avec étiquettes → choix unique
        else:
            var_type = "continuous"  # poids, numéro de questionnaire, compteurs…

        is_sociodemo = col in SOCIODEMO_VARS
        sociodemo_type = SOCIODEMO_VARS.get(col)

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
            "tags": ["electoral", "provincial", "québec", "panel", "1998"],
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

    # Vérification des accents (spot-check)
    print("\nSpot-check accents (premières réponses avec accents attendus) :")
    for q in validated.questions:
        for o in q.response_options:
            if any(c in o.label for c in "éèêàùîôûç"):
                print(f"  {q.variable} → {o.label!r}")
                break
