"""Extraction normalisée — cecd_sante_can_usa.

Source : Fichier SPSS - Étude sur la santé - Canada-USA.Sav (SPSS)
         Étude sur la santé - Canada-USA, Leger Marketing.

Encodage : le fichier SAV est lu avec l'encodage par défaut de pyreadstat
(latin-1/cp1252 inféré par SPSS). Les libellés sont bilingues ou anglais.
"""

from __future__ import annotations

import json
from pathlib import Path

import pyreadstat

from ingestion.canonical import canonical_sociodemo_text
from ingestion.models import SurveyFile
from ingestion.validate import fabrication_reason
from ingestion.open_text import is_text_column

# ---------------------------------------------------------------------------
# Chemins
# ---------------------------------------------------------------------------

_HERE = Path(__file__).parent
REPO_ROOT = _HERE.parent.parent
DATA_DIR = REPO_ROOT / "data" / "cecd_sante_can_usa"
SAV_FILE = DATA_DIR / "Fichier SPSS - Étude sur la santé - Canada-USA.Sav"
WEIGHT_VAR = "POND"  # poids fourni → weight_source='provided' (v33.3)
OUT_FILE = REPO_ROOT / "ingestion" / "normalized" / "cecd_sante_can_usa.json"

# ---------------------------------------------------------------------------
# Constantes du sondage
# ---------------------------------------------------------------------------

SURVEY_ID = "cecd_sante_can_usa"
SURVEY_NAME = "Étude sur la santé - Canada-USA"
# Le champ SDAT indique une collecte en février/mars 2011.
YEAR = 2011
POLLSTER = "Leger Marketing"
LANGUAGE = "en"  # Questionnaire bilingue dans les labels, codebook anglais.

# ---------------------------------------------------------------------------
# Variables EXCLUES (techniques : pondérations, admin, gestion terrain, sans label)
# ---------------------------------------------------------------------------

EXCLUDED_VARS: dict[str, str] = {
    "QUEST": "ID de questionnaire (admin)",
    "SDAT": "Date de l'entrevue (admin)",
    "COUNT": "Indicateur de pays (Canada/USA) sans libellé de question dans le raw",
    "PONDC": "Pondération Canada",
    "PONDU": "Pondération US",
    "POND": "Somme des pondérations Canada + US",
}

# ---------------------------------------------------------------------------
# Classification des variables socio-démographiques
# ---------------------------------------------------------------------------

SOCIODEMO_VARS: dict[str, str] = {
    "SEX": "gender",
    "BIRTH": "age",
    "SCOL": "education",
    "REVEN": "income",
    "PROV": "region",
    "STATE": "region",
    "USREG": "region",
    "DIVIS": "region",
    "QAB": "region",
    "QON": "region",
    "QBC": "region",
    "QQC": "region",
    "MTONG": "language",
    "LANG": "language",
    "OCCUP": "occupation",
    "JOB": "occupation",
}


def _clean_text(text: str | None) -> str:
    """Nettoie le markup SPSS et les espaces superflus."""
    if not text:
        return ""
    # Nettoyage des tags {i}, {b}, etc. et leurs versions HTML
    tags = [
        "{i}", "{/i}", "{b}", "{/b}", "{u}", "{/u}", "{br}",
        "<i>", "</i>", "<b>", "</b>", "<u>", "</u>", "<br>", "&nbsp;"
    ]
    for tag in tags:
        text = text.replace(tag, " ")
    return " ".join(text.split()).strip()


def extract() -> dict:
    """Lit le fichier SAV et retourne le dict SurveyFile normalisé."""
    df, meta = pyreadstat.read_sav(str(SAV_FILE))

    var_labels = meta.column_names_to_labels or {}
    val_labels = meta.variable_value_labels or {}

    questions = []
    for col in df.columns:
        if col in EXCLUDED_VARS:
            continue

        raw_label = var_labels.get(col)
        sociodemo_type = SOCIODEMO_VARS.get(col)

        # Règle cardinale : ZÉRO fabrication. Fallback sur le wording canonique
        # UNIQUEMENT pour les sociodémo sans label exploitable.
        if sociodemo_type and (not raw_label or fabrication_reason(col, raw_label)):
            question_text = canonical_sociodemo_text(sociodemo_type)
            if question_text is None:
                continue
        else:
            question_text = _clean_text(raw_label)
            if not question_text:
                continue

        # Options de réponse
        raw_opts = val_labels.get(col, {})
        response_options = []
        if raw_opts:
            # Sort codes numerically if possible
            try:
                # Handle possible mixed types in keys
                def _sort_key(kv):
                    k = kv[0]
                    if isinstance(k, (int, float)):
                        return (0, k)
                    if isinstance(k, str) and k.replace('.', '', 1).isdigit():
                        return (0, float(k))
                    return (1, str(k))

                sorted_items = sorted(raw_opts.items(), key=_sort_key)
                for code, label in sorted_items:
                    if isinstance(code, float) and code == int(code):
                        code = int(code)
                    response_options.append({"code": code, "label": _clean_text(str(label))})
            except Exception:
                for code, label in raw_opts.items():
                    response_options.append({"code": code, "label": _clean_text(str(label))})

        # Type de variable
        if is_text_column(df[col]):
            var_type = "open"
        elif raw_opts:
            var_type = "single"
        else:
            var_type = "continuous"

        questions.append(
            {
                "variable": col,
                "question_text": question_text,
                "response_options": response_options,
                "var_type": var_type,
                "is_sociodemo": sociodemo_type is not None,
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
            "tags": ["health", "canada", "usa", "healthcare systems", "comparison"],
        },
        "questions": questions,
    }
    return result


if __name__ == "__main__":
    # Self-test & writing
    data = extract()
    sf = SurveyFile.model_validate(data)

    OUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    OUT_FILE.write_text(
        json.dumps(sf.model_dump(), ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    print(f"Sondage   : {sf.survey.survey_id}")
    print(f"Questions : {len(sf.questions)}")
    print(f"Exclues   : {len(EXCLUDED_VARS)}")
    print(f"Socio-démo: {sum(1 for q in sf.questions if q.is_sociodemo)}")
    print(f"Fichier   : {OUT_FILE}")

    # Validation de couverture
    import pyreadstat
    df, meta = pyreadstat.read_sav(str(SAV_FILE))
    raw_vars = set(df.columns)
    mapped_vars = {q.variable for q in sf.questions} | set(EXCLUDED_VARS)
    missing = raw_vars - mapped_vars
    if missing:
        print(f"ERREUR: Variables non couvertes : {missing}")
    else:
        print("Couverture : OK")
