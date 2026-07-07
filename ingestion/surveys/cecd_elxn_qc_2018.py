"""Extraction normalisée — cecd_elxn_qc_2018.

Source : IPsos_oct_2018_17-057727_V.SAV (SPSS)
         Panel électoral sur l'élection québécoise de 2018, firme IPSOS.
         Panel sur les intentions de vote provinciales, vague pré-électorale
         réalisée en septembre 2018 et vague post-électorale réalisée en
         octobre 2018 (élection le 1er octobre 2018 — majorité CAQ), ~1250
         répondants, sondages administrés en ligne (75 %) et par téléphone
         (25 %).
         Cf. « Livre de codes: Sondage panel sur l'élection québécoise de
         2018.pdf ».

Encodage : le fichier SAV est lu avec l'encodage par défaut de pyreadstat
(latin-1/cp1252 inféré par SPSS) ; les accents sont correctement restitués
sans option supplémentaire.

Usage :
    uv run python ingestion/surveys/cecd_elxn_qc_2018.py
    → écrit ingestion/normalized/cecd_elxn_qc_2018.json
"""

from __future__ import annotations

import json
from pathlib import Path

import pyreadstat

from ingestion.canonical import canonical_sociodemo_text
from ingestion.models import SurveyFile
from ingestion.validate import fabrication_reason

# ---------------------------------------------------------------------------
# Chemins
# ---------------------------------------------------------------------------

_HERE = Path(__file__).parent
REPO_ROOT = _HERE.parent.parent
DATA_DIR = REPO_ROOT / "data" / "cecd_elxn_qc_2018"
SAV_FILE = DATA_DIR / "IPsos_oct_2018_17-057727_V.SAV"
OUT_FILE = REPO_ROOT / "ingestion" / "normalized" / "cecd_elxn_qc_2018.json"

# ---------------------------------------------------------------------------
# Constantes du sondage
# ---------------------------------------------------------------------------

SURVEY_ID = "cecd_elxn_qc_2018"
SURVEY_NAME = "Panel électoral du Québec 2018 - vagues pré/post-électorales (CECD)"
YEAR = 2018
POLLSTER = "Ipsos"
LANGUAGE = "fr"

# ---------------------------------------------------------------------------
# Variables « rating scale » (échelles numériques d'accord/intensité)
# ---------------------------------------------------------------------------
# Batteries d'énoncés notés sur une échelle numérique (1-7, 1-10, 0-10) avec
# un code NSP séparé — value labels présentes mais var_type "scale" plutôt
# que "single" (nominal), plus fidèle à la nature de la mesure.
SCALE_VARS: set[str] = {
    "q1a",
    "q5_1",
    "q5_2",
    "q6_01",
    "q6_02",
    "q6_03",
    "q6_04",
    "q6_05",
    "q6_06",
    "q6_07",
    "q6_08",
    "q6_09",
    "q6_10",
    "q6_11",
    "q6_12",
    "q6_13",
    "q6_14",
    "rts_q8",
}

