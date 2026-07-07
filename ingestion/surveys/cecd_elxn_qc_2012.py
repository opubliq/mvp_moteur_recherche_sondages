"""Extraction normalisée — cecd_elxn_qc_2012.

Source : repondants_post_2012.sav (SPSS)
         Panel électoral provincial Québec 2012 (volet post-électoral), firme
         CROP. Sondage préélectoral réalisé du 24 au 26 août 2012, sondage
         postélectoral réalisé du 10 au 18 septembre 2012 (élection le
         4 septembre 2012), 844 répondants (téléphone).
         Cf. « Livre de codes - Panel Québec 2012.pdf ».

Encodage : le fichier SAV est lu avec l'encodage par défaut de pyreadstat
(latin-1/cp1252 inféré par SPSS) ; les accents sont correctement restitués
sans option supplémentaire.

Usage :
    uv run python ingestion/surveys/cecd_elxn_qc_2012.py
    → écrit ingestion/normalized/cecd_elxn_qc_2012.json
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
DATA_DIR = REPO_ROOT / "data" / "cecd_elxn_qc_2012"
SAV_FILE = DATA_DIR / "repondants_post_2012.sav"
OUT_FILE = REPO_ROOT / "ingestion" / "normalized" / "cecd_elxn_qc_2012.json"

# ---------------------------------------------------------------------------
# Constantes du sondage
# ---------------------------------------------------------------------------

SURVEY_ID = "cecd_elxn_qc_2012"
SURVEY_NAME = "Panel électoral du Québec 2012 - volet postélectoral (CECD)"
YEAR = 2012
POLLSTER = "CROP"
LANGUAGE = "fr"

# ---------------------------------------------------------------------------
# Variables EXCLUES (techniques, pondérations, ou dérivées/recodées)
# ---------------------------------------------------------------------------
# Aucune valeur analytique propre — ce ne sont pas des questions posées
# verbatim aux répondants, mais soit de l'administration terrain, soit des
# recodages/regroupements/combinaisons d'une (ou plusieurs) variable(s)
# substantielle(s) déjà couverte(s) par ailleurs. Vérifié dans les données
# (value labels identiques/recomposées, libellé contenant "recodé(e)",
# "en X groupes", "croisement", "dérivé", "Q2+Q3", "synthèse"...).
EXCLUDED_VARS: dict[str, str] = {
    # --- Administration / identifiants de questionnaire ---
    "quest": "numéro de questionnaire (identifiant administratif)",
    "questionnaire7701": "numéro de questionnaire (identifiant administratif)",
    # NB : `sexe` n'est PAS exclue. Son seul libellé raw est "sexe" (= nom de
    # variable), dégénéré, mais c'est une sociodémo universelle → wording
    # canonique via ingestion/canonical.py (cf. SOCIODEMO_VARS ci-dessous).
    # --- Métadonnées de gestion terrain (centre d'appels), sans label SAV ---
    "ResIntervCall_last": "métadonnée de gestion terrain (centre d'appels), sans label",
    "ResIntervCallName_last": "métadonnée de gestion terrain (centre d'appels), sans label",
    "ResLastCallDate_last": "métadonnée de gestion terrain (centre d'appels), sans label",
    "CallDurationInMinutes_last": "métadonnée de gestion terrain (centre d'appels), sans label",
    "resCallCount_last": "métadonnée de gestion terrain (centre d'appels), sans label",
    "resCodeResult_last": "métadonnée de gestion terrain (centre d'appels), sans label",
    "N_BREAK": "métadonnée de gestion terrain, sans label",
    "ResIntervCallName_pre": "métadonnée de gestion terrain (centre d'appels), sans label",
    "CallDurationInMinutes_pre": "métadonnée de gestion terrain (centre d'appels), sans label",
    "resCodeResult_pre": "métadonnée de gestion terrain (centre d'appels), sans label",
    "resCallCount_pre": "métadonnée de gestion terrain (centre d'appels), sans label",
    # --- Pondérations statistiques ---
    "pond": "pondération statistique",
    "pondam1": "pondération statistique",
    "pond_post": "pondération statistique",
    "pond_postam1": "pondération statistique",
    "pondvote": "pondération statistique (par le vote déclaré)",
    # --- Regroupements/croisements dérivés de variables déjà présentes ---
    "reg_3gr": "regroupement dérivé de `reg` (région en 3 groupes)",
    "age_3gr": "regroupement dérivé de `age` (âge en 3 groupes)",
    "lmat2": "recodage dérivé de `lmat` (langue maternelle en 2 catégories)",
    "reglang": "croisement dérivé de `reg` × `lmat`",
    # --- Recodages binaires/synthèses dérivés d'une question substantielle ---
    "definibin": "recodage binaire dérivé de `definitif` (1 seule modalité étiquetée)",
    "debat1": "recodage dérivé de `vudebatSRC` (mêmes modalités réordonnées + `non`)",
    "debat2": "recodage dérivé de `vudebat_CH_MA` (mêmes modalités réordonnées + `non`)",
    "debat3": "recodage dérivé de `vudebat_CH_LE` (mêmes modalités réordonnées + `non`)",
    "debat4": "recodage dérivé de `vudebat_MA_LE` (mêmes modalités réordonnées + `non`)",
    "debat": "compte dérivé du nombre de débats écoutés (sans value labels)",
    "interetrev": "indice dérivé du visionnement des débats (label l'indique explicitement)",
    "interetrev2": "indice dérivé du visionnement des débats (label l'indique explicitement)",
    "interetbin": "indice dérivé du visionnement des débats (label l'indique explicitement)",
    "interetrec": "indice dérivé du visionnement des débats (label l'indique explicitement)",
    "souv_rec": "recodage dérivé de `intvoteref` (intention de vote référendaire)",
    "intvoteprov": "combinaison dérivée Q2+Q3 de `intvoteprov1` + `intvoteprov2`",
    "vote2bis": "doublon dérivé (mêmes modalités/label que `intvoteprov`, combinaison Q2+Q3)",
    "vote1": "combinaison dérivée Q2+Q3, « après relance, avant répartition »",
    "vote3": "combinaison dérivée Q2+Q3, « après relance, après répartition »",
    "intvoteprovrec": "recodage dérivé de l'intention de vote provinciale",
    "vote2rec": "recodage alternatif dérivé de l'intention de vote provinciale",
    "voteprov2": "vote recodé, dérivé de `voteprov`",
    "voteprovrec": "recodage alternatif dérivé de `voteprov`",
    "influpersorec": "recodage dérivé de `influperso`",
    "influpersobin": "recodage binaire dérivé de `influperso` (1 seule modalité étiquetée)",
    "sefierev": "recodage inversé dérivé de `sefie`",
    "sondbonsrev": "recodage inversé dérivé de `sondbons`",
    "patron": (
        "synthèse dérivée pré/post des changements de vote "
        "(pas un énoncé de question, sans value labels)"
    ),
    "changesynt": "synthèse dérivée des changements de vote entre le pré et le post",
    "changesyntrec": "recodage dérivé de `changesynt`",
}

# ---------------------------------------------------------------------------
# Variables « mention multiple » (grille de sélection multiple)
# ---------------------------------------------------------------------------
# vudebat_m1..m4 : quatre colonnes "mention 1" à "mention 4" du même item à
# choix multiples (débats regardés) — chaque colonne encode le n-ième débat
# mentionné par le répondant, avec les mêmes modalités. Il ne s'agit pas de
# variables dérivées (aucune n'est un recodage d'une autre), mais d'une
# décomposition standard d'une question à réponses multiples en colonnes.
MULTI_MENTION_VARS: set[str] = {"vudebat_m1", "vudebat_m2", "vudebat_m3", "vudebat_m4"}

# ---------------------------------------------------------------------------
# Classification des variables socio-démographiques
# ---------------------------------------------------------------------------
#   reg   → région    (libellé raw "REGION" exploitable → verbatim)
#   age   → groupe d'âge (libellé raw riche → verbatim)
#   lmat  → langue maternelle (libellé raw riche → verbatim)
#   sexe  → gender    (libellé raw dégénéré "sexe" → wording CANONIQUE)
# Pour une sociodémo dont le libellé raw est absent/dégénéré, l'extracteur
# retombe sur le wording canonique versionné (ingestion/canonical.py), plutôt
# que d'exclure la variable. Un libellé raw riche reste toujours verbatim.
SOCIODEMO_VARS: dict[str, str] = {
    "reg": "region",
    "age": "age",
    "lmat": "language",
    "sexe": "gender",
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
        has_verbatims = False
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
        if col in MULTI_MENTION_VARS:
            var_type = "multiple"  # grille de sélection multiple (mention 1..4)
        elif dtype_str == "object":
            var_type = "open"
            has_verbatims = True  # chaîne de caractères
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
            "tags": ["electoral", "provincial", "québec", "panel", "2012"],
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
