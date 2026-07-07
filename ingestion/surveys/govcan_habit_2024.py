"""Extractor for govcan_habit_2024 (HABIT Phase II).
Source: Health Canada / PHAC.
Dictionary: HABIT-Phase-II-Final-Data-Data-Dictionary.xlsx
Data: HABIT-Phase-II-Final-Data.csv (CSV, ISO-8859-1)
"""

import re
from pathlib import Path

import pandas as pd

from ingestion.canonical import canonical_sociodemo_text
from ingestion.models import Question, SurveyFile
from ingestion.validate import fabrication_reason

SURVEY_ID = "govcan_habit_2024"
SURVEY_NAME = "HABIT Phase II"
SURVEY_YEAR = 2024
POLLSTER = "Health Canada / PHAC"
LANGUAGE = "en"

DATA_DIR = Path("data") / SURVEY_ID
CSV_FILE = DATA_DIR / "HABIT-Phase-II-Final-Data.csv"
XLSX_FILE = DATA_DIR / "HABIT-Phase-II-Final-Data-Data-Dictionary.xlsx"

EXCLUDED_VARS = {
    "record": "Technical ID",
    "LMID": "Technical ID",
    "LastConnectionDate": "Technical metadata",
    "ResLanguage": "Technical metadata (language of interview)",
    "TotalDurationSec": "Technical metadata",
    "Device": "Technical metadata",
    "CODESURVEY": "Technical metadata",
    "TARGET": "Sample metadata",
    "CONSENT": "Administrative (consent)",
    "FSA": "Postal code (first 3 chars) - high cardinality",
    "WEIGHTMERGED": "Weighting variable",
    "WAVE": "Technical metadata",
    "WEIGHT_FIN": "Weighting variable",
    "TIMER_FIRSTCLICK": "Technical timer",
    "TIMER_LASTCLICK": "Technical timer",
    "TIMER_CLICKCOUNT": "Technical counter",
    "TIMER_TOTALTIME": "Technical timer",
    "TIMER_FIRSTCLICK_2": "Technical timer",
    "TIMER_LASTCLICK_2": "Technical timer",
    "TIMER_CLICKCOUNT_2": "Technical counter",
    "TIMER_TOTALTIME_2": "Technical timer",
    "TIMER_FIRSTCLICK_3": "Technical timer",
    "TIMER_LASTCLICK_3": "Technical timer",
    "TIMER_CLICKCOUNT_3": "Technical counter",
    "TIMER_TOTALTIME_3": "Technical timer",
    "TIMER_FIRSTCLICK_4": "Technical timer",
    "TIMER_LASTCLICK_4": "Technical timer",
    "TIMER_CLICKCOUNT_4": "Technical counter",
    "TIMER_TOTALTIME_4": "Technical timer",
    "TIMER_FIRSTCLICK_5": "Technical timer",
    "TIMER_LASTCLICK_5": "Technical timer",
    "TIMER_CLICKCOUNT_5": "Technical counter",
    "TIMER_TOTALTIME_5": "Technical timer",
    "GROUP_016C": "Technical experimental group",
    "GROUP": "Technical experimental group",
    "GROUP_1_MSG": "Technical experimental message",
    "GROUP_2_MSG": "Technical experimental message",
    "GROUP_3_MSG": "Technical experimental message",
    "GROUP_4_MSG": "Technical experimental message",
    "EXPERIMENT": "Technical experimental flag",
    "EXPERIMENT1": "Technical experimental flag",
    "EXPERIMENT2": "Technical experimental flag",
    "Variables in the working file": "Technical header row in dictionary",
    "OPENTEXT_LOCAL_SERVICES_NEGATIVEO": "Other (open text)",
    "OPENTEXT_LOCAL_SERVICES_POSITIVEO": "Other (open text)",
    "OPENTEXT_LOCAL_SERVICES_NEUTRALO": "Other (open text)",
    "DISABILITY_BENEFIT_BARRIERO": "Other (open text)",
    "DISABILITY_BENEFIT_BARRIERC8O": "Other (open text)",
    "HEALTH_DIAGNOSISO": "Other (open text)",
    "HEALTH_DIAGNOSISC13O": "Other (open text)",
    "GENDERO": "Other (open text)",
    "FLU_VAX_BARRIERO": "Other (open text)",
    "FLU_VAX_BARRIERC14O": "Other (open text)",
    "COVID_VAX_BARRIERO": "Other (open text)",
    "COVID_VAX_BARRIERC14O": "Other (open text)",
    "ANTIBIOTIC_SOURCEO": "Other (open text)",
    "ANTIBIOTIC_SOURCEC12O": "Other (open text)",
    "ANTIBIOTIC_DISPOSEO": "Other (open text)",
    "ANTIBIOTIC_DISPOSEC6O": "Other (open text)",
    "MH_UNDIAGNOSED_BARRIERSO": "Other (open text)",
    "MH_UNDIAGNOSED_BARRIERSC13O": "Other (open text)",
    "MH_UNDIAGNOSED_HELPSEEK_OTHER_2O": "Other (open text)",
    "MH_UNDIAGNOSED_HELPSEEK_OTHER_2C7O": "Other (open text)",
    "MH_BARRIER_TYPEO": "Other (open text)",
    "MH_BARRIER_TYPEC11O": "Other (open text)",
    "CRISIS_REASONSO": "Other (open text)",
    "ETHNICITYO": "Other (open text)",
    "ETHNICITYC12O": "Other (open text)",
}

