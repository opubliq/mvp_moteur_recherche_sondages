"""Extraction normalisée -- provincial_qc_2012.

Source : Quebec_provincial_2012.dta
         Étude électorale québécoise provinciale 2012, Harris Decima / MEDW
         (Codebook_Quebec_provincial_2012.xlsx, Questionnaire_Quebec_provincial_2012_FR.pdf)

DEVIATION ASSUMEE ET VALIDEE (voir docs/EXTRACTOR_BRIEF.md et
ingestion/CONVENTIONS.md) : le fichier Stata .dta a ses variable labels et
value labels en ANGLAIS. Un questionnaire français intégral existe
("Questionnaire_Quebec_provincial_2012_FR.pdf"). Conformément aux consignes
validées par l'utilisateur, `question_text` et les `response_options[].label`
PROVIENNENT DE CE QUESTIONNAIRE FRANÇAIS, mappés sur les variables du .dta.
Le .dta sert uniquement à : la liste complète des variables (couverture),
les codes numériques de valeur (pour aligner `response_options[].code`),
les métadonnées structurelles (exclusions techniques, sociodémo) et le
nombre de répondants. L'invariant zéro-fabrication reste intact : tout
texte vient d'un raw, juste un raw différent (le questionnaire PDF français
plutôt que le DTA) -- rien n'est inventé.

Usage :
    uv run python ingestion/surveys/provincial_qc_2012.py
    -> écrit ingestion/normalized/provincial_qc_2012.json
"""

from __future__ import annotations

import json
from pathlib import Path

import pyreadstat

from ingestion.models import SurveyFile
from ingestion.open_text import is_text_column

# ---------------------------------------------------------------------------
# Chemins
# ---------------------------------------------------------------------------

_HERE = Path(__file__).parent
REPO_ROOT = _HERE.parent.parent
DATA_DIR = REPO_ROOT / "data" / "provincial_qc_2012"
DTA_FILE = DATA_DIR / "Quebec_provincial_2012.dta"
PDF_QUESTIONNAIRE_FILE = DATA_DIR / "Questionnaire_Quebec_provincial_2012_FR.pdf"
OUT_FILE = REPO_ROOT / "ingestion" / "normalized" / "provincial_qc_2012.json"

# ---------------------------------------------------------------------------
# Constantes du sondage
# ---------------------------------------------------------------------------

WEIGHT_VAR = "POST_WEIGHT1"
RESPONDENT_ID_VAR = "RESPID"

SURVEY_ID = "provincial_qc_2012"
SURVEY_NAME = "Étude électorale québécoise provinciale 2012"
YEAR = 2012
POLLSTER = "Harris Decima / MEDW"
LANGUAGE = "fr"

# ---------------------------------------------------------------------------
# Variables EXCLUES (techniques / dérivées / sans contenu exploitable)
# ---------------------------------------------------------------------------

EXCLUDED_VARS: dict[str, str] = {
    # Identifiants et métadonnées d'entrevue
    "RESPID": "numéro de répondant (identifiant technique)",
    "PANELISTID": "numéro de panneau (identifiant technique)",
    "PRE_COMPLETE": "flag de complétion du volet pré-électoral",
    "POST_COMPLETE": "flag de complétion du volet post-électoral",
    "SAMPL75": "source d’échantillon (HPOL vs SSI)",
    "PRE_DAT": "date de l’entrevue pré-électorale",
    "PRE_HRD": "heure de l’entrevue pré-électorale",
    "POST_DAT": "date de l’entrevue post-électorale",
    "POST_HRD": "heure de l’entrevue post-électorale",
    "PRE_LANG": "langue de l’entrevue pré-électorale",
    "POST_LANG": "langue de l’entrevue post-électorale",
    "LAST_Q": "dernière question répondue (variable technique)",
    "SECTION": "disposition des volets pré et post-électoraux",
    # Contrôles de qualité terrain et flags d'attention / filtres ISQ
    "PRE_GRID": "flag de contrôle de qualité ISQ grille pré-électorale",
    "PRE_RESP": "flag de contrôle de qualité ISQ logique pré-électorale",
    "PRE_TIME": "flag de contrôle de qualité ISQ temps pré-électoral",
    "PRE_FAIL": "flag d’échec du contrôle de qualité ISQ pré-électoral",
    "POST_GRID": "flag de contrôle de qualité ISQ grille post-électorale",
    "POST_RESP": "flag de contrôle de qualité ISQ logique post-électorale",
    "POST_TIME": "flag de contrôle de qualité ISQ temps post-électoral",
    "POST_FAIL": "flag d’échec du contrôle de qualité ISQ post-électoral",
    "FLAG_TIME_POST": "flag de durée/échec ISQ post-électoral",
    "ISQ1": "question de contrôle de l’attention du répondant pré-électorale",
    "ISQ2": "question de contrôle de l’attention du répondant post-électorale",
    # Quotas de terrain et drapeaux d'échantillonnage
    "QT2A": "quota de genre (variable de gestion de terrain)",
    "QT2B": "quota d’âge (variable de gestion de terrain)",
    "QT3": "quota de code postal (variable de gestion de terrain)",
    "QT4": "quota d’éducation (variable de gestion de terrain)",
    "Q1SEL": "flag de sélection aléatoire d’ordre de présentation pour Q1",
    "PQ1SEL": "flag de sélection aléatoire d’ordre de présentation pour PQ1",
    "SEL5B": "flag de variante de formulation pour PQ5B",
    "SEL5E": "flag de variante de formulation pour PQ5E",
    "SEL6D": "flag de variante de formulation pour PQ6D",
    "MULTI_ED": "indicateur technique de code postal à circonscriptions multiples",
    "SD4A_INVALID": "indicateur technique de code postal invalide",
    "SD4A_UNLISTED": "indicateur technique de code postal hors liste",
    # Pondérations
    "PRE_WEIGHT1": "pondération pré-électorale 1",
    "PRE_WEIGHT2": "pondération pré-électorale 2",
    "PRE_WEIGHT3": "pondération pré-électorale 3",
    "PRE_WEIGHT3B": "pondération pré-électorale 3B",
    "PRE_WEIGHT4": "pondération pré-électorale 4",
    "POST_WEIGHT1": "pondération post-électorale 1 (poids statistique principal)",
    "POST_WEIGHT2": "pondération post-électorale 2",
    "POST_WEIGHT3": "pondération post-électorale 3",
    "POST_WEIGHT3B": "pondération post-électorale 3B",
    "POST_WEIGHT4": "pondération post-électorale 4",
    # Profils de panneaux pré-existants
    "PANEL_AGE": "profil de panneau : âge",
    "PANEL_GENDER": "profil de panneau : genre",
    "PANEL_PROV": "profil de panneau : province",
    "PANEL_INCOME": "profil de panneau HPOL : revenu",
    "PANEL_INCOME2": "profil de panneau SSI : revenu",
    "PANEL_HHCOMP": "profil de panneau : composition du ménage",
    "PANEL_HHTYPE": "profil de panneau : type de ménage",
    "PANEL_OWN": "profil de panneau : statut de propriété",
    "PANEL_HHSIZE": "profil de panneau : taille du ménage",
    "PANEL_HHADULT": "profil de panneau : nombre d’adultes",
    "PANEL_HHCHILD": "profil de panneau : nombre d’enfants",
    "PANEL_MARITAL": "profil de panneau : état civil",
    "PANEL_INVESTABLE": "profil de panneau : actifs financiers",
    "PANEL_EDUC": "profil de panneau : éducation",
    "PANEL_EMPLOY": "profil de panneau : emploi",
    "PANEL_BANK": "profil de panneau : institution financière",
    "PANEL_BIRTH": "profil de panneau : naissance au Canada",
    "PANEL_IMMIGRATE": "profil de panneau : année d’immigration",
    "PANEL_USAGE": "profil de panneau : utilisation des médias sociaux",
    "PANEL_ETHNIC": "profil de panneau : origine ethnique",
    "PANEL_RACE": "profil de panneau : appartenance ethnique/raciale",
    "PANEL_PRIMLANG": "profil de panneau : langue principale",
    # Variables dérivées / recodées / variantes expérimentales d'ordre
    "AGE": "variable dérivée d’âge calculé à partir de YOB / SD1A",
    "AGE_GEND": "variable croisée dérivée d’âge par genre",
    "ELEC_CON": "circonscription électorale dérivée du code postal SD4A",
    "PRE_INT": "variable dérivée d’intention de vote pré-électorale",
    "POST_INT": "variable dérivée de comportement de vote post-électoral",
    "PRE_W": "flag d’inclusion dans la pondération pré-électorale",
    "POST_W": "flag d’inclusion dans la pondération post-électorale",
    "PRE_VOTE": "intention de vote pré-électorale recodée",
    "POST_VOTE": "comportement de vote post-électoral recodé",
    "PRE_VOTE_COL1": "intention de vote pré-électorale regroupée 1",
    "PRE_VOTE_COL2": "intention de vote pré-électorale regroupée 2",
    "POST_VOTE_COL1": "comportement de vote post-électoral regroupé 1",
    "POST_VOTE_COL2": "comportement de vote post-électoral regroupé 2",
    "Q1A_BEGINNING": "variante d'ordre de Q1A — couverte par la variable combinée Q1A",
    "Q1A_END": "variante d'ordre de Q1A — couverte par la variable combinée Q1A",
    "Q1B_BEGINNING": "variante d'ordre de Q1B — couverte par la variable combinée Q1B",
    "Q1B_END": "variante d'ordre de Q1B — couverte par la variable combinée Q1B",
    "PQ1A_BEGINNING": "variante d'ordre de PQ1A — couverte par la variable combinée PQ1A",
    "PQ1A_END": "variante d'ordre de PQ1A — couverte par la variable combinée PQ1A",
    "PQ1B_BEGINNING": "variante d'ordre de PQ1B — couverte par la variable combinée PQ1B",
    "PQ1B_END": "variante d'ordre de PQ1B — couverte par la variable combinée PQ1B",
    "Q17": "parti préféré dérivé des évaluations Q17A-F — couverte par Q18",
}

# ---------------------------------------------------------------------------
# Variables socio-démographiques
# ---------------------------------------------------------------------------

SOCIODEMO_VARS: dict[str, str] = {
    "GEND": "gender",
    "YOB": "age",
    "SD1A": "age",
    "SD2A": "region",
    "SD6F": "language",
    "MLANG": "language",
    "SD4": "education",
    "SD10": "education",
    "SD3": "religion",
    "SD3B": "religion_practice",
    "SD5": "income",
    "SD6": "place_of_birth",
    "SD6A": "place_of_birth",
    "SD6B": "place_of_birth",
    "SD6C": "place_of_birth",
    "SD6D": "immigration_years",
    "SD6E": "residence_years",
    "SD7": "region",
    "PSD1": "union",
    "PSD2": "household_children",
    "PSD3": "employment",
}

# ---------------------------------------------------------------------------
# Variables de type échelle
# ---------------------------------------------------------------------------

SCALE_VARS: set[str] = {
    "Q1A",
    "Q1B",
    "PQ1A",
    "PQ1B",
    "Q4A",
    "Q5",
    "Q11",
    "Q12",
    "Q17A",
    "Q17B",
    "Q17C",
    "Q17D",
    "Q17E",
    "Q17F",
    "Q19A",
    "Q19B",
    "Q19C",
    "Q19D",
    "Q19E",
    "Q19F",
    "Q19G",
    "Q20",
    "Q24A",
    "Q24B",
    "Q24C",
    "Q26",
    "Q28A",
    "Q28B",
    "Q28C",
    "Q28D",
    "Q28E",
    "Q28F",
    "Q30A",
    "Q30AA",
    "Q30AB",
    "Q30AC",
    "Q30AD",
    "Q30AE",
    "Q30AF",
    "Q30B",
    "Q30C",
    "Q30D",
    "Q30E",
    "Q30F",
    "Q32A",
    "Q32B",
    "Q34A",
    "Q34B",
    "Q34C",
    "Q42A",
    "Q42B",
    "Q42C",
    "Q43A",
    "Q43B",
    "Q43C",
    "Q49",
    "PQ9A",
    "PQ9B",
    "PQ9C",
    "PQ9D",
    "PQ9F",
    "PQ19",
    "PQ20",
}

