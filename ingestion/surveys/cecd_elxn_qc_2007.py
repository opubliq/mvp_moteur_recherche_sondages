"""Extraction normalisée — cecd_elxn_qc_2007.

Source : complet_tous_repondants_2007.sav (SPSS)
         « Sondage panel sur l'élection québécoise de 2007 » : deux sondages
         sur les intentions de vote provinciales réalisés par la firme CROP
         durant la campagne électorale en mars 2007 (vague 1 avant le débat
         des chefs du 13 mars — variables préfixées `z1`/sans préfixe, vague 2
         après le débat — variables préfixées `z2`), et un troisième sondage
         post-électoral sur le vote déclaré réalisé en avril 2007 (variables
         suffixées `_post`/`_pst`), élection le 26 mars 2007 (gouvernement
         minoritaire PLQ). 2442 répondants (téléphone).
         Cf. « Livre de codes: Sondage panel sur l'élection québécoise de
         2007.pdf » et « Questionnaire_post-sondage-panel-electionqc-2007_FR.doc »
         (questionnaire court de rappel post-électoral, avril 2007).

Encodage : le fichier SAV est lu avec l'encodage par défaut de pyreadstat
(latin-1/cp1252 inféré par SPSS) ; les accents sont correctement restitués
sans option supplémentaire.

Usage :
    uv run python ingestion/surveys/cecd_elxn_qc_2007.py
    → écrit ingestion/normalized/cecd_elxn_qc_2007.json
"""

from __future__ import annotations
import numpy as np
import pandas as pd

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
DATA_DIR = REPO_ROOT / "data" / "cecd_elxn_qc_2007"
SAV_FILE = DATA_DIR / "complet_tous_repondants_2007.sav"
OUT_FILE = REPO_ROOT / "ingestion" / "normalized" / "cecd_elxn_qc_2007.json"

# ---------------------------------------------------------------------------
# Constantes du sondage
# ---------------------------------------------------------------------------

SURVEY_ID = "cecd_elxn_qc_2007"
SURVEY_NAME = "Panel électoral du Québec 2007 - vagues de campagne et postélectorale (CECD)"
YEAR = 2007
POLLSTER = "CROP"
LANGUAGE = "fr"

# ---------------------------------------------------------------------------
# Sociodémo au libellé raw dégénéré : override explicite
# ---------------------------------------------------------------------------
# `sexe`/`genre_post` portent le libellé raw « INSCRIRE LE SEXE DU RÉPONDANT
# [post] » — une CONSIGNE À L'INTERVIEWER (coder le sexe observé/déduit), pas
# une question posée au répondant. `fabrication_reason()` ne le détecte pas
# automatiquement (ce n'est ni vide, ni un placeholder, ni une copie du nom de
# variable — limite assumée du garde-fou, cf. CONVENTIONS.md §3), mais c'est
# bien un libellé dégénéré au sens de la convention. On force donc le wording
# CANONIQUE pour ces deux variables plutôt que de les exclure ou de garder
# verbatim une instruction d'entrevue comme si c'était une question.
FORCE_CANONICAL_SOCIODEMO: set[str] = {"sexe", "genre_post"}

# ---------------------------------------------------------------------------
# Variables « mention multiple » (raisons codées en jusqu'à 2 mentions)
# ---------------------------------------------------------------------------
# q24ar1/q24ar2 : raisons pour lesquelles les sondages ne seraient pas justes
# (Q24, mention 1 et mention 2 du même item ouvert codé). q28br1/q28br2 :
# raisons pour lesquelles les sondages sont une bonne/mauvaise chose (Q28b,
# mention 1 et mention 2). Décomposition standard d'une question ouverte
# codée en plusieurs mentions, pas des variables dérivées l'une de l'autre.
MULTI_MENTION_VARS: set[str] = {"q24ar1", "q24ar2", "q28br1", "q28br2"}

# ---------------------------------------------------------------------------
# Variables EXCLUES (techniques, pondérations, ou dérivées/recodées)
# ---------------------------------------------------------------------------
# Aucune valeur analytique propre — ce ne sont pas des questions posées
# verbatim aux répondants, mais soit de l'administration terrain/méthodologie
# de collecte (CATI, centre d'appels), soit des recodages/regroupements/
# combinaisons d'une (ou plusieurs) variable(s) substantielle(s) déjà
# couverte(s) par ailleurs. Vérifié dans les données (comparaison des value
# labels/distributions à la variable source, libellés contenant « recodé »,
# « en X groupes », « fusion », « combinaison », « + relance »… ou variables
# numériques « oui=1 » sans aucune value label).

