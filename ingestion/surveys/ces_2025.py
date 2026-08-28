"""Extraction normalisée — ces_2025 (Canadian Election Study 2025).

Source : 2025 Canadian Election Study v1.dta (Stata)
         Étude électorale canadienne 2025 (CES / ÉÉC 2025), Stephen Stephenson,
         Allison Harell, Daniel Rubenson et al.
         Vagues de campagne (CPS) et post-électorale (PES), ~20 180 répondants.
         Codebook : 2025 Canadian Election Study Technical Report and Codebook v1.pdf.

Encodage : Le fichier Stata .dta est lu via pyreadstat.read_dta.

Usage :
    uv run python ingestion/surveys/ces_2025.py
    → écrit ingestion/normalized/ces_2025.json
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
DATA_DIR = REPO_ROOT / "data" / "ces_2025"
DTA_FILE = DATA_DIR / "2025 Canadian Election Study v1.dta"
OUT_FILE = REPO_ROOT / "ingestion" / "normalized" / "ces_2025.json"

# ---------------------------------------------------------------------------
# Constantes du sondage
# ---------------------------------------------------------------------------

SURVEY_ID = "ces_2025"
SURVEY_NAME = "Étude électorale canadienne 2025 / Canadian Election Study 2025"
YEAR = 2025
POLLSTER = "Stephenson, Harell, Rubenson / CES"
LANGUAGE = "en"
WEIGHT_VAR = "cps25_weight_general_all"  # poids général 2025 → weight_source='provided'
RESPONDENT_ID_VAR = None  # IDs de chaîne (cps25_ResponseId) → index de ligne pour ID unique

# ---------------------------------------------------------------------------
# Classification des variables socio-démographiques
# ---------------------------------------------------------------------------

SOCIODEMO_VARS: dict[str, str] = {
    "cps25_genderid": "gender",
    "cps25_age_in_years": "age",
    "cps25_yob": "age",
    "cps25_education": "education",
    "cps25_income": "income",
    "cps25_province": "region",
    "pes25_province": "region",
    "cps25_employment": "occupation",
    "cps25_marital": "marital_status",
    "pes25_lang": "language",
}

# ---------------------------------------------------------------------------
# Variables EXCLUES (techniques, métadonnées, horodatages, flags Qualtrics,
# pondérations, variables de contrôle ou recodages dérivés)
# ---------------------------------------------------------------------------

EXCLUDED_VARS: dict[str, str] = {
    # --- Dates, durées, identifiants et métadonnées d'administration ---
    "cps25_StartDate": "date de début du questionnaire (CPS)",
    "cps25_StartDate_DMY": "date de début JJ/MM/AAAA (CPS)",
    "cps25_EndDate": "date de fin du questionnaire (CPS)",
    "cps25_Duration__in_seconds_": "durée de passation en secondes (CPS)",
    "cps25_time": "durée de passation en minutes (CPS)",
    "cps25_RecordedDate": "date d'enregistrement de la réponse (CPS)",
    "cps25_ResponseId": "identifiant unique de réponse Qualtrics (CPS)",
    "cps25_UserLanguage": "langue d'affichage de l'interface Qualtrics (CPS)",
    "cps25_consent": "formulaire d'information et de consentement (CPS)",
    "pes25_StartDate": "date de début du questionnaire (PES)",
    "pes25_StartDate_DMY": "date de début JJ/MM/AAAA (PES)",
    "pes25_EndDate": "date de fin du questionnaire (PES)",
    "pes25_Duration__in_seconds_": "durée de passation en secondes (PES)",
    "pes25_time": "durée de passation en minutes (PES)",
    "pes25_RecordedDate": "date d'enregistrement de la réponse (PES)",
    "pes25_ResponseId": "identifiant unique de réponse Qualtrics (PES)",
    "pes25_UserLanguage": "langue d'affichage de l'interface Qualtrics (PES)",
    "pes25_consent": "formulaire d'information et de consentement (PES)",
    # --- Qualité des données et contrôles d'attention ---
    "cps25_duplicates_pid_flag": "indicateur de doublon d'identifiant panneau (CPS)",
    "cps25_duplicate_ip_demo_flag": (
        "indicateur de doublon IP et socio-démographique (CPS)"
    ),
    "cps25_straightliner_flag": (
        "indicateur de profil de réponse uniforme / straightlining (CPS)"
    ),
    "cps25_attention_check": "indicateur de contrôle d'attention (CPS)",
    "cps25_inattentive": "indicateur de répondant inattentif (CPS)",
    "cps25_data_quality": "indicateur global de qualité des données (CPS)",
    "cps25_age_flag_1": (
        "indicateur de divergence âge/année de naissance à +/- 1 an (CPS)"
    ),
    "cps25_age_flag_2": (
        "indicateur de divergence âge/année de naissance à +/- 2 ans (CPS)"
    ),
    "pes25_duplicates_pid_flag": "indicateur de doublon d'identifiant panneau (PES)",
    "pes25_speeder_low_quality": (
        "indicateur de réponse trop rapide / basse qualité (PES)"
    ),
    "pes25_data_quality": "indicateur global de qualité des données (PES)",
    "pes25_inattentive": (
        "indicateur de répondant inattentif (PES, recode de la durée)"
    ),
    "pccf_problem": "indicateur de problème d'appariement géographique PCCF",
    "pes25_lowturnout": (
        "indicateur / suréchantillon faible participation électorale (PES)"
    ),
    # --- Pondérations statistiques ---
    "cps25_weight_general_all": (
        "poids de sondage population générale, tous répondants (CPS)"
    ),
    "cps25_weight_general_restricted": (
        "poids de sondage population générale, échantillon restreint (CPS)"
    ),
    "pes25_weight_general_all": (
        "poids de sondage population générale, tous répondants (PES)"
    ),
    "pes25_weight_general_restricted": (
        "poids de sondage population générale, échantillon restreint (PES)"
    ),
    # --- Blocs Qualtrics et répartition expérimentale ---
    "block_1": "indicateur de bloc de questions Qualtrics (block_1)",
    "block_1_one": "indicateur de sous-bloc Qualtrics (block_1_one)",
    "block_1_two": "indicateur de sous-bloc Qualtrics (block_1_two)",
    "block_2": "indicateur de bloc de questions Qualtrics (block_2)",
    "block_2_one": "indicateur de sous-bloc Qualtrics (block_2_one)",
    "block_3": "indicateur de bloc de questions Qualtrics (block_3)",
    "pes_block": "indicateur de bloc de questions Qualtrics (pes_block)",
    "fed_gov_sat_split": (
        "flag de sous-échantillon expérimental (satisfaction gouv. fédéral)"
    ),
    "reason_not_vote_for_split": (
        "flag de sous-échantillon expérimental (raison de ne pas voter)"
    ),
    "govt_programs_word": (
        "variable de substitution de texte expérimental (programmes gouv. EN)"
    ),
    "govt_programs_word_fr": (
        "variable de substitution de texte expérimental (programmes gouv. FR)"
    ),
    "immigincrease_exp": "flag d'expérience textuelle (immigration)",
    "immigincrease_exp_text": (
        "variable de substitution de texte expérimental (immigration EN)"
    ),
    "immigincrease_exp_text_fr": (
        "variable de substitution de texte expérimental (immigration FR)"
    ),
    "tariffs_exp": "flag d'expérience textuelle (tarifs douaniers)",
    "tariffs_exp_text_en": (
        "variable de substitution de texte expérimental (tarifs EN)"
    ),
    "tariffs_exp_text_fr": (
        "variable de substitution de texte expérimental (tarifs FR)"
    ),
    "lr_prov_loc_ec": (
        "variable de substitution de texte expérimental (axe gauche-droite EN)"
    ),
    "lr_prov_loc_ec_fr": (
        "variable de substitution de texte expérimental (axe gauche-droite FR)"
    ),
    "justice_law_fr": (
        "variable de substitution de texte expérimental (justice/loi FR)"
    ),
    "justice_law": (
        "variable de substitution de texte expérimental (justice/loi EN)"
    ),
    "religion_EN": (
        "variable de substitution de texte (dénomination religieuse EN)"
    ),
    "religion_FR": (
        "variable de substitution de texte (dénomination religieuse FR)"
    ),
    "pid_en_cps": (
        "variable de substitution de texte (identification partisane CPS EN)"
    ),
    "pid_party_fr_cps": (
        "variable de substitution de texte (identification partisane CPS FR)"
    ),
    "pid_party_en_cps": (
        "variable de substitution de texte (identification partisane CPS EN)"
    ),
    "pid_en_pes": (
        "variable de substitution de texte (identification partisane PES EN)"
    ),
    "pid_party_fr_pes": (
        "variable de substitution de texte (identification partisane PES FR)"
    ),
    "leader_fr_corrected": (
        "variable de substitution de texte (chef de parti corrigé FR)"
    ),
    "wave": "indicateur de vague d'enquête (1=CPS, 2=PES)",
    "pes24_place_live_text": "texte de géocodage PCCF (lieu de résidence)",
    "pes24_place_live_s2_text": "texte de géocodage PCCF (lieu de résidence s2)",
    "pes24_place_live_s1_text_fr": (
        "texte de géocodage PCCF (lieu de résidence s1 FR)"
    ),
    "pes24_place_live_s2_text_fr": (
        "texte de géocodage PCCF (lieu de résidence s2 FR)"
    ),
    "pes24_place_live_s3_text_fr": (
        "texte de géocodage PCCF (lieu de résidence s3 FR)"
    ),
    "pes24_place_live_s4_text_fr": (
        "texte de géocodage PCCF (lieu de résidence s4 FR)"
    ),
    "pes24_place_live_s5_text_fr": (
        "texte de géocodage PCCF (lieu de résidence s5 FR)"
    ),
    "pes24_place_live_s6_text_fr": (
        "texte de géocodage PCCF (lieu de résidence s6 FR)"
    ),
    "pes24_place_live_s7_text_fr": (
        "texte de géocodage PCCF (lieu de résidence s7 FR)"
    ),
    "pes24_place_live_s8_text_fr": (
        "texte de géocodage PCCF (lieu de résidence s8 FR)"
    ),
    "feduid": "identifiant de circonscription fédérale (FEDuid-2013)",
    "fedname": "nom de circonscription fédérale (FEDname-2013)",
    "premier": "nom du premier ministre provincial (variable de contexte)",
    "Region": "macro-région canadienne dérivée de la province",
    "most_seats": (
        "flag d'expérience de format de question (prédiction sièges)"
    ),
    "duty_choice": "flag d'expérience d'ordre de question (devoir vs choix)",
    "cps25_duty_choice_2_text": (
        "variable de substitution de texte expérimental (devoir/choix EN)"
    ),
    "cps25_duty_choice_2_text_fr": (
        "variable de substitution de texte expérimental (devoir/choix FR)"
    ),
    "occupation_code": "code de profession NOC dérivé de la réponse ouverte",
    "occupation_name": (
        "intitulé de profession NOC dérivé de la réponse ouverte"
    ),
    "occupation_category": (
        "catégorie de profession NOC dérivée de la réponse ouverte"
    ),
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

    # Compléter EXCLUDED_VARS dynamiquement pour les variables Qualtrics
    dynamic_excluded = dict(EXCLUDED_VARS)
    for col in meta.column_names:
        if "_DO_" in col and col not in dynamic_excluded:
            dynamic_excluded[col] = "Qualtrics display order variable (DO)"
        elif (
            any(
                t in col
                for t in [
                    "_t_First_Click",
                    "_t_Last_Click",
                    "_t_Page_Submit",
                    "_t_Click_Count",
                ]
            )
            and col not in dynamic_excluded
        ):
            dynamic_excluded[col] = "Qualtrics question timing metadata"

    questions = []
    for col in df.columns:
        if col in dynamic_excluded:
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
        for code, label in sorted(
            raw_opts.items(), key=lambda kv: float(kv[0])
        ):
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
            "tags": ["electoral", "federal", "canada", "ces", "2025"],
        },
        "questions": questions,
    }
    return result


# Populate EXCLUDED_VARS statically for export / inspection
_cols_temp, _meta_temp = pyreadstat.read_dta(str(DTA_FILE), metadataonly=True)
for _c in _meta_temp.column_names:
    if "_DO_" in _c and _c not in EXCLUDED_VARS:
        EXCLUDED_VARS[_c] = "Qualtrics display order variable (DO)"
    elif (
        any(
            _t in _c
            for _t in [
                "_t_First_Click",
                "_t_Last_Click",
                "_t_Page_Submit",
                "_t_Click_Count",
            ]
        )
        and _c not in EXCLUDED_VARS
    ):
        EXCLUDED_VARS[_c] = "Qualtrics question timing metadata"


# ---------------------------------------------------------------------------
# Point d'entrée CLI
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    data = extract()

    # Validation Pydantic
    validated = SurveyFile.model_validate(data)

    # Verification garde-fou anti-fabrication
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
