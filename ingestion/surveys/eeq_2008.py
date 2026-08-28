"""Extraction normalisée — eeq_2008.

Source : Quebec Election Study 2008 (SPSS).sav
         Étude électorale québécoise (EEQ) 2008, portant sur l'élection
         provinciale québécoise du 8 décembre 2008 (chefs : Jean Charest — PLQ,
         Pauline Marois — PQ, Mario Dumont — ADQ, Françoise David — QS,
         Guy Rainville — PV), 1151 répondants.
         Codebooks complémentaires disponibles :
         « Quebec Election Study 2008 FR.md » et « Quebec Election study 2008 ENG.md ».

Encodage : fichier SAV lu avec `apply_value_formats=False` — les variable labels
et value labels sont entièrement issus du SAV — aucun texte inventé.

Usage :
    uv run python ingestion/surveys/eeq_2008.py
    → écrit ingestion/normalized/eeq_2008.json
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
DATA_DIR = REPO_ROOT / "data" / "eeq_2008"
SAV_FILE = DATA_DIR / "Quebec Election Study 2008 (SPSS).sav"
WEIGHT_VAR = "pond"  # poids fourni par la maison de sondage → weight_source='provided'
RESPONDENT_ID_VAR = "seq"  # numéro de séquence RAW = identité de ligne
OUT_FILE = REPO_ROOT / "ingestion" / "normalized" / "eeq_2008.json"

# ---------------------------------------------------------------------------
# Constantes du sondage
# ---------------------------------------------------------------------------

SURVEY_ID = "eeq_2008"
SURVEY_NAME = "Étude électorale québécoise 2008 (EEQ)"
YEAR = 2008
POLLSTER = "EEQ (Étude électorale québécoise)"
LANGUAGE = "fr"

# ---------------------------------------------------------------------------
# Variables EXCLUES (techniques / administratives / dérivées)
# ---------------------------------------------------------------------------

# seq   : identifiant unique / numéro de séquence du répondant (technique)
# regio : recodage dérivé en 3 groupes (MTL RMR, QC RMR, Autres) — regroupement de reg (5 régions)
# pond  : pondération statistique (sans taux de participation)
# pondx : pondération statistique (avec taux de participation)
EXCLUDED_VARS: dict[str, str] = {
    "seq": "identifiant unique de questionnaire / numéro de séquence (technique)",
    "regio": (
        "variable dérivée/recodée en 3 groupes (MTL RMR, QC RMR, Autres) —"
        " regroupement de reg (5 régions)"
    ),
    "pond": "pondération statistique (sans taux de participation)",
    "pondx": "pondération statistique (avec taux de participation)",
}

# ---------------------------------------------------------------------------
# Variables socio-démographiques
# ---------------------------------------------------------------------------

SOCIODEMO_VARS: dict[str, str] = {
    "q0age": "age",
    "reg": "region",
    "q75": "age",
    "q76": "gender",
    "q77": "education",
    "q78": "income",
    "q79": "occupation",
    "q80": "language_home",
    "q81": "religion_practice",
    "ethn1": "ethnicity",
    "langu": "language",
}

# ---------------------------------------------------------------------------
# Variables « scale » (échelles numériques d'intérêt/intensité/thermomètre)
# ---------------------------------------------------------------------------

SCALE_VARS: set[str] = {
    "q14",  # Échelle d'intérêt pour l'élection (0 à 10)
    "q39",  # Thermomètre 0-100 Jean Charest
    "q40",  # Thermomètre 0-100 Pauline Marois
    "q41",  # Thermomètre 0-100 Mario Dumont
    "q42",  # Thermomètre 0-100 Françoise David
    "q43",  # Thermomètre 0-100 Guy Rainville
    "q64",  # Thermomètre 0-100 syndicats
    "q65",  # Thermomètre 0-100 entreprises
}

# ---------------------------------------------------------------------------
# Variables « continuous » forcées
# ---------------------------------------------------------------------------

CONTINUOUS_VARS: set[str] = {"q75"}  # Année de naissance (ex. 1972)


# ---------------------------------------------------------------------------
# Fonction principale
# ---------------------------------------------------------------------------


def extract() -> dict:
    """Lit le fichier SAV et retourne le dict SurveyFile normalisé.

    Tous les question_text proviennent des variable labels SAV réels.
    Tous les response_options proviennent des value labels SAV réels.
    Aucun accès réseau, aucun embedding — pure extraction de structure.
    """
    df, meta = pyreadstat.read_sav(str(SAV_FILE), apply_value_formats=False)

    var_labels: dict[str, str] = dict(meta.column_names_to_labels or {})
    val_labels: dict[str, dict] = dict(meta.variable_value_labels or {})

    questions = []
    for col in df.columns:
        if col in EXCLUDED_VARS:
            continue

        raw_label = (var_labels.get(col) or "").strip()
        sociodemo_type = SOCIODEMO_VARS.get(col)

        # Sociodémo au libellé raw absent/dégénéré (ex: reg = "REG.") : fallback canonique.
        if sociodemo_type and (not raw_label or fabrication_reason(col, raw_label)):
            question_text = canonical_sociodemo_text(sociodemo_type)
            if question_text is None:
                continue  # sociodemo_type sans wording canonique → exclu
        else:
            # Pas de fallback `or col` (interdit par CONVENTIONS.md) : on
            # exclut plutôt que de fabriquer un question_text.
            question_text = raw_label
            if not question_text:
                continue

        # Construire les options de réponse depuis les value labels SAV
        raw_opts: dict = val_labels.get(col, {})
        response_options = []
        for code, label in sorted(
            raw_opts.items(),
            key=lambda kv: float(kv[0]) if isinstance(kv[0], (int, float)) else str(kv[0]),
        ):
            # Convertir les codes float entiers (1.0, 2.0…) en int
            if isinstance(code, float) and code == int(code):
                code = int(code)
            response_options.append({"code": code, "label": str(label).strip()})

        # Inférer le type de variable.
        if col in SCALE_VARS:
            var_type = "scale"
        elif col in CONTINUOUS_VARS:
            var_type = "continuous"
        elif raw_opts:
            var_type = "single"
        elif is_text_column(df[col]):
            var_type = "open"
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
            "tags": ["electoral", "provincial", "québec", "2008", "eeq"],
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
    n_empty_text = sum(1 for q in validated.questions if not q.question_text.strip())

    print(f"Sondage   : {validated.survey.survey_id}")
    print(f"Répondants: {validated.survey.n_respondents}")
    print(f"Questions : {n_q} total, {n_with_opts} avec options de réponse")
    print(f"Socio-démo: {n_sd}")
    print(f"question_text vides : {n_empty_text}/{n_q}")
    print(f"Fichier JSON : {OUT_FILE}")

    # Aperçu des socio-démos
    print("\nSocio-démo flaggées :")
    for q in validated.questions:
        if q.is_sociodemo:
            print(f"  {q.variable} ({q.sociodemo_type}): {q.question_text[:80]!r}")
            if q.response_options:
                print(f"    options: {[o.label for o in q.response_options[:4]]}")

    # Variables EXCLUES
    print(f"\nVariables exclues ({len(EXCLUDED_VARS)}) :")
    for v, reason in sorted(EXCLUDED_VARS.items()):
        print(f"  {v}: {reason}")