_ADMIN_PROJECT: dict[str, str] = {
    "nompn": "identifiant de projet (674A/674B), administratif",
    "nom_proj2": "identifiant de projet (674A/674B), administratif — doublon texte de `nompn`",
    "quest": "numéro de questionnaire (identifiant administratif)",
    "questpost": "numéro de questionnaire post (identifiant administratif)",
    "questpst": "numéro de questionnaire (identifiant administratif)",
    "questbv": "numéro de questionnaire du projet refusbv (identifiant administratif)",
}

_GEO_SAMPLING: dict[str, str] = {
    "regpond": "recodage dérivé de `reg` (« region en 2 groupes »)",
    "s_reg": (
        "variable système de région (assignée depuis l'échantillon), mêmes 3 "
        "catégories que `reg`, doublon technique"
    ),
    "s_reg_pst": (
        "variable système de région post (assignée depuis l'échantillon), mêmes 3 "
        "catégories que `reg`, doublon technique"
    ),
    "ville": (
        "identifiant géographique brut de l'échantillonnage (ville), pas une "
        "question posée — source de `reg`/`reg2`"
    ),
    "ville_pst": (
        "identifiant géographique brut de l'échantillonnage post (ville), "
        "pas une question posée"
    ),
    "codp": (
        "code postal (3 premiers caractères), identifiant géographique brut de l'échantillonnage"
    ),
    "codp_pst": (
        "code postal post (3 premiers caractères), identifiant géographique "
        "brut de l'échantillonnage"
    ),
}

_DERIVED_SOCIODEMO: dict[str, str] = {
    "age3": "recodage dérivé de `age` (« age en 3 groupes »)",
    "age45": "recodage dérivé de `age` (« age de plus ou moins que 45 ans »)",
    "lmat2": "recodage dérivé de `lmat` (« langue maternelle recodée »)",
    "lusage2": "recodage dérivé de `lusage` (« langue usage en 2 groupes »)",
}

_WEIGHTS: dict[str, str] = {
    "pond": "pondération statistique",
    "pond_max": "pondération statistique",
    "pond_min": "pondération statistique",
    "pond_tot_am1": "pondération statistique",
    "pondam1": "pondération statistique (à moyenne 1)",
    "ponderation_totale": "pondération statistique (indicateur de réestimation)",
    "pdspart": "surpondération statistique (par le vote à la dernière élection)",
    "pdspart2": "surpondération statistique (par le vote à la dernière élection)",
}