# ---------------------------------------------------------------------------
# Contenu FR (question_text + response_options) extrait du questionnaire FR
# (Questionnaire_Quebec_provincial_2012_FR.pdf), aligné aux codes numériques.
# ---------------------------------------------------------------------------

# Options courantes réutilisables
OPT_PARTIS_QC = [
    (1, "Parti libéral du Québec"),
    (2, "Parti québécois"),
    (3, "Québec solidaire"),
    (4, "Coalition avenir Québec - L’équipe François Legault"),
    (5, "Option nationale"),
    (6, "Parti vert du Québec"),
    (96, "Autre"),
    (98, "Ne sais pas"),
    (99, "Pas de réponse"),
]

OPT_PARTIS_FED = [
    (1, "Bloc québécois"),
    (2, "Parti conservateur du Canada"),
    (3, "Nouveau parti démocratique"),
    (4, "Parti libéral du Canada"),
    (5, "Le Parti vert du Canada"),
    (96, "Autre"),
    (98, "Ne sais pas"),
    (99, "Pas de réponse"),
]

OPT_OUI_NON = [
    (1, "Oui"),
    (2, "Non"),
    (8, "Ne sais pas"),
    (9, "Pas de réponse"),
]

OPT_SATISFACTION = [
    (1, "Très insatisfait"),
    (2, "Plutôt insatisfait"),
    (3, "Plutôt satisfait"),
    (4, "Très satisfait"),
    (9, "Ne sais pas"),
]

OPT_AGREE_DISAGREE = [
    (1, "Fortement en désaccord"),
    (2, "Assez en désaccord"),
    (3, "Assez d’accord"),
    (4, "Fortement d’accord"),
    (9, "Ne sais pas"),
]

