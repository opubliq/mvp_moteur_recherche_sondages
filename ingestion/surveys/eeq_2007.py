"""Extraction normalisée — eeq_2007.

Source : Quebec Election Study 2007 (SPSS).sav
         Étude électorale québécoise (EEQ) 2007, portant sur l'élection
         provinciale québécoise du 26 mars 2007 (chefs : Jean Charest — PLQ,
         André Boisclair — PQ, Mario Dumont — ADQ), 2175 répondants,
         collecte téléphonique et Web (cf. variable `type`).
         Codebook complémentaire disponible :
         « Quebec Election Study 2007 FR.doc/.md » (wording complet en cas de
         libellé SAV tronqué, non utilisé ici — les labels SAV ne sont pas
         tronqués pour ce fichier).

Encodage : fichier SAV lu avec `apply_value_formats=False` (comme eeq_2014) —
sans cette option, pyreadstat substitue directement les libellés de valeur aux
codes dans les colonnes catégorielles (beaucoup de variables de ce fichier sont
stockées en type SPSS *string*, y compris les questions à choix fermé codées
'01', '02'... ce qui rendrait les codes bruts illisibles). Les variable labels
et value labels sont entièrement issus du SAV — aucun texte inventé.

Particularité de ce fichier : de nombreuses variables catégorielles sont
stockées en type SPSS *string* (codes zéro-paddés comme '01', '02', '96'...)
plutôt qu'en numérique avec format. `is_text_column()` (qui teste le dtype)
classerait donc à tort ces colonnes comme `open` (texte libre) si on
l'appliquait en premier. La classification ci-dessous vérifie donc la présence
de *value labels* AVANT de tester `is_text_column` : une colonne avec des
value labels est catégorielle (`single`/`scale`), qu'elle soit stockée en
str ou en float. Aucune colonne de ce sondage n'est du texte libre verbatim :
même `q1` (enjeu le plus important, réponse ouverte à l'origine) a été codée
en catégories fermées par la maison de sondage (incluant un code écran-témoin
96 « veuillez inscrire votre réponse » pour les réponses non prévues), donc
`single` et non `open`.

Usage :
    uv run python ingestion/surveys/eeq_2007.py
    → écrit ingestion/normalized/eeq_2007.json
"""

from __future__ import annotations

import json
from pathlib import Path

import pyreadstat

from ingestion.canonical import canonical_sociodemo_text
from ingestion.models import SurveyFile
from ingestion.open_text import is_text_column
from ingestion.validate import fabrication_reason

# ---------------------------------------------------------------------------
# Chemins
# ---------------------------------------------------------------------------

_HERE = Path(__file__).parent
REPO_ROOT = _HERE.parent.parent
DATA_DIR = REPO_ROOT / "data" / "eeq_2007"
SAV_FILE = DATA_DIR / "Quebec Election Study 2007 (SPSS).sav"
WEIGHT_VAR = "pond"  # poids fourni par la maison de sondage → weight_source='provided'
RESPONDENT_ID_VAR = "quest"  # numéro de questionnaire RAW = identité de ligne
OUT_FILE = REPO_ROOT / "ingestion" / "normalized" / "eeq_2007.json"

# ---------------------------------------------------------------------------
# Constantes du sondage
# ---------------------------------------------------------------------------

SURVEY_ID = "eeq_2007"
SURVEY_NAME = "Étude électorale québécoise 2007 (EEQ)"
YEAR = 2007
POLLSTER = "EEQ (Étude électorale québécoise)"
LANGUAGE = "fr"

# ---------------------------------------------------------------------------
# Variables EXCLUES (techniques / administratives / méthodologie)
# ---------------------------------------------------------------------------

# quest : identifiant de questionnaire, valeur unique par répondant (technique)
# codep : code postal brut, sans value labels (identifiant géographique
#         technique — la région administrative est déjà couverte par `nomx`)
# pond  : pondération statistique
# type  : mode de collecte (téléphonique/Web) — méthodologie d'administration,
#         pas une caractéristique du répondant ni une question posée
EXCLUDED_VARS: dict[str, str] = {
    "quest": "identifiant de questionnaire (technique, valeur unique par répondant)",
    "codep": "code postal brut (identifiant géographique technique, sans value labels)",
    "pond": "pondération statistique",
    "type": "méthodologie de collecte (mode d'administration téléphonique/Web)",
}

