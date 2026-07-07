"""Extractor for govcan_06822_wave3_2024.
Source: Government of Canada (Continuous Survey of Canadians)
Dictionary: 068-22-wave3-data-dictionary.xlsx
Data: 068-22-wave3-data.csv (CSV, UTF-8)
"""

from pathlib import Path

import pandas as pd

from ingestion.canonical import canonical_sociodemo_text
from ingestion.models import Question, SurveyFile
from ingestion.validate import fabrication_reason

SURVEY_ID = "govcan_06822_wave3_2024"
SURVEY_NAME = "Continuous Survey of Canadians (Wave 3, 2024)"
SURVEY_YEAR = 2024
POLLSTER = "Government of Canada"
LANGUAGE = "en"

DATA_DIR = Path("data") / SURVEY_ID
CSV_FILE = DATA_DIR / "068-22-wave3-data.csv"
XLSX_FILE = DATA_DIR / "068-22-wave3-data-dictionary.xlsx"

EXCLUDED_VARS = {
    "UniqueID": "Technical ID",
    "WAVE": "Technical metadata",
    "LANGINT": "Technical metadata (language of interview)",
    "DATE": "Technical metadata",
    "DATELAUNCH": "Technical metadata",
    "OVERSAMPLE": "Sample metadata",
    "OVERSAMPLE_INDIGENOUS": "Sample metadata",
    "OVERSAMPLE_RECENTIMMIGRANTS": "Sample metadata",
    "OVERSAMPLE_REGION": "Sample metadata",
    "COSMOSURVEY": "Technical metadata",
    "COSMOLATEST": "Technical metadata",
    "TIDESSURVEY": "Technical metadata",
    "TIDESLATEST": "Technical metadata",
    "PRETESTFLAG": "Technical metadata",
    "INCENTIVE": "Administrative (incentive)",
    "INCENTIVEAMOUNT": "Administrative (incentive amount)",
    "QEND": "Technical metadata",
    "wgt1": "Weighting variable",
    "FSA": "Postal code (first 3 chars) - high cardinality / PII risk",
    "AFSA": "Postal code (first 3 chars) - high cardinality / PII risk",
    "AGENDER": "Other (open text)",
    "ABIRTH_YEAR": "Other (open text)",
    "BIRTH_YEAR": "Sensitive personal data",
    "AGEMERGE": "Derived (kept AGE categorical)",
    "AETHNICITY": "Other (open text)",
    "ALANGUAGE": "Other (open text)",
    "ABIRTH_PLACE": "Other (open text)",
    "ARESIDENT_STATUS": "Other (open text)",
    "ATRUST_GOV_OPEN": "Other (open text)",
    "AFEDGOV_SERV": "Other (open text)",
    "AFEDGOV_METHOD": "Other (open text)",
    "ASOCMED_OTHER": "Other (open text)",
    "TRUST_GOV_OPEN_1": "Other (open text)",
    "TRUST_GOV_OPEN_2": "Other (open text)",
    "TRUST_GOV_OPEN_3": "Other (open text)",
    "Variables in the working file": "Header noise in dictionary",
}

# Add timing and flag variables
for i in range(1, 10):
    EXCLUDED_VARS[f"ATSECT{i}AVG"] = "Technical timing metric"
EXCLUDED_VARS["ATENDAVG"] = "Technical timing metric"

for col in ["FLAGMIS", "FLAGTRUST_GOV_POLS", "FLAGINFO_USE", "FLAGWORRIED"]:
    EXCLUDED_VARS[col] = "Technical processing flag"

SOCIODEMO_VARS = {
    "AGE": "age",
    "GENDER": "gender",
    "PROVINCE": "region",
    "LANGUAGE": "language",
    "EDUCATION": "education",
    "HOUSEHOLD_INCOME": "income",
    "COMMUNITY_SIZE": "region",
}

