"""Extracteur pour cecd_charte_2013_10.

Lit Charte_CROP_2013-10.sav (pyreadstat) et retourne le JSON normalisé
conforme au contrat SurveyFile (ingestion/models.py).

Variables exclues :
  - quest  (numéro de questionnaire — identifiant admin, pas une question)
  - pond   (pondération — variable technique sans choix de réponse)
Raison : ces deux variables n'ont aucun value label ; les inclure ferait
échouer la contrainte « chaque question a des response_options ».
"""

from __future__ import annotations

from pathlib import Path

import pyreadstat  # type: ignore[import]

# ---------------------------------------------------------------------------
# Constantes
# ---------------------------------------------------------------------------

SURVEY_ID = "cecd_charte_2013_10"
SAV_FILE = "Charte_CROP_2013-10.sav"

# Variables sans value labels (admin / pondération) : exclure des questions
_SKIP_VARS: set[str] = {"quest", "pond"}

# Mapping variable → sociodemo_type (hardcodé, car fiable depuis le SAV)
_SOCIODEMO: dict[str, str] = {
    "reg": "region",
    "reg2": "region",
    "reglang": "region",
    "qage": "age",
    "agerec": "age",
    "qlanf": "language",
    "lanf": "language",
    "qlanm": "language",
    "lanm": "language",
    "sexe": "gender",
    "qtrav": "employment",
    "qmatr": "marital_status",
    "qetud": "education",
    "qreve": "income",
    "qenfa": "household",
}

# ---------------------------------------------------------------------------
# Extraction principale
# ---------------------------------------------------------------------------


def extract() -> dict:
    """Lit le SAV et retourne le dictionnaire normalisé (SurveyFile-compatible)."""
    sav_path = Path(__file__).parent.parent.parent / "data" / SURVEY_ID / SAV_FILE

    df, meta = pyreadstat.read_sav(str(sav_path))

    n_respondents: int = len(df)
    variable_labels: dict[str, str] = dict(getattr(meta, "column_names_to_labels", {}) or {})
    value_labels: dict[str, dict] = dict(getattr(meta, "variable_value_labels", {}) or {})

    questions = []
    for col in df.columns:
        if col in _SKIP_VARS:
            continue

        question_text = variable_labels.get(col, "").strip()
        if not question_text:
            # Aucun label disponible — on ne peut pas satisfaire la contrainte
            # question_text non vide ; on skippe prudemment.
            continue

        col_value_labels: dict = value_labels.get(col, {})
        response_options = [
            {"code": _coerce_code(code), "label": str(label)}
            for code, label in sorted(col_value_labels.items(), key=lambda x: x[0])
        ]

        sociodemo_type = _SOCIODEMO.get(col)
        is_sociodemo = sociodemo_type is not None

        # var_type : "single" si value labels, sinon "numeric"
        var_type = "single" if response_options else "numeric"

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

    return {
        "survey": {
            "survey_id": SURVEY_ID,
            "survey_name": "Sondage CROP sur la Charte des valeurs québécoises (octobre 2013)",
            "year": 2013,
            "pollster": "CROP",
            "language": "fr",
            "n_respondents": n_respondents,
            "raw_data_file": SAV_FILE,
            "tags": ["charte", "valeurs", "identité", "Québec", "PQ", "CROP"],
        },
        "questions": questions,
    }


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _coerce_code(code) -> int | str:
    """Convertit un code float (ex. 1.0) en int si possible, sinon str."""
    try:
        as_int = int(code)
        if float(code) == as_int:
            return as_int
        return str(code)
    except (TypeError, ValueError):
        return str(code)


# ---------------------------------------------------------------------------
# CLI rapide (pour tester sans importer le module)
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    import json

    data = extract()
    print(f"Questions: {len(data['questions'])}")
    print(f"Socio-démo: {sum(1 for q in data['questions'] if q['is_sociodemo'])}")
    out = Path(__file__).parent.parent / "normalized" / f"{SURVEY_ID}.json"
    out.write_text(json.dumps(data, ensure_ascii=False, indent=2))
    print(f"Écrit : {out}")
