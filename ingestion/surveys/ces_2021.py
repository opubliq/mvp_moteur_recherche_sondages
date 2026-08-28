"""Extraction normalisée — ces_2021 (Canadian Election Study 2021).

Source : 2021 Canadian Election Study v2.0.dta (Stata)
         Étude sur l'élection canadienne de 2021 / Canadian Election Study 2021 (CES 2021),
         Consortium Élection Canada / Canadian Election Study Consortium.
         Vagues de campagne (CPS) et post-électorale (PES), ~20 968 répondants.

Encodage : Le fichier Stata .dta est lu via pyreadstat.read_dta.

Usage :
    uv run python ingestion/surveys/ces_2021.py
    → écrit ingestion/normalized/ces_2021.json
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
DATA_DIR = REPO_ROOT / "data" / "ces_2021"
DTA_FILE = DATA_DIR / "2021 Canadian Election Study v2.0.dta"
OUT_FILE = REPO_ROOT / "ingestion" / "normalized" / "ces_2021.json"

# ---------------------------------------------------------------------------
# Constantes du sondage
# ---------------------------------------------------------------------------

SURVEY_ID = "ces_2021"
SURVEY_NAME = (
    "Canadian Election Study 2021 / Étude sur l'élection canadienne de 2021"
)
YEAR = 2021
POLLSTER = "Consortium Élection Canada / Canadian Election Study Consortium"
LANGUAGE = "en"
WEIGHT_VAR = "cps21_weight_general_all"
RESPONDENT_ID_VAR = None

# ---------------------------------------------------------------------------
# Classification des variables socio-démographiques
# ---------------------------------------------------------------------------

SOCIODEMO_VARS: dict[str, str] = {
    "cps21_genderid": "gender",
    "cps21_yob": "age",
    "cps21_yob_2003_age": "age",
    "cps21_yob_2": "age",
    "cps21_education": "education",
    "cps21_income_cat": "income",
    "cps21_income_number": "income",
    "cps21_province": "region",
    "pes21_province": "region",
    "cps21_employment": "occupation",
    "cps21_marital": "marital_status",
    "pes21_lang": "language",
}

# ---------------------------------------------------------------------------
# Variables EXCLUES (techniques, métadonnées, horodatages, flags Qualtrics,
# pondérations, variables de contrôle ou recodages dérivés)
# ---------------------------------------------------------------------------

EXCLUDED_VARS: dict[str, str] = {
    # --- Dates, durées, IDs, consentement et métadonnées d'administration ---
    "cps21_StartDate": "date de début du questionnaire (CPS)",
    "cps21_StartDate_DMY": "date de début JJ/MM/AAAA (CPS)",
    "cps21_EndDate": "date de fin du questionnaire (CPS)",
    "Duration__in_seconds_": "durée de passation en secondes (CPS/PES)",
    "cps21_time": "durée de passation en minutes (CPS)",
    "RecordedDate": "date d'enregistrement de la réponse (CPS/PES)",
    "cps21_ResponseId": "identifiant unique de réponse Qualtrics (CPS)",
    "DistributionChannel": "canal de distribution Qualtrics",
    "UserLanguage": "langue d'affichage de l'interface Qualtrics",
    "cps21_consent": "formulaire d'information et de consentement (CPS)",
    "cps21_survey_wave": "vague de sondage complétée (CPS)",
    "wave": "vague d'enquête (1=CPS, 2=PES)",
    "Q_Language": "langue d'interface / variable système Qualtrics",
    "pes21_StartDate": "date de début du questionnaire (PES)",
    "pes21_StartDate_DMY": "date de début JJ/MM/AAAA (PES)",
    "pes21_EndDate": "date de fin du questionnaire (PES)",
    "pes21_time": "durée de passation en minutes (PES)",
    "pes21_consent": "formulaire d'information et de consentement (PES)",
    # --- Qualité des données, contrôles et flags ---
    "cps21_duplicates_pid_flag": (
        "indicateur de doublon d'identifiant panneau (CPS)"
    ),
    "cps21_duplicate_ip_demo_flag": (
        "indicateur de doublon IP et socio-démographique (CPS)"
    ),
    "cps21_attention_check": "indicateur de contrôle d'attention (CPS)",
    "cps21_data_quality": "indicateur global de qualité des données (CPS)",
    "pes21_data_quality": "indicateur global de qualité des données (PES)",
    "pes21_inattentive": "indicateur de répondant inattentif (PES)",
    "pes21_duplicates_pid_flag": (
        "indicateur de doublon d'identifiant panneau (PES)"
    ),
    "pes21_speeder_low_quality": (
        "indicateur de réponse trop rapide / basse qualité (PES)"
    ),
    "pes21_lowturnout": (
        "indicateur / suréchantillon faible participation électorale (PES)"
    ),
    "pes21_friendsnames_1_valid": "flag de validité pour réseau de noms 1 (PES)",
    "pes21_friendsnames_2_valid": "flag de validité pour réseau de noms 2 (PES)",
    "pes21_friendsnames_3_valid": "flag de validité pour réseau de noms 3 (PES)",
    "pccf_pcode_problem": (
        "indicateur de problème d'appariement géographique PCCF"
    ),
    "manual_PCCF": (
        "indicateur de données de circonscription ajoutées manuellement"
    ),
    # --- Variables de géographie/contexte et substitutions textuelles / splits ---
    "feduid": "identifiant unique de circonscription fédérale",
    "fedname": "nom de la circonscription fédérale",
    "message": "message d'erreur PCCF",
    "premier": "nom du premier ministre provincial (variable de contexte)",
    "Region": "macro-région canadienne dérivée de la province",
    "province": "variable de substitution de texte (province EN)",
    "province_fr": "variable de substitution de texte (province FR)",
    "campaign_AH_split": "flag d'expérience / sous-échantillon (campaign AH)",
    "leader_residential_split": (
        "flag d'expérience / sous-échantillon (leader residential)"
    ),
    "outcome_affective_split": (
        "flag d'expérience / sous-échantillon (outcome affective)"
    ),
    "local_partybest_split": (
        "flag d'expérience / sous-échantillon (local partybest)"
    ),
    "group_discrim_majority_split": (
        "flag d'expérience / sous-échantillon (group discrim majority)"
    ),
    "split_candidate_outcome": (
        "flag d'expérience / sous-échantillon (candidate outcome)"
    ),
    "split_partyissue_namegen": (
        "flag d'expérience / sous-échantillon (partyissue namegen)"
    ),
    "cps21_howvote": "variable de substitution de texte (mode de vote)",
    "cps21_howvote_EN1": "variable de substitution de texte (mode de vote EN1)",
    "cps21_howvote_FR1": "variable de substitution de texte (mode de vote FR1)",
    "cps21_howvote3_EN3": (
        "variable de substitution de texte (mode de vote EN3)"
    ),
    "cps21_howvote3_FR3": (
        "variable de substitution de texte (mode de vote FR3)"
    ),
    "justice_law": "variable de substitution de texte (justice/loi EN)",
    "justice_law_fr": "variable de substitution de texte (justice/loi FR)",
    "pid_en": (
        "variable de substitution de texte (identification partisane EN)"
    ),
    "pid_party_en": (
        "variable de substitution de texte (parti d'identification EN)"
    ),
    "pid_party_fr": (
        "variable de substitution de texte (parti d'identification FR)"
    ),
    "religion_EN": "variable de substitution de texte (religion EN)",
    "religion_FR": "variable de substitution de texte (religion FR)",
    "govt_programs_word": (
        "variable de substitution de texte (programmes gouvernementaux EN)"
    ),
    "govt_programs_word_fr": (
        "variable de substitution de texte (programmes gouvernementaux FR)"
    ),
    # --- Pondérations statistiques ---
    "cps21_weight_general_all": (
        "poids de sondage population générale, tous répondants (CPS)"
    ),
    "cps21_weight_general_restricted": (
        "poids de sondage population générale, échantillon restreint (CPS)"
    ),
    "pes21_weight_general_all": (
        "poids de sondage population générale, tous répondants (PES)"
    ),
    "pes21_weight_general_restricted": (
        "poids de sondage population générale, échantillon restreint (PES)"
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
        if col in dynamic_excluded:
            continue
        if any(
            t in col
            for t in [
                "_t_First_Click",
                "_t_Last_Click",
                "_t_Page_Submit",
                "_t_Click_Count",
            ]
        ):
            dynamic_excluded[col] = "Qualtrics question timing metadata"
        elif (
            "_DO_" in col
            or "DO-" in col
            or col.endswith("_DO")
            or "_DO" in col
            or col.startswith("DO_")
            or col.startswith("DO-")
            or col.startswith("FL_")
        ):
            dynamic_excluded[col] = (
                "Qualtrics display order variable (DO / FL)"
            )
        elif (
            col.endswith("_TEXT")
            or col.endswith("_TEXT_FR")
            or "_TEXT_" in col
            or col.endswith("_text")
            or "_text_" in col
        ):
            dynamic_excluded[col] = "Champ texte de précision 'Autre (préciser)'"

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
            "tags": ["electoral", "federal", "canada", "ces", "2021"],
        },
        "questions": questions,
    }
    return result


# Populate EXCLUDED_VARS statically for export / inspection
_cols_temp, _meta_temp = pyreadstat.read_dta(str(DTA_FILE), metadataonly=True)
for _c in _meta_temp.column_names:
    if _c in EXCLUDED_VARS:
        continue
    if any(
        _t in _c
        for _t in [
            "_t_First_Click",
            "_t_Last_Click",
            "_t_Page_Submit",
            "_t_Click_Count",
        ]
    ):
        EXCLUDED_VARS[_c] = "Qualtrics question timing metadata"
    elif (
        "_DO_" in _c
        or "DO-" in _c
        or _c.endswith("_DO")
        or "_DO" in _c
        or _c.startswith("DO_")
        or _c.startswith("DO-")
        or _c.startswith("FL_")
    ):
        EXCLUDED_VARS[_c] = "Qualtrics display order variable (DO / FL)"
    elif (
        _c.endswith("_TEXT")
        or _c.endswith("_TEXT_FR")
        or "_TEXT_" in _c
        or _c.endswith("_text")
        or "_text_" in _c
    ):
        EXCLUDED_VARS[_c] = "Champ texte de précision 'Autre (préciser)'"


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
