"""Extraction normalisée — govcan_parca_2024.

Source : PARCA-Phase2-Final-Merged-Data(1).csv
         PARCA-Phase2-Final-Data-Dictionary.xlsx
         Sondage PARCA (Public Awareness, Readiness and Capacity Survey) Phase 2, 2024.

Usage :
    uv run python ingestion/surveys/govcan_parca_2024.py
    → écrit ingestion/normalized/govcan_parca_2024.json
"""

from __future__ import annotations
import numpy as np
import pandas as pd

import json
import re
from pathlib import Path

import pandas as pd

from ingestion.canonical import canonical_sociodemo_text
from ingestion.models import SurveyFile
from ingestion.validate import fabrication_reason

# ---------------------------------------------------------------------------
# Chemins
# ---------------------------------------------------------------------------

_HERE = Path(__file__).parent
REPO_ROOT = _HERE.parent.parent
DATA_DIR = REPO_ROOT / "data" / "govcan_parca_2024"
RAW_FILE = DATA_DIR / "PARCA-Phase2-Final-Merged-Data(1).csv"
WEIGHT_VAR = "WeightNEW"  # poids fourni → weight_source='provided' (v33.3)
DICT_FILE = DATA_DIR / "PARCA-Phase2-Final-Data-Dictionary.xlsx"
OUT_FILE = REPO_ROOT / "ingestion" / "normalized" / "govcan_parca_2024.json"

# ---------------------------------------------------------------------------
# Constantes du sondage
# ---------------------------------------------------------------------------

SURVEY_ID = "govcan_parca_2024"
SURVEY_NAME = "Public Awareness, Readiness and Capacity Survey (PARCA) - Phase 2"
YEAR = 2024
POLLSTER = "Government of Canada"
LANGUAGE = "en"

# ---------------------------------------------------------------------------
# Variables EXCLUES (techniques, timers, recodages multi-mentions)
# ---------------------------------------------------------------------------

EXCLUDED_VARS: dict[str, str] = {
    "SurveyWave": "Wave ID (technical)",
    "CaseId": "Case ID (technical)",
    "Oversample": "Oversample indicator (technical)",
    "LastConnectionDate": "Connection metadata (admin)",
    "ConnectionDurationInSeconds": "Connection metadata (admin)",
    "ConnectionDurationInMinutes": "Connection metadata (admin)",
    "STTIMER_FC": "Timer (technical)",
    "STTIMER_LC": "Timer (technical)",
    "STTIMER_CC": "Timer (technical)",
    "STTIMER_TT": "Timer (technical)",
    "INT01": "Introductory text / Consent (not a question)",
    "QRANDOM": "Randomization seed (technical)",
    "QRANDOMC8": "Randomization seed (technical)",
    "CTTIMER_FC": "Timer (technical)",
    "CTTIMER_LC": "Timer (technical)",
    "CTTIMER_CC": "Timer (technical)",
    "CTTIMER_TT": "Timer (technical)",
    "CONSENT": "Consent (not a question)",
    "PCMOV1": "Technical flag",
    "QNORTH": "Technical flag (Northern Canadians)",
    "INT05": "Introductory text (not a question)",
    "ORD1": "Order randomization (technical)",
    "ORD2": "Order randomization (technical)",
    "ORD3": "Order randomization (technical)",
    "WeightNEW": "Weighting (statistical)",
    "weight": "Weighting (statistical)",
    "AGE": "Redundant categorical age (A1A is preferred)",
    "ID": "Metadata",
    "C8VERSION": "Metadata (randomization version)",
}

# Sociodemo mapping
SOCIODEMO_VARS: dict[str, str] = {
    "A3": "gender",
    "A1A": "age",
    "E1": "education",
    "E8": "income",
    "A4": "region",
    "E4": "occupation",
    "ResLanguage": "language",
}


def _clean_text(text: str) -> str:
    """Nettoie le markup HTML et normalise les espaces."""
    if not text:
        return ""
    # Remove HTML tags
    text = re.sub(r"<[^>]+>", " ", text)
    # Remove &nbsp;
    text = text.replace("&nbsp;", " ")
    # Normalize spaces
    text = re.sub(r"\s+", " ", text).strip()
    return text