QUESTION_DATA: dict[str, tuple[str, list[tuple[object, str]]]] = {
    # Sociodémo & screening
    "GEND": ("Êtes-vous ...?", [(1, "Un homme"), (2, "Une femme")]),
    "YOB": ("En quelle année êtes-vous né(e) ?", [(9999, "Pas de réponse")]),
    "SD1A": ("Quel âge aurez-vous le 4 septembre 2012 ?", [(1, "17"), (2, "18")]),
    "SD2A": ("Résidez-vous au Québec ?", [(1, "Oui"), (2, "Non")]),
    "SD2B": ("Êtes-vous citoyen canadien ?", [(1, "Oui"), (2, "Non")]),
    "SD6F": (
        "Quelle est la première langue que vous avez apprise et que vous comprenez toujours ?",
        [
            (1, "Anglais"),
            (2, "Français"),
            (3, "Italien"),
            (4, "Chinois/Cantonais/Mandarin"),
            (5, "Néerlandais"),
            (6, "Allemand"),
            (7, "Portugais"),
            (8, "Espagnol"),
            (9, "Arabe"),
            (10, "Grec"),
            (11, "Autre"),
        ],
    ),
    "MLANG": (
        "Quelle est votre langue maternelle ?",
        [(1, "Anglais"), (2, "Français"), (3, "Autre")],
    ),
    "SD4": (
        "Quel est le plus haut niveau de scolarité que vous avez complété ?",
        [
            (1, "Aucun"),
            (2, "École primaire commencée"),
            (3, "École primaire complétée"),
            (4, "École secondaire commencée"),
            (5, "École secondaire complétée"),
            (6, "Formation professionnelle ou collégiale commencée"),
            (7, "Formation professionnelle ou collégiale complétée"),
            (8, "Baccalauréat universitaire commencé"),
            (9, "Baccalauréat universitaire complété"),
            (10, "Diplôme universitaire supérieur au baccalauréat"),
        ],
    ),
    # Démocratie & Enjeux (Pré-électoral)
    "Q1A": (
        (
            "À l’aide d’une échelle de 0 à 10, où 0 signifie « pas satisfait du "
            "tout » et 10 signifie « très satisfait », veuillez indiquer si vous "
            "êtes satisfait de la façon dont fonctionne la démocratie : / Au Québec"
        ),
        [
            (0, "0 - Pas satisfait du tout"),
            (1, "1"),
            (2, "2"),
            (3, "3"),
            (4, "4"),
            (5, "5"),
            (6, "6"),
            (7, "7"),
            (8, "8"),
            (9, "9"),
            (10, "10 - Très satisfait"),
        ],
    ),
    "Q1B": (
        (
            "À l’aide d’une échelle de 0 à 10, où 0 signifie « pas satisfait du "
            "tout » et 10 signifie « très satisfait », veuillez indiquer si vous "
            "êtes satisfait de la façon dont fonctionne la démocratie : / Au Canada"
        ),
        [
            (0, "0 - Pas satisfait du tout"),
            (1, "1"),
            (2, "2"),
            (3, "3"),
            (4, "4"),
            (5, "5"),
            (6, "6"),
            (7, "7"),
            (8, "8"),
            (9, "9"),
            (10, "10 - Très satisfait"),
        ],
    ),
    "Q2": (
        "Quel est l’enjeu le plus important pour vous dans l’élection PROVINCIALE en cours ?",
        [
            (1, "La santé"),
            (2, "Les taxes et impôts"),
            (3, "L’éducation"),
            (4, "L’environnement"),
            (5, "Les dépenses publiques et la dette"),
            (6, "Le transport"),
            (7, "L’économie"),
            (8, "Les garderies"),
            (9, "La souveraineté du Québec / le fédéralisme"),
            (10, "L’éthique et la corruption"),
            (96, "Autre"),
            (98, "Ne sais pas"),
        ],
    ),
    "Q3": (
        (
            "De votre point de vue, y a-t-il un parti plus apte à s’occuper de "
            "l'enjeu le plus important ?"
        ),
        [(1, "Oui"), (2, "Non"), (9, "Ne sais pas")],
    ),
    "Q3B": ("Quel parti est le plus apte à s’occuper de cet enjeu ?", OPT_PARTIS_QC),
    "Q4A": (
        (
            "Sur une échelle de 0 à 10, où 0 signifie « aucun intérêt » et 10 "
            "signifie « beaucoup d’intérêt », quel est votre degré d’intérêt "
            "pour... / L'élection provinciale en cours"
        ),
        [
            (0, "0 - Aucun intérêt"),
            (1, "1"),
            (2, "2"),
            (3, "3"),
            (4, "4"),
            (5, "5"),
            (6, "6"),
            (7, "7"),
            (8, "8"),
            (9, "9"),
            (10, "10 - Beaucoup d'intérêt"),
        ],
    ),
    "Q5": (
        (
            "Sur une échelle de 0 à 10, où 0 signifie « aucun intérêt » et 10 "
            "signifie « beaucoup d’intérêt », quel est votre degré d’intérêt "
            "pour... / La politique en général"
        ),
        [
            (0, "0 - Aucun intérêt"),
            (1, "1"),
            (2, "2"),
            (3, "3"),
            (4, "4"),
            (5, "5"),
            (6, "6"),
            (7, "7"),
            (8, "8"),
            (9, "9"),
            (10, "10 - Beaucoup d'intérêt"),
        ],
    ),
    "Q6": (
        ("Avez-vous déjà voté (par anticipation, par exemple) à l’élection PROVINCIALE en cours ?"),
        [(1, "Oui"), (2, "Non"), (9, "Ne sais pas")],
    ),
    "Q6A": ("Pour quel parti avez-vous voté ?", OPT_PARTIS_QC),
    "Q7": (
        "Pour cette élection, est-ce :",
        [
            (1, "Certain que vous irez voter"),
            (2, "Très probable que vous irez voter"),
            (3, "Assez probable que vous irez voter"),
            (4, "Assez improbable que vous irez voter"),
            (5, "Très improbable que vous irez voter"),
        ],
    ),
    "Q8A": ("Si vous allez voter, ce sera pour le candidat de quel parti ?", OPT_PARTIS_QC),
    "Q8B": (
        (
            "À quel parti appartient le candidat pour lequel il est le plus "
            "probable que vous votiez ?"
        ),
        OPT_PARTIS_QC,
    ),
    "Q9": (
        "S’il y avait une élection FÉDÉRALE demain, pour quel parti voteriez-vous ?",
        OPT_PARTIS_FED,
    ),
    # Photos & Connaissances
    "Q10A": (
        "Associer la photo du chef au parti : / Parti libéral du Québec",
        [(1, "Jean Charest"), (2, "Pierre Paradis"), (3, "Pauline Marois"), (4, "Autre")],
    ),
    "Q10B": (
        "Associer la photo du chef au parti : / Parti québécois",
        [(1, "Jean Charest"), (2, "Pierre Paradis"), (3, "Pauline Marois"), (4, "Autre")],
    ),
    "Q10C": (
        "Associer la photo du chef au parti : / Québec solidaire",
        [(1, "Jean Charest"), (2, "Pierre Paradis"), (3, "Pauline Marois"), (4, "Autre")],
    ),
    "Q10D": (
        (
            "Associer la photo du chef au parti : / Coalition avenir Québec - "
            "L’équipe François Legault"
        ),
        [(1, "Jean Charest"), (2, "Pierre Paradis"), (3, "Pauline Marois"), (4, "Autre")],
    ),
    "Q10E": (
        "Associer la photo du chef au parti : / Option nationale",
        [(1, "Jean Charest"), (2, "Pierre Paradis"), (3, "Pauline Marois"), (4, "Autre")],
    ),
    # Efficacité & Bilan
    "Q11": (
        (
            "Certaines personnes pensent que, peu importe le parti qui est au "
            "pouvoir, c’est du pareil au même. D’autres pensent que c’est différent "
            "selon le parti qui est au pouvoir. Sur une échelle de 0 à 10, où vous "
            "situez-vous ?"
        ),
        [
            (0, "0 - C'est du pareil au même"),
            (1, "1"),
            (2, "2"),
            (3, "3"),
            (4, "4"),
            (5, "5"),
            (6, "6"),
            (7, "7"),
            (8, "8"),
            (9, "9"),
            (10, "10 - C'est vraiment différent"),
        ],
    ),
    "Q12": (
        (
            "Certaines personnes pensent que peu importe qui gagne une élection, "
            "cela ne fait pas vraiment de différence quant à ce qui se passe par la "
            "suite. D'autres pensent que voter fait une grande différence. Sur une "
            "échelle de 0 à 10, où vous situez-vous ?"
        ),
        [
            (0, "0 - Ne fait pas de différence"),
            (1, "1"),
            (2, "2"),
            (3, "3"),
            (4, "4"),
            (5, "5"),
            (6, "6"),
            (7, "7"),
            (8, "8"),
            (9, "9"),
            (10, "10 - Fait une grande différence"),
        ],
    ),
    "Q13": (
        (
            "À quel point êtes-vous satisfait des réalisations du gouvernement du "
            "Québec dans les derniers 12 mois ?"
        ),
        OPT_SATISFACTION,
    ),
    "Q14": (
        (
            "À quel point êtes-vous satisfait des réalisations du gouvernement "
            "FÉDÉRAL canadien dans les derniers 12 mois ?"
        ),
        OPT_SATISFACTION,
    ),
    "Q15": (
        (
            "Au cours des 12 derniers mois, l’économie QUÉBÉCOISE s’est-elle "
            "améliorée, détériorée ou est restée stable ?"
        ),
        [
            (1, "S’est détériorée"),
            (2, "Est restée stable"),
            (3, "S’est améliorée"),
            (9, "Ne sais pas"),
        ],
    ),
    "Q15A": (
        (
            "Au cours des 12 derniers mois, les politiques du gouvernement "
            "PROVINCIAL ont-elles rendu l'économie québécoise meilleure, pire ou ne "
            "l'ont pas influencée ?"
        ),
        [(1, "Pire"), (2, "Pas influencée"), (3, "Meilleure"), (9, "Ne sais pas")],
    ),
    "Q16": (
        (
            "Durant les 12 derniers mois, l'économie CANADIENNE s’est-elle "
            "améliorée, détériorée ou est restée stable ?"
        ),
        [
            (1, "S’est détériorée"),
            (2, "Est restée stable"),
            (3, "S’est améliorée"),
            (9, "Ne sais pas"),
        ],
    ),
    "Q16A": (
        (
            "Durant les 12 derniers mois, les politiques du gouvernement FÉDÉRAL "
            "ont-elles rendu l'économie canadienne meilleure, pire ou ne l'ont pas "
            "influencée ?"
        ),
        [(1, "Pire"), (2, "Pas influencée"), (3, "Meilleure"), (9, "Ne sais pas")],
    ),
    # Évaluations des partis et des chefs
    "Q17A": (
        (
            "Veuillez attribuer une note à chacun des partis politiques QUÉBÉCOIS "
            "suivants en utilisant une échelle de 0 à 10, où 0 signifie « n’aime "
            "pas du tout » et 10 « aime beaucoup » : / Parti libéral du Québec"
        ),
        [
            (0, "0 - N'aime pas du tout"),
            (1, "1"),
            (2, "2"),
            (3, "3"),
            (4, "4"),
            (5, "5"),
            (6, "6"),
            (7, "7"),
            (8, "8"),
            (9, "9"),
            (10, "10 - Aime beaucoup"),
        ],
    ),
    "Q17B": (
        (
            "Veuillez attribuer une note à chacun des partis politiques QUÉBÉCOIS "
            "suivants en utilisant une échelle de 0 à 10, où 0 signifie « n’aime "
            "pas du tout » et 10 « aime beaucoup » : / Parti québécois"
        ),
        [
            (0, "0 - N'aime pas du tout"),
            (1, "1"),
            (2, "2"),
            (3, "3"),
            (4, "4"),
            (5, "5"),
            (6, "6"),
            (7, "7"),
            (8, "8"),
            (9, "9"),
            (10, "10 - Aime beaucoup"),
        ],
    ),
    "Q17C": (
        (
            "Veuillez attribuer une note à chacun des partis politiques QUÉBÉCOIS "
            "suivants en utilisant une échelle de 0 à 10, où 0 signifie « n’aime "
            "pas du tout » et 10 « aime beaucoup » : / Québec solidaire"
        ),
        [
            (0, "0 - N'aime pas du tout"),
            (1, "1"),
            (2, "2"),
            (3, "3"),
            (4, "4"),
            (5, "5"),
            (6, "6"),
            (7, "7"),
            (8, "8"),
            (9, "9"),
            (10, "10 - Aime beaucoup"),
        ],
    ),
    "Q17D": (
        (
            "Veuillez attribuer une note à chacun des partis politiques QUÉBÉCOIS "
            "suivants en utilisant une échelle de 0 à 10, où 0 signifie « n’aime "
            "pas du tout » et 10 « aime beaucoup » : / Coalition avenir Québec - "
            "L’équipe François Legault"
        ),
        [
            (0, "0 - N'aime pas du tout"),
            (1, "1"),
            (2, "2"),
            (3, "3"),
            (4, "4"),
            (5, "5"),
            (6, "6"),
            (7, "7"),
            (8, "8"),
            (9, "9"),
            (10, "10 - Aime beaucoup"),
        ],
    ),
    "Q17E": (
        (
            "Veuillez attribuer une note à chacun des partis politiques QUÉBÉCOIS "
            "suivants en utilisant une échelle de 0 à 10, où 0 signifie « n’aime "
            "pas du tout » et 10 « aime beaucoup » : / Option nationale"
        ),
        [
            (0, "0 - N'aime pas du tout"),
            (1, "1"),
            (2, "2"),
            (3, "3"),
            (4, "4"),
            (5, "5"),
            (6, "6"),
            (7, "7"),
            (8, "8"),
            (9, "9"),
            (10, "10 - Aime beaucoup"),
        ],
    ),
    "Q17F": (
        (
            "Veuillez attribuer une note à chacun des partis politiques QUÉBÉCOIS "
            "suivants en utilisant une échelle de 0 à 10, où 0 signifie « n’aime "
            "pas du tout » et 10 « aime beaucoup » : / Parti vert du Québec"
        ),
        [
            (0, "0 - N'aime pas du tout"),
            (1, "1"),
            (2, "2"),
            (3, "3"),
            (4, "4"),
            (5, "5"),
            (6, "6"),
            (7, "7"),
            (8, "8"),
            (9, "9"),
            (10, "10 - Aime beaucoup"),
        ],
    ),
    "Q18": ("Globalement, quel parti préférez-vous ?", OPT_PARTIS_QC),
    "Q19A": (
        (
            "Veuillez attribuer une note à chacun des chefs de parti suivant en "
            "utilisant une échelle de 0 à 10, où 0 signifie « n’aime pas du tout » "
            "et 10 « aime beaucoup » : / Jean Charest"
        ),
        [
            (0, "0 - N'aime pas du tout"),
            (1, "1"),
            (2, "2"),
            (3, "3"),
            (4, "4"),
            (5, "5"),
            (6, "6"),
            (7, "7"),
            (8, "8"),
            (9, "9"),
            (10, "10 - Aime beaucoup"),
        ],
    ),
    "Q19B": (
        (
            "Veuillez attribuer une note à chacun des chefs de parti suivant en "
            "utilisant une échelle de 0 à 10, où 0 signifie « n’aime pas du tout » "
            "et 10 « aime beaucoup » : / Pauline Marois"
        ),
        [
            (0, "0 - N'aime pas du tout"),
            (1, "1"),
            (2, "2"),
            (3, "3"),
            (4, "4"),
            (5, "5"),
            (6, "6"),
            (7, "7"),
            (8, "8"),
            (9, "9"),
            (10, "10 - Aime beaucoup"),
        ],
    ),
    "Q19C": (
        (
            "Veuillez attribuer une note à chacun des chefs de parti suivant en "
            "utilisant une échelle de 0 à 10, où 0 signifie « n’aime pas du tout » "
            "et 10 « aime beaucoup » : / Amir Khadir"
        ),
        [
            (0, "0 - N'aime pas du tout"),
            (1, "1"),
            (2, "2"),
            (3, "3"),
            (4, "4"),
            (5, "5"),
            (6, "6"),
            (7, "7"),
            (8, "8"),
            (9, "9"),
            (10, "10 - Aime beaucoup"),
        ],
    ),
    "Q19D": (
        (
            "Veuillez attribuer une note à chacun des chefs de parti suivant en "
            "utilisant une échelle de 0 à 10, où 0 signifie « n’aime pas du tout » "
            "et 10 « aime beaucoup » : / Françoise David"
        ),
        [
            (0, "0 - N'aime pas du tout"),
            (1, "1"),
            (2, "2"),
            (3, "3"),
            (4, "4"),
            (5, "5"),
            (6, "6"),
            (7, "7"),
            (8, "8"),
            (9, "9"),
            (10, "10 - Aime beaucoup"),
        ],
    ),
    "Q19E": (
        (
            "Veuillez attribuer une note à chacun des chefs de parti suivant en "
            "utilisant une échelle de 0 à 10, où 0 signifie « n’aime pas du tout » "
            "et 10 « aime beaucoup » : / François Legault"
        ),
        [
            (0, "0 - N'aime pas du tout"),
            (1, "1"),
            (2, "2"),
            (3, "3"),
            (4, "4"),
            (5, "5"),
            (6, "6"),
            (7, "7"),
            (8, "8"),
            (9, "9"),
            (10, "10 - Aime beaucoup"),
        ],
    ),
    "Q19F": (
        (
            "Veuillez attribuer une note à chacun des chefs de parti suivant en "
            "utilisant une échelle de 0 à 10, où 0 signifie « n’aime pas du tout » "
            "et 10 « aime beaucoup » : / Jean-Martin Aussant"
        ),
        [
            (0, "0 - N'aime pas du tout"),
            (1, "1"),
            (2, "2"),
            (3, "3"),
            (4, "4"),
            (5, "5"),
            (6, "6"),
            (7, "7"),
            (8, "8"),
            (9, "9"),
            (10, "10 - Aime beaucoup"),
        ],
    ),
    "Q19G": (
        (
            "Veuillez attribuer une note à chacun des chefs de parti suivant en "
            "utilisant une échelle de 0 à 10, où 0 signifie « n’aime pas du tout » "
            "et 10 « aime beaucoup » : / Claude Sabourin"
        ),
        [
            (0, "0 - N'aime pas du tout"),
            (1, "1"),
            (2, "2"),
            (3, "3"),
            (4, "4"),
            (5, "5"),
            (6, "6"),
            (7, "7"),
            (8, "8"),
            (9, "9"),
            (10, "10 - Aime beaucoup"),
        ],
    ),
    "Q19AA": (
        "Qui préfèreriez-vous comme premier ministre du Québec ?",
        [
            (1, "Jean Charest"),
            (2, "Pauline Marois"),
            (3, "Amir Khadir"),
            (4, "Françoise David"),
            (5, "François Legault"),
            (98, "Ne sais pas"),
        ],
    ),
    "Q20": (
        (
            "En utilisant une échelle de 0 à 10, où 0 indique que vous n’y "
            "accordez « aucune importance » et 10 que vous y accordez « beaucoup "
            "d’importance », quelle importance accordez-vous au parti politique qui "
            "formera le gouvernement au Québec après l’élection ?"
        ),
        [
            (0, "0 - Aucune importance"),
            (1, "1"),
            (2, "2"),
            (3, "3"),
            (4, "4"),
            (5, "5"),
            (6, "6"),
            (7, "7"),
            (8, "8"),
            (9, "9"),
            (10, "10 - Beaucoup d'importance"),
        ],
    ),
    "Q22": (
        (
            "Selon vous, est-il préférable d'avoir un gouvernement majoritaire, un "
            "gouvernement minoritaire ou cela ne fait aucune différence ?"
        ),
        [(1, "Minoritaire"), (2, "Aucune différence"), (3, "Majoritaire"), (9, "Ne sais pas")],
    ),
    "Q24A": (
        (
            "Quelle est la probabilité que les partis suivants gagnent assez de "
            "votes pour avoir au moins un siège à l’Assemblée nationale (0 = très "
            "improbable, 10 = très probable) : / Parti libéral du Québec"
        ),
        [
            (0, "0 - Très improbable"),
            (1, "1"),
            (2, "2"),
            (3, "3"),
            (4, "4"),
            (5, "5"),
            (6, "6"),
            (7, "7"),
            (8, "8"),
            (9, "9"),
            (10, "10 - Très probable"),
        ],
    ),
    "Q24B": (
        (
            "Quelle est la probabilité que les partis suivants gagnent assez de "
            "votes pour avoir au moins un siège à l’Assemblée nationale (0 = très "
            "improbable, 10 = très probable) : / Parti québécois"
        ),
        [
            (0, "0 - Très improbable"),
            (1, "1"),
            (2, "2"),
            (3, "3"),
            (4, "4"),
            (5, "5"),
            (6, "6"),
            (7, "7"),
            (8, "8"),
            (9, "9"),
            (10, "10 - Très probable"),
        ],
    ),
    "Q24C": (
        (
            "Quelle est la probabilité que les partis suivants gagnent assez de "
            "votes pour avoir au moins un siège à l’Assemblée nationale (0 = très "
            "improbable, 10 = très probable) : / Coalition avenir Québec - L’équipe "
            "François Legault"
        ),
        [
            (0, "0 - Très improbable"),
            (1, "1"),
            (2, "2"),
            (3, "3"),
            (4, "4"),
            (5, "5"),
            (6, "6"),
            (7, "7"),
            (8, "8"),
            (9, "9"),
            (10, "10 - Très probable"),
        ],
    ),
    "Q25": (
        "D’après vous, quel parti obtiendra le plus de sièges lors de cette élection :",
        OPT_PARTIS_QC,
    ),
    "Q26": (
        (
            "Sur une échelle de 0 à 10, où 0 signifie « aucune importance » et 10 "
            "« beaucoup d'importance », quelle importance accordez-vous à ce qu’un "
            "candidat, plutôt qu’un autre, soit élu dans votre circonscription ?"
        ),
        [
            (0, "0 - Aucune importance"),
            (1, "1"),
            (2, "2"),
            (3, "3"),
            (4, "4"),
            (5, "5"),
            (6, "6"),
            (7, "7"),
            (8, "8"),
            (9, "9"),
            (10, "10 - Beaucoup d'importance"),
        ],
    ),
    "Q27": (
        ("Y a-t-il un candidat local que vous aimez particulièrement dans votre circonscription ?"),
        [(1, "Oui"), (2, "Non"), (9, "Ne sais pas")],
    ),
    "Q27A": ("De quel parti est ce candidat local ?", OPT_PARTIS_QC),
    "Q28A": (
        (
            "Veuillez indiquer les chances qu’ont les candidats de chaque parti de "
            "gagner dans votre CIRCONSCRIPTION sur une échelle de 0 à 10 (0 = "
            "aucune chance, 10 = certain de gagner) : / Parti libéral du Québec"
        ),
        [
            (0, "0 - Aucune chance"),
            (1, "1"),
            (2, "2"),
            (3, "3"),
            (4, "4"),
            (5, "5"),
            (6, "6"),
            (7, "7"),
            (8, "8"),
            (9, "9"),
            (10, "10 - Certain de gagner"),
        ],
    ),
    "Q28B": (
        (
            "Veuillez indiquer les chances qu’ont les candidats de chaque parti de "
            "gagner dans votre CIRCONSCRIPTION sur une échelle de 0 à 10 (0 = "
            "aucune chance, 10 = certain de gagner) : / Parti québécois"
        ),
        [
            (0, "0 - Aucune chance"),
            (1, "1"),
            (2, "2"),
            (3, "3"),
            (4, "4"),
            (5, "5"),
            (6, "6"),
            (7, "7"),
            (8, "8"),
            (9, "9"),
            (10, "10 - Certain de gagner"),
        ],
    ),
    "Q28C": (
        (
            "Veuillez indiquer les chances qu’ont les candidats de chaque parti de "
            "gagner dans votre CIRCONSCRIPTION sur une échelle de 0 à 10 (0 = "
            "aucune chance, 10 = certain de gagner) : / Québec solidaire"
        ),
        [
            (0, "0 - Aucune chance"),
            (1, "1"),
            (2, "2"),
            (3, "3"),
            (4, "4"),
            (5, "5"),
            (6, "6"),
            (7, "7"),
            (8, "8"),
            (9, "9"),
            (10, "10 - Certain de gagner"),
        ],
    ),
    "Q28D": (
        (
            "Veuillez indiquer les chances qu’ont les candidats de chaque parti de "
            "gagner dans votre CIRCONSCRIPTION sur une échelle de 0 à 10 (0 = "
            "aucune chance, 10 = certain de gagner) : / Coalition avenir Québec - "
            "L’équipe François Legault"
        ),
        [
            (0, "0 - Aucune chance"),
            (1, "1"),
            (2, "2"),
            (3, "3"),
            (4, "4"),
            (5, "5"),
            (6, "6"),
            (7, "7"),
            (8, "8"),
            (9, "9"),
            (10, "10 - Certain de gagner"),
        ],
    ),
    "Q28E": (
        (
            "Veuillez indiquer les chances qu’ont les candidats de chaque parti de "
            "gagner dans votre CIRCONSCRIPTION sur une échelle de 0 à 10 (0 = "
            "aucune chance, 10 = certain de gagner) : / Option nationale"
        ),
        [
            (0, "0 - Aucune chance"),
            (1, "1"),
            (2, "2"),
            (3, "3"),
            (4, "4"),
            (5, "5"),
            (6, "6"),
            (7, "7"),
            (8, "8"),
            (9, "9"),
            (10, "10 - Certain de gagner"),
        ],
    ),
    "Q28F": (
        (
            "Veuillez indiquer les chances qu’ont les candidats de chaque parti de "
            "gagner dans votre CIRCONSCRIPTION sur une échelle de 0 à 10 (0 = "
            "aucune chance, 10 = certain de gagner) : / Parti vert du Québec"
        ),
        [
            (0, "0 - Aucune chance"),
            (1, "1"),
            (2, "2"),
            (3, "3"),
            (4, "4"),
            (5, "5"),
            (6, "6"),
            (7, "7"),
            (8, "8"),
            (9, "9"),
            (10, "10 - Certain de gagner"),
        ],
    ),
    "Q29": (
        (
            "Croyez-vous que le résultat de l'élection dans votre circonscription "
            "sera très serré, assez serré, pas très serré ou pas du tout serré ?"
        ),
        [(1, "Pas du tout serré"), (2, "Pas très serré"), (3, "Assez serré"), (4, "Très serré")],
    ),
    "Q29A": (
        (
            "Si un référendum avait lieu aujourd’hui vous demandant si vous voulez "
            "que le Québec devienne un pays souverain, voteriez-vous « Oui » ou "
            "voteriez-vous « Non » ?"
        ),
        [(1, "Oui"), (2, "Non"), (9, "Ne sais pas")],
    ),
    # Orientations politiques & Idéologie
    "Q30A": (
        (
            "En politique, les gens parlent parfois de gauche et de droite. Où "
            "vous situez-vous sur une échelle de 0 à 10, où 0 signifie « l’extrême "
            "gauche » et 10 « l’extrême droite » ?"
        ),
        [
            (0, "0 - Extrême gauche"),
            (1, "1"),
            (2, "2"),
            (3, "3"),
            (4, "4"),
            (5, "5"),
            (6, "6"),
            (7, "7"),
            (8, "8"),
            (9, "9"),
            (10, "10 - Extrême droite"),
        ],
    ),
    "Q30AA": (
        (
            "Où situeriez-vous chacun des partis politiques sur la même échelle de "
            "0 à 10 de gauche à droite ? / Parti libéral du Québec"
        ),
        [
            (0, "0 - Extrême gauche"),
            (1, "1"),
            (2, "2"),
            (3, "3"),
            (4, "4"),
            (5, "5"),
            (6, "6"),
            (7, "7"),
            (8, "8"),
            (9, "9"),
            (10, "10 - Extrême droite"),
        ],
    ),
    "Q30AB": (
        (
            "Où situeriez-vous chacun des partis politiques sur la même échelle de "
            "0 à 10 de gauche à droite ? / Parti québécois"
        ),
        [
            (0, "0 - Extrême gauche"),
            (1, "1"),
            (2, "2"),
            (3, "3"),
            (4, "4"),
            (5, "5"),
            (6, "6"),
            (7, "7"),
            (8, "8"),
            (9, "9"),
            (10, "10 - Extrême droite"),
        ],
    ),
    "Q30AC": (
        (
            "Où situeriez-vous chacun des partis politiques sur la même échelle de "
            "0 à 10 de gauche à droite ? / Québec solidaire"
        ),
        [
            (0, "0 - Extrême gauche"),
            (1, "1"),
            (2, "2"),
            (3, "3"),
            (4, "4"),
            (5, "5"),
            (6, "6"),
            (7, "7"),
            (8, "8"),
            (9, "9"),
            (10, "10 - Extrême droite"),
        ],
    ),
    "Q30AD": (
        (
            "Où situeriez-vous chacun des partis politiques sur la même échelle de "
            "0 à 10 de gauche à droite ? / Coalition avenir Québec - L’équipe "
            "François Legault"
        ),
        [
            (0, "0 - Extrême gauche"),
            (1, "1"),
            (2, "2"),
            (3, "3"),
            (4, "4"),
            (5, "5"),
            (6, "6"),
            (7, "7"),
            (8, "8"),
            (9, "9"),
            (10, "10 - Extrême droite"),
        ],
    ),
    "Q30AE": (
        (
            "Où situeriez-vous chacun des partis politiques sur la même échelle de "
            "0 à 10 de gauche à droite ? / Option nationale"
        ),
        [
            (0, "0 - Extrême gauche"),
            (1, "1"),
            (2, "2"),
            (3, "3"),
            (4, "4"),
            (5, "5"),
            (6, "6"),
            (7, "7"),
            (8, "8"),
            (9, "9"),
            (10, "10 - Extrême droite"),
        ],
    ),
    "Q30AF": (
        (
            "Où situeriez-vous chacun des partis politiques sur la même échelle de "
            "0 à 10 de gauche à droite ? / Parti vert du Québec"
        ),
        [
            (0, "0 - Extrême gauche"),
            (1, "1"),
            (2, "2"),
            (3, "3"),
            (4, "4"),
            (5, "5"),
            (6, "6"),
            (7, "7"),
            (8, "8"),
            (9, "9"),
            (10, "10 - Extrême droite"),
        ],
    ),
    "Q30B": (
        (
            "Où vous situez-vous sur une échelle de 0 à 10, où 0 signifie être « "
            "très favorable aux réductions de taxes et d’impôts » et 10 signifie "
            "être « très favorable à l’amélioration des services publics » ?"
        ),
        [
            (0, "0 - Réductions de taxes et d'impôts"),
            (1, "1"),
            (2, "2"),
            (3, "3"),
            (4, "4"),
            (5, "5"),
            (6, "6"),
            (7, "7"),
            (8, "8"),
            (9, "9"),
            (10, "10 - Amélioration des services publics"),
        ],
    ),
    "Q30C": (
        (
            "Où vous situez-vous sur une échelle de 0 à 10, où 0 signifie être « "
            "très favorable à la redistribution » et 10 signifie être « très opposé "
            "à la redistribution » ?"
        ),
        [
            (0, "0 - Très favorable à la redistribution"),
            (1, "1"),
            (2, "2"),
            (3, "3"),
            (4, "4"),
            (5, "5"),
            (6, "6"),
            (7, "7"),
            (8, "8"),
            (9, "9"),
            (10, "10 - Très opposé à la redistribution"),
        ],
    ),
    "Q30D": (
        (
            "Où vous situez-vous sur une échelle de 0 à 10, où 0 signifie être « "
            "très favorable aux sentences lourdes » et 10 signifie être « très "
            "favorable aux programmes de réhabilitation » ?"
        ),
        [
            (0, "0 - Favorable aux sentences lourdes"),
            (1, "1"),
            (2, "2"),
            (3, "3"),
            (4, "4"),
            (5, "5"),
            (6, "6"),
            (7, "7"),
            (8, "8"),
            (9, "9"),
            (10, "10 - Favorable à la réhabilitation"),
        ],
    ),
    "Q30E": (
        (
            "Où vous situez-vous sur une échelle de 0 à 10, où 0 signifie être « "
            "très favorable à l’accueil d’un plus grand nombre d’immigrants » et 10 "
            "signifie être « très favorable à la réduction du nombre de nouveaux "
            "immigrants » ?"
        ),
        [
            (0, "0 - Plus grand nombre d'immigrants"),
            (1, "1"),
            (2, "2"),
            (3, "3"),
            (4, "4"),
            (5, "5"),
            (6, "6"),
            (7, "7"),
            (8, "8"),
            (9, "9"),
            (10, "10 - Réduction de l'immigration"),
        ],
    ),
    "Q30F": (
        (
            "Sur une échelle de 0 à 10, où 0 signifie « beaucoup moins » et 10 "
            "signifie « beaucoup plus », combien les étudiants universitaires "
            "devraient-ils payer pour leurs droits de scolarité ?"
        ),
        [
            (0, "0 - Beaucoup moins"),
            (1, "1"),
            (2, "2"),
            (3, "3"),
            (4, "4"),
            (5, "5"),
            (6, "6"),
            (7, "7"),
            (8, "8"),
            (9, "9"),
            (10, "10 - Beaucoup plus"),
        ],
    ),
    "Q31": (
        (
            "Si vous ne votiez pas à cette élection, vous sentiriez-vous très "
            "coupable, assez coupable, pas très coupable, ou pas du tout coupable ?"
        ),
        [
            (1, "Pas du tout coupable"),
            (2, "Pas très coupable"),
            (3, "Assez coupable"),
            (4, "Très coupable"),
        ],
    ),
    "Q32A": (
        (
            "À quel point pensez-vous que ces gouvernements se soucient de ce que "
            "les gens comme vous pensent : / Le gouvernement du Québec"
        ),
        [(1, "Aucunement"), (2, "Un peu"), (3, "Assez"), (4, "Beaucoup")],
    ),
    "Q32B": (
        (
            "À quel point pensez-vous que ces gouvernements se soucient de ce que "
            "les gens comme vous pensent : / Le gouvernement du Canada"
        ),
        [(1, "Aucunement"), (2, "Un peu"), (3, "Assez"), (4, "Beaucoup")],
    ),
    "Q34A": (
        (
            "Veuillez indiquer l’importance que ces élections ont pour vous sur "
            "une échelle de 0 à 10 (0 = pas importante du tout, 10 = extrêmement "
            "importante) : / L'élection provinciale québécoise de 2012"
        ),
        [
            (0, "0 - Pas importante du tout"),
            (1, "1"),
            (2, "2"),
            (3, "3"),
            (4, "4"),
            (5, "5"),
            (6, "6"),
            (7, "7"),
            (8, "8"),
            (9, "9"),
            (10, "10 - Extrêmement importante"),
        ],
    ),
    "Q34B": (
        (
            "Veuillez indiquer l’importance que ces élections ont pour vous sur "
            "une échelle de 0 à 10 (0 = pas importante du tout, 10 = extrêmement "
            "importante) : / La dernière élection fédérale canadienne (mai 2011)"
        ),
        [
            (0, "0 - Pas importante du tout"),
            (1, "1"),
            (2, "2"),
            (3, "3"),
            (4, "4"),
            (5, "5"),
            (6, "6"),
            (7, "7"),
            (8, "8"),
            (9, "9"),
            (10, "10 - Extrêmement importante"),
        ],
    ),
    "Q34C": (
        (
            "Veuillez indiquer l’importance que ces élections ont pour vous sur "
            "une échelle de 0 à 10 (0 = pas importante du tout, 10 = extrêmement "
            "importante) : / La dernière élection municipale dans votre "
            "municipalité"
        ),
        [
            (0, "0 - Pas importante du tout"),
            (1, "1"),
            (2, "2"),
            (3, "3"),
            (4, "4"),
            (5, "5"),
            (6, "6"),
            (7, "7"),
            (8, "8"),
            (9, "9"),
            (10, "10 - Extrêmement importante"),
        ],
    ),
    "Q35A1": (
        (
            "Êtes-vous fortement d’accord, assez d’accord, assez en désaccord ou "
            "fortement en désaccord avec : On ne devrait pas accorder le droit de "
            "vote à des gens qui ne connaissent rien à la politique."
        ),
        OPT_AGREE_DISAGREE,
    ),
    "Q35A": (
        (
            "Êtes-vous fortement d’accord, assez d’accord, assez en désaccord ou "
            "fortement en désaccord avec : Parfois, la politique et le gouvernement "
            "semblent tellement compliqués qu'une personne comme moi ne peut pas "
            "vraiment comprendre ce qui se passe."
        ),
        OPT_AGREE_DISAGREE,
    ),
    "Q35B": (
        (
            "Êtes-vous fortement d’accord, assez d’accord, assez en désaccord ou "
            "fortement en désaccord avec : Les politiciens ne se soucient pas "
            "beaucoup de ce que les gens comme moi pensent."
        ),
        OPT_AGREE_DISAGREE,
    ),
    "Q35C": (
        (
            "Êtes-vous fortement d’accord, assez d’accord, assez en désaccord ou "
            "fortement en désaccord avec : Il n'y a pas grand-chose que l'on puisse "
            "faire pour changer la façon dont le gouvernement agit."
        ),
        OPT_AGREE_DISAGREE,
    ),
    "Q35D": (
        (
            "Êtes-vous fortement d’accord, assez d’accord, assez en désaccord ou "
            "fortement en désaccord avec : Les gens comme moi n'ont aucun pouvoir "
            "sur ce que fait le gouvernement."
        ),
        OPT_AGREE_DISAGREE,
    ),
    "Q36": (
        (
            "Votre situation financière est-elle meilleure, pire ou à peu près la "
            "même qu'il y a un an ?"
        ),
        [(1, "Pire"), (2, "À peu près la même"), (3, "Meilleure"), (9, "Ne sais pas")],
    ),
    "Q37": (
        (
            "Au cours de la dernière année, les politiques du gouvernement "
            "QUÉBÉCOIS ont-elles amélioré votre situation financière, ont-elles nui "
            "à votre situation financière, ou n’ont-elles pas changé grand-chose ?"
        ),
        [
            (1, "Nui à ma situation"),
            (2, "Pas changé grand-chose"),
            (3, "Amélioré ma situation"),
            (9, "Ne sais pas"),
        ],
    ),
    "Q38": (
        (
            "Au cours de la dernière année, les politiques du gouvernement FÉDÉRAL "
            "ont-elles amélioré votre situation financière, ont-elles nui à votre "
            "situation financière, ou n’ont-elles pas changé grand-chose ?"
        ),
        [
            (1, "Nui à ma situation"),
            (2, "Pas changé grand-chose"),
            (3, "Amélioré ma situation"),
            (9, "Ne sais pas"),
        ],
    ),
    "Q40": (
        (
            "Veuillez indiquer si l'affirmation suivante est vraie ou fausse : « "
            "pour être élu, un candidat à l'élection provinciale doit obtenir plus "
            "de la moitié des votes dans une circonscription »."
        ),
        [(1, "Vrai"), (2, "Faux"), (9, "Ne sais pas")],
    ),
    "Q41": (
        (
            "Dans notre système électoral actuel, un parti peut gagner une "
            "majorité de sièges sans avoir la majorité des votes. Trouvez-vous cela "
            "très acceptable, acceptable, ni acceptable ni inacceptable, "
            "inacceptable ou très inacceptable ?"
        ),
        [
            (1, "Très inacceptable"),
            (2, "Inacceptable"),
            (3, "Ni acceptable ni inacceptable"),
            (4, "Acceptable"),
            (5, "Très acceptable"),
        ],
    ),
    "Q42A": (
        (
            "Sur une échelle de 0 à 10, quelle influence les politiques des "
            "gouvernements suivants ont-elles sur votre bien-être (0 = très petit "
            "impact, 10 = très grand impact) : / Le gouvernement du Québec"
        ),
        [
            (0, "0 - Très petit impact"),
            (1, "1"),
            (2, "2"),
            (3, "3"),
            (4, "4"),
            (5, "5"),
            (6, "6"),
            (7, "7"),
            (8, "8"),
            (9, "9"),
            (10, "10 - Très grand impact"),
        ],
    ),
    "Q42B": (
        (
            "Sur une échelle de 0 à 10, quelle influence les politiques des "
            "gouvernements suivants ont-elles sur votre bien-être (0 = très petit "
            "impact, 10 = très grand impact) : / Le gouvernement du Canada"
        ),
        [
            (0, "0 - Très petit impact"),
            (1, "1"),
            (2, "2"),
            (3, "3"),
            (4, "4"),
            (5, "5"),
            (6, "6"),
            (7, "7"),
            (8, "8"),
            (9, "9"),
            (10, "10 - Très grand impact"),
        ],
    ),
    "Q42C": (
        (
            "Sur une échelle de 0 à 10, quelle influence les politiques des "
            "gouvernements suivants ont-elles sur votre bien-être (0 = très petit "
            "impact, 10 = très grand impact) : / Votre gouvernement municipal"
        ),
        [
            (0, "0 - Très petit impact"),
            (1, "1"),
            (2, "2"),
            (3, "3"),
            (4, "4"),
            (5, "5"),
            (6, "6"),
            (7, "7"),
            (8, "8"),
            (9, "9"),
            (10, "10 - Très grand impact"),
        ],
    ),
    "Q43A": (
        (
            "Sur une échelle de 0 à 10, à quel point êtes-vous attaché au/à (0 = "
            "pas attaché du tout, 10 = très attaché) : / Canada"
        ),
        [
            (0, "0 - Pas attaché du tout"),
            (1, "1"),
            (2, "2"),
            (3, "3"),
            (4, "4"),
            (5, "5"),
            (6, "6"),
            (7, "7"),
            (8, "8"),
            (9, "9"),
            (10, "10 - Très attaché"),
        ],
    ),
    "Q43B": (
        (
            "Sur une échelle de 0 à 10, à quel point êtes-vous attaché au/à (0 = "
            "pas attaché du tout, 10 = très attaché) : / Québec"
        ),
        [
            (0, "0 - Pas attaché du tout"),
            (1, "1"),
            (2, "2"),
            (3, "3"),
            (4, "4"),
            (5, "5"),
            (6, "6"),
            (7, "7"),
            (8, "8"),
            (9, "9"),
            (10, "10 - Très attaché"),
        ],
    ),
    "Q43C": (
        (
            "Sur une échelle de 0 à 10, à quel point êtes-vous attaché au/à (0 = "
            "pas attaché du tout, 10 = très attaché) : / Votre municipalité"
        ),
        [
            (0, "0 - Pas attaché du tout"),
            (1, "1"),
            (2, "2"),
            (3, "3"),
            (4, "4"),
            (5, "5"),
            (6, "6"),
            (7, "7"),
            (8, "8"),
            (9, "9"),
            (10, "10 - Très attaché"),
        ],
    ),
    "Q44A": (
        (
            "Pour vous personnellement, est-ce que voter est avant tout un devoir "
            "ou un choix ? / Aux élections provinciales"
        ),
        [(1, "Devoir"), (2, "Choix"), (9, "Ne sais pas")],
    ),
    "Q44B": (
        (
            "Pour vous personnellement, est-ce que voter est avant tout un devoir "
            "ou un choix ? / Aux élections fédérales"
        ),
        [(1, "Devoir"), (2, "Choix"), (9, "Ne sais pas")],
    ),
    "Q44C": (
        (
            "Pour vous personnellement, est-ce que voter est avant tout un devoir "
            "ou un choix ? / Aux élections municipales"
        ),
        [(1, "Devoir"), (2, "Choix"), (9, "Ne sais pas")],
    ),
    "Q45A": (
        (
            "À quel point considérez-vous que voter est un devoir : très "
            "fortement, assez fortement, ou peu fortement ? / En politique "
            "provinciale"
        ),
        [(1, "Peu fortement"), (2, "Assez fortement"), (3, "Très fortement")],
    ),
    "Q45B": (
        (
            "À quel point considérez-vous que voter est un devoir : très "
            "fortement, assez fortement, ou peu fortement ? / En politique fédérale"
        ),
        [(1, "Peu fortement"), (2, "Assez fortement"), (3, "Très fortement")],
    ),
    "Q45C": (
        (
            "À quel point considérez-vous que voter est un devoir : très "
            "fortement, assez fortement, ou peu fortement ? / En politique "
            "municipale"
        ),
        [(1, "Peu fortement"), (2, "Assez fortement"), (3, "Très fortement")],
    ),
    "Q45AA": (
        "Laquelle des affirmations suivantes décrit le mieux votre sentiment ?",
        [
            (1, "Je me sens seulement Canadien"),
            (2, "Je me sens plus Canadien que Québécois"),
            (3, "Je me sens autant Canadien que Québécois"),
            (4, "Je me sens plus Québécois que Canadien"),
            (5, "Je me sens seulement Québécois"),
        ],
    ),
    "Q46": (
        "De façon générale, vous sentez-vous proche d'un parti politique PROVINCIAL au Québec ?",
        [(1, "Oui"), (2, "Non"), (9, "Ne sais pas")],
    ),
    "Q46A": ("De quel parti vous sentez-vous le plus proche ?", OPT_PARTIS_QC),
    "Q46B": (
        (
            "Vous sentez-vous très proche, assez proche, ou pas très proche du "
            "parti provincial dont vous vous sentez le plus proche ?"
        ),
        [(1, "Pas très proche"), (2, "Assez proche"), (3, "Très proche"), (9, "Ne sais pas")],
    ),
    "Q47": (
        "De façon générale, vous sentez-vous proche d'un parti politique FÉDÉRAL ?",
        [(1, "Oui"), (2, "Non"), (9, "Ne sais pas")],
    ),
    "Q47A": ("De quel parti fédéral vous sentez-vous le plus proche ?", OPT_PARTIS_FED),
    "Q47B": (
        (
            "Vous sentez-vous très proche, assez proche, ou pas très proche du "
            "parti fédéral dont vous vous sentez le plus proche ?"
        ),
        [(1, "Pas très proche"), (2, "Assez proche"), (3, "Très proche"), (9, "Ne sais pas")],
    ),
    "Q48": (
        (
            "Pour certaines personnes voter est simple et facile. Pour d'autres, "
            "c'est difficile ou compliqué. Pour vous, est-il facile ou difficile de "
            "voter ?"
        ),
        [(1, "Très difficile"), (2, "Assez difficile"), (3, "Assez facile"), (4, "Très facile")],
    ),
    "Q49": (
        (
            "À quel point croyez-vous que vos opinions sont reflétées à "
            "l’Assemblée nationale du Québec (0 = pas du tout, 10 = très bien) ?"
        ),
        [
            (0, "0 - Pas du tout"),
            (1, "1"),
            (2, "2"),
            (3, "3"),
            (4, "4"),
            (5, "5"),
            (6, "6"),
            (7, "7"),
            (8, "8"),
            (9, "9"),
            (10, "10 - Très bien"),
        ],
    ),
    "Q50A": (
        (
            "Diriez-vous qu'il y a très peu de corruption, un peu de corruption, "
            "moyennement de corruption ou beaucoup de corruption au : / "
            "Gouvernement du Québec"
        ),
        [
            (1, "Très peu de corruption"),
            (2, "Un peu de corruption"),
            (3, "Moyennement de corruption"),
            (4, "Beaucoup de corruption"),
        ],
    ),
    "Q50B": (
        (
            "Diriez-vous qu'il y a très peu de corruption, un peu de corruption, "
            "moyennement de corruption ou beaucoup de corruption au : / "
            "Gouvernement du Canada"
        ),
        [
            (1, "Très peu de corruption"),
            (2, "Un peu de corruption"),
            (3, "Moyennement de corruption"),
            (4, "Beaucoup de corruption"),
        ],
    ),
    "Q50C": (
        (
            "Diriez-vous qu'il y a très peu de corruption, un peu de corruption, "
            "moyennement de corruption ou beaucoup de corruption au : / Niveau "
            "municipal"
        ),
        [
            (1, "Très peu de corruption"),
            (2, "Un peu de corruption"),
            (3, "Moyennement de corruption"),
            (4, "Beaucoup de corruption"),
        ],
    ),
    # Sociodémo complémentaires (SDR / PSD)
    "SD10": (
        "Étudiez-vous actuellement dans un collège ou une université ?",
        [(1, "Oui, à temps plein"), (2, "Oui, à temps partiel"), (3, "Non")],
    ),
    "SD3": (
        "Quelle est votre religion, si vous en avez une ?",
        [
            (1, "Anglicane / Église de l’Angleterre"),
            (2, "Baptiste"),
            (3, "Bouddhiste / Bouddhisme"),
            (4, "Catholique"),
            (5, "Orthodoxe grecque/ukrainienne/russe"),
            (6, "Hindoue / Hindouisme"),
            (7, "Islam / Musulmane"),
            (8, "Témoins de Jéhovah"),
            (9, "Judaïsme / Juive"),
            (10, "Luthérienne"),
            (11, "Mormone"),
            (12, "Protestante"),
            (13, "Sikh"),
            (14, "Église unie du Canada"),
            (15, "Aucune religion"),
            (96, "Autre"),
        ],
    ),
    "SD3B": (
        (
            "À l'exception d'occasions spéciales comme les mariages et les "
            "cérémonies funéraires, à quelle fréquence assistez-vous à des services "
            "religieux ?"
        ),
        [
            (1, "Jamais"),
            (2, "Moins souvent"),
            (3, "Seulement lors des fêtes religieuses"),
            (4, "Au moins une fois par mois"),
            (5, "Une fois par semaine"),
            (6, "Plus d'une fois par semaine"),
            (7, "Tous les jours"),
        ],
    ),
    "SD5": (
        (
            "Laquelle des options suivantes décrit le mieux le revenu annuel avant "
            "impôt de votre ménage ?"
        ),
        [
            (1, "Moins de 20,000$"),
            (2, "20,000$-29,999$"),
            (3, "30,000$-39,999$"),
            (4, "40,000$-49,999$"),
            (5, "50,000$-59,999$"),
            (6, "60,000$-69,999$"),
            (7, "70,000$-79,999$"),
            (8, "80,000$-89,999$"),
            (9, "90,000$-99,999$"),
            (10, "100,000$-119,999$"),
            (11, "120,000$ et plus"),
        ],
    ),
    "SD6": ("Êtes-vous né au Canada ?", [(1, "Oui"), (2, "Non"), (9, "Ne sais pas")]),
    "SD6A": (
        "Dans quel pays êtes-vous né ?",
        [(1, "Albanie"), (2, "Algérie"), (3, "Argentine"), (4, "Australie"), (96, "Autre pays")],
    ),
    ("SD6B"): ("Votre mère est-elle née au Canada ?", [(1, "Oui"), (2, "Non"), (9, "Ne sais pas")]),
    "SD6C": (
        "Dans quel pays est née votre mère ?",
        [(1, "Albanie"), (2, "Algérie"), (3, "Argentine"), (4, "Australie"), (96, "Autre pays")],
    ),
    "SD6D": ("Depuis combien d'années vivez-vous au Canada ?", [(999, "Ne sais pas")]),
    "SD6E": ("Depuis combien d'années vivez-vous au Québec ?", [(999, "Ne sais pas")]),
    "SD7": (
        "Quelle expression décrit le mieux l'endroit où vous vivez ?",
        [
            (1, "Une grande ville"),
            (2, "Une banlieue ou proche d'une grande ville"),
            (3, "Une municipalité ou petite ville"),
            (4, "Un village"),
            (5, "La campagne"),
        ],
    ),
    "SD8": (
        (
            "Lors des dernières élections PROVINCIALES, en décembre 2008, pour "
            "quel parti avez-vous voté ?"
        ),
        [
            (1, "Parti libéral du Québec"),
            (2, "Action démocratique du Québec"),
            (3, "Parti québécois"),
            (4, "Parti vert du Québec"),
            (5, "Québec solidaire"),
            (96, "Autre parti"),
            (97, "N'a pas voté"),
            (98, "Ne sais pas"),
        ],
    ),
    "SD9": (
        "Lors de la dernière élection FÉDÉRALE, en mai 2011, pour quel parti avez-vous voté ?",
        [
            (1, "Bloc québécois"),
            (2, "Parti conservateur du Canada"),
            (3, "Nouveau parti démocratique"),
            (4, "Parti libéral du Canada"),
            (5, "Le Parti vert du Canada"),
            (96, "Autre parti"),
            (97, "N'a pas voté"),
            (98, "Ne sais pas"),
        ],
    ),
    # Volet Post-Électoral (PQ)
    "PQ1A": (
        (
            "À l’aide d’une échelle de 0 à 10, où 0 signifie « pas satisfait du "
            "tout » et 10 signifie « très satisfait », veuillez indiquer si vous "
            "êtes satisfait de la façon dont fonctionne la démocratie : / Au Québec "
            "(post-électoral)"
        ),
        [
            (0, "0 - Pas satisfait du tout"),
            (1, "1"),
            (2, "2"),
            (3, "3"),
            (4, "4"),
            (5, "5"),
            (6, "6"),
            (7, "7"),
            (8, "8"),
            (9, "9"),
            (10, "10 - Très satisfait"),
        ],
    ),
    "PQ1B": (
        (
            "À l’aide d’une échelle de 0 à 10, où 0 signifie « pas satisfait du "
            "tout » et 10 signifie « très satisfait », veuillez indiquer si vous "
            "êtes satisfait de la façon dont fonctionne la démocratie : / Au Canada "
            "(post-électoral)"
        ),
        [
            (0, "0 - Pas satisfait du tout"),
            (1, "1"),
            (2, "2"),
            (3, "3"),
            (4, "4"),
            (5, "5"),
            (6, "6"),
            (7, "7"),
            (8, "8"),
            (9, "9"),
            (10, "10 - Très satisfait"),
        ],
    ),
    "PQ2A": (
        (
            "De quels enjeux les partis ont-ils le plus parlé pendant la campagne "
            "électorale ? / Parti libéral du Québec"
        ),
        [
            (1, "La santé"),
            (2, "Les taxes et impôts"),
            (3, "L’éducation"),
            (4, "L’environnement"),
            (5, "La dette et l’économie"),
        ],
    ),
    "PQ2B": (
        (
            "De quels enjeux les partis ont-ils le plus parlé pendant la campagne "
            "électorale ? / Parti québécois"
        ),
        [
            (1, "La santé"),
            (2, "Les taxes et impôts"),
            (3, "L’éducation"),
            (4, "L’environnement"),
            (5, "La dette et l’économie"),
        ],
    ),
    "PQ2C": (
        (
            "De quels enjeux les partis ont-ils le plus parlé pendant la campagne "
            "électorale ? / Québec solidaire"
        ),
        [
            (1, "La santé"),
            (2, "Les taxes et impôts"),
            (3, "L’éducation"),
            (4, "L’environnement"),
            (5, "La dette et l’économie"),
        ],
    ),
    "PQ2D": (
        (
            "De quels enjeux les partis ont-ils le plus parlé pendant la campagne "
            "électorale ? / Coalition avenir Québec - L’équipe François Legault"
        ),
        [
            (1, "La santé"),
            (2, "Les taxes et impôts"),
            (3, "L’éducation"),
            (4, "L’environnement"),
            (5, "La dette et l’économie"),
        ],
    ),
    "PQ2E": (
        (
            "De quels enjeux les partis ont-ils le plus parlé pendant la campagne "
            "électorale ? / Option nationale"
        ),
        [
            (1, "La santé"),
            (2, "Les taxes et impôts"),
            (3, "L’éducation"),
            (4, "L’environnement"),
            (5, "La dette et l’économie"),
        ],
    ),
    "PQ2F": (
        (
            "De quels enjeux les partis ont-ils le plus parlé pendant la campagne "
            "électorale ? / Parti vert du Québec"
        ),
        [
            (1, "La santé"),
            (2, "Les taxes et impôts"),
            (3, "L’éducation"),
            (4, "L’environnement"),
            (5, "La dette et l’économie"),
        ],
    ),
    "PQ3A": (
        "Durant la campagne, quel parti a promis : d'introduire une déduction fiscale de 30% ?",
        OPT_PARTIS_QC,
    ),
    "PQ3B": (
        (
            "Durant la campagne, quel parti a promis : que les parents "
            "bénéficieraient d'un rabais sur la taxe scolaire ?"
        ),
        OPT_PARTIS_QC,
    ),
    "PQ3C": (
        (
            "Durant la campagne, quel parti a promis : $100 aux parents ayant des "
            "enfants d'âge scolaire ?"
        ),
        OPT_PARTIS_QC,
    ),
    "PQ5_1": (
        (
            "À chaque élection, plusieurs personnes sont incapables de voter parce "
            "qu’elles ne sont pas inscrites sur la liste électorale, elles sont "
            "malades ou elles n’ont pas le temps. Laquelle des situations suivantes "
            "correspond le mieux à votre cas ?"
        ),
        [
            (1, "Je n'ai pas voté à cette élection"),
            (2, "Je voulais voter mais ne suis pas allé voter"),
            (3, "Je vote généralement mais ne suis pas allé cette fois-ci"),
        ],
    ),
    "PQ5_2": (
        (
            "À chaque élection, plusieurs personnes sont incapables de voter. "
            "Avez-vous été capable de voter à cette élection ?"
        ),
        [(1, "Oui"), (2, "Non"), (9, "Ne sais pas/Préfère ne pas répondre")],
    ),
    "PQ5A": (
        "Quand avez-vous décidé de ne pas voter ou réalisé que vous ne pourriez pas voter ?",
        [
            (1, "Des mois avant le jour du vote"),
            (2, "Quelques semaines avant le jour du vote"),
            (3, "Quelques jours avant le jour du vote"),
            (4, "Le jour du vote"),
            (9, "Ne sais pas"),
        ],
    ),
    "PQ5B": (
        "Considérez-vous que la décision de ne pas voter était :",
        [
            (1, "Une très mauvaise décision"),
            (2, "Une assez mauvaise décision"),
            (3, "Une assez bonne décision"),
            (4, "Une très bonne décision"),
            (9, "Ne sais pas"),
        ],
    ),
    "PQ5C": (
        "Avez-vous voté le jour du vote, par anticipation ou par mesure spéciale ?",
        [
            (1, "Le jour du vote"),
            (2, "Par anticipation"),
            (3, "Par mesure spéciale"),
            (9, "Ne sais pas"),
        ],
    ),
    "PQ5D": (
        "Quand avez-vous décidé de voter ?",
        [
            (1, "Des mois avant le jour du vote"),
            (2, "Quelques semaines avant le jour du vote"),
            (3, "Quelques jours avant le jour du vote"),
            (4, "Le jour du vote"),
            (9, "Ne sais pas"),
        ],
    ),
    "PQ5E": (
        "Considérez-vous que la décision de voter était :",
        [
            (1, "Une très mauvaise décision"),
            (2, "Une assez mauvaise décision"),
            (3, "Une assez bonne décision"),
            (4, "Une très bonne décision"),
            (9, "Ne sais pas"),
        ],
    ),
    "PQ5F": (
        "Avez-vous considéré la possibilité de ne pas voter ?",
        [(1, "Oui"), (2, "Non"), (9, "Ne sais pas")],
    ),
    "PQ6": ("Pour le candidat de quel parti avez-vous voté ?", OPT_PARTIS_QC),
    "PQ6A": (
        "Avez-vous considéré la possibilité de voter pour un autre parti ?",
        [(1, "Oui"), (2, "Non"), (9, "Ne sais pas")],
    ),
    "PQ6B": ("Quel autre parti avez-vous considéré ?", OPT_PARTIS_QC),
    "PQ6C": (
        "Quand avez-vous décidé de voter pour le parti que vous avez choisi ?",
        [
            (1, "Des mois avant le jour du vote"),
            (2, "Quelques semaines avant le jour du vote"),
            (3, "Quelques jours avant le jour du vote"),
            (4, "Le jour du vote"),
            (9, "Ne sais pas"),
        ],
    ),
    "PQ6D": (
        "Considérez-vous que votre choix de vote était :",
        [
            (1, "Une très mauvaise décision"),
            (2, "Une assez mauvaise décision"),
            (3, "Une assez bonne décision"),
            (4, "Une très bonne décision"),
            (9, "Ne sais pas"),
        ],
    ),
    "PQ8": (
        (
            "Diriez-vous que le parti pour lequel vous avez voté a gagné "
            "l'élection ou a perdu l'élection ?"
        ),
        [(1, "A gagné l'élection"), (2, "A perdu l'élection"), (9, "Ne sais pas")],
    ),
    "PQ9A": (
        (
            "À quel point avez-vous été attentif aux nouvelles concernant "
            "l'élection (0 = aucune attention, 10 = beaucoup d'attention) : / À la "
            "télévision"
        ),
        [
            (0, "0 - Aucune attention"),
            (1, "1"),
            (2, "2"),
            (3, "3"),
            (4, "4"),
            (5, "5"),
            (6, "6"),
            (7, "7"),
            (8, "8"),
            (9, "9"),
            (10, "10 - Beaucoup d'attention"),
        ],
    ),
    "PQ9B": (
        (
            "À quel point avez-vous été attentif aux nouvelles concernant "
            "l'élection (0 = aucune attention, 10 = beaucoup d'attention) : / Dans "
            "les journaux"
        ),
        [
            (0, "0 - Aucune attention"),
            (1, "1"),
            (2, "2"),
            (3, "3"),
            (4, "4"),
            (5, "5"),
            (6, "6"),
            (7, "7"),
            (8, "8"),
            (9, "9"),
            (10, "10 - Beaucoup d'attention"),
        ],
    ),
    "PQ9C": (
        (
            "À quel point avez-vous été attentif aux nouvelles concernant "
            "l'élection (0 = aucune attention, 10 = beaucoup d'attention) : / À la "
            "radio"
        ),
        [
            (0, "0 - Aucune attention"),
            (1, "1"),
            (2, "2"),
            (3, "3"),
            (4, "4"),
            (5, "5"),
            (6, "6"),
            (7, "7"),
            (8, "8"),
            (9, "9"),
            (10, "10 - Beaucoup d'attention"),
        ],
    ),
    "PQ9D": (
        (
            "À quel point avez-vous été attentif aux nouvelles concernant "
            "l'élection (0 = aucune attention, 10 = beaucoup d'attention) : / Sur "
            "internet"
        ),
        [
            (0, "0 - Aucune attention"),
            (1, "1"),
            (2, "2"),
            (3, "3"),
            (4, "4"),
            (5, "5"),
            (6, "6"),
            (7, "7"),
            (8, "8"),
            (9, "9"),
            (10, "10 - Beaucoup d'attention"),
        ],
    ),
    "PQ9F": (
        (
            "À quel point avez-vous été attentif aux nouvelles concernant "
            "l'élection (0 = aucune attention, 10 = beaucoup d'attention) : / Aux "
            "débats des chefs à la télévision"
        ),
        [
            (0, "0 - Aucune attention"),
            (1, "1"),
            (2, "2"),
            (3, "3"),
            (4, "4"),
            (5, "5"),
            (6, "6"),
            (7, "7"),
            (8, "8"),
            (9, "9"),
            (10, "10 - Beaucoup d'attention"),
        ],
    ),
    "PQ10A": (
        (
            "Durant la campagne, avez-vous utilisé ces moyens pour en apprendre "
            "plus sur l’élection ? / Le site web d'un candidat ou d'un parti"
        ),
        [(1, "Oui"), (2, "Non"), (9, "Ne sais pas")],
    ),
    "PQ10B": (
        (
            "Durant la campagne, avez-vous utilisé ces moyens pour en apprendre "
            "plus sur l’élection ? / Les réseaux sociaux (ex. Facebook, Twitter)"
        ),
        [(1, "Oui"), (2, "Non"), (9, "Ne sais pas")],
    ),
    "PQ10C": (
        (
            "Durant la campagne, avez-vous utilisé ces moyens pour en apprendre "
            "plus sur l’élection ? / Les sites d'actualités et journaux en ligne"
        ),
        [(1, "Oui"), (2, "Non"), (9, "Ne sais pas")],
    ),
    "PQ10D": (
        (
            "Durant la campagne, avez-vous utilisé ces moyens pour en apprendre "
            "plus sur l’élection ? / Les blogues politiques"
        ),
        [(1, "Oui"), (2, "Non"), (9, "Ne sais pas")],
    ),
    "PQ10E": (
        (
            "Durant la campagne, avez-vous utilisé ces moyens pour en apprendre "
            "plus sur l’élection ? / Les vidéos en ligne (ex. YouTube)"
        ),
        [(1, "Oui"), (2, "Non"), (9, "Ne sais pas")],
    ),
    "PQ10F": (
        (
            "Durant la campagne, avez-vous utilisé ces moyens pour en apprendre "
            "plus sur l’élection ? / Les applications mobiles ou jeux en ligne"
        ),
        [(1, "Oui"), (2, "Non"), (9, "Ne sais pas")],
    ),
    "PQ11": (
        "Avez-vous utilisé la Boussole électorale québécoise ?",
        [(1, "Oui"), (2, "Non"), (9, "Ne sais pas / Ne me rappelle pas")],
    ),
    "PQ12": (
        "Avez-vous regardé l’un ou l’autre des débats des chefs ?",
        [(1, "Oui"), (2, "Non"), (9, "Ne sais pas")],
    ),
    "PQ13A": (
        (
            "Veuillez indiquer si vous êtes familier avec ce slogan de campagne "
            "électorale : / À nous de choisir"
        ),
        [(1, "Familier"), (2, "Pas familier"), (9, "Ne sais pas")],
    ),
    "PQ13B": (
        (
            "Veuillez indiquer si vous êtes familier avec ce slogan de campagne "
            "électorale : / C'est à vous de choisir"
        ),
        [(1, "Familier"), (2, "Pas familier"), (9, "Ne sais pas")],
    ),
    "PQ13C": (
        (
            "Veuillez indiquer si vous êtes familier avec ce slogan de campagne "
            "électorale : / La force de l'action"
        ),
        [(1, "Familier"), (2, "Pas familier"), (9, "Ne sais pas")],
    ),
    "PQ13D": (
        (
            "Veuillez indiquer si vous êtes familier avec ce slogan de campagne "
            "électorale : / Le Québec a besoin d'un changement"
        ),
        [(1, "Familier"), (2, "Pas familier"), (9, "Ne sais pas")],
    ),
    "PQ13E": (
        (
            "Veuillez indiquer si vous êtes familier avec ce slogan de campagne "
            "électorale : / On a le droit de choisir"
        ),
        [(1, "Familier"), (2, "Pas familier"), (9, "Ne sais pas")],
    ),
    "PQ13F": (
        (
            "Veuillez indiquer si vous êtes familier avec ce slogan de campagne "
            "électorale : / Travailler pour le Québec"
        ),
        [(1, "Familier"), (2, "Pas familier"), (9, "Ne sais pas")],
    ),
    "PQ14A": (
        "Pouvez-vous indiquer quel parti est associé au slogan : À nous de choisir ?",
        OPT_PARTIS_QC,
    ),
    "PQ14B": (
        "Pouvez-vous indiquer quel parti est associé au slogan : C'est à vous de choisir ?",
        OPT_PARTIS_QC,
    ),
    "PQ14C": (
        "Pouvez-vous indiquer quel parti est associé au slogan : La force de l'action ?",
        OPT_PARTIS_QC,
    ),
    "PQ14D": (
        (
            "Pouvez-vous indiquer quel parti est associé au slogan : Le Québec a "
            "besoin d'un changement ?"
        ),
        OPT_PARTIS_QC,
    ),
    "PQ14E": (
        "Pouvez-vous indiquer quel parti est associé au slogan : On a le droit de choisir ?",
        OPT_PARTIS_QC,
    ),
    "PQ14F": (
        "Pouvez-vous indiquer quel parti est associé au slogan : Travailler pour le Québec ?",
        OPT_PARTIS_QC,
    ),
    "PQ15A": (
        (
            "Durant la campagne électorale, avez-vous appuyé un candidat ou un "
            "parti en : / Posant une affiche ou une pancarte"
        ),
        [(1, "Oui"), (2, "Non"), (9, "Ne sais pas")],
    ),
    "PQ15B": (
        (
            "Durant la campagne électorale, avez-vous appuyé un candidat ou un "
            "parti en : / Donnant de l'argent"
        ),
        [(1, "Oui"), (2, "Non"), (9, "Ne sais pas")],
    ),
    "PQ15C": (
        (
            "Durant la campagne électorale, avez-vous appuyé un candidat ou un "
            "parti en : / Faisant du bénévolat"
        ),
        [(1, "Oui"), (2, "Non"), (9, "Ne sais pas")],
    ),
    "PQ15D": (
        (
            "Durant la campagne électorale, avez-vous appuyé un candidat ou un "
            "parti en : / Assistant à une assemblée ou un ralliement"
        ),
        [(1, "Oui"), (2, "Non"), (9, "Ne sais pas")],
    ),
    "PQ16A": (
        (
            "Durant la campagne électorale, est-ce que l'une des personnes "
            "suivantes vous a encouragé à voter pour un candidat ou un parti : / Un "
            "ami"
        ),
        [(1, "Oui"), (2, "Non"), (9, "Ne sais pas")],
    ),
    "PQ16B": (
        (
            "Durant la campagne électorale, est-ce que l'une des personnes "
            "suivantes vous a encouragé à voter pour un candidat ou un parti : / Un "
            "membre de la famille"
        ),
        [(1, "Oui"), (2, "Non"), (9, "Ne sais pas")],
    ),
    "PQ16C": (
        (
            "Durant la campagne électorale, est-ce que l'une des personnes "
            "suivantes vous a encouragé à voter pour un candidat ou un parti : / Un "
            "collègue de travail"
        ),
        [(1, "Oui"), (2, "Non"), (9, "Ne sais pas")],
    ),
    "PQ16D": (
        (
            "Durant la campagne électorale, est-ce que l'une des personnes "
            "suivantes vous a encouragé à voter pour un candidat ou un parti : / Un "
            "voisin"
        ),
        [(1, "Oui"), (2, "Non"), (9, "Ne sais pas")],
    ),
    "PQ17A": (
        (
            "Durant la campagne, est-ce qu'un candidat ou un parti politique vous "
            "a contacté : / En personne à votre porte"
        ),
        [(1, "Oui"), (2, "Non"), (9, "Ne sais pas")],
    ),
    "PQ17B": (
        (
            "Durant la campagne, est-ce qu'un candidat ou un parti politique vous "
            "a contacté : / Par téléphone avec une personne réelle"
        ),
        [(1, "Oui"), (2, "Non"), (9, "Ne sais pas")],
    ),
    "PQ17C": (
        (
            "Durant la campagne, est-ce qu'un candidat ou un parti politique vous "
            "a contacté : / Par téléphone avec un message enregistré (robocall)"
        ),
        [(1, "Oui"), (2, "Non"), (9, "Ne sais pas")],
    ),
    "PQ17D": (
        (
            "Durant la campagne, est-ce qu'un candidat ou un parti politique vous "
            "a contacté : / Par la poste ou par dépliant"
        ),
        [(1, "Oui"), (2, "Non"), (9, "Ne sais pas")],
    ),
    "PQ17E": (
        (
            "Durant la campagne, est-ce qu'un candidat ou un parti politique vous "
            "a contacté : / Par courriel"
        ),
        [(1, "Oui"), (2, "Non"), (9, "Ne sais pas")],
    ),
    "PQ17AAM1": (
        "Quels partis ou candidats vous ont contacté ? / Parti libéral du Québec",
        [(1, "Sélectionné"), (0, "Non sélectionné")],
    ),
    "PQ17AAM2": (
        "Quels partis ou candidats vous ont contacté ? / Parti québécois",
        [(1, "Sélectionné"), (0, "Non sélectionné")],
    ),
    "PQ17AAM3": (
        "Quels partis ou candidats vous ont contacté ? / Québec solidaire",
        [(1, "Sélectionné"), (0, "Non sélectionné")],
    ),
    "PQ17AAM4": (
        (
            "Quels partis ou candidats vous ont contacté ? / Coalition avenir "
            "Québec - L’équipe François Legault"
        ),
        [(1, "Sélectionné"), (0, "Non sélectionné")],
    ),
    "PQ17AAM5": (
        "Quels partis ou candidats vous ont contacté ? / Option nationale",
        [(1, "Sélectionné"), (0, "Non sélectionné")],
    ),
    "PQ17AAM6": (
        "Quels partis ou candidats vous ont contacté ? / Parti vert du Québec",
        [(1, "Sélectionné"), (0, "Non sélectionné")],
    ),
    "PQ17AAM7": (
        "Quels partis ou candidats vous ont contacté ? / Autre parti ou candidat",
        [(1, "Sélectionné"), (0, "Non sélectionné")],
    ),
    "PQ17BA": (
        (
            "Est-ce que l’un des partis qui vous a contacté vous a encouragé à "
            "voter de façon stratégique : / Parti libéral du Québec"
        ),
        [(1, "Oui"), (2, "Non"), (9, "Ne sais pas")],
    ),
    "PQ17BB": (
        (
            "Est-ce que l’un des partis qui vous a contacté vous a encouragé à "
            "voter de façon stratégique : / Parti québécois"
        ),
        [(1, "Oui"), (2, "Non"), (9, "Ne sais pas")],
    ),
    "PQ17BC": (
        (
            "Est-ce que l’un des partis qui vous a contacté vous a encouragé à "
            "voter de façon stratégique : / Québec solidaire"
        ),
        [(1, "Oui"), (2, "Non"), (9, "Ne sais pas")],
    ),
    "PQ17BD": (
        (
            "Est-ce que l’un des partis qui vous a contacté vous a encouragé à "
            "voter de façon stratégique : / Coalition avenir Québec"
        ),
        [(1, "Oui"), (2, "Non"), (9, "Ne sais pas")],
    ),
    "PQ17BE": (
        (
            "Est-ce que l’un des partis qui vous a contacté vous a encouragé à "
            "voter de façon stratégique : / Option nationale"
        ),
        [(1, "Oui"), (2, "Non"), (9, "Ne sais pas")],
    ),
    "PQ17BF": (
        (
            "Est-ce que l’un des partis qui vous a contacté vous a encouragé à "
            "voter de façon stratégique : / Parti vert du Québec"
        ),
        [(1, "Oui"), (2, "Non"), (9, "Ne sais pas")],
    ),
    "PQ17BG": (
        (
            "Est-ce que l’un des partis qui vous a contacté vous a encouragé à "
            "voter de façon stratégique : / Autre parti"
        ),
        [(1, "Oui"), (2, "Non"), (9, "Ne sais pas")],
    ),
    "PQ18A": (
        (
            "Au cours des 12 derniers mois, avez-vous : Contacté un représentant "
            "élu ou un fonctionnaire"
        ),
        [(1, "Oui"), (2, "Non"), (9, "Ne sais pas")],
    ),
    "PQ18B": (
        (
            "Au cours des 12 derniers mois, avez-vous : Acheté ou boycotté "
            "certains produits pour des raisons politiques, éthiques ou "
            "environnementales"
        ),
        [(1, "Oui"), (2, "Non"), (9, "Ne sais pas")],
    ),
    "PQ18C": (
        (
            "Au cours des 12 derniers mois, avez-vous : Participé à une "
            "manifestation ou un rassemblement public"
        ),
        [(1, "Oui"), (2, "Non"), (9, "Ne sais pas")],
    ),
    "PQ18D": (
        "Au cours des 12 derniers mois, avez-vous : Signé une pétition",
        [(1, "Oui"), (2, "Non"), (9, "Ne sais pas")],
    ),
    "PQ19": (
        (
            "Veuillez noter la dernière élection québécoise sur une échelle de 0 à "
            "10, où 0 signifie que l’élection a été conduite de façon « très "
            "inéquitable » et 10 qu’elle a été conduite de façon « très équitable "
            "»."
        ),
        [
            (0, "0 - Très inéquitable"),
            (1, "1"),
            (2, "2"),
            (3, "3"),
            (4, "4"),
            (5, "5"),
            (6, "6"),
            (7, "7"),
            (8, "8"),
            (9, "9"),
            (10, "10 - Très équitable"),
        ],
    ),
    "PQ20": (
        (
            "Sur une échelle de 0 à 10 (0 = pas du tout fidèlement, 10 = très "
            "fidèlement) : à quel point croyez-vous que le résultat de l'élection "
            "représente le point de vue des électeurs ?"
        ),
        [
            (0, "0 - Pas du tout fidèlement"),
            (1, "1"),
            (2, "2"),
            (3, "3"),
            (4, "4"),
            (5, "5"),
            (6, "6"),
            (7, "7"),
            (8, "8"),
            (9, "9"),
            (10, "10 - Très fidèlement"),
        ],
    ),
    "PQ24": (
        (
            "Croyez-vous que l’élection a surtout porté sur les enjeux actuels les "
            "plus importants ou plutôt sur le choix des meilleures personnes pour "
            "gouverner ?"
        ),
        [
            (1, "Enjeux les plus importants"),
            (2, "Meilleures personnes pour gouverner"),
            (3, "Ne sais pas"),
        ],
    ),
    "PQ25": (
        "Quel enjeu était le plus important dans cette élection ?",
        [
            (1, "La santé"),
            (2, "Les taxes et impôts"),
            (3, "L’éducation"),
            (4, "L’environnement"),
            (5, "Les dépenses publiques et la dette"),
        ],
    ),
    "PQ26B": (
        (
            "Êtes-vous fortement d’accord, assez d’accord, assez en désaccord ou "
            "très en désaccord avec : Les cours universitaires ne devraient pas "
            "coûter plus cher aux étudiants."
        ),
        OPT_AGREE_DISAGREE,
    ),
    "PQ26C": (
        (
            "Êtes-vous fortement d’accord, assez d’accord, assez en désaccord ou "
            "très en désaccord avec : La corruption est inévitable en politique."
        ),
        OPT_AGREE_DISAGREE,
    ),
    "PQ26D": (
        (
            "Êtes-vous fortement d’accord, assez d’accord, assez en désaccord ou "
            "très en désaccord avec : Le gouvernement devrait dépenser plus pour "
            "les services de santé."
        ),
        OPT_AGREE_DISAGREE,
    ),
    "PSD1": (
        "Est-ce que quelqu'un dans votre ménage fait partie d'un syndicat ?",
        [(1, "Oui"), (2, "Non"), (9, "Ne sais pas")],
    ),
    ("PSD2"): (
        "Combien de personnes dans votre ménage ont moins de 18 ans ?",
        [(99, "Ne sais pas")],
    ),
    "PSD3": (
        "Laquelle de ces descriptions décrit le mieux votre type de travail ?",
        [
            (1, "Professionnel à son compte et grand employeur"),
            (2, "Propriétaire de petite entreprise, travailleur autonome"),
            (3, "Expert technique et technicien"),
            (4, "Cadre supérieur et gestionnaire"),
            (5, "Employé de bureau et de service"),
            (6, "Ouvrier spécialisé ou qualifié"),
            (7, "Ouvrier non spécialisé"),
            (8, "Agriculteur / exploitant agricole"),
            (9, "Autre type de travail"),
            (99, "Pas de réponse"),
        ],
    ),
}


