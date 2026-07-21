"""Extraction normalisée — cecd_elxn_can_2011.

Source : repondantspost_2011.sav (SPSS)
         Panel électoral sur l'élection fédérale canadienne de 2011, firme
         CROP, échantillon québécois fusionné (715 répondants ayant répondu
         aux deux vagues). Vague pré-électorale réalisée du 13 au 20 avril
         2011, vague post-électorale réalisée du 12 au 14 mai 2011 (élection
         le 2 mai 2011 — « vague orange » du NPD, majorité conservatrice de
         Stephen Harper), sondage administré en ligne.
         Cf. « LivredeCodes_SondagePanel-CAN2011.pdf » et
         « sondage2011_post.docx ».

Encodage : le fichier SAV est lu avec l'encodage par défaut de pyreadstat
(latin-1/cp1252 inféré par SPSS) ; les accents sont correctement restitués
sans option supplémentaire.

Usage :
    uv run python ingestion/surveys/cecd_elxn_can_2011.py
    → écrit ingestion/normalized/cecd_elxn_can_2011.json
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
DATA_DIR = REPO_ROOT / "data" / "cecd_elxn_can_2011"
SAV_FILE = DATA_DIR / "repondantspost_2011.sav"
WEIGHT_VAR = "poids_census_post"  # poids fourni → weight_source='provided' (v33.3)
OUT_FILE = REPO_ROOT / "ingestion" / "normalized" / "cecd_elxn_can_2011.json"

# ---------------------------------------------------------------------------
# Constantes du sondage
# ---------------------------------------------------------------------------

SURVEY_ID = "cecd_elxn_can_2011"
SURVEY_NAME = "Panel électoral fédéral canadien 2011 - vagues pré/post-électorales (CECD)"
YEAR = 2011
POLLSTER = "CROP"
LANGUAGE = "fr"

# ---------------------------------------------------------------------------
# Variables EXCLUES (techniques, pondérations, ou dérivées/recodées)
# ---------------------------------------------------------------------------
# Aucune valeur analytique propre — ce ne sont pas des questions posées
# verbatim aux répondants, mais soit de l'administration terrain/méthodologie,
# soit des recodages/regroupements/combinaisons/inversions d'une (ou
# plusieurs) variable(s) substantielle(s) déjà couverte(s) par ailleurs.
# Vérifié dans les données (libellés contenant "recodé(e)", "en X groupes",
# "inversée", "+ relance", comparaison des value labels avec la/les
# variable(s) source(s), et pour Code1-5 comparaison valeur-par-valeur avec
# code1_num-code5_num — 0 mismatch sur 715 répondants, confirmant que Code1-5
# ne sont que la représentation textuelle redondante de code1_num-code5_num).
EXCLUDED_VARS: dict[str, str] = {
    # --- Administration / identifiants ---
    "quest": "numéro de questionnaire (identifiant technique, sans value labels)",
    # --- Pondérations statistiques ---
    "pondp_1000": "pondération statistique (CE/SCOL/3SC/LANGU/LANGM)",
    "pondp_1000_am1": "pondération statistique (CE/SCOL/3SC/LANGU/LANGM à moyenne 1)",
    "pdspart2008": "pondération statistique (fonction des résultats électoraux 2008)",
    "pdspart2011": "pondération statistique (fonction des résultats électoraux 2011)",
    "poids_census": "pondération statistique (par rapport au recensement)",
    "poids_census_post": "pondération statistique (recensement, 715 répondants post)",
    # --- Méthodologie / administration d'entrevue ---
    "S_LAN_post": (
        "métadonnée d'administration (langue d'entrevue post, "
        "pas une caractéristique du répondant)"
    ),
    # --- Regroupements/recodages dérivés (sociodémo) ---
    "reg_3gr": "recodage dérivé de `reg` (région en 3 groupes au lieu de 4)",
    "age_3gr": "recodage dérivé de `qage` (âge en 3 groupes au lieu de 7)",
    "age": (
        "recodage dérivé de `qage` (âge en 6 groupes au lieu de 7 — "
        "dernières catégories fusionnées)"
    ),
    "lusage2": "recodage dérivé de `qlanf` (langue d'usage recodée en français/autres)",
    "lmat2": "recodage dérivé de `qlanm` (langue maternelle recodée en français/anglais+autres)",
    "scol_3gr": "recodage dérivé de `qetud` (scolarité en 3 groupes)",
    "SCOL_4gr": "recodage dérivé de `qetud` (scolarité en 4 groupes)",
    "revenu": "recodage dérivé de `qreve` (revenu recodé)",
    # --- Combinaisons/recodages/inversions dérivés d'une question substantielle ---
    "intvoteprov": "combinaison dérivée de `prov1` + `prov2` (« Intvoteprov + relance »)",
    "souv": "combinaison dérivée de `souv1` + `souv2` (« Intvotesouv + relance »)",
    "SOUV_REC": "recodage dérivé de `souv` (question référendaire recodée en 3 catégories)",
    "satisfrev": "recodage dérivé de `sastf` (satisfaction gouvernement du Canada inversée)",
    "fed": "combinaison dérivée de `fede1` + `fede2` (« Intvotefed + relance »)",
    "intvotefed": "recodage dérivé de `fed` (partis regroupés BQ/NPD/PCC/PLC/PV et Autres)",
    "interetrev": "recodage dérivé de `z1` (intérêt pour la campagne inversé)",
    "indecis": "indicateur binaire dérivé de `z3` (être indécis(e), une seule valeur « oui »)",
    "votefed": "recodage dérivé de `z4` (parti voté regroupé BQ/NPD/PCC/PLC/PV et Autres)",
    "influpersorec": "recodage dérivé de `z7` (influence personnelle des sondages récodée)",
    "influenceoui": "indicateur binaire dérivé de `z7` (influence des sondages oui/non)",
    "sondbonsrev": "recodage dérivé de `z8` (perceptions des sondages inversée)",
    "voteprecfed": (
        "recodage dérivé de `z10` (parti voté en 2008 regroupé "
        "BQ/NPD/PCC/PLC/PV et Autres)"
    ),
    "change": "synthèse dérivée du changement de vote (technique, sans value labels)",
    "changesynt": "synthèse dérivée du changement de vote pré/post",
    "changesyntrec": "synthèse recodée dérivée du changement de vote pré/post",
    "patron": "synthèse dérivée du patron de réponse pré/post (technique, sans value labels)",
    "patron2b": (
        "synthèse dérivée du parcours de vote 2008-avril2011-mai2011 "
        "(combinaison à 3 chiffres)"
    ),
    "transfuges": "catégorisation dérivée des transferts de vote (recodage synthétique)",
    "transfert": "synthèse dérivée du parcours de vote 2008-2011 (combinaison à 2 chiffres)",
    # --- Doublons textuels redondants des variables codées ---
    "Code1": (
        "doublon textuel de `code1_num` (chaîne = value label de code1_num, "
        "vérifié 0 mismatch/715)"
    ),
    "Code2": "doublon textuel de `code2_num` (chaîne = value label de code2_num)",
    "Code3": "doublon textuel de `code3_num` (chaîne = value label de code3_num)",
    "Code4": "doublon textuel de `code4_num` (chaîne = value label de code4_num)",
    "Code5": "doublon textuel de `code5_num` (chaîne = value label de code5_num)",
}

# ---------------------------------------------------------------------------
# Classification des variables socio-démographiques
# ---------------------------------------------------------------------------
#   reg   → region      (libellé raw "S1. Region :" → verbatim)
#   qage  → age          (libellé raw "S2. Auquel des groupes d'âges..." → verbatim)
#   qlanm → language     (libellé raw "S4. Quelle est votre langue maternelle..." → verbatim)
#   sexe  → gender       (libellé raw "S5. Êtes-vous un homme ou une femme?" → verbatim)
#   occup → occupation   (libellé raw "S6. ... votre situation actuelle..." → verbatim)
#   qetud → education    (libellé raw "S9. Quel est le niveau de scolarité..." → verbatim)
#   qreve → income       (libellé raw "S10. ... revenu annuel total..." → verbatim)
# Tous les libellés raw ci-dessus sont riches (questions réellement posées),
# donc aucun n'active le fallback canonique — le mécanisme est néanmoins
# implémenté ci-dessous (cf. EXTRACTOR_BRIEF.md) au cas où un futur retraitement
# du raw dégraderait un libellé.
# `qlanf` (langue parlée au foyer, S3) et `p9`/`qtras` (occupation détaillée,
# S7/S8) restent des questions substantielles verbatim mais ne sont PAS
# flaggées sociodémo (doublons partiels de qlanm/occup) ; `qenfa` (S11,
# nombre d'enfants au foyer) reste également une question substantielle non
# flaggée sociodémo (pas de type canonique correspondant).
SOCIODEMO_VARS: dict[str, str] = {
    "reg": "region",
    "qage": "age",
    "qlanm": "language",
    "sexe": "gender",
    "occup": "occupation",
    "qetud": "education",
    "qreve": "income",
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

        # Construire les options de réponse depuis les value labels SAV.
        # On élimine les libellés vides (p.ex. code1_num..code5_num=37.0 → '')
        # : nettoyage honnête, pas de fabrication (le garde-fou rejette les
        # labels vides).
        raw_opts: dict = val_labels.get(col, {})
        response_options = []
        for code, label in sorted(raw_opts.items(), key=lambda kv: float(kv[0])):
            if not str(label).strip():
                continue
            # Convertir les codes float entiers (1.0, 2.0 …) en int
            if isinstance(code, float) and code == int(code):
                code = int(code)
            response_options.append({"code": code, "label": str(label)})

        # Inférer le type de variable
        if is_text_column(df[col]):
            var_type = "open"
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
            "tags": ["electoral", "federal", "québec", "panel", "2011"],
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