_DERIVED_OPINION: dict[str, str] = {
    "interet2": "recodage inversé dérivé de `interet`",
    "z1q2r": "recodage dérivé de `z1q2` (candidats regroupés, catégories réduites)",
    "satisf2": "recodage inversé dérivé de `satisf`",
    "intvotepre": (
        "synthèse dérivée combinant `intvote1` + `intvote2` (intention de vote consolidée)"
    ),
    "intvote": "combinaison dérivée de `intvote1` + `intvote2` (label explicite « + relance »)",
    "intvoter": "recodage dérivé de `intvote` (label explicite « recodée »)",
    "vote_enregist": (
        "synthèse dérivée de l'intention de vote enregistrée "
        "(combinaison de `intvote1`/`intvote2`)"
    ),
    "liberal": "recodage dichotomique dérivé de l'intention de vote (« libéral dichotomique »)",
    "definibin": (
        "recodage binaire dérivé de `defini` (« 6 en variable binaire », "
        "1 seule modalité étiquetée)"
    ),
    "deuxintr": "recodage dérivé de `deuxint` (« Deuxième choix recodé »)",
    "apter": "recodage dérivé de `apte` (candidats regroupés, catégories réduites)",
    "z1q10r": "recodage dérivé de `z1q10` (catégories réduites)",
    "gagner": "recodage dérivé de `gagne` (catégories réduites)",
    "libgagnebin": "recodage binaire dérivé de `libgagne` (« binaire », NSP fusionné avec non)",
    "intref": "combinaison dérivée de `intref1` + `intref2` (label explicite « + relance »)",
    "luentendbin": "indicateur binaire dérivé de `luentend` (sans value labels, « oui=1 »)",
    "quiavance2": "recodage binaire dérivé de `quiavance` (« qui en avance (binaire) »)",
    "bienlu": "indicateur binaire dérivé (sans value labels, « sait que Lib en avance - oui=1 »)",
    "avancelib2": "recodage dérivé de `avancelib` (« en 2 catégories »)",
    "Libplus": "indicateur binaire dérivé (sans value labels, « oui=1 »)",
    "estres": (
        "synthèse dérivée combinant `quiavance` + `beaucoup` + `avancelib` "
        "(estimation des résultats)"
    ),
    "estres2": "recodage dérivé de `estres` (catégories réduites)",
    "estres3": (
        "recodage dérivé de `estres` (label explicite « recode … pour "
        "régression multinominale »)"
    ),
    "estimebon": (
        "indicateur binaire dérivé (sans value labels, « estime que les sondages sont bons »)"
    ),
    "estimeplqgagne": (
        "indicateur binaire dérivé (sans value labels, « estime que le plq va gagner »)"
    ),
    "Q24m1": "fusion dérivée de `q24ar1`/`q24ar2` (label explicite « Résultat de la fusion »)",
    "Q24m2": "fusion dérivée de `q24ar1`/`q24ar2` (label explicite « Résultat de la fusion »)",
    "pollsok": (
        "indicateur binaire dérivé (sans value labels, « estime que les sondages sont bons »)"
    ),
    "changement": (
        "synthèse dérivée croisant l'intention de vote pré/post (« Vers où on change? »)"
    ),
    "q25adq": "combinaison dérivée de `posadq` avec l'intention de vote (potentiel de vote ADQ)",
    "q25adqr": "recodage dérivé de `q25adq`",
    "q25lib": "combinaison dérivée de `poslib` avec l'intention de vote (potentiel de vote PLQ)",
    "q25libr": "recodage dérivé de `q25lib`",
    "q25pq": "combinaison dérivée de `pospq` avec l'intention de vote (potentiel de vote PQ)",
    "q25pqr": "recodage dérivé de `q25pq`",
    "q25qspv": (
        "combinaison dérivée de `posqspv` avec l'intention de vote (potentiel de vote QS/PV)"
    ),
    "q25qspvr": "recodage dérivé de `q25qspv`",
    "changespec": "synthèse dérivée du changement d'intention de vote (« changement specifique »)",
    "change": "synthèse dérivée du changement d'intention de vote (« changement ou pas »)",
    "change2": "recodage binaire dérivé de `change` (sans value labels)",
    "profil1": (
        "combinaison dérivée (label explicite « combinaison intention de vote + vote declare »)"
    ),
    "profil2": "synthèse dérivée de l'origine des changements de vote",
    "influencebin": "indicateur binaire dérivé de `influence` (sans value labels, « oui=1 »)",
    "influencespec": (
        "combinaison dérivée (label explicite « influence combinée à l'intention de vote »)"
    ),
    "influperso": "indicateur binaire dérivé (sans value labels, « oui=1 »)",
    "influtot": (
        "synthèse dérivée croisant `influence` (perception générale) et "
        "`influperso` (effet personnel)"
    ),
    "influtot2": "recodage dérivé de `influtot` (label explicite « recodée »)",
    "sefie2": "recodage dérivé de `sefie` (« en 3 catégories »)",
    "sefieoui": "recodage binaire dérivé de `sefie` (« binaire »)",
    "bonchose": "indicateur binaire dérivé de `sondbons` (sans value labels)",
    "q28br": (
        "synthèse dérivée de `q28br1`/`q28br2` (catégories réduites, "
        "sans la modalité « autres, nsp »)"
    ),
    "Q28m1": "fusion dérivée de `q28br1`/`q28br2` (label explicite « Données fusionnées »)",
    "Q28m2": "fusion dérivée de `q28br1`/`q28br2` (label explicite « Données fusionnées »)",
    "votebin": "indicateur binaire dérivé de `voteoui` (sans value labels)",
    "avote": "recodage binaire dérivé de `voteoui` (catégories « oui » 1+2 fusionnées)",
    "voter": "recodage dérivé de `vote` (« Pour quel parti voté recodé1 »)",
    "voter2": "recodage dérivé de `vote` (« Pour quel parti voté recodé2 »)",
    "voterecode": "recodage dérivé de `vote` (« Pour quel parti voté recodé3 »)",
    "sonddiff2": (
        "recodage dérivé de `sonddiff` (catégories réduites, « impact sondage sur decision »)"
    ),
    "sondok": (
        "indicateur binaire dérivé (sans value labels, "
        "« sondages prédisent bien les libéraux - oui=1 »)"
    ),
}

