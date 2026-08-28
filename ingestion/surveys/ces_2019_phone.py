"""Extraction normalisée — ces_2019_phone (Canadian Election Study 2019 - Phone Survey).

Source : 2019 Canadian Election Study - Phone Survey v1.1.dta (Stata)
         Étude électorale canadienne 2019 - Volet téléphonique,
         Consortium de l'Étude électorale canadienne 2019, ~4 021 répondants.

Encodage : Le fichier Stata .dta est lu via pyreadstat.read_dta.

Usage :
    uv run python ingestion/surveys/ces_2019_phone.py
    → écrit ingestion/normalized/ces_2019_phone.json
"""

from __future__ import annotations

import json
from pathlib import Path

import pyreadstat

from ingestion.canonical import canonical_sociodemo_text
from ingestion.models import SurveyFile
from ingestion.open_text import is_text_column
from ingestion.validate import assert_no_fabricated_text, fabrication_reason

# ---------------------------------------------------------------------------
# Chemins
# ---------------------------------------------------------------------------

_HERE = Path(__file__).parent
REPO_ROOT = _HERE.parent.parent
DATA_DIR = REPO_ROOT / "data" / "ces_2019_phone"
DTA_FILE = DATA_DIR / "2019 Canadian Election Study - Phone Survey v1.1.dta"
OUT_FILE = REPO_ROOT / "ingestion" / "normalized" / "ces_2019_phone.json"

# ---------------------------------------------------------------------------
# Constantes du sondage
# ---------------------------------------------------------------------------

SURVEY_ID = "ces_2019_phone"
SURVEY_NAME = "Canadian Election Study 2019 (Phone Survey)"
YEAR = 2019
POLLSTER = "Canadian Election Study Consortium"
LANGUAGE = "en"
WEIGHT_VAR = "weight_CES"  # poids général CES
RESPONDENT_ID_VAR = "sample_id"  # ID répondant unique

# ---------------------------------------------------------------------------
# Classification des variables socio-démographiques
# ---------------------------------------------------------------------------

SOCIODEMO_VARS: dict[str, str] = {
    "q3": "gender",
    "q2": "age",
    "q61": "education",
    "q69": "income",
    "q4": "region",
    "q67": "language",
    "q68": "occupation",
    "p50": "marital_status",
}

# ---------------------------------------------------------------------------
# Variables EXCLUES (techniques, métadonnées, horodatages, numéros d'appels,
# pondérations, variables de consentement/clôture ou recodages dérivés)
# ---------------------------------------------------------------------------

EXCLUDED_VARS: dict[str, str] = {
    # --- Identifiants, métadonnées, dates, durées et terrain ---
    "sample_id": "identifiant unique du répondant",
    "survey_end_CES": "date et heure de fin du questionnaire CES",
    "survey_end_month_CES": "mois de fin du questionnaire CES",
    "survey_end_day_CES": "jour de fin du questionnaire CES",
    "num_attempts_CES": "nombre de tentatives d'appel CES",
    "interviewer_id_CES": "identifiant de l'interviewer CES",
    "interviewer_gender_CES": "genre de l'interviewer CES",
    "language_CES": "langue de passation du questionnaire CES",
    "phonetype_CES": "type de téléphone utilisé pour le questionnaire CES",
    "survey_end_PES": "date et heure de fin du questionnaire PES",
    "survey_end_month_PES": "mois de fin du questionnaire PES",
    "survey_end_day_PES": "jour de fin du questionnaire PES",
    "num_attempts_PES": "nombre de tentatives d'appel PES",
    "interviewer_id_PES": "identifiant de l'interviewer PES",
    "interviewer_gender_PES": "genre de l'interviewer PES",
    "language_PES": "langue de passation du questionnaire PES",
    "phonetype_PES": "type de téléphone utilisé pour le questionnaire PES",
    "mode_PES": "mode de passation du questionnaire PES",
    "phone_type": "type de téléphone de résidence",
    "weight_CES": "poids de sondage agrégé CES",
    "weight_PES": "poids de sondage agrégé PES",
    "feduid": "identifiant de circonscription fédérale (FEDuid)",
    "fedname": "nom de la circonscription fédérale (FEDname)",
    # --- Introduction, consentement et clôture ---
    "c1": "demande d'information complémentaire (introduction)",
    "c2a": "sujet des questions d'information (introduction)",
    "c3": "consentement et acceptation de participer au sondage (CES)",
    "pc1": "consentement et acceptation de participer au sondage (PES)",
    "r1": "message de clôture et recontactation",
    # --- Variables dérivées, recodées, combinées et regroupements ---
    "age": "variable d'âge calculée (dérivée de q2)",
    "age_range": "tranches d'âge regroupées (dérivées de q2)",
    "q71r": "nombre de personnes dans le ménage regroupé (dérivé de q71)",
    "q70r": "revenu du ménage combiné/recodé (dérivé de q69 et q70)",
    "q14r": "évaluation du Parti libéral regroupée (dérivée de q14)",
    "q15r": "évaluation du Parti conservateur regroupée (dérivée de q15)",
    "q16r": "évaluation du NPD regroupée (dérivée de q16)",
    "q17r": "évaluation du Bloc Québécois regroupée (dérivée de q17)",
    "q18r": "évaluation du Parti vert regroupée (dérivée de q18)",
    "q19r": "évaluation du Parti populaire regroupée (dérivée de q19)",
    "q20r": "évaluation de Justin Trudeau regroupée (dérivée de q20)",
    "q21r": "évaluation d'Andrew Scheer regroupée (dérivée de q21)",
    "q22r": "évaluation de Jagmeet Singh regroupée (dérivée de q22)",
    "q23r": "évaluation d'Yves-François Blanchet regroupée (dérivée de q23)",
    "q24r": "évaluation d'Elizabeth May regroupée (dérivée de q24)",
    "q25r": "évaluation de Maxime Bernier regroupée (dérivée de q25)",
    "vote": "intention / choix de vote combiné (dérivé de q10, q11, q12)",
    "p6r": (
        "positionnement du Parti conservateur recodé numérique (dérivé de p6)"
    ),
    "p7r": "positionnement du Parti libéral recodé numérique (dérivé de p7)",
    "p8r": "positionnement du NPD recodé numérique (dérivé de p8)",
    "p9r": "positionnement du Parti vert recodé numérique (dérivé de p9)",
    "p10r": (
        "positionnement du Bloc Québécois recodé numérique (dérivé de p10)"
    ),
    "p11r": (
        "positionnement du Parti populaire recodé numérique (dérivé de p11)"
    ),
    "p12r": "positionnement d'Andrew Scheer recodé numérique (dérivé de p12)",
    "p13r": "positionnement de Justin Trudeau recodé numérique (dérivé de p13)",
    "p14r": "positionnement de Jagmeet Singh recodé numérique (dérivé de p14)",
    "p15r": "positionnement d'Elizabeth May recodé numérique (dérivé de p15)",
    "p16r": (
        "positionnement d'Yves-François Blanchet recodé numérique (dérivé de"
        " p16)"
    ),
    "p17r": (
        "positionnement de Maxime Bernier recodé numérique (dérivé de p17)"
    ),
    "p36r": (
        "positionnement du Parti libéral recodé numérique (dérivé de p36)"
    ),
    "p37r": (
        "positionnement du Parti conservateur recodé numérique (dérivé de p37)"
    ),
    "p38r": "positionnement du NPD recodé numérique (dérivé de p38)",
    "p39r": (
        "positionnement du Bloc Québécois recodé numérique (dérivé de p39)"
    ),
    "p40r": (
        "positionnement du Parti vert recodé numérique (dérivé de p40)"
    ),
    "p41r": (
        "positionnement du Parti populaire recodé numérique (dérivé de p41)"
    ),
    "p42r": "positionnement de soi-même recodé numérique (dérivé de p42)",
}