# ---------------------------------------------------------------------------
# Variables EXCLUES (techniques, pondérations, ou dérivées/recodées)
# ---------------------------------------------------------------------------
# Aucune valeur analytique propre — ce ne sont pas des questions posées
# verbatim aux répondants, mais soit de l'administration terrain/méthodologie
# d'échantillonnage, soit des recodages/regroupements/combinaisons d'une (ou
# plusieurs) variable(s) substantielle(s) déjà couverte(s) par ailleurs.
# Vérifié dans les données (comparaison des distributions de valeurs entre la
# variable dérivée et sa/ses variable(s) source(s), formules de dérivation
# explicites dans les value labels, libellés contenant "recodé(e)", "en X
# groupes", "combinaison", "synthèse"...).
EXCLUDED_VARS: dict[str, str] = {
    # --- Administration / identifiants ---
    "id": "identifiant répondant (technique)",
    "matchid": "identifiant de jumelage panel pré/post (technique, sans value labels)",
    "repondant_post": (
        "indicateur administratif de participation à la vague post-électorale "
        "(flag binaire sans value labels, pas une question)"
    ),
    "patron": (
        "synthèse dérivée du pattern de réponse pré/post (codes composites "
        "sans value labels, pas un énoncé de question)"
    ),
    # --- Méthodologie de collecte / screening téléphonique ---
    "method": "méthodologie de collecte (CATI landline/CATI cell/Web)",
    "langfix": (
        "métadonnée d'administration (langue de l'entrevue téléphonique, "
        "pas une caractéristique du répondant)"
    ),
    "cel1": "screening téléphonique (méthodologie d'échantillonnage dual-frame landline/cell)",
    "qb": "screening téléphonique (méthodologie d'échantillonnage dual-frame landline/cell)",
    "qbb": "screening téléphonique (méthodologie d'échantillonnage dual-frame landline/cell)",
    "q4xx": "screening téléphonique (méthodologie d'échantillonnage dual-frame landline/cell)",
    "phoneown": (
        "type de ligne téléphonique dérivé de qb/qbb (formule de dérivation explicite "
        "dans les value labels : « [QBB=NO, OR QB=DK/REF, SAMPLE=LANDLINE] »)"
    ),
    # --- Pondérations statistiques ---
    "weight": "pondération statistique",
    "weight_web": "pondération statistique (volet web seul)",
    "weight_rts": "pondération statistique (volet post-électoral « retour sur le scrutin »)",
    # --- Regroupements/recodages géographiques dérivés ---
    "region": "recodage dérivé de `fsa_tabl` (région en 4 groupes au lieu de 5)",
    # --- Combinaisons/recodages dérivés d'une question substantielle ---
    "rv1ab": (
        "combinaison dérivée de `rv1a` + `rv1b` (variable « leaner » fusionnée : "
        "identique à `rv1b` quand renseignée, sinon à `rv1a`)"
    ),
    "vote": (
        "combinaison dérivée de `rts_q1` (a voté ?) + `rts_q2` (pour qui) — "
        "comportement de vote synthétisé"
    ),
    "winner": "recodage dérivé de `q2b` (regroupé de 6 à 3 catégories : PLQ/CAQ/autres+NSP)",
    "sure": "recodage dérivé de `qc` (regroupé de 5 à 3 catégories de certitude)",
    "raison1": "recodage dérivé de `rts_q3a`/`q3a2` (regroupement en 13 catégories synthétiques)",
    "raison2": "recodage dérivé de `rts_q3a`/`q3a2` (regroupement en 13 catégories synthétiques)",
    "comport": "synthèse dérivée du comportement de vote pré/post (recodée à partir de `patron`)",
    "comport2": (
        "synthèse dérivée du comportement de vote pré/post (recodée, variante -2 de `comport`)"
    ),
    "independance": (
        "indice binaire dérivé de `rts_q7` (opinion sur l'indépendance recodée en 0/1, "
        "sans value labels)"
    ),
    "scolU": (
        "indicateur binaire dérivé de `d3` (scolarité universitaire recodée en 0/1, "
        "sans value labels)"
    ),
}

# ---------------------------------------------------------------------------
# Classification des variables socio-démographiques
# ---------------------------------------------------------------------------
#   fsa_tabl → region      (libellé raw "Regions" exploitable → verbatim)
#   s1       → language    (langue maternelle, libellé raw riche → verbatim)
#   age      → age         (libellé raw "Age - Total" → verbatim, non dégénéré
#                            au sens du garde-fou : distinct du nom de variable)
#   d3       → education   (libellé raw riche → verbatim)
#   d4       → occupation  (libellé raw riche → verbatim)
#   d5       → income      (libellé raw riche → verbatim)
#   sexfix   → gender      (libellé raw "sexfix.  Sexe:" → verbatim)
# Pour une sociodémo dont le libellé raw serait absent/dégénéré, l'extracteur
# retomberait sur le wording canonique (ingestion/canonical.py) ; ici tous les
# libellés raw passent le garde-fou et restent verbatim.
SOCIODEMO_VARS: dict[str, str] = {
    "fsa_tabl": "region",
    "s1": "language",
    "age": "age",
    "d3": "education",
    "d4": "occupation",
    "d5": "income",
    "sexfix": "gender",
}