def _clean_text(s: str) -> str:
    """Nettoie les espaces et formatage."""
    return " ".join(s.split())


def extract() -> dict:
    """Extrait la structure normalisée SurveyFile pour provincial_qc_2012."""
    df, meta = pyreadstat.read_dta(str(DTA_FILE))
    raw_cols = list(meta.column_names)

    # Vérification stricte d'exhaustivité des variables
    all_known = set(EXCLUDED_VARS.keys()) | set(QUESTION_DATA.keys())
    missing = [c for c in raw_cols if c not in all_known]
    if missing:
        raise ValueError(f"Variables non répertoriées dans {SURVEY_ID}: {missing}")

    questions = []
    for col in raw_cols:
        if col in EXCLUDED_VARS:
            continue

        q_text, opt_tuples = QUESTION_DATA[col]
        q_text_clean = _clean_text(q_text)

        # Type de variable
        if is_text_column(df[col]):
            var_type = "open"
        elif col in SCALE_VARS:
            var_type = "scale"
        elif col.startswith("PQ17AAM"):
            var_type = "multiple"
        else:
            var_type = "single"

        # Sociodémo
        sociodemo_type = SOCIODEMO_VARS.get(col)
        is_socio = sociodemo_type is not None

        # Options de réponse
        response_options = [{"code": code, "label": _clean_text(lbl)} for code, lbl in opt_tuples]

        questions.append(
            {
                "variable": col,
                "question_text": q_text_clean,
                "display_label": None,
                "response_options": response_options,
                "var_type": var_type,
                "is_sociodemo": is_socio,
                "sociodemo_type": sociodemo_type,
                "concepts": [],
                "themes": [],
            }
        )

    survey_dict = {
        "survey": {
            "survey_id": SURVEY_ID,
            "survey_name": SURVEY_NAME,
            "survey_description": None,
            "year": YEAR,
            "survey_month": 9,  # Élection du 4 septembre 2012
            "pollster": POLLSTER,
            "language": LANGUAGE,
            "n_respondents": len(df),
            "raw_data_file": f"data/provincial_qc_2012/{DTA_FILE.name}",
            "tags": ["québec", "provincial", "élection", "2012", "medw", "decima"],
        },
        "questions": questions,
    }

    return survey_dict


if __name__ == "__main__":
    from ingestion.validate import assert_no_fabricated_text

    print(f"Extraction de {SURVEY_ID}...")
    data = extract()

    # Validation Pydantic
    sf = SurveyFile.model_validate(data)

    # Validation zéro fabrication
    assert_no_fabricated_text(sf)

    # Écriture de la sortie normalisée
    OUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(OUT_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    df_raw, meta_raw = pyreadstat.read_dta(str(DTA_FILE))
    raw_cols = list(meta_raw.column_names)
    q_vars = {q.variable for q in sf.questions}
    missing_vars = [v for v in raw_cols if v not in (q_vars | set(EXCLUDED_VARS))]

    print(f"Succès ! Fichier écrit : {OUT_FILE}")
    print(f"Nombre de répondants : {sf.survey.n_respondents}")
    print(f"Nombre de questions  : {len(sf.questions)}")
    print(f"Nombre d'exclues     : {len(EXCLUDED_VARS)}")
    print(f"Variables orphelines : {missing_vars}")

    socio_list = [(q.variable, q.sociodemo_type) for q in sf.questions if q.is_sociodemo]
    print(f"Nombre de sociodémo  : {len(socio_list)}")
    print(f"Liste sociodémo      : {socio_list}")
