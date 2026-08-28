"""Extraction normalisée — ces_2019_online (Canadian Election Study 2019 Online Survey).

Source : 2019 Canadian Election Study - Online Survey v1.0.dta (Stata)
         Canadian Election Study 2019 / Étude électorale canadienne 2019,
         37 822 répondants (vagues CPS et PES).

Encodage : Le fichier Stata .dta utilise le codage latin-1 pour les chaînes.
          Le chargement s'effectue via pandas.io.stata.StataReader avec gestion
          de l'encodage pour les StrLs.

Usage :
    uv run python ingestion/surveys/ces_2019_online.py
    → écrit ingestion/normalized/ces_2019_online.json
"""

from __future__ import annotations

import json
from pathlib import Path

import pandas as pd
import pandas.io.stata as stata

from ingestion.canonical import canonical_sociodemo_text
from ingestion.models import SurveyFile
from ingestion.open_text import is_text_column
from ingestion.validate import assert_no_fabricated_text, fabrication_reason

# ---------------------------------------------------------------------------
# Chemins
# ---------------------------------------------------------------------------

_HERE = Path(__file__).parent
REPO_ROOT = _HERE.parent.parent
DATA_DIR = REPO_ROOT / "data" / "ces_2019_online"
DTA_FILE = DATA_DIR / "2019 Canadian Election Study - Online Survey v1.0.dta"
OUT_FILE = REPO_ROOT / "ingestion" / "normalized" / "ces_2019_online.json"

# ---------------------------------------------------------------------------
# Constantes du sondage
# ---------------------------------------------------------------------------

SURVEY_ID = "ces_2019_online"
SURVEY_NAME = "Canadian Election Study 2019 (Online Survey)"
YEAR = 2019
POLLSTER = "Canadian Election Study Consortium"
LANGUAGE = "en"
WEIGHT_VAR = "cps19_weight_general_all"
RESPONDENT_ID_VAR = "cps19_ResponseId"

# ---------------------------------------------------------------------------
# Classification des variables socio-démographiques
# ---------------------------------------------------------------------------

SOCIODEMO_VARS: dict[str, str] = {
    "cps19_gender": "gender",
    "cps19_yob": "age",
    "cps19_yob_2001_age": "age",
    "cps19_education": "education",
    "cps19_income_cat": "income",
    "cps19_income_number": "income",
    "cps19_province": "region",
    "pes19_province": "region",
    "cps19_employment": "occupation",
    "pes19_occ_cat": "occupation",
    "pes19_employment": "occupation",
    "cps19_marital": "marital_status",
    "pes19_lang": "language",
}

# ---------------------------------------------------------------------------
# Variables EXCLUES (techniques, métadonnées, horodatages, flags Qualtrics,
# pondérations, variables de contrôle ou recodages dérivés)
# ---------------------------------------------------------------------------