def _clean_text(text: str) -> str:
    if not text or text == "<none>":
        return ""
    # Remove common survey tool noise
    text = text.replace("&nbsp;", " ")
    return text.strip()

def extract() -> dict:
    # Read Variable metadata (from 'Variable' sheet)
    var_meta = pd.read_excel(XLSX_FILE, sheet_name="Variable")

    # Read Value labels (from 'Value' sheet)
    val_labels_df = pd.read_excel(XLSX_FILE, sheet_name="Value")
    val_labels_df["Variable"] = val_labels_df["Variable"].ffill()

    # Group value labels by variable
    val_labels = {}
    for var_name, group in val_labels_df.groupby("Variable"):
        val_labels[str(var_name).strip()] = [
            {"code": row["Value"], "label": str(row["Label"]).strip()}
            for _, row in group.iterrows()
            if pd.notna(row["Value"]) and pd.notna(row["Label"])
        ]

    questions = []

    for _, row in var_meta.iterrows():
        has_verbatims = False
        var_name = str(row["Variable"]).strip()
        raw_label = (str(row["Label"]) or "").strip()

        if var_name in EXCLUDED_VARS or var_name == "nan" or not var_name:
            continue

        if raw_label == "<none>" or not raw_label:
            raw_label = ""

        sociodemo_type = SOCIODEMO_VARS.get(var_name)

        if sociodemo_type and (not raw_label or fabrication_reason(var_name, raw_label)):
            question_text = canonical_sociodemo_text(sociodemo_type)
            if not question_text:
                EXCLUDED_VARS[var_name] = "Sociodemo without canonical text"
                continue
        else:
            question_text = _clean_text(raw_label)
            if not question_text:
                EXCLUDED_VARS[var_name] = "No label in raw data"
                continue

        options = val_labels.get(var_name, [])

        # Detect var_type
        if not options:
            var_type = "open"
            has_verbatims = True
            has_verbatims = True
        elif any(
            o["label"].lower() in ["accurate", "inaccurate"] for o in options
        ):
            var_type = "single"
        elif any(
            o["label"].lower() in ["strongly agree", "strongly disagree"]
            for o in options
        ):
            var_type = "scale"
        else:
            var_type = "single"

        questions.append(
            Question(
                variable=var_name,
                question_text=question_text,
                response_options=options,
                var_type=var_type,
                has_verbatims=has_verbatims,
                is_sociodemo=sociodemo_type is not None,
                sociodemo_type=sociodemo_type,
            )
        )

    survey = {
        "survey_id": SURVEY_ID,
        "survey_name": SURVEY_NAME,
        "year": SURVEY_YEAR,
        "pollster": POLLSTER,
        "language": LANGUAGE,
        "raw_data_file": str(CSV_FILE.relative_to(Path("data").parent)),
    }

    # Get n_respondents from CSV
    try:
        # Use utf-8-sig to handle BOM
        df = pd.read_csv(CSV_FILE, encoding="utf-8-sig", low_memory=False)
        survey["n_respondents"] = len(df)
    except Exception:
        pass

    return SurveyFile(survey=survey, questions=questions).model_dump()

if __name__ == "__main__":
    import json

    data = extract()
    validated = SurveyFile.model_validate(data)

    _HERE = Path(__file__).parent
    REPO_ROOT = _HERE.parent.parent
    OUT_FILE = REPO_ROOT / "ingestion" / "normalized" / f"{SURVEY_ID}.json"
    OUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    OUT_FILE.write_text(
        json.dumps(validated.model_dump(), ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    n_q = len(validated.questions)
    n_sd = sum(1 for q in validated.questions if q.is_sociodemo)
    print(f"Sondage   : {validated.survey.survey_id}")
    print(f"Répondants: {validated.survey.n_respondents}")
    print(f"Questions : {n_q} total")
    print(f"Socio-démo: {n_sd}")
    print(f"Fichier JSON : {OUT_FILE}")