_RADIO_META: dict[str, str] = {
    "sigle": (
        "identifiant intermédiaire d'appariement du poste de radio (chaîne), doublon "
        "de contenu avec `poste_radio`/`siglenum`"
    ),
    "Affiliation": (
        "classification externe du poste de radio (groupe propriétaire/réseau), "
        "métadonnée jointe depuis une base de stations, pas une question posée au répondant"
    ),
    "AffGénérale": "recodage dérivé de `Affiliation` (« Affiliation recodée »)",
    "AMFM": "classification externe du poste de radio (bande AM/FM), métadonnée de station",
    "format": "classification externe du poste de radio (style de contenu), métadonnée de station",
    "format2": "recodage dérivé de `format` (« Recode de style et essence… »)",
    "Chiffres": "métadonnée externe du poste de radio (numéro de fréquence)",
    "talk1": "classification externe du poste de radio (forme d'émission), métadonnée de station",
    "trash2": (
        "variable technique résiduelle (quasi entièrement vide), "
        "doublon d'appellation de poste de radio"
    ),
    "propriété": "classification externe du poste de radio (propriétaire), métadonnée de station",
    "PropGénérale": "recodage dérivé de `propriété` (« Propriété recodée »)",
}

_LANG_INTERVIEW: dict[str, str] = {
    "lang_pre": "langue de l'entrevue (méthodologie), pas une caractéristique du répondant",
    "langent_pst": (
        "langue de l'entrevue post (méthodologie), pas une caractéristique du répondant"
    ),
    "qaa": (
        "consigne d'entrevue à l'interviewer (contrôle qualité), "
        "pas une question posée au répondant"
    ),
    "s_lan": "variable système de langue d'entrevue, doublon technique sans label exploitable",
    "s_lang": "variable système de langue d'entrevue, doublon technique sans label",
    "s_lang_pst": "variable système de langue d'entrevue post, doublon technique",
    "s_lang2_pst": "variable système de langue d'entrevue post, doublon technique sans label",
}

# Métadonnées de gestion terrain (centre d'appels CATI) : appels, refus,
# durée, date, heure, interviewer, résultat d'entrevue… Aucune n'a de
# contenu de question, uniquement de l'administration/logistique de collecte.
_CALL_CENTER_VARS: list[str] = [
    "s_app_pst",
    "s_dat",
    "s_date",
    "s_date_pst",
    "rv",
    "rv_pst",
    "s_dur_min",
    "s_dur_min_pst",
    "s_dur_sec",
    "s_dur_sec_pst",
    "s_dum",
    "s_hrd",
    "s_hrd_pst",
    "s_int",
    "s_ini_post",
    "s_ini",
    "s_jse",
    "s_jse_pst",
    "s_res_ML",
    "s_res_ml_bin",
    "s_resfin_pst",
    "source01",
    "sresfin_sync",
    "resultat",
    "resultat_pst",
    "nquest_pst",
    "derquest",
    "derquest_pst",
    "heure_rv",
    "heure_rv_pst",
    "ininum",
    "comin",
    "codes",
    "codin",
    "codin2",
    "codin3",
    "codin4",
    "codin5",
    "codint",
    "ech",
    "ech_BV",
    "ech_BV2",
    "echBV",
    "n_appels",
    "Nbapp",
    "Nbapp_pst",
    "nbbv",
    "nbbv_pst",
    "nbml_pst",
    "nboc",
    "nboc_pst",
    "nbpr",
    "nbpr_pst",
    "nbquest",
    "nbri",
    "nbri_pst",
    "nbri2_pst",
    "nbri3_pst",
    "nbrm",
    "nbrm_pst",
    "nbrm2_pst",
    "nbrm3_pst",
    "no_derapp",
    "no_derapp_pst",
    "pres_bv",
    "pres_bv_pst",
    "pres_ri",
    "pres_ri2",
    "pres_ri3",
    "pres_ri_pst",
    "pres_ri2_pst",
    "pres_ri3_pst",
    "pres_rm",
    "pres_rm2",
    "pres_rm3",
    "pres_rm_pst",
    "pres_rm2_pst",
    "prop_bv",
    "prop_bv_pst",
    "prop_ml_pst",
    "prop_occ",
    "prop_occ_pst",
    "prop_pr",
    "prop_pr_pst",
    "prop_ri",
    "prop_ri2",
    "prop_ri3",
    "prop_ri_pst",
    "prop_ri2_pst",
    "prop_ri3_pst",
    "prop_rm",
    "prop_rm2",
    "prop_rm3",
    "prop_rm_pst",
    "prop_rm2_pst",
    "prop_rm3_pst",
]
_CALL_CENTER_REASON = (
    "métadonnée de gestion terrain (centre d'appels CATI : appels, refus, "
    "durée, date, heure, interviewer, résultat d'entrevue…), sans valeur "
    "analytique, pas une question posée"
)