# ---------------------------------------------------------------------------
# Fonction principale
# ---------------------------------------------------------------------------


def extract() -> dict:
    """Lit le fichier SAV et retourne le dict SurveyFile normalisé.

    Aucun accès réseau, aucun embedding — pure extraction de structure.
    """
    # L'encodage par défaut de pyreadstat (latin-1/cp1252 inféré depuis SPSS)
    # produit des accents corrects pour ce fichier.
    df, meta = pyreadstat.read_sav(str(SAV_FILE))

    var_labels: dict[str, str] = dict(meta.column_names_to_labels or {})
    val_labels: dict[str, dict] = dict(meta.variable_value_labels or {})

    questions = []
    for col in df.columns:
        if col in EXCLUDED_VARS:
            continue

        raw_label = (var_labels.get(col) or "").strip()
        sociodemo_type = SOCIODEMO_VARS.get(col)

        # Sociodémo au libellé raw absent/dégénéré (indistinguable d'un nom de
        # variable) : on retombe sur le wording CANONIQUE versionné plutôt que
        # d'exclure (cf. ingestion/canonical.py). Sinon, verbatim du raw.
        if sociodemo_type and (not raw_label or fabrication_reason(col, raw_label)):
            question_text = canonical_sociodemo_text(sociodemo_type)
            if question_text is None:
                continue  # sociodemo_type sans wording canonique → exclu
        else:
            # Pas de fallback `or col` : interdit par CONVENTIONS.md (fabriquerait
            # un question_text à partir du nom de variable). On exclut plutôt.
            question_text = raw_label
            if not question_text:
                continue

        # Construire les options de réponse depuis les value labels SAV
        raw_opts: dict = val_labels.get(col, {})
        response_options = []
        for code, label in sorted(raw_opts.items(), key=lambda kv: float(kv[0])):
            # Convertir les codes float entiers (1.0, 2.0 …) en int
            if isinstance(code, float) and code == int(code):
                code = int(code)
            response_options.append({"code": code, "label": str(label)})

        # Inférer le type de variable
        dtype_str = str(df[col].dtype)
        if dtype_str == "object":
            var_type = "open"  # chaîne de caractères (verbatim ouvert)
        elif col in SCALE_VARS:
            var_type = "scale"  # échelle numérique d'accord/intensité
        elif raw_opts:
            var_type = "single"  # numérique avec étiquettes → choix unique
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
            "tags": ["electoral", "provincial", "québec", "panel", "2018"],
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
    non_empty_text = sum(1 for q in validated.questions if q.question_text.strip())

    print(f"Sondage   : {validated.survey.survey_id}")
    print(f"Répondants: {validated.survey.n_respondents}")
    print(f"Questions : {n_q} total, {n_with_opts} avec options de réponse")
    print(f"Socio-démo: {n_sd}")
    print(f"question_text non vides : {non_empty_text}/{n_q}")
    print(f"Fichier JSON : {OUT_FILE}")

    # Aperçu des socio-démos
    print("\nSocio-démo flaggées :")
    for q in validated.questions:
        if q.is_sociodemo:
            print(f"  {q.variable} ({q.sociodemo_type}): {q.question_text!r}")
            if q.response_options:
                print(f"    options: {[o.label for o in q.response_options[:4]]}")

    # Vérification des accents (spot-check)
    print("\nSpot-check accents (premières réponses avec accents attendus) :")
    for q in validated.questions:
        for o in q.response_options:
            if any(c in o.label for c in "éèêàùîôûç"):
                print(f"  {q.variable} → {o.label!r}")
                break