SOCIODEMO_VARS = {
    "AGE": "age",
    "AGE_CAT": "age",
    "AGEX": "age",
    "AGENUM": "age",
    "GENDER": "gender",
    "SEX": "gender",
    "REGION": "region",
    "EMPLOYMENT": "occupation",
    "EDUCATION": "education",
    "HOUSEHOLD_INCOME": "income",
    "MOTHER_TONGUE": "language",
    "URBAN": "region",
    "GENERATION": "age",
    "LGBTQ": "gender",
    "INDIGENOUSC1": None,
    "INDIGENOUSC2": None,
    "INDIGENOUSC3": None,
    "INDIGENOUSC4": None,
    "ETHNICITYC1": None,
    "ETHNICITYC2": None,
    "ETHNICITYC3": None,
    "ETHNICITYC4": None,
    "ETHNICITYC5": None,
    "ETHNICITYC6": None,
    "ETHNICITYC7": None,
    "ETHNICITYC8": None,
    "ETHNICITYC9": None,
    "ETHNICITYC10": None,
    "ETHNICITYC11": None,
    "ETHNICITYC12": None,
    "ETHNICITYC13": None,
    "ETHNICITYC14": None,
}

def _clean_text(text: str) -> str:
    if not text or text == "<none>":
        return ""
    # Remove question code prefix if it exists (e.g., "AGE: ")
    # Only if it matches the variable name or a common pattern
    text = re.sub(r"^[A-Z0-9_]+:\s*", "", text)
    # Remove common survey tool noise
    text = text.replace("&nbsp;", " ")
    return text.strip()

def extract() -> dict:
    # Read Variable metadata (from 'Value' sheet)
    var_meta = pd.read_excel(XLSX_FILE, sheet_name="Value")

    # Read Value labels (from 'Variable' sheet)
    val_labels_df = pd.read_excel(XLSX_FILE, sheet_name="Variable")
    val_labels_df['Variable'] = val_labels_df['Variable'].ffill()

    # Group value labels by variable
    val_labels = {}
    for var_name, group in val_labels_df.groupby('Variable'):
        val_labels[str(var_name).strip()] = [
            {"code": row['Value'], "label": str(row['Label']).strip()}
            for _, row in group.iterrows()
            if pd.notna(row['Value']) and pd.notna(row['Label'])
        ]

    questions = []

    for _, row in var_meta.iterrows():
        var_name = str(row['Variable']).strip()
        raw_label = (str(row['Label']) or "").strip()

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

        questions.append(Question(
            variable=var_name,
            question_text=question_text,
            response_options=options,
            var_type="single" if options else "open",
            is_sociodemo=sociodemo_type is not None,
            sociodemo_type=sociodemo_type
        ))

    survey = {
        "survey_id": SURVEY_ID,
        "survey_name": SURVEY_NAME,
        "year": SURVEY_YEAR,
        "pollster": POLLSTER,
        "language": LANGUAGE,
        "raw_data_file": str(CSV_FILE.relative_to(Path("data").parent))
    }

    # Get n_respondents from CSV
    try:
        df = pd.read_csv(CSV_FILE, encoding='iso-8859-1', low_memory=False)
        survey["n_respondents"] = len(df)
    except Exception:
        pass

    return SurveyFile(survey=survey, questions=questions).model_dump()

if __name__ == "__main__":
    import json
    print(json.dumps(extract(), indent=2, ensure_ascii=False))