def extract() -> dict:
    """Lit le CSV et le dictionnaire XLSX pour produire le SurveyFile."""
    # Read dictionary
    df_dict = pd.read_excel(DICT_FILE, sheet_name="PARCA Phase 2 Final Data Dictio")
    df_val = pd.read_excel(DICT_FILE, sheet_name="Value")

    # Fill Variable column in value labels
    df_val["Variable"] = df_val["Variable"].ffill()

    # Build value labels mapping
    val_labels_map = {}
    for var, group in df_val.groupby("Variable"):
        opts = []
        for _, row in group.iterrows():
            val = row["Value"]
            lab = str(row["Label"]).strip()
            if lab.lower() != "nan" and lab != "":
                opts.append({"code": val, "label": _clean_text(lab)})
        if opts:
            val_labels_map[var] = opts

    # Map variables to labels
    var_labels = {
        row["Variable"]: str(row["Label"])
        for _, row in df_dict.iterrows()
        if pd.notna(row["Variable"])
    }

    # Get column names from CSV
    df_head = pd.read_csv(RAW_FILE, nrows=0)
    columns = df_head.columns.tolist()

    # Get respondent count
    n_respondents = len(pd.read_csv(RAW_FILE, usecols=[0]))

    questions = []

    for col in columns:
        # Ratio détection auto
        series_data = df[col].replace([' ', ''], np.nan).dropna() if 'df' in locals() else pd.Series()
        has_verbatims = (len(series_data) > 10 and (series_data.nunique() / len(series_data)) > 0.1)
        has_verbatims = False
        if col in EXCLUDED_VARS:
            continue

        # Automatic exclusions for timers and intro texts
        if "TIMER" in col or "INTRO" in col:
            EXCLUDED_VARS[col] = "Timer or Intro text (technical)"
            continue

        # Exclude multi-mention variables (M1, M2...) if they have a prefix (e.g., E16M1)
        # We keep the dummy variables (_1, _2...) which have better labels.
        if re.search(r"^[A-Z]+\d+M\d+", col) or re.search(r"^[A-Z]+\d+[A-Z]+\d+M\d+", col):
            EXCLUDED_VARS[col] = "Multi-mention recode (dummies preferred)"
            continue

        raw_label = var_labels.get(col, "").strip()

        # Exclude if no label or label is <none>
        if not raw_label or raw_label == "<none>":
            EXCLUDED_VARS[col] = "No label or <none> (technical/unused)"
            continue

        # Sociodemo handling
        sociodemo_type = SOCIODEMO_VARS.get(col)
        if sociodemo_type and (not raw_label or fabrication_reason(col, raw_label)):
            question_text = canonical_sociodemo_text(sociodemo_type)
            if question_text is None:
                EXCLUDED_VARS[col] = "Sociodemo without canonical text"
                continue
        else:
            question_text = _clean_text(raw_label)
            if not question_text or fabrication_reason(col, question_text):
                EXCLUDED_VARS[col] = "Empty label or fabricated text"
                continue

        # Response options
        response_options = val_labels_map.get(col, [])

        # Infer type
        if col.endswith("O") or col.endswith("_TEXT") or col.endswith("_TEXTO"):
            var_type = "open"
            has_verbatims = True
            has_verbatims = True
        elif response_options:
            var_type = "single"
        else:
            var_type = "continuous"

        questions.append({
            "variable": col,
            "question_text": question_text,
            "response_options": response_options,
            "var_type": var_type,
                "has_verbatims": has_verbatims,
            "is_sociodemo": sociodemo_type is not None,
            "sociodemo_type": sociodemo_type,
            "concepts": [],
            "themes": [],
        })

    result = {
        "survey": {
            "survey_id": SURVEY_ID,
            "survey_name": SURVEY_NAME,
            "year": YEAR,
            "pollster": POLLSTER,
            "language": LANGUAGE,
            "n_respondents": n_respondents,
            "raw_data_file": RAW_FILE.name,
            "tags": ["environment", "climate change", "canada", "awareness"],
        },
        "questions": questions,
    }
    return result

if __name__ == "__main__":
    data = extract()
    validated = SurveyFile.model_validate(data)

    OUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    OUT_FILE.write_text(
        json.dumps(validated.model_dump(), ensure_ascii=False, indent=2),
        encoding="utf-8"
    )

    print(f"Survey ID: {validated.survey.survey_id}")
    print(f"Questions: {len(validated.questions)}")
    print(f"Exclues  : {len(EXCLUDED_VARS)}")
    print(f"Socio-démo: {sum(1 for q in validated.questions if q.is_sociodemo)}")