EXCLUDED_VARS: dict[str, str] = {
    # --- Dates, identifiants, consentement ---
    "cps19_StartDate": "date de début du questionnaire (CPS)",
    "cps19_EndDate": "date de fin du questionnaire (CPS)",
    "cps19_ResponseId": "identifiant unique de réponse Qualtrics (CPS)",
    "cps19_consent": "formulaire d'information et de consentement (CPS)",
    "pes19_StartDate": "date de début du questionnaire (PES)",
    "pes19_EndDate": "date de fin du questionnaire (PES)",
    "pes19_ResponseId": "identifiant unique de réponse Qualtrics (PES)",
    "pes19_consent": "formulaire d'information et de consentement (PES)",
    # --- Durées, langues d'interface, dates système ---
    "cps19_current_date": "date courante du système (CPS)",
    "cps19_current_date_string": "chaîne de date courante du système (CPS)",
    "cps19_Q_Language": "langue d'interface Qualtrics (CPS)",
    "cps19_Q_TotalDuration": "durée totale du questionnaire Qualtrics (CPS)",
    "pes19_current_date": "date courante du système (PES)",
    "pes19_current_date_string": "chaîne de date courante du système (PES)",
    "pes19_Q_Language": "langue d'interface Qualtrics (PES)",
    "pes19_Q_TotalDuration": "durée totale du questionnaire Qualtrics (PES)",
    # --- Qualité des données, flags, contrôle, géographie ---
    "cps19_data_quality": "indicateur global de qualité des données (CPS)",
    "cps19_panel": "indicateur de panel (CPS)",
    "cps19_age": "âge dérivé de l'année de naissance (CPS)",
    "cps19_duplicates_flag": (
        "indicateur de réponse multiple / doublon (CPS)"
    ),
    "cps19_inattentive": (
        "indicateur de répondant inattentif / durée > 60 min (CPS)"
    ),
    "constituencynumber": "numéro de circonscription fédérale",
    "constituencyname": "nom de la circonscription fédérale",
    "pes19_data_quality": "indicateur global de qualité des données (PES)",
    "pes19_panel": "indicateur de panel (PES)",
    "pes19_age": "âge dérivé de l'année de naissance (PES)",
    "pes19_duplicates_flag": (
        "indicateur de réponse multiple / doublon (PES)"
    ),
    "pes19_inattentive": (
        "indicateur de répondant inattentif / durée > 60 min (PES)"
    ),
    # --- Pondérations ---
    "cps19_weight_general_all": (
        "poids de sondage population générale, tous répondants (CPS)"
    ),
    "cps19_weight_general_restricted": (
        "poids de sondage population générale, échantillon restreint (CPS)"
    ),
    "pes19_weight_general_all": (
        "poids de sondage population générale, tous répondants (PES)"
    ),
    "pes19_weight_general_restricted": (
        "poids de sondage population générale, échantillon restreint (PES)"
    ),
    # --- Variables de canal / piping / split Qualtrics (substitutions et blocs dynamiques) ---
    "get_news": (
        "variable technique de substitution de texte / piping Qualtrics"
    ),
    "get_more_naming": (
        "variable technique de substitution de texte / piping Qualtrics"
    ),
    "get_not_vote_for": (
        "variable technique de substitution de texte / piping Qualtrics"
    ),
    "get_party_issue_handling": (
        "variable technique de substitution de texte / piping Qualtrics"
    ),
    "get_imp_loc_iss": (
        "variable technique de substitution de texte / piping Qualtrics"
    ),
    "get_outcome": (
        "variable technique de substitution de texte / piping Qualtrics"
    ),
    "justice_law": (
        "variable technique de substitution de texte / piping Qualtrics (justice EN)"
    ),
    "justice_law_fr": (
        "variable technique de substitution de texte / piping Qualtrics (justice FR)"
    ),
    "lr_scale_order": (
        "variable technique d'ordre d'affichage de l'échelle gauche-droite"
    ),
    "ethnicity_intro": (
        "variable technique de substitution de texte d'introduction aux ethnies (EN)"
    ),
    "ethnicity_intro_fr": (
        "variable technique de substitution de texte d'introduction aux ethnies (FR)"
    ),
    "premier": "nom du premier ministre provincial (variable de contexte)",
    "province_fr": "nom de province en français (variable de contexte)",
    "pid_en": (
        "variable technique de substitution de texte (identification partisane EN)"
    ),
    "pid_party_en": (
        "variable technique de substitution de texte (nom de parti EN)"
    ),
    "pid_party_fr": (
        "variable technique de substitution de texte (nom de parti FR)"
    ),
    "notvote_split": (
        "flag d'échantillon expérimental (raison de ne pas voter)"
    ),
    "splitsample": "flag de sous-échantillon expérimental (PES)",
    "confidence_institutions_word": (
        "variable de substitution de texte (confiance institutions EN)"
    ),
    "confidence_institutions_word_fr": (
        "variable de substitution de texte (confiance institutions FR)"
    ),
    "govt_programs_word": (
        "variable de substitution de texte (programmes gouvernementaux EN)"
    ),
    "govt_programs_word_fr": (
        "variable de substitution de texte (programmes gouvernementaux FR)"
    ),
    "split_taxes": "flag d'échantillon expérimental (taxes)",
    "split_senate": "flag d'échantillon expérimental (Sénat)",
    "split_trade": "flag d'échantillon expérimental (commerce)",
    "split_lifesat": (
        "flag d'échantillon expérimental (satisfaction de vie)"
    ),
    "split_responsibility": (
        "flag d'échantillon expérimental (responsabilité)"
    ),
    "split_sexism": "flag d'échantillon expérimental (sexisme)",
    "split_abortion": "flag d'échantillon expérimental (avortement)",
    "split_getahead": (
        "flag d'échantillon expérimental (réussite personnelle)"
    ),
    "split_att_div": "flag d'échantillon expérimental (attention / diversité)",
    "split_govt_eff": "flag d'échantillon expérimental (efficacité gouv.)",
    "split_medical": "flag d'échantillon expérimental (soins médicaux)",
    "split_ties": "flag d'échantillon expérimental (relations internationales)",
    "split_health_followups": (
        "flag d'échantillon expérimental (suivis santé)"
    ),
    "split_gender_id": (
        "flag d'échantillon expérimental (identité de genre)"
    ),
    "split_big5": "flag d'échantillon expérimental (Big 5 personnalité)",
    "split_hatespeech": (
        "flag d'échantillon expérimental (discours haineux)"
    ),
    "split_vol_assoc": (
        "flag d'échantillon expérimental (engagement associatif)"
    ),
}


def _clean_text(text: str) -> str:
    """Nettoie le texte (espaces, retours à la ligne)."""
    if not text:
        return ""
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    lines = [line.strip() for line in text.split("\n") if line.strip()]
    return " ".join(lines)


def _load_stata_data() -> tuple[pd.DataFrame, dict[str, str], dict[str, dict]]:
    """Charge le fichier Stata .dta avec prise en charge de l'encodage latin-1 pour les StrLs."""
    orig_read_strls = stata.StataReader._read_strls

    def custom_read_strls(self: stata.StataReader) -> None:
        self._encoding = "latin1"
        return orig_read_strls(self)

    stata.StataReader._read_strls = custom_read_strls
    try:
        reader = pd.read_stata(
            str(DTA_FILE), iterator=True, convert_categoricals=False
        )
        var_labels: dict[str, str] = reader.variable_labels()
        val_labels: dict[str, dict] = reader.value_labels()
        df: pd.DataFrame = reader.read()
    finally:
        stata.StataReader._read_strls = orig_read_strls

    return df, var_labels, val_labels


def extract() -> dict:
    """Lit le fichier .dta et retourne le dict SurveyFile normalisé.

    Aucun accès réseau, aucun embedding — pure extraction de structure.
    """
    df, var_labels, val_labels = _load_stata_data()

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
        if raw_opts:
            for code, label in sorted(
                raw_opts.items(),
                key=lambda kv: (
                    float(kv[0])
                    if isinstance(kv[0], (int, float))
                    else str(kv[0])
                ),
            ):
                if isinstance(code, float) and code == int(code):
                    code = int(code)
                response_options.append({"code": code, "label": str(label)})

        # Type de variable
        if is_text_column(df[col]):
            var_type = "open"
        elif any(k in raw_label.lower() for k in ["slider", "scale", "rating"]):
            var_type = "scale"
        elif response_options:
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
            "tags": ["electoral", "federal", "canada", "ces", "2019"],
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
