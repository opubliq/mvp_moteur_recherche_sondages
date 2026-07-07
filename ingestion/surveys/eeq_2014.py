"""Extraction normalisée — eeq_2014.

Source : Quebec Election Study 2014.sav (SPSS)
         Étude électorale québécoise 2014, Université McGill.

Encodage : fichier SAV lu avec pyreadstat (encodage SPSS par défaut).
Les variable labels et value labels sont entièrement issus du SAV
— aucun texte inventé.

Usage :
    uv run python ingestion/surveys/eeq_2014.py
    → écrit ingestion/normalized/eeq_2014.json
"""

from __future__ import annotations

import json
import re
from pathlib import Path

import pyreadstat

from ingestion.models import SurveyFile

# ---------------------------------------------------------------------------
# Chemins
# ---------------------------------------------------------------------------

_HERE = Path(__file__).parent
REPO_ROOT = _HERE.parent.parent
DATA_DIR = REPO_ROOT / "data" / "eeq_2014"
SAV_FILE = DATA_DIR / "Quebec Election Study 2014.sav"
OUT_FILE = REPO_ROOT / "ingestion" / "normalized" / "eeq_2014.json"

# ---------------------------------------------------------------------------
# Constantes du sondage
# ---------------------------------------------------------------------------

SURVEY_ID = "eeq_2014"
SURVEY_NAME = "Étude électorale québécoise 2014 (EEQ)"
YEAR = 2014
POLLSTER = "Université McGill"
LANGUAGE = "fr"

# ---------------------------------------------------------------------------
# Variables EXCLUES (techniques / sans intérêt analytique)
# ---------------------------------------------------------------------------

# QUEST    : numéro de questionnaire, pas de label, valeur unique (0)
# SDAT     : date d'entrevue, pas de value labels, variable de gestion
# SMAGE    : âge calculé continu, aucun value label (→ CLAGE le remplace)
# POND     : pondération, pas de value labels
# GREET    : page d'accueil du sondage, unique valeur "continue"
# SEL1-4   : flags de randomisation (split sample), pas des questions
# CODE1-3  : caractères du code postal (variable de localisation technique)
EXCLUDED_VARS: set[str] = {
    "QUEST",
    "SDAT",
    "SMAGE",
    "POND",
    "GREET",
    "SEL1",
    "SEL2",
    "SEL3",
    "SEL4",
    "CODE1",
    "CODE2",
    "CODE3",
}

# ---------------------------------------------------------------------------
# Variables socio-démographiques
# ---------------------------------------------------------------------------

SOCIODEMO_VARS: dict[str, str] = {
    "QAGE": "age",  # année de naissance (continue)
    "CLAGE": "age",  # groupe d'âge (catégorielle)
    "QSEXE": "gender",  # sexe
    "QLANG": "language",  # langue maternelle
    "QREGION": "region",  # région du Québec
    "REGIO": "region",  # région métropolitaine (agrégée)
    "QSCOL": "education",  # niveau de scolarité
    "Q57": "income",  # revenu total du ménage
    "Q58": "employment",  # situation d'emploi
    "Q61": "union_membership",  # syndicalisation
    "Q62": "religion",  # appartenance religieuse
    "Q63": "religion_type",  # dénomination religieuse
    "Q64": "religion_practice",  # fréquence des pratiques religieuses
    "Q65": "place_of_birth",  # lieu de naissance
    "Q66": "language_home",  # langue parlée à la maison
    "Q67": "ethnicity",  # origine ethnique
    "Q68": "civil_status",  # statut civil
}

# ---------------------------------------------------------------------------
# Variables de type échelle (0-10 ou 0-100)
# ---------------------------------------------------------------------------

# Q29A-G  : thermomètre 0-100 pour les politiciens
# Q43A-B  : thermomètre 0-100 pour syndicats/entreprises
# Q31A-F  : échelle gauche-droite 0-10 pour les partis
# Q32     : position gauche-droite personnelle 0-10
# Q53     : importance référendum indépendance 0-10
# Q54     : importance charte laïcité 0-10
SCALE_VARS: set[str] = {
    "Q29A",
    "Q29B",
    "Q29C",
    "Q29D",
    "Q29E",
    "Q29F",
    "Q29G",
    "Q43A",
    "Q43B",
    "Q31A",
    "Q31B",
    "Q31C",
    "Q31D",
    "Q31E",
    "Q31F",
    "Q32",
    "Q53",
    "Q54",
}

# ---------------------------------------------------------------------------
# Nettoyage du markup HTML-like SPSS
# ---------------------------------------------------------------------------

_HTML_TAG_RE = re.compile(r"\{/?[a-zA-Z]+\}")  # {u}, {/u}, {b}, {/b}, {br}
_NBSP_RE = re.compile(r"&nbsp;")


def _clean_text(text: str) -> str:
    """Supprime les balises de mise en forme SPSS inline ({u}, {b}, {br}, &nbsp;)."""
    text = _HTML_TAG_RE.sub(" ", text)
    text = _NBSP_RE.sub(" ", text)
    # Collapsez les espaces multiples
    text = re.sub(r" {2,}", " ", text)
    return text.strip()