# ---------------------------------------------------------------------------
# Variables socio-démographiques
# ---------------------------------------------------------------------------
#   nomx  → region              (libellé raw riche : "NOM. REGIONS
#                                 ADMINISTRATIVES DU QUÉBEC: 21 SOUS-GROUPES")
#   q75   → age                 (année de naissance, continue)
#   q76   → gender              (libellé raw "(NE PAS LIRE) Indiquez le sexe...")
#   q77   → education           (niveau d'éducation)
#   q78   → income              (revenu total du ménage avant impôts)
#   q79   → occupation          (situation d'emploi : autonome/salarié/retraité...)
#   q80   → language_home       (langue parlée le plus souvent à la maison)
#   langu → language            (langue apprise en premier / mère, canonique
#                                 "language" = langue maternelle)
#   ethn1 → ethnicity           (origine ethnique)
#   q81   → religion_practice   (fréquence de pratique religieuse)
# Tous les libellés raw ci-dessus sont riches (non dégénérés) → verbatim ;
# le fallback canonique (`canonical_sociodemo_text`) n'est donc déclenché pour
# aucune de ces variables dans ce sondage, mais reste codé par cohérence avec
# les autres extracteurs / en cas d'évolution du raw.
SOCIODEMO_VARS: dict[str, str] = {
    "nomx": "region",
    "q75": "age",
    "q76": "gender",
    "q77": "education",
    "q78": "income",
    "q79": "occupation",
    "q80": "language_home",
    "langu": "language",
    "ethn1": "ethnicity",
    "q81": "religion_practice",
}

# ---------------------------------------------------------------------------
# Variables « scale » (échelles numériques d'intérêt/intensité/thermomètre)
# ---------------------------------------------------------------------------
# q14/q15  : échelle d'intérêt 0-10 (élection / politique en général)
# q28-q32  : thermomètres 0-100 pour les partis (PLQ, PQ, ADQ, QS, Vert)
# q39-q43  : thermomètres 0-100 pour les chefs (Charest, Boisclair, Dumont,
#            David, McKay)
# q64/q65  : thermomètres 0-100 (syndicats, entreprises)
SCALE_VARS: set[str] = {
    "q14",
    "q15",
    "q28",
    "q29",
    "q30",
    "q31",
    "q32",
    "q39",
    "q40",
    "q41",
    "q42",
    "q43",
    "q64",
    "q65",
}

# ---------------------------------------------------------------------------
# Variables « continuous » forcées malgré la présence de value labels
# ---------------------------------------------------------------------------
# q75 : année de naissance (71 valeurs distinctes), seule valeur étiquetée =
#       le code sentinelle 9999 « Refus ». Une variable authentiquement
#       continue, pas un choix fermé — la règle générale (raw_opts non vide →
#       "single") la classerait à tort.
CONTINUOUS_VARS: set[str] = {"q75"}


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
        if col in EXCLUDED_VARS:
            continue

        raw_label = (var_labels.get(col) or "").strip()
        sociodemo_type = SOCIODEMO_VARS.get(col)

        # Sociodémo au libellé raw absent/dégénéré : fallback canonique.
        # Sinon (cas de ce sondage : tous les libellés sont riches) : verbatim.
        if sociodemo_type and (not raw_label or fabrication_reason(col, raw_label)):
            question_text = canonical_sociodemo_text(sociodemo_type)
            if question_text is None:
                continue  # sociodemo_type sans wording canonique → exclu
        else:
            # Pas de fallback `or col` (interdit par CONVENTIONS.md) : on
            # exclut plutôt que de fabriquer un question_text.
            question_text = raw_label
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
            response_options.append({"code": code, "label": str(label).strip()})

        # Inférer le type de variable. IMPORTANT : la présence de value labels
        # est vérifiée AVANT `is_text_column`, car de nombreuses variables
        # catégorielles de ce fichier sont stockées en type SPSS string (codes
        # '01', '02'...) — `is_text_column` (test de dtype) les classerait à
        # tort en `open` si on l'appliquait en premier (cf. docstring module).
        if col in SCALE_VARS:
            var_type = "scale"
        elif col in CONTINUOUS_VARS:
            var_type = "continuous"
        elif raw_opts:
            var_type = "single"
        elif is_text_column(df[col]):
            var_type = "open"
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
            "raw_data_file": SAV_FILE.name,
            "tags": ["electoral", "provincial", "québec", "2007", "eeq"],
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
                print(f"    options: {[o.label for o in q.response_options[:4]]}")

    # Variables EXCLUES
    print(f"\nVariables exclues ({len(EXCLUDED_VARS)}) :")
    for v, reason in sorted(EXCLUDED_VARS.items()):
        print(f"  {v}: {reason}")

    # Spot-check: quelques question_text/labels avec accents
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
