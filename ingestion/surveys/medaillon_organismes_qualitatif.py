"""Extraction normalisée — medaillon_organismes_qualitatif.

Source : questionnaire rempli (« Volet organismes communautaires ») auprès de 130
organismes de l'Est de Montréal, mené par Médaillon (terrain mai–juin 2026) pour
le Comité des usagers du CIUSSS de l'Est-de-l'Île-de-Montréal.

Format INÉDIT dans ce repo : CSV de réponses + questionnaire SurveyJS (JSON), et
non SAV/DTA + codebook. Les 29 colonnes substantielles sont TOUTES du texte libre
(`var_type="open"`) : réponses ouvertes directes (`q4`, `q6`, …) + champs
« autre / précisez » (`qX-Comment`) des questions à choix, dont le CSV ne contient
que la précision libre. Le wording verbatim vient du `title` SurveyJS — jamais
inventé (invariant zéro fabrication, cf. `docs/INGESTION_RUNBOOK.md`).

PII — anonymisation TOTALE : le CSV brut porte `participant_name` /
`participant_email` (85 répondants internet ; les 25 téléphone n'en ont aucun).
`write_deid_csv()` produit un CSV dé-identifié (ces 2 colonnes retirées pour les
130) qui est la SEULE source lue par les rails microdonnées et verbatims — via
`raw_data_file`. `mode` (internet/telephone) est CONSERVÉ : il sert à recroiser
les annotations avec DuckDB (aucun champ `mode` ajouté aux index — décision
utilisateur).

Poids : aucun → `WEIGHT_VAR=None` (`weight_source='uniform'`). `response_id` est
un horodatage (non numérique) → `RESPONDENT_ID_VAR=None`, l'ID répondant retombe
sur l'index de ligne.

Usage :
    uv run python ingestion/surveys/medaillon_organismes_qualitatif.py
    → écrit data/medaillon_organismes_qualitatif/medaillon_organismes_qualitatif_deid.csv
    → écrit ingestion/normalized/medaillon_organismes_qualitatif.json
"""

from __future__ import annotations

import csv
import json
import re
from pathlib import Path

from ingestion.models import SurveyFile

# ---------------------------------------------------------------------------
# Chemins
# ---------------------------------------------------------------------------

_HERE = Path(__file__).parent
REPO_ROOT = _HERE.parent.parent
DATA_DIR = REPO_ROOT / "data" / "medaillon_organismes_qualitatif"
RAW_FILE = DATA_DIR / "medaillon_organismes_qualitatif.csv"  # avec PII (jamais lu par les rails)
DEID_FILE = DATA_DIR / "medaillon_organismes_qualitatif_deid.csv"  # sans PII → raw_data_file
# Questionnaire SurveyJS : version internet (105/130), wording canonique. La
# version téléphone ne diffère que par des préfixes de numérotation et n'apporte
# aucune colonne CSV supplémentaire (q25 téléphone n'est pas dans les données).
QUESTIONNAIRE_FILE = DATA_DIR / "questionnaire_organismes.json"
OUT_FILE = REPO_ROOT / "ingestion" / "normalized" / "medaillon_organismes_qualitatif.json"

# ---------------------------------------------------------------------------
# Constantes du sondage
# ---------------------------------------------------------------------------

SURVEY_ID = "medaillon_organismes_qualitatif"
SURVEY_NAME = (
    "Comité des usagers du CIUSSS de l'Est-de-l'Île-de-Montréal "
    "— Volet organismes communautaires"
)
YEAR = 2026
SURVEY_MONTH = 5  # terrain démarré en mai 2026
POLLSTER = "Médaillon"
LANGUAGE = "fr"

# Rail microdonnées (LECTURE SEULE, additif, ignoré par le rail catalogue).
WEIGHT_VAR = None  # aucun poids → weight_source='uniform'
RESPONDENT_ID_VAR = None  # response_id = horodatage non numérique → index de ligne

# Colonnes de métadonnées (NON des questions). Retirées de la liste des questions
# du catalogue ; elles restent néanmoins dans le Parquet (le rail microdonnées
# écrit toutes les colonnes du CSV dé-identifié) — c'est voulu pour `mode`.
META_COLS = frozenset(
    {
        "response_id",
        "mode",
        "participant_email",
        "participant_name",
        "submitted_at",
        "doublon_email",
    }
)
# Retirées du CSV dé-identifié : anonymisation totale.
PII_COLS = ("participant_email", "participant_name")

TAGS = [
    "organismes communautaires",
    "droits des usagers",
    "santé et services sociaux",
    "CIUSSS Est-de-l'Île-de-Montréal",
    "qualitatif",
]