# ---------------------------------------------------------------------------
# Fonction principale
# ---------------------------------------------------------------------------


def extract() -> dict:
    """Lit le fichier SAV et retourne le dict SurveyFile normalisé.

    Tous les question_text proviennent des variable labels SAV réels.
    Tous les response_options proviennent des value labels SAV réels.
    Aucun accès réseau, aucun embedding — pure extraction de structure.
    """
    df, meta = pyreadstat.read_sav(str(SAV_FILE), apply_value_formats=False)

    var_labels: dict[str, str] = dict(meta.column_names_to_labels or {})
    val_labels: dict[str, dict] = dict(meta.variable_value_labels or {})

    questions = []
    for col in df.columns:
        has_verbatims = False
        # Exclusions techniques
        if col in EXCLUDED_VARS:
            continue

        raw_label = var_labels.get(col) or ""
        if not raw_label:
            # Pas de label SAV : on exclut plutôt qu'inventer
            continue

        question_text = _clean_text(raw_label)
        if not question_text:
            continue

        # Construire les options de réponse depuis les value labels SAV
        raw_opts: dict = val_labels.get(col, {})
        response_options = []
        for code, label in sorted(
            raw_opts.items(),
            key=lambda kv: float(kv[0]) if isinstance(kv[0], (int, float)) else str(kv[0]),
        ):
            # Convertir les codes float entiers (1.0, 2.0…) en int
            if isinstance(code, float) and code == int(code):
                code = int(code)
            response_options.append(
                {
                    "code": code,
                    "label": _clean_text(str(label)),
                }
            )

        # Inférer le type de variable
        dtype_str = str(df[col].dtype)
        if dtype_str == "object":
            var_type = "open"
            has_verbatims = True
        elif col in SCALE_VARS:
            var_type = "scale"
        elif raw_opts:
            var_type = "single"
        else:
            var_type = "continuous"  # QAGE : année de naissance continue

        is_sociodemo = col in SOCIODEMO_VARS
        sociodemo_type = SOCIODEMO_VARS.get(col)

        questions.append(
            {
                "variable": col,
                "question_text": question_text,
                "response_options": response_options,
                "var_type": var_type,
                "has_verbatims": has_verbatims,
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
            "raw_data_file": SAV_FILE.name,
            "tags": ["electoral", "provincial", "québec", "2014", "eeq"],
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

    # Écriture JSON
    OUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    OUT_FILE.write_text(
        json.dumps(validated.model_dump(), ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    n_q = len(validated.questions)
    n_sd = sum(1 for q in validated.questions if q.is_sociodemo)
    n_with_opts = sum(1 for q in validated.questions if q.response_options)
    n_empty_text = sum(1 for q in validated.questions if not q.question_text.strip())

    print(f"Sondage   : {validated.survey.survey_id}")
    print(f"Répondants: {validated.survey.n_respondents}")
    print(f"Questions : {n_q} total, {n_with_opts} avec options de réponse")
    print(f"Socio-démo: {n_sd}")
    print(f"question_text vides : {n_empty_text}/{n_q}")
    print(f"Fichier JSON : {OUT_FILE}")

    # Aperçu des socio-démos
    print("\nSocio-démo flaggées :")
    for q in validated.questions:
        if q.is_sociodemo:
            print(f"  {q.variable} ({q.sociodemo_type}): {q.question_text[:80]!r}")
            if q.response_options:
                print(f"    options: {[o.label for o in q.response_options[:3]]}")

    # Variables EXCLUES
    print(f"\nVariables exclues ({len(EXCLUDED_VARS)}) :")
    for v in sorted(EXCLUDED_VARS):
        reason = {
            "QUEST": "numéro de questionnaire (valeur unique, technique)",
            "SDAT": "date d'entrevue (pas de value labels, technique)",
            "SMAGE": "âge calculé continu sans value labels (remplacé par CLAGE)",
            "POND": "pondération — poids statistique",
            "GREET": "page d'accueil du sondage, valeur unique 'continue'",
            "SEL1": "flag randomisation split-sample (routing interne)",
            "SEL2": "flag randomisation split-sample (routing interne)",
            "SEL3": "flag randomisation split-sample (routing interne)",
            "SEL4": "flag randomisation split-sample (routing interne)",
            "CODE1": "caractère 1 du code postal (identification technique)",
            "CODE2": "caractère 2 du code postal (identification technique)",
            "CODE3": "caractère 3 du code postal (identification technique)",
        }.get(v, "technique")
        print(f"  {v}: {reason}")

    # Spot-check: quelques question_text avec accents
    print("\nSpot-check accents (premières réponses avec accents) :")
    shown = 0
    for q in validated.questions:
        for o in q.response_options:
            if any(c in o.label for c in "éèêàùîôûçÉÈÊÀÙÎÔÛÇ"):
                print(f"  {q.variable} → {o.label!r}")
                shown += 1
                break
        if shown >= 5:
            break