def _clean_text(text: str) -> str:
    """Nettoie le texte (espaces, retours à la ligne)."""
    if not text:
        return ""
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    lines = [line.strip() for line in text.split("\n") if line.strip()]
    return " ".join(lines)


def extract() -> dict:
    """Lit le fichier .dta et retourne le dict SurveyFile normalisé.

    Aucun accès réseau, aucun embedding — pure extraction de structure.
    """
    df, meta = pyreadstat.read_dta(str(DTA_FILE))

    var_labels: dict[str, str] = dict(meta.column_names_to_labels or {})
    val_labels: dict[str, dict] = dict(meta.variable_value_labels or {})

    questions = []
    for col in df.columns:
        if col in EXCLUDED_VARS:
            continue

        raw_label = (var_labels.get(col) or "").strip()
        sociodemo_type = SOCIODEMO_VARS.get(col)

        # Sociodémo au libellé raw absent/dégénéré : retomber sur le wording canonique
        if sociodemo_type and (
            not raw_label or fabrication_reason(col, raw_label)
        ):
            question_text = canonical_sociodemo_text(sociodemo_type)
            if question_text is None:
                continue
        else:
            question_text = _clean_text(raw_label)
            if not question_text:
                continue

        # Options de réponse
        raw_opts: dict = val_labels.get(col, {})
        response_options = []

        try:
            sorted_items = sorted(
                raw_opts.items(), key=lambda kv: float(kv[0])
            )
        except (ValueError, TypeError):
            sorted_items = sorted(raw_opts.items(), key=lambda kv: str(kv[0]))

        for code, label in sorted_items:
            if isinstance(code, float) and code == int(code):
                code = int(code)
            response_options.append({"code": code, "label": str(label)})

        # Type de variable
        if is_text_column(df[col]):
            var_type = "open"
        elif any(k in raw_label.lower() for k in ["slider", "scale", "rating"]):
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
            "raw_data_file": DTA_FILE.name,
            "tags": ["electoral", "federal", "canada", "ces", "2019", "phone"],
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

    # Vérification garde-fou anti-fabrication
    assert_no_fabricated_text(validated)

    # Écriture JSON
    OUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    OUT_FILE.write_text(
        json.dumps(validated.model_dump(), ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    n_q = len(validated.questions)
    n_sd = sum(1 for q in validated.questions if q.is_sociodemo)
    n_with_opts = sum(1 for q in validated.questions if q.response_options)
    non_empty_text = sum(
        1 for q in validated.questions if q.question_text.strip()
    )

    print(f"Sondage   : {validated.survey.survey_id}")
    print(f"Répondants: {validated.survey.n_respondents}")
    print(f"Questions : {n_q} total, {n_with_opts} avec options de réponse")
    print(f"Exclues   : {len(EXCLUDED_VARS)}")
    print(f"Socio-démo: {n_sd}")
    print(f"question_text non vides : {non_empty_text}/{n_q}")
    print(f"Fichier JSON : {OUT_FILE}")

    # Aperçu des socio-démos
    print("\nSocio-démo flaggées :")
    for q in validated.questions:
        if q.is_sociodemo:
            print(f"  {q.variable} ({q.sociodemo_type}): {q.question_text!r}")
            if q.response_options:
                print(
                    f"    options: {[o.label for o in q.response_options[:4]]}"
                )