EXCLUDED_VARS: dict[str, str] = {
    **_ADMIN_PROJECT,
    **_GEO_SAMPLING,
    **_DERIVED_SOCIODEMO,
    **_WEIGHTS,
    **_DERIVED_OPINION,
    **_RADIO_META,
    **_LANG_INTERVIEW,
    **dict.fromkeys(_CALL_CENTER_VARS, _CALL_CENTER_REASON),
}

# ---------------------------------------------------------------------------
# Classification des variables socio-démographiques
# ---------------------------------------------------------------------------
#   sexe/genre_post → gender    (libellé raw = consigne d'interviewer, dégénéré
#                                 → wording CANONIQUE forcé, cf. FORCE_CANONICAL_SOCIODEMO)
#   reg             → region    (libellé raw "RÉGION" exploitable → verbatim)
#   reg2/reg2_pst   → region    (libellé raw "Sous-région [post]" → verbatim ;
#                                 granularité différente de `reg`, pas un recodage :
#                                 22 sous-régions vs 3 macro-régions, non alignées 1:1)
#   age             → age       (libellé raw riche, Q29 → verbatim)
#   occup           → occupation(libellé raw riche, Q30 → verbatim)
#   scol            → education (libellé raw riche, Q31 → verbatim)
#   revenu          → income    (libellé raw riche, Q32 → verbatim)
#   lmat            → language  (libellé raw riche, Q33 → verbatim)
SOCIODEMO_VARS: dict[str, str] = {
    "sexe": "gender",
    "genre_post": "gender",
    "reg": "region",
    "reg2": "region",
    "reg2_pst": "region",
    "age": "age",
    "occup": "occupation",
    "scol": "education",
    "revenu": "income",
    "lmat": "language",
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
        # Ratio détection auto
        series_data = df[col].replace([' ', ''], np.nan).dropna() if 'df' in locals() else pd.Series()
        has_verbatims = (len(series_data) > 10 and (series_data.nunique() / len(series_data)) > 0.1)
        has_verbatims = False
        if col in EXCLUDED_VARS:
            continue

        raw_label = (var_labels.get(col) or "").strip()
        sociodemo_type = SOCIODEMO_VARS.get(col)

        # Sociodémo au libellé raw absent/dégénéré (indistinguable d'un nom de
        # variable, ou — cas `sexe`/`genre_post` — une consigne d'interviewer
        # plutôt qu'une question) : on retombe sur le wording CANONIQUE
        # versionné plutôt que d'exclure (cf. ingestion/canonical.py). Sinon,
        # verbatim du raw.
        if sociodemo_type and (
            not raw_label or fabrication_reason(col, raw_label) or col in FORCE_CANONICAL_SOCIODEMO
        ):
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
            var_type = "open"
            has_verbatims = True
            has_verbatims = True  # chaîne de caractères (verbatim ouvert)
        elif col in MULTI_MENTION_VARS:
            var_type = "multiple"  # grille de mentions multiples (raisons codées)
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
            "tags": ["electoral", "provincial", "québec", "panel", "2007"],
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