def _clean_text(text: str) -> str:
    """Retire le markup HTML éventuel et normalise les espaces (verbatim-safe)."""
    if not text:
        return ""
    text = re.sub(r"<[^>]+>", " ", text)
    text = text.replace("&nbsp;", " ")
    return re.sub(r"\s+", " ", text).strip()


# ---------------------------------------------------------------------------
# Étape 0 — CSV dé-identifié (anonymisation totale)
# ---------------------------------------------------------------------------


def write_deid_csv() -> int:
    """Écrit `DEID_FILE` = `RAW_FILE` sans les colonnes PII. Retourne le nb de lignes.

    Lu en `utf-8-sig` (le brut porte un BOM) et réécrit en `utf-8` sans BOM, pour
    que `pandas.read_csv(encoding="utf-8")` du rail microdonnées lise des noms de
    colonnes propres (un BOM collerait « \\ufeff » au premier nom de colonne).
    """
    with open(RAW_FILE, encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        src_cols = list(reader.fieldnames or [])
        rows = list(reader)

    kept_cols = [c for c in src_cols if c not in PII_COLS]
    with open(DEID_FILE, "w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=kept_cols, extrasaction="ignore")
        writer.writeheader()
        for row in rows:
            writer.writerow({c: row.get(c, "") for c in kept_cols})
    return len(rows)


# ---------------------------------------------------------------------------
# Mapping colonne CSV → wording SurveyJS
# ---------------------------------------------------------------------------


def _questionnaire_titles() -> dict[str, str]:
    """{name SurveyJS: title nettoyé} pour tous les éléments porteurs d'un titre."""
    j = json.loads(QUESTIONNAIRE_FILE.read_text(encoding="utf-8"))
    titles: dict[str, str] = {}
    for page in j.get("pages", []):
        for el in page.get("elements", []):
            name = el.get("name")
            title = el.get("title")
            if name and title:
                titles[name] = _clean_text(str(title))
    return titles


def _question_text_for(col: str, titles: dict[str, str]) -> str:
    """Wording verbatim d'une colonne CSV.

    - colonne = nom d'un élément SurveyJS (`q1_1`, `q4`, `q18_3`…) → son titre ;
    - colonne `qX-Comment` (précision libre « autre » d'une question à choix) →
      titre de la question parente `qX` (le champ ouvert répond à cette question).
    """
    if col in titles:
        return titles[col]
    if col.endswith("-Comment"):
        base = col[: -len("-Comment")]
        if base in titles:
            return titles[base]
    raise KeyError(f"Colonne CSV {col!r} sans wording dans {QUESTIONNAIRE_FILE.name}")


def _csv_columns() -> list[str]:
    """En-tête du CSV brut (source des noms de variable RAW, PII incluse)."""
    with open(RAW_FILE, encoding="utf-8-sig", newline="") as f:
        return next(csv.reader(f))


def extract() -> dict:
    """Construit le SurveyFile : 1 parent + 29 questions ouvertes."""
    titles = _questionnaire_titles()
    columns = _csv_columns()
    question_cols = [c for c in columns if c not in META_COLS]

    n_respondents = sum(1 for _ in _iter_rows())

    questions = []
    for col in question_cols:
        questions.append(
            {
                "variable": col,
                "question_text": _question_text_for(col, titles),
                "response_options": [],
                "var_type": "open",  # text_kind (prose) dérivé au build par open_text.py
                "is_sociodemo": False,
                "sociodemo_type": None,
                "concepts": [],
                "themes": [],
            }
        )

    return {
        "survey": {
            "survey_id": SURVEY_ID,
            "survey_name": SURVEY_NAME,
            "year": YEAR,
            "survey_month": SURVEY_MONTH,
            "pollster": POLLSTER,
            "language": LANGUAGE,
            "n_respondents": n_respondents,
            "raw_data_file": DEID_FILE.name,  # les rails lisent le CSV dé-identifié
            "tags": TAGS,
        },
        "questions": questions,
    }


def _iter_rows():
    with open(RAW_FILE, encoding="utf-8-sig", newline="") as f:
        yield from csv.DictReader(f)


if __name__ == "__main__":
    n_deid = write_deid_csv()
    print(
        f"CSV dé-identifié : {DEID_FILE.name} ({n_deid} lignes, "
        f"PII retirée : {', '.join(PII_COLS)})"
    )

    data = extract()
    validated = SurveyFile.model_validate(data)

    OUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    OUT_FILE.write_text(
        json.dumps(validated.model_dump(), ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    print(f"Survey ID  : {validated.survey.survey_id}")
    print(f"Répondants : {validated.survey.n_respondents}")
    print(f"Questions  : {len(validated.questions)} (toutes var_type=open)")
