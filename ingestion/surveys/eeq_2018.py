"""Extraction normalisée — eeq_2018.

Source : data/eeq_2018/Quebec Election Study 2018.dta (Stata)
         Étude électorale québécoise 2018 (Équipe d'études électorales du Québec)
         N = 3072 répondants, 254 variables.
Codebook : data/eeq_2018/Quebec Election Study 2018 FR with programmed answer values.md

Encodage : Le fichier .dta est lu avec pyreadstat. Les libellés de questions
et choix de réponses sont parsés depuis le codebook Markdown car pyreadstat
ne fournit que des column_names_to_labels triviaux (égaux aux noms de variables).

Usage :
    uv run python ingestion/surveys/eeq_2018.py
    → écrit ingestion/normalized/eeq_2018.json
"""

from __future__ import annotations

import json
from pathlib import Path

import pyreadstat

from ingestion.canonical import canonical_sociodemo_text
from ingestion.models import SurveyFile
from ingestion.validate import assert_no_fabricated_text, fabrication_reason

# ---------------------------------------------------------------------------
# Chemins
# ---------------------------------------------------------------------------

_HERE = Path(__file__).parent
REPO_ROOT = _HERE.parent.parent
DATA_DIR = REPO_ROOT / "data" / "eeq_2018"
DTA_FILE = DATA_DIR / "Quebec Election Study 2018.dta"
CODEBOOK_FILE = DATA_DIR / "Quebec Election Study 2018 FR with programmed answer values.md"
WEIGHT_VAR = "pond"
RESPONDENT_ID_VAR = "respid"
OUT_FILE = REPO_ROOT / "ingestion" / "normalized" / "eeq_2018.json"

# ---------------------------------------------------------------------------
# Constantes du sondage
# ---------------------------------------------------------------------------

SURVEY_ID = "eeq_2018"
SURVEY_NAME = "Élection générale québécoise de 2018 (Études électorales du Québec)"
YEAR = 2018
POLLSTER = "Équipe d'études électorales du Québec"
LANGUAGE = "fr"

# ---------------------------------------------------------------------------
# Variables EXCLUES (techniques, pondérations, ou dérivées/recodées)
# ---------------------------------------------------------------------------

EXCLUDED_VARS: dict[str, str] = {
    # Administration / Identifiants / Géographie / Pondération
    "responseid": "Identifiant unique de réponse (technique, sans value labels)",
    "respid": "Identifiant unique de répondant (technique, sans value labels)",
    "agemonth_1": "Mois de naissance du répondant (gestion administrative terrain)",
    "agensp": "Indicateur de précision du mois de naissance (technique)",
    "ageref": "Variable de référence d'âge (technique, valeur constante 0)",
    "minor": "Indicateur calculé de répondant mineur (16-17 ans vs 18+, mode test)",
    "split_q20": "Indicateur de tirage aléatoire split-sample pour Q20A/Q20B (technique)",
    "split_q50": "Indicateur de tirage aléatoire split-sample pour Q50x1/x2/x3 (technique)",
    "district": "Nom de la circonscription électorale du répondant (variable de localisation)",
    "NM_MUNCP": "Nom de la municipalité du répondant (variable de localisation)",
    "pond": "Pondération du sondage (poids de sondage fourni par l'équipe d'étude)",
    # Variables d'âge calculé ou d'origine brutes remplacées
    "ageyear_1": "Année de naissance brute (remplacée par AGENUM / AGE)",
    "agecalc": "Âge calculé en années (remplacé par AGENUM / AGE)",
    # String chunks de continuation de texte libre pour Q2_96_other
    "Q2_960": "Continuation de texte overflow pour la réponse ouverte Q2_96_other (technique)",
    "Q2_961": "Continuation de texte overflow pour la réponse ouverte Q2_96_other (technique)",
    "Q2_962": "Continuation de texte overflow pour la réponse ouverte Q2_96_other (technique)",
    "Q2_963": "Continuation de texte overflow pour la réponse ouverte Q2_96_other (technique)",
    "Q2_964": "Continuation de texte overflow pour la réponse ouverte Q2_96_other (technique)",
    "Q2_965": "Continuation de texte overflow pour la réponse ouverte Q2_96_other (technique)",
    "Q2_966": "Continuation de texte overflow pour la réponse ouverte Q2_96_other (technique)",
    "Q2_967": "Continuation de texte overflow pour la réponse ouverte Q2_96_other (technique)",
    "Q2_968": "Continuation de texte overflow pour la réponse ouverte Q2_96_other (technique)",
    "Q2_969": "Continuation de texte overflow pour la réponse ouverte Q2_96_other (technique)",
    "Q2_96A": "Continuation de texte overflow pour la réponse ouverte Q2_96_other (technique)",
    "Q2_96B": "Continuation de texte overflow pour la réponse ouverte Q2_96_other (technique)",
    "Q2_96C": "Continuation de texte overflow pour la réponse ouverte Q2_96_other (technique)",
    "Q2_96D": "Continuation de texte overflow pour la réponse ouverte Q2_96_other (technique)",
    "Q2_96E": "Continuation de texte overflow pour la réponse ouverte Q2_96_other (technique)",
    "Q2_96F": "Continuation de texte overflow pour la réponse ouverte Q2_96_other (technique)",
    "Q2_96G": "Continuation de texte overflow pour la réponse ouverte Q2_96_other (technique)",
    "Q2_96H": "Continuation de texte overflow pour la réponse ouverte Q2_96_other (technique)",
    "Q2_96I": "Continuation de texte overflow pour la réponse ouverte Q2_96_other (technique)",
}

# ---------------------------------------------------------------------------
# Variables socio-démographiques
# ---------------------------------------------------------------------------

SOCIODEMO_VARS: dict[str, str] = {
    "q0qc": "region",
    "regio": "region",
    "qsexe": "gender",
    "agenum": "age",
    "age": "age",
    "qlangue": "language",
    "qstat": "marital_status",
    "qscol": "education",
    "qoccup": "occupation",
    "q56": "income",
    "q57": "income",
    "q58": "religion",
    "q60": "religion_practice",
    "q66": "place_of_birth",
    "q68": "place_of_birth",
    "q70": "language",
    "q71_1": "ethnicity",
    "q71_2": "ethnicity",
    "q71_3": "ethnicity",
    "q71_4": "ethnicity",
    "q71_5": "ethnicity",
    "q71_6": "ethnicity",
    "q71_7": "ethnicity",
    "q71_8": "ethnicity",
    "q71_9": "ethnicity",
    "q71_10": "ethnicity",
    "q71_11": "ethnicity",
    "q71_12": "ethnicity",
    "q71_13": "ethnicity",
    "q71_96": "ethnicity",
    "q71_98": "ethnicity",
    "q71_99": "ethnicity",
}

# ---------------------------------------------------------------------------
# Rating scale / ordinal scale variables
# ---------------------------------------------------------------------------

SCALE_VARS: set[str] = {
    "q21_1",
    "q32_1",
    "q32_2",
    "q32_3",
    "q32_4",
    "q33_a",
    "q33_b",
    "q33_c",
    "q33_d",
    "q33_e",
    "q33_f",
    "q34_a",
    "q34_b",
    "q34_c",
    "q34_d",
    "q34_e",
    "q35_1",
    "q35_2",
    "q35_3",
    "q35_4",
    "q36_1",
    "q37a_1",
    "q37b_1",
    "q37c_1",
    "q38_1",
    "q38_2",
    "q38_3",
    "q38_4",
    "q38_5",
    "q41_1",
    "q47_1",
    "q62a",
    "q62b",
}


def _clean_text(text: str) -> str:
    """Nettoie les espaces multiples et sauts de ligne superflus."""
    if not text:
        return ""
    # Remplace les sauts de ligne et tabulations par un espace
    cleaned = text.replace("\r", " ").replace("\n", " ").replace("\t", " ")
    # Réduit les espaces multiples
    while "  " in cleaned:
        cleaned = cleaned.replace("  ", " ")
    return cleaned.strip()


def extract() -> dict:
    """Extrait la structure du sondage eeq_2018."""
    df, meta = pyreadstat.read_dta(str(DTA_FILE))

    # -----------------------------------------------------------------------
    # Dictionnaire explicite complet des 222 questions extraites
    # Parsé verbatim du codebook Markdown
    # -----------------------------------------------------------------------

    questions_data: list[dict] = []

    # Helper function for option dictionaries
    def opts(*items: tuple[int | str, str]) -> list[dict]:
        return [{"code": c, "label": _clean_text(lbl)} for c, lbl in items]

    # Standard options listes fréquentes
    opt_yes_no = opts((1, "Oui"), (2, "Non"), (9, "Je préfère ne pas répondre"))
    opt_yes_no_sais = opts(
        (1, "Oui"), (2, "Non"), (98, "Je ne sais pas"), (99, "Je préfère ne pas répondre")
    )
    opt_parties = opts(
        (1, "Parti libéral du Québec"),
        (2, "Parti québécois"),
        (3, "Coalition avenir Québec"),
        (4, "Québec solidaire"),
        (96, "Un autre parti"),
        (97, "Aucun de ces partis"),
        (98, "Je ne sais pas"),
        (99, "Je préfère ne pas répondre"),
    )
    opt_parties_no_none = opts(
        (1, "Parti libéral du Québec"),
        (2, "Parti québécois"),
        (3, "Coalition avenir Québec"),
        (4, "Québec solidaire"),
        (96, "Un autre parti"),
        (98, "Je ne sais pas"),
        (99, "Je préfère ne pas répondre"),
    )
    opt_accord_4 = opts(
        (1, "Fortement d’accord"),
        (2, "Plutôt d’accord"),
        (3, "Plutôt en désaccord"),
        (4, "Fortement en désaccord"),
        (98, "Je ne sais pas"),
        (99, "Je préfère ne pas répondre"),
    )
    opt_accord_5 = opts(
        (1, "Tout à fait en désaccord"),
        (2, "Plutôt en désaccord"),
        (3, "Ni en désaccord ni d’accord"),
        (4, "Plutôt d’accord"),
        (5, "Tout à fait d’accord"),
        (98, "Je ne sais pas"),
        (99, "Je préfère ne pas répondre"),
    )

    # Construction des objets questions par variable RAW

    # Q0QC
    questions_data.append(
        {
            "variable": "q0qc",
            "question_text": "Dans quelle région du Québec demeurez-vous ?",
            "response_options": opts(
                (1, "Bas-Saint-Laurent"),
                (2, "Saguenay-Lac-Saint-Jean"),
                (3, "Capitale-Nationale"),
                (4, "Mauricie"),
                (5, "Estrie"),
                (6, "Montréal"),
                (7, "Outaouais"),
                (8, "Abitibi-Témiscamingue"),
                (9, "Côte-Nord"),
                (10, "Nord-du-Québec"),
                (11, "Gaspésie/Îles-de-la-Madeleine"),
                (12, "Chaudière-Appalaches"),
                (13, "Laval"),
                (14, "Lanaudière"),
                (15, "Laurentides"),
                (16, "Montérégie"),
                (17, "Centre-du-Québec"),
            ),
            "var_type": "single",
        }
    )

    # REGIO
    questions_data.append(
        {
            "variable": "regio",
            "question_text": canonical_sociodemo_text("region"),
            "response_options": opts((1, "MTL RMR"), (2, "QC RMR"), (3, "AUTRES RÉGIONS")),
            "var_type": "single",
        }
    )

    # QSEXE
    questions_data.append(
        {
            "variable": "qsexe",
            "question_text": "Quel est votre sexe?",
            "response_options": opts((1, "Masculin"), (2, "Féminin")),
            "var_type": "single",
        }
    )

    # AGENUM
    questions_data.append(
        {
            "variable": "agenum",
            "question_text": "Quel âge avez-vous ?",
            "response_options": [],
            "var_type": "open",
        }
    )

    # AGE
    questions_data.append(
        {
            "variable": "age",
            "question_text": "Quel âge avez-vous ?",
            "response_options": opts(
                (0, "Moins de 16 ans"),
                (1, "Z (nés après 1999)"),
                (2, "Milléniaux (nés entre 1980 et 1999)"),
                (3, "X (nés entre 1960 et 1979)"),
                (4, "Baby-boomers (nés entre 1945 et 1959)"),
                (5, "Pré-baby-boomers (nés avant 1945)"),
            ),
            "var_type": "single",
        }
    )

    # QPARENTS
    questions_data.append(
        {
            "variable": "qparents",
            "question_text": "Demeurez-vous toujours chez vos parents?",
            "response_options": opt_yes_no,
            "var_type": "single",
        }
    )

    # QLANGUE
    questions_data.append(
        {
            "variable": "qlangue",
            "question_text": "Quelle est la langue principale que vous avez apprise en premier lieu à la maison dans votre enfance et que vous comprenez toujours?",  # noqa: E501
            "response_options": opts(
                (1, "Français"),
                (2, "Anglais"),
                (96, "Autre"),
                (98, "Je ne sais pas"),
                (99, "Je préfère ne pas répondre"),
            ),
            "var_type": "single",
        }
    )

    # QSTAT
    questions_data.append(
        {
            "variable": "qstat",
            "question_text": "Quel est votre statut civil?",
            "response_options": opts(
                (1, "Marié(e) ou vivant en union de fait"),
                (2, "Célibataire (jamais marié/e)"),
                (3, "Séparé(e) ou divorcé(e)"),
                (4, "Veuf(ve)"),
                (98, "Je ne sais pas"),
                (99, "Je préfère ne pas répondre"),
            ),
            "var_type": "single",
        }
    )

    # QENFAN
    questions_data.append(
        {
            "variable": "qenfan",
            "question_text": "Avez-vous des enfants de 18 ans ou moins qui habitent sous votre toit?",  # noqa: E501
            "response_options": opt_yes_no,
            "var_type": "single",
        }
    )

    # QENFAN2
    questions_data.append(
        {
            "variable": "qenfan2",
            "question_text": "Parmi vos enfants qui habitent sous votre toit, quel est l'âge du plus jeune?",  # noqa: E501
            "response_options": opts(
                (1, "0 à 5 ans"),
                (2, "6 à 12 ans"),
                (3, "13 à 18 ans"),
                (9, "Je préfère ne pas répondre"),
            ),
            "var_type": "single",
        }
    )

    # QSCOL
    questions_data.append(
        {
            "variable": "qscol",
            "question_text": "Quel est le plus haut niveau d'études que vous avez complété?",
            "response_options": opts(
                (1, "Aucun diplôme, certificat ou grade"),
                (2, "Diplôme d’études secondaires ou l’équivalent"),
                (3, "Certificat ou diplôme d’un cours d’apprentissage ou d’un métier"),
                (
                    4,
                    "Certificat ou diplôme d’un collège, d’un cégep ou d’un autre établissement non universitaire",  # noqa: E501
                ),
                (5, "Certificat ou diplôme universitaire inférieur au baccalauréat"),
                (6, "Baccalauréat"),
                (7, "Certificat ou diplôme universitaire supérieur au baccalauréat"),
                (8, "Maîtrise"),
                (9, "Doctorat"),
                (10, "Études primaires non complétées"),
                (11, "Études primaires complétées"),
                (12, "Études secondaires non complétées"),
                (13, "Études secondaires complétées"),
                (14, "Études collégiales (CÉGEP) non complétées"),
                (15, "Études collégiales (CÉGEP) complétées"),
                (16, "Université - Diplôme universitaire ou grade"),
                (98, "Je ne sais pas"),
                (99, "Je préfère ne pas répondre"),
            ),
            "var_type": "single",
        }
    )

    # QOCCUP
    questions_data.append(
        {
            "variable": "qoccup",
            "question_text": "Quelle est votre occupation principale présentement?",
            "response_options": opts(
                (1, "Travailler à temps plein contre rémunération ou à votre compte"),
                (2, "Travailler à temps partiel contre rémunération ou à votre compte"),
                (3, "À la recherche d’un emploi / sans emploi"),
                (4, "Au foyer (s'occuper de la famille / du ménage)"),
                (5, "À la retraite"),
                (6, "Étudiant(e) à temps plein"),
                (7, "Étudiant(e) à temps partiel"),
                (8, "Congé de maladie / invalidité"),
                (9, "Congé parental ou de maternité"),
                (10, "Autre"),
                (11, "Plein temps pour un salaire"),
                (12, "Temps partiel pour un salaire"),
                (13, "Travailleur autonome"),
                (98, "Je ne sais pas"),
                (99, "Je préfère ne pas répondre"),
            ),
            "var_type": "single",
        }
    )

    # Q1
    questions_data.append(
        {
            "variable": "q1",
            "question_text": "Dans l’ensemble, à quel point êtes-vous satisfait(e) de la façon dont la démocratie fonctionne au Québec?",  # noqa: E501
            "response_options": opts(
                (1, "Très satisfait(e)"),
                (2, "Assez satisfait(e)"),
                (3, "Peu satisfait(e)"),
                (4, "Pas du tout satisfait(e)"),
                (8, "Je ne sais pas"),
                (9, "Je préfère ne pas répondre"),
            ),
            "var_type": "single",
        }
    )

    # Q2
    questions_data.append(
        {
            "variable": "q2",
            "question_text": "Parmi les enjeux suivants, lequel était, pour vous personnellement, le plus important lors de l’élection provinciale du 1er octobre dernier?",  # noqa: E501
            "response_options": opts(
                (1, "L’économie"),
                (2, "La santé"),
                (3, "L’environnement"),
                (4, "L’éducation"),
                (5, "L’aide aux familles"),
                (6, "La pauvreté"),
                (7, "L’intégrité des politiciens et la corruption"),
                (8, "Les taxes et les finances publiques"),
                (9, "La souveraineté du Québec"),
                (10, "L’immigration"),
                (96, "Un autre enjeu, spécifiez :"),
            ),
            "var_type": "single",
        }
    )

    # q2_96_other
    questions_data.append(
        {
            "variable": "q2_96_other",
            "question_text": "Parmi les enjeux suivants, lequel était, pour vous personnellement, le plus important lors de l’élection provinciale du 1er octobre dernier? — Un autre enjeu, spécifiez",  # noqa: E501
            "response_options": [],
            "var_type": "open",
        }
    )

    # Q3
    questions_data.append(
        {
            "variable": "q3",
            "question_text": "Au niveau PROVINCIAL, pour quel parti voteriez-vous si des élections provinciales avaient lieu aujourd'hui?",  # noqa: E501
            "response_options": opt_parties_no_none,
            "var_type": "single",
        }
    )

    # Q4
    questions_data.append(
        {
            "variable": "q4",
            "question_text": "De façon générale, à quel point êtes-vous certain(e) de voter pour ce parti?",  # noqa: E501
            "response_options": opts(
                (1, "Très certain(e)"),
                (2, "Assez certain(e)"),
                (3, "Peu certain(e)"),
                (4, "Pas du tout certain(e)"),
                (96, "Pas de second choix"),
                (98, "Je ne sais pas"),
                (99, "Je préfère ne pas répondre"),
            ),
            "var_type": "single",
        }
    )

    # Q5
    questions_data.append(
        {
            "variable": "q5",
            "question_text": "Avez-vous voté lors de l'élection provinciale du 1er octobre dernier?",  # noqa: E501
            "response_options": opts(
                (1, "Oui, certain(e) d'avoir voté"),
                (2, "Non, certain(e) de ne pas avoir voté"),
                (3, "J'ai l'intention de voter"),
                (4, "Je ne voterai pas"),
                (5, "Pas certain(e)"),
                (98, "Je ne sais pas"),
                (99, "Je préfère ne pas répondre"),
            ),
            "var_type": "single",
        }
    )

    # Q5A
    questions_data.append(
        {
            "variable": "q5a",
            "question_text": "À quel point diriez-vous qu'il était probable que vous alliez voter?",
            "response_options": opts(
                (1, "Certain(e) de ne pas avoir voté"),
                (2, "Pas très certain(e) de ne pas avoir voté"),
                (3, "Très probable"),
                (4, "Assez probable"),
                (96, "Autre"),
                (98, "Je ne sais pas"),
                (99, "Je préfère ne pas répondre"),
            ),
            "var_type": "single",
        }
    )

    # Q6
    questions_data.append(
        {
            "variable": "q6",
            "question_text": "Pour quel parti avez-vous voté lors de l'élection provinciale du 1er octobre dernier?",  # noqa: E501
            "response_options": opt_parties_no_none,
            "var_type": "single",
        }
    )

    # Q6A
    questions_data.append(
        {
            "variable": "q6a",
            "question_text": "Avez-vous voté par la poste, lors du vote par anticipation, ou le jour de l'élection?",  # noqa: E501
            "response_options": opts(
                (1, "Le jour de l'élection"),
                (2, "Lors du vote par anticipation"),
                (3, "Par la poste"),
                (4, "Au bureau du directeur du scrutin"),
                (99, "Je préfère ne pas répondre"),
            ),
            "var_type": "single",
        }
    )

    # Q7
    questions_data.append(
        {
            "variable": "q7",
            "question_text": "Avez-vous voté pour ce parti parce que vous l'aimez vraiment, ou pour empêcher un autre parti de gagner?",  # noqa: E501
            "response_options": opts(
                (1, "Parce que vous l'aimez vraiment"),
                (2, "Pour empêcher un autre parti de gagner"),
                (9, "Je préfère ne pas répondre"),
            ),
            "var_type": "single",
        }
    )

    # Q8
    questions_data.append(
        {
            "variable": "q8",
            "question_text": "Quel parti vouliez-vous empêcher de gagner?",
            "response_options": opt_parties_no_none,
            "var_type": "single",
        }
    )

    # Q9
    questions_data.append(
        {
            "variable": "q9",
            "question_text": "Si vous aviez voté, pour quel parti auriez-vous voté?",
            "response_options": opts(
                (1, "Parti libéral du Québec"),
                (2, "Parti québécois"),
                (3, "Coalition avenir Québec"),
                (4, "Québec solidaire"),
                (96, "Un autre parti"),
                (97, "Aucun parti"),
                (98, "Je ne sais pas"),
                (99, "Je préfère ne pas répondre"),
            ),
            "var_type": "single",
        }
    )

    # Q10
    questions_data.append(
        {
            "variable": "q10",
            "question_text": "Diriez-vous que la politique est quelque chose qui vous intéresse...",
            "response_options": opts(
                (1, "Très intéressé(e)"),
                (2, "Assez intéressé(e)"),
                (3, "Peu intéressé(e)"),
                (4, "Pas du tout intéressé(e)"),
                (8, "Je ne sais pas"),
                (9, "Je préfère ne pas répondre"),
            ),
            "var_type": "single",
        }
    )

    # Q11 battery: Quel palier de gouvernement est responsable ...
    q11_items = [
        ("q11_1", "l’éducation"),
        ("q11_2", "des services d’aqueduc"),
    ]
    q11_opts = opts(
        (1, "Gouvernement fédéral"),
        (2, "Gouvernement provincial"),
        (3, "Gouvernement municipal"),
        (8, "Je ne sais pas"),
        (9, "Je préfère ne pas répondre"),
    )
    for var, item in q11_items:
        questions_data.append(
            {
                "variable": var,
                "question_text": f"Quel palier de gouvernement est responsable de {item}?",
                "response_options": q11_opts,
                "var_type": "single",
            }
        )

    # Q12 battery: Quel poste occupait chacune des personnalités politiques suivantes au cours de la dernière année?  # noqa: E501
    q12_items = [
        ("q12_1", "Rachel Notley"),
        ("q12_2", "Carlos Leitão"),
        ("q12_3", "Emmanuel Macron"),
        ("q12_4", "Chrystia Freeland"),
    ]
    q12_opts = opts(
        (1, "Premier ministre de l’Alberta"),
        (2, "Ministre des finances du Québec"),
        (3, "Président de la France"),
        (4, "Ministre des affaires étrangères du Canada"),
        (5, "Premier ministre du Royaume-Uni"),
        (98, "Je ne sais pas"),
        (99, "Je préfère ne pas répondre"),
    )
    for var, item in q12_items:
        questions_data.append(
            {
                "variable": var,
                "question_text": f"Quel poste occupait {item} au cours de la dernière année?",
                "response_options": q12_opts,
                "var_type": "single",
            }
        )

    # Q13
    questions_data.append(
        {
            "variable": "q13",
            "question_text": "Au niveau FÉDÉRAL, si des élections fédérales avaient lieu aujourd'hui, pour quel parti voteriez-vous?",  # noqa: E501
            "response_options": opts(
                (1, "Parti libéral du Canada"),
                (2, "Parti conservateur du Canada"),
                (3, "Nouveau Parti démocratique (NPD)"),
                (4, "Bloc québécois"),
                (5, "Parti vert du Canada"),
                (96, "Un autre parti"),
                (98, "Je ne sais pas"),
                (99, "Je préfère ne pas répondre"),
            ),
            "var_type": "single",
        }
    )

    # Q14 battery: Pouvez-vous associer chacun des slogans de campagne suivants à son parti?
    q14_items = [
        ("q14_1", "Maintenant"),
        ("q14_2", "Sérieusement"),
        ("q14_3", "Populaires"),
        ("q14_4", "Pour faire évoluer le Québec"),
        ("q14_5", "Changer de cap"),
    ]
    for var, item in q14_items:
        questions_data.append(
            {
                "variable": var,
                "question_text": f"Pouvez-vous associer le slogan de campagne « {item} » à son parti?",  # noqa: E501
                "response_options": opt_parties,
                "var_type": "single",
            }
        )

    # Q15 battery: Pouvez-vous associer chacune des promesses de campagne suivantes à son parti?
    q15_items = [
        ("q15_1", "Offrir une assurance dentaire pour tous"),
        ("q15_2", "Rendre la maternelle accessible dès l'âge de 4 ans"),
        ("q15_3", "Réduire l'impôt sur le revenu des particuliers"),
        ("q15_4", "Fixer un tarif unique pour les services de garde subventionnés"),
    ]
    for var, item in q15_items:
        questions_data.append(
            {
                "variable": var,
                "question_text": f"Pouvez-vous associer la promesse de campagne « {item} » à son parti?",  # noqa: E501
                "response_options": opt_parties,
                "var_type": "single",
            }
        )

    # Q16 battery: Lorsque vous pensez à chacun des enjeux suivants, à quel parti politique pensez-vous spontanément?  # noqa: E501
    q16_items = [
        ("q16_1", "les intérêts du Québec"),
        ("q16_2", "l'économie"),
        ("q16_3", "la santé"),
        ("q16_4", "l'environnement"),
        ("q16_5", "l'éducation"),
        ("q16_6", "les taxes et les finances publiques"),
        ("q16_7", "l'immigration"),
        ("q16_8", "l'intégrité et la lutte contre la corruption"),
    ]
    for var, item in q16_items:
        questions_data.append(
            {
                "variable": var,
                "question_text": f"Lorsque vous pensez à « {item} », à quel parti politique pensez-vous spontanément?",  # noqa: E501
                "response_options": opt_parties,
                "var_type": "single",
            }
        )

    # Q17 battery: Lorsque vous pensez aux gens de chacun des groupes d’âges suivants, à quel parti politique pensez-vous spontanément?  # noqa: E501
    q17_items = [
        ("q17_1", "18 à 34 ans"),
        ("q17_2", "35 à 54 ans"),
        ("q17_3", "55 ans et plus"),
    ]
    for var, item in q17_items:
        questions_data.append(
            {
                "variable": var,
                "question_text": f"Lorsque vous pensez aux gens âgés de {item}, à quel parti politique pensez-vous spontanément?",  # noqa: E501
                "response_options": opt_parties,
                "var_type": "single",
            }
        )

    # Q18
    questions_data.append(
        {
            "variable": "q18",
            "question_text": "Diriez-vous que le gouvernement du Québec devrait en faire plus, en faire autant ou en faire moins pour réduire l’écart entre les riches et les pauvres?",  # noqa: E501
            "response_options": opts(
                (1, "En faire beaucoup plus"),
                (2, "En faire un peu plus"),
                (3, "En faire autant qu’actuellement"),
                (4, "En faire un peu moins"),
                (5, "En faire beaucoup moins"),
                (98, "Je ne sais pas"),
                (99, "Je préfère ne pas répondre"),
            ),
            "var_type": "single",
        }
    )

    # Q19
    questions_data.append(
        {
            "variable": "q19",
            "question_text": "Pensant à la dernière année, diriez-vous que l'économie du Québec s'est améliorée, est restée la même ou s'est détériorée?",  # noqa: E501
            "response_options": opts(
                (1, "S’est beaucoup améliorée"),
                (2, "S’est un peu améliorée"),
                (3, "Est restée la même"),
                (4, "S’est un peu détériorée"),
                (5, "S’est beaucoup détériorée"),
                (98, "Je ne sais pas"),
                (99, "Je préfère ne pas répondre"),
            ),
            "var_type": "single",
        }
    )

    # Q20A
    questions_data.append(
        {
            "variable": "q20a",
            "question_text": "Les gens ont différentes façons de se définir. Diriez-vous que vous vous considérez...?",  # noqa: E501
            "response_options": opts(
                (1, "Uniquement comme Québécois(e), pas du tout comme Canadien(ne)"),
                (2, "D’abord comme Québécois(e), puis comme Canadien(ne)"),
                (3, "Également comme Québécois(e) et comme Canadien(ne)"),
                (4, "D’abord comme Canadien(ne), puis comme Québécois(e)"),
                (5, "Uniquement comme Canadien(ne), pas du tout comme Québécois(e)"),
                (98, "Je ne sais pas"),
                (99, "Je préfère ne pas répondre"),
            ),
            "var_type": "single",
        }
    )

    # Q20B
    questions_data.append(
        {
            "variable": "q20b",
            "question_text": "Les gens ont différentes façons de se définir. Diriez-vous que vous vous considérez...?",  # noqa: E501
            "response_options": opts(
                (1, "Uniquement comme Canadien(ne), pas du tout comme Québécois(e)"),
                (2, "D’abord comme Canadien(ne), puis comme Québécois(e)"),
                (3, "Également comme Canadien(ne) et comme Québécois(e)"),
                (4, "D’abord comme Québécois(e), puis comme Canadien(ne)"),
                (5, "Uniquement comme Québécois(e), pas du tout comme Canadien(ne)"),
                (98, "Je ne sais pas"),
                (99, "Je préfère ne pas répondre"),
            ),
            "var_type": "single",
        }
    )

    # Q21_1
    questions_data.append(
        {
            "variable": "q21_1",
            "question_text": "Où vous situez-vous sur une échelle de 0 à 10, où 0 veut dire que les Québécois ont des valeurs et priorités distinctes et 10 veut dire que les Québécois ont les mêmes valeurs que les autres Canadiens?",  # noqa: E501
            "response_options": opts(
                (0, "0 - Valeurs et priorités distinctes"),
                (1, "1"),
                (2, "2"),
                (3, "3"),
                (4, "4"),
                (5, "5"),
                (6, "6"),
                (7, "7"),
                (8, "8"),
                (9, "9"),
                (10, "10 - Mêmes valeurs et priorités"),
                (98, "Je ne sais pas"),
                (99, "Je préfère ne pas répondre"),
            ),
            "var_type": "scale",
        }
    )

    # Q22 battery: À votre avis, pour être vraiment Québécois, à quel point est-il important ...
    q22_items = [
        ("q22_1", "D’être né au Québec"),
        ("q22_2", "De vivre au Québec depuis longtemps"),
        ("q22_3", "D’être capable de parler français"),
        ("q22_4", "De partager la culture québécoise"),
        ("q22_5", "De respecter les lois et les institutions du Québec"),
        ("q22_6", "De se sentir Québécois"),
        ("q22_7", "D'être de religion catholique ou chrétienne"),
        ("q22_8", "D'avoir des ancêtres canadiens-français"),
    ]
    q22_opts = opts(
        (1, "Très important"),
        (2, "Assez important"),
        (3, "Peu important"),
        (4, "Pas du tout important"),
        (98, "Je ne sais pas"),
        (99, "Je préfère ne pas répondre"),
    )
    for var, item in q22_items:
        questions_data.append(
            {
                "variable": var,
                "question_text": f"À votre avis, pour être vraiment Québécois, à quel point est-il important : {item}?",  # noqa: E501
                "response_options": q22_opts,
                "var_type": "single",
            }
        )

    # Q23
    questions_data.append(
        {
            "variable": "q23",
            "question_text": "Avez-vous voté lors du référendum sur la souveraineté du Québec en 1995?",  # noqa: E501
            "response_options": opt_yes_no,
            "var_type": "single",
        }
    )

    # Q24
    questions_data.append(
        {
            "variable": "q24",
            "question_text": "Avez-vous voté pour le Oui ou pour le Non lors du référendum de 1995?",  # noqa: E501
            "response_options": opts((1, "Oui"), (2, "Non"), (9, "Je préfère ne pas répondre")),
            "var_type": "single",
        }
    )

    # Q25
    questions_data.append(
        {
            "variable": "q25",
            "question_text": "À quel point diriez-vous que vous êtes attaché(e) au Québec?",
            "response_options": opts(
                (1, "Très attaché(e)"),
                (2, "Assez attaché(e)"),
                (3, "Peu attaché(e)"),
                (4, "Pas du tout attaché(e)"),
                (98, "Je ne sais pas"),
                (99, "Je préfère ne pas répondre"),
            ),
            "var_type": "single",
        }
    )

    # Q26
    questions_data.append(
        {
            "variable": "q26",
            "question_text": "Et à quel point diriez-vous que vous êtes attaché(e) au Canada?",
            "response_options": opts(
                (1, "Très attaché(e)"),
                (2, "Assez attaché(e)"),
                (3, "Peu attaché(e)"),
                (4, "Pas du tout attaché(e)"),
                (98, "Je ne sais pas"),
                (99, "Je préfère ne pas répondre"),
            ),
            "var_type": "single",
        }
    )

    # Q27
    questions_data.append(
        {
            "variable": "q27",
            "question_text": "Au cours de la dernière année, diriez-vous que la qualité des services de santé au Québec s’est améliorée, est restée la même ou s’est détériorée?",  # noqa: E501
            "response_options": opts(
                (1, "S’est beaucoup améliorée"),
                (2, "S’est un peu améliorée"),
                (3, "Est restée la même"),
                (4, "S’est un peu détériorée"),
                (5, "S’est beaucoup détériorée"),
                (98, "Je ne sais pas"),
                (99, "Je préfère ne pas répondre"),
            ),
            "var_type": "single",
        }
    )

    # Q28
    questions_data.append(
        {
            "variable": "q28",
            "question_text": "Et au cours de la dernière année, diriez-vous que la qualité du système d’éducation au Québec s’est améliorée, est restée la même ou s’est détériorée?",  # noqa: E501
            "response_options": opts(
                (1, "S’est beaucoup améliorée"),
                (2, "S’est un peu améliorée"),
                (3, "Est restée la même"),
                (4, "S’est un peu détériorée"),
                (5, "S’est beaucoup détériorée"),
                (98, "Je ne sais pas"),
                (99, "Je préfère ne pas répondre"),
            ),
            "var_type": "single",
        }
    )

    # Q29 battery: En général, à quelle fréquence discutez-vous de politique et d’enjeux publics avec...  # noqa: E501
    q29_items = [
        ("q29_1", "Vos parents"),
        ("q29_2", "D’autres membres de votre famille"),
        ("q29_3", "Vos amis"),
        ("q29_4", "Votre partenaire de vie"),
        ("q29_5", "Vos collègues de travail"),
        ("q29_6", "Vos voisins"),
        ("q29_7", "Des personnes que vous connaissez peu ou pas"),
    ]
    q29_opts = opts(
        (1, "Toujours"),
        (2, "Souvent"),
        (3, "Parfois"),
        (4, "Rarement"),
        (97, "Jamais"),
        (99, "Je préfère ne pas répondre"),
    )
    for var, item in q29_items:
        questions_data.append(
            {
                "variable": var,
                "question_text": f"En général, à quelle fréquence discutez-vous de politique et d’enjeux publics avec {item}?",  # noqa: E501
                "response_options": q29_opts,
                "var_type": "single",
            }
        )

    # Q30 battery: Au cours des dernières semaines, avez-vous discuté de l’élection provinciale avec...  # noqa: E501
    q30_items = [
        ("q30_1", "Vos parents"),
        ("q30_2", "D’autres membres de votre famille"),
        ("q30_3", "Vos amis"),
        ("q30_4", "Votre partenaire de vie"),
        ("q30_5", "Vos collègues de travail"),
        ("q30_6", "Vos voisins"),
        ("q30_7", "Des personnes que vous connaissez peu ou pas"),
    ]
    q30_opts = opts(
        (1, "Oui, plusieurs fois"),
        (2, "Oui, une fois"),
        (3, "Non, jamais"),
        (99, "Je préfère ne pas répondre"),
    )
    for var, item in q30_items:
        questions_data.append(
            {
                "variable": var,
                "question_text": f"Au cours des dernières semaines, avez-vous discuté de l’élection provinciale avec {item}?",  # noqa: E501
                "response_options": q30_opts,
                "var_type": "single",
            }
        )

    # Q31 battery: Avez-vous fait une de ces activités au cours des dernières semaines:
    q31_items = [
        ("q31_1", "Assisté à une séance d’information sur les élections"),
        ("q31_2", "Recherché de l’information sur les élections"),
        ("q31_3", "Parlé avec un candidat politique"),
        ("q31_4", "Écouté un des débats des chefs"),
        ("q31_5", "Assisté à un débat politique à votre école ou travail"),
        ("q31_6", "Tenté de convaincre quelqu’un de voter pour un parti"),
    ]
    q31_opts = opts((1, "Oui"), (2, "Non"), (99, "Je préfère ne pas répondre"))
    for var, item in q31_items:
        questions_data.append(
            {
                "variable": var,
                "question_text": f"Avez-vous fait cette activité au cours des dernières semaines : {item}?",  # noqa: E501
                "response_options": q31_opts,
                "var_type": "single",
            }
        )

    # Q32 battery: ...lesquelles des activités suivantes seriez-vous prêt à entreprendre...
    q32_items = [
        ("q32_1", "Voter à des élections"),
        ("q32_2", "Travailler pour un parti politique ou un candidat"),
        ("q32_3", "Faire un don d’argent à un parti politique"),
        ("q32_4", "Assister à une manifestation ou un rassemblement politique"),
    ]
    q32_opts = opts(
        (0, "0 - Pas du tout probable"),
        (1, "1"),
        (2, "2"),
        (3, "3"),
        (4, "4"),
        (5, "5 - Fort probable"),
        (99, "Je préfère ne pas répondre"),
    )
    for var, item in q32_items:
        questions_data.append(
            {
                "variable": var,
                "question_text": f"En utilisant une échelle de 0 à 5, dans quelle mesure seriez-vous prêt à entreprendre cette activité : {item}?",  # noqa: E501
                "response_options": q32_opts,
                "var_type": "scale",
            }
        )

    # Q33 battery: Sur une échelle de 0 à 10... que pensez-vous de...
    q33_items = [
        ("q33_a", "Philippe Couillard"),
        ("q33_b", "Jean-François Lisée"),
        ("q33_c", "François Legault"),
        ("q33_d", "Manon Massé"),
        ("q33_e", "Gabriel Nadeau-Dubois"),
        ("q33_f", "Adrien Pouliot"),
    ]
    q33_opts = opts(
        (0, "0 - N’AIMEZ VRAIMENT PAS DU TOUT"),
        (1, "1"),
        (2, "2"),
        (3, "3"),
        (4, "4"),
        (5, "5"),
        (6, "6"),
        (7, "7"),
        (8, "8"),
        (9, "9"),
        (10, "10 - L’AIMEZ VRAIMENT BEAUCOUP"),
        (97, "Je ne le/la connais pas"),
        (98, "Je ne sais pas"),
        (99, "Je préfère ne pas répondre"),
    )
    for var, item in q33_items:
        questions_data.append(
            {
                "variable": var,
                "question_text": f"Sur une échelle de 0 à 10, que pensez-vous de {item}?",
                "response_options": q33_opts,
                "var_type": "scale",
            }
        )

    # Q34 battery: Sur une échelle de 0 à 10... que pensez-vous des...
    q34_items = [
        ("q34_a", "minorités ethnoculturelles"),
        ("q34_b", "immigrants"),
        ("q34_c", "anglophones du Québec"),
        ("q34_d", "francophones du Québec"),
        ("q34_e", "musulmans"),
    ]
    q34_opts = opts(
        (0, "0 - Vous ne les aimez vraiment pas du tout"),
        (1, "1"),
        (2, "2"),
        (3, "3"),
        (4, "4"),
        (5, "5"),
        (6, "6"),
        (7, "7"),
        (8, "8"),
        (9, "9"),
        (10, "10 - Vous les aimez vraiment beaucoup"),
        (98, "Je ne sais pas"),
        (99, "Je préfère ne pas répondre"),
    )
    for var, item in q34_items:
        questions_data.append(
            {
                "variable": var,
                "question_text": f"Sur une échelle de 0 à 10, que pensez-vous des {item}?",
                "response_options": q34_opts,
                "var_type": "scale",
            }
        )

    # Q35 battery: En politique, les gens parlent de la « gauche » et de la « droite »... où placeriez-vous chacun des partis suivants?  # noqa: E501
    q35_items = [
        ("q35_1", "Parti libéral du Québec"),
        ("q35_2", "Parti québécois"),
        ("q35_3", "Coalition avenir Québec"),
        ("q35_4", "Québec solidaire"),
    ]
    q35_opts = opts(
        (0, "0 - à gauche"),
        (1, "1"),
        (2, "2"),
        (3, "3"),
        (4, "4"),
        (5, "5"),
        (6, "6"),
        (7, "7"),
        (8, "8"),
        (9, "9"),
        (10, "10 - à droite"),
        (98, "Je ne sais pas"),
        (99, "Je préfère ne pas répondre"),
    )
    for var, item in q35_items:
        questions_data.append(
            {
                "variable": var,
                "question_text": f"Sur une échelle de 0 à 10 (gauche à droite), où placeriez-vous le {item}?",  # noqa: E501
                "response_options": q35_opts,
                "var_type": "scale",
            }
        )

    # Q36_1
    questions_data.append(
        {
            "variable": "q36_1",
            "question_text": "Et sur la même échelle de 0 à 10 (gauche à droite), où vous placeriez-vous, de manière générale?",  # noqa: E501
            "response_options": q35_opts,
            "var_type": "scale",
        }
    )

    # Q37A_1
    questions_data.append(
        {
            "variable": "q37a_1",
            "question_text": "Sur une échelle de 0 à 5, selon vous, qui devrait prendre les décisions politiques importantes : les citoyens ou les politiciens élus ?",  # noqa: E501
            "response_options": opts(
                (0, "0 - Citoyens"),
                (1, "1"),
                (2, "2"),
                (3, "3"),
                (4, "4"),
                (5, "5 - Politiciens élus"),
                (99, "Je préfère ne pas répondre"),
            ),
            "var_type": "scale",
        }
    )

    # Q37B_1
    questions_data.append(
        {
            "variable": "q37b_1",
            "question_text": "Sur une échelle de 0 à 5, selon vous, qui devrait prendre les décisions politiques importantes : les politiciens élus ou les experts politiques indépendants ?",  # noqa: E501
            "response_options": opts(
                (0, "0 - Politiciens élus"),
                (1, "1"),
                (2, "2"),
                (3, "3"),
                (4, "4"),
                (5, "5 - Experts politiques indépendants"),
                (99, "Je préfère ne pas répondre"),
            ),
            "var_type": "scale",
        }
    )

    # Q37C_1
    questions_data.append(
        {
            "variable": "q37c_1",
            "question_text": "Sur une échelle de 0 à 5, selon vous, qui devrait prendre les décisions politiques importantes : les experts politiques indépendants ou les citoyens ?",  # noqa: E501
            "response_options": opts(
                (0, "0 - Experts politiques indépendants"),
                (1, "1"),
                (2, "2"),
                (3, "3"),
                (4, "4"),
                (5, "5 - Citoyens"),
                (99, "Je préfère ne pas répondre"),
            ),
            "var_type": "scale",
        }
    )

    # Q38 battery: Veuillez indiquer si vous êtes d'accord ou en désaccord avec les énoncés suivants:  # noqa: E501
    q38_items = [
        (
            "q38_1",
            "C’est la responsabilité du gouvernement de garantir que les besoins fondamentaux sont satisfaits pour tous.",  # noqa: E501
        ),
        (
            "q38_2",
            "Les taxes et les impôts devraient être augmentés pour financer de meilleurs services publics.",  # noqa: E501
        ),
        (
            "q38_3",
            "Le gouvernement devrait laisser plus de place aux entreprises privées dans l'économie.",  # noqa: E501
        ),
        ("q38_4", "Le Québec devrait dépenser plus d'argent pour protéger l'environnement."),
        (
            "q38_5",
            "Le Québec devrait accorder plus d'importance aux traditions et aux valeurs morales.",
        ),
    ]
    for var, item in q38_items:
        questions_data.append(
            {
                "variable": var,
                "question_text": f"Veuillez indiquer si vous êtes d’accord ou en désaccord avec cet énoncé : {item}",  # noqa: E501
                "response_options": opt_accord_5,
                "var_type": "scale",
            }
        )

    # Q39 battery (A-J): Veuillez indiquer si vous êtes d'accord ou en désaccord avec les énoncés suivants:  # noqa: E501
    q39_items = [
        ("q39a", "Les immigrants apportent une importante contribution au Québec."),
        (
            "q39b",
            "Les immigrants devraient s'adapter aux valeurs et au mode de vie de la société québécoise.",  # noqa: E501
        ),
        (
            "q39c",
            "Le gouvernement devrait prendre des mesures pour réduire les inégalités entre les hommes et les femmes.",  # noqa: E501
        ),
        (
            "q39d",
            "Les couples de même sexe devraient avoir les mêmes droits de se marier et d'adopter des enfants que les couples hétérosexuels.",  # noqa: E501
        ),
        (
            "q39e",
            "Le gouvernement fait déjà trop de choses pour aider les minorités ethniques et religieuses.",  # noqa: E501
        ),
        ("q39f", "La présence de minorités ethniques enrichit la vie culturelle du Québec."),
        (
            "q39g",
            "Les personnes qui viennent s'établir au Québec devraient être obligées de maîtriser le français.",  # noqa: E501
        ),
        (
            "q39h",
            "Les politiciens ne se soucient pas beaucoup de ce que pensent les gens comme moi.",
        ),
        (
            "q39i",
            "Le gouvernement est généralement géré par quelques grands intérêts qui ne pensent qu'à eux-mêmes.",  # noqa: E501
        ),
        ("q39j", "Les citoyens ont suffisamment d'influence sur ce que fait le gouvernement."),
    ]
    for var, item in q39_items:
        questions_data.append(
            {
                "variable": var,
                "question_text": f"Veuillez indiquer si vous êtes d’accord ou en désaccord avec cet énoncé : {item}",  # noqa: E501
                "response_options": opt_accord_5,
                "var_type": "single",
            }
        )

    # Q40 battery (A-I)
    q40_items = [
        ("q40a", "Les syndicats ont trop de pouvoir au Québec."),
        (
            "q40b",
            "Les entreprises privées font généralement un meilleur travail que le gouvernement pour gérer les services.",  # noqa: E501
        ),
        ("q40c", "Le gouvernement devrait investir davantage dans les transports en commun."),
        (
            "q40d",
            "Le gouvernement devrait baisser les impôts même si cela signifie réduire les services publics.",  # noqa: E501
        ),
        (
            "q40e",
            "Les étudiants universitaires devraient payer une plus grande part du coût de leurs études.",  # noqa: E501
        ),
        (
            "q40f",
            "Le gouvernement devrait imposer des normes environnementales plus strictes aux entreprises.",  # noqa: E501
        ),
        ("q40g", "Le Québec devrait chercher à devenir un pays souverain."),
        (
            "q40h",
            "La souveraineté du Québec permettrait de mieux protéger la langue et la culture québécoises.",  # noqa: E501
        ),
        ("q40i", "La souveraineté du Québec entraînerait une instabilité économique importante."),
    ]
    for var, item in q40_items:
        questions_data.append(
            {
                "variable": var,
                "question_text": f"Veuillez indiquer si vous êtes d’accord ou en désaccord avec cet énoncé : {item}",  # noqa: E501
                "response_options": opt_accord_5,
                "var_type": "single",
            }
        )

    # Q41_1
    questions_data.append(
        {
            "variable": "q41_1",
            "question_text": "Préférez-vous un État imposant beaucoup de taxes servant à financer plus de services gouvernementaux ou un État n’imposant pas beaucoup de taxes mais offrant moins de services?",  # noqa: E501
            "response_options": opts(
                (0, "0 - Beaucoup de taxes et plus de services"),
                (1, "1"),
                (2, "2"),
                (3, "3"),
                (4, "4"),
                (5, "5 - Pas beaucoup de taxes mais moins de services"),
                (98, "Je ne sais pas"),
                (99, "Je préfère ne pas répondre"),
            ),
            "var_type": "scale",
        }
    )

    # Q42
    questions_data.append(
        {
            "variable": "q42",
            "question_text": "Pensez-vous que le Québec devrait être un pays indépendant?",
            "response_options": opts(
                (1, "Oui"),
                (2, "Non"),
                (3, "Dépend des conditions"),
                (98, "Je ne sais pas"),
                (99, "Je préfère ne pas répondre"),
            ),
            "var_type": "single",
        }
    )

    # Q43
    questions_data.append(
        {
            "variable": "q43",
            "question_text": "Pensez-vous que le gouvernement du Québec devrait imposer des restrictions plus sévères sur la vente de cannabis?",  # noqa: E501
            "response_options": opt_yes_no_sais,
            "var_type": "single",
        }
    )

    # Q44
    questions_data.append(
        {
            "variable": "q44",
            "question_text": "Pensez-vous que les personnes qui portent des symboles religieux visibles devraient être autorisées à travailler comme enseignants dans les écoles publiques?",  # noqa: E501
            "response_options": opt_yes_no_sais,
            "var_type": "single",
        }
    )

    # Q45
    questions_data.append(
        {
            "variable": "q45",
            "question_text": "Pensez-vous que les personnes qui portent un voile intégral (comme la burqa ou le niqab) devraient être tenues de découvrir leur visage pour recevoir des services gouvernementaux?",  # noqa: E501
            "response_options": opt_yes_no_sais,
            "var_type": "single",
        }
    )

    # Q46
    questions_data.append(
        {
            "variable": "q46",
            "question_text": "Pensez-vous que les immigrants devraient être tenus de réussir un test de français avant de pouvoir obtenir la résidence permanente au Québec?",  # noqa: E501
            "response_options": opt_yes_no_sais,
            "var_type": "single",
        }
    )

    # Q47_1
    questions_data.append(
        {
            "variable": "q47_1",
            "question_text": "Certaines personnes disent que les gouvernements devraient s’assurer que chaque personne ait un emploi et une bonne qualité de vie. D’autres personnes disent que les gouvernements devraient plutôt laisser chaque personne se débrouiller par elle-même. Où vous situez-vous sur l’échelle ci-dessous?",  # noqa: E501
            "response_options": opts(
                (
                    1,
                    "1 - Les gouvernements devraient s’assurer que chaque personne a un emploi et une bonne qualité de vie",  # noqa: E501
                ),
                (2, "2"),
                (3, "3"),
                (4, "4"),
                (
                    5,
                    "5 - Les gouvernements devraient laisser chaque personne se débrouiller par elle-même",  # noqa: E501
                ),
                (98, "Je ne sais pas"),
                (99, "Je préfère ne pas répondre"),
            ),
            "var_type": "scale",
        }
    )

    # Q48
    questions_data.append(
        {
            "variable": "q48",
            "question_text": "Pensez-vous que le gouvernement du Québec devrait réduire le nombre d’immigrants admis au Québec chaque année?",  # noqa: E501
            "response_options": opt_yes_no_sais,
            "var_type": "single",
        }
    )

    # Q49
    questions_data.append(
        {
            "variable": "q49",
            "question_text": "Pensez-vous que le gouvernement du Québec devrait abolir les commissions scolaires?",  # noqa: E501
            "response_options": opt_yes_no_sais,
            "var_type": "single",
        }
    )

    # Q50x1
    questions_data.append(
        {
            "variable": "q50x1",
            "question_text": "Il y a déjà eu des discussions portant sur des changements au droit de vote au Québec. Êtes-vous en accord ou en désaccord avec l’idée d’abaisser l’âge de voter à 16 ans?",  # noqa: E501
            "response_options": opt_accord_4,
            "var_type": "single",
        }
    )

    # Q50x2
    questions_data.append(
        {
            "variable": "q50x2",
            "question_text": "Il y a déjà eu des discussions à propos de l’idée d’abaisser l’âge de vote à 16 ans au Québec. Un argument avancé est que la participation aux élections est en baisse, en particulier chez les jeunes, et que l’abaissement de l’âge de vote pourrait contribuer à accroître la participation électorale. Êtes-vous en accord ou en désaccord avec l’idée d’abaisser l’âge de voter à 16 ans?",  # noqa: E501
            "response_options": opt_accord_4,
            "var_type": "single",
        }
    )

    # Q50x3
    questions_data.append(
        {
            "variable": "q50x3",
            "question_text": "Il y a déjà eu des discussions à propos de l’idée d’abaisser l’âge de vote à 16 ans au Québec. Un argument avancé est que les jeunes de 16 et 17 ans travaillent, paient des impôts et sont soumis aux lois, et qu'ils devraient donc avoir le droit de voter. Êtes-vous en accord ou en désaccord avec l’idée d’abaisser l’âge de voter à 16 ans?",  # noqa: E501
            "response_options": opt_accord_4,
            "var_type": "single",
        }
    )

    # Q51A battery: Selon vous, quel parti est le meilleur pour ...
    q51a_items = [
        ("q51a_1", "défendre les intérêts du Québec"),
        ("q51a_2", "défendre l’identité et la culture québécoises"),
        ("q51a_3", "gérer les finances publiques"),
        ("q51a_4", "améliorer les services de santé"),
        ("q51a_5", "améliorer le système d’éducation"),
        ("q51a_6", "protéger l’environnement"),
        ("q51a_7", "lutter contre la pauvreté et les inégalités"),
        ("q51a_8", "gérer les enjeux d’immigration"),
    ]
    for var, item in q51a_items:
        questions_data.append(
            {
                "variable": var,
                "question_text": f"Selon vous, quel parti est le meilleur pour {item}?",
                "response_options": opt_parties,
                "var_type": "single",
            }
        )

    # Q52 battery: Selon vous, quel parti est le meilleur pour défendre les intérêts ...
    q52_items = [
        ("q52_1", "des gens âgés de 18 à 34 ans"),
        ("q52_2", "des familles avec enfants"),
        ("q52_3", "des personnes aînées"),
    ]
    for var, item in q52_items:
        questions_data.append(
            {
                "variable": var,
                "question_text": f"Selon vous, quel parti est le meilleur pour défendre les intérêts {item}?",  # noqa: E501
                "response_options": opt_parties,
                "var_type": "single",
            }
        )

    # Q53
    questions_data.append(
        {
            "variable": "q53",
            "question_text": "Au cours des 12 derniers mois, avez-vous fait du bénévolat pour un organisme communautaire ou une association?",  # noqa: E501
            "response_options": opts(
                (1, "Oui"),
                (2, "Non"),
                (3, "Je ne sais pas"),
                (98, "Je ne sais pas"),
                (99, "Je préfère ne pas répondre"),
            ),
            "var_type": "single",
        }
    )

    # Q54
    questions_data.append(
        {
            "variable": "q54",
            "question_text": "Au cours des 12 derniers mois, avez-vous fait un don d’argent à un organisme de charité ou à une cause sociale?",  # noqa: E501
            "response_options": opts(
                (1, "Oui"),
                (2, "Non"),
                (3, "Je ne sais pas"),
                (98, "Je ne sais pas"),
                (99, "Je préfère ne pas répondre"),
            ),
            "var_type": "single",
        }
    )

    # Q55A
    questions_data.append(
        {
            "variable": "q55a",
            "question_text": "Au cours des 12 derniers mois, avez-vous boycotté ou acheté certains produits pour des raisons éthiques, environnementales ou politiques?",  # noqa: E501
            "response_options": opts(
                (1, "Oui"),
                (2, "Non"),
                (3, "Je ne sais pas"),
                (4, "Pas applicable"),
                (99, "Je préfère ne pas répondre"),
            ),
            "var_type": "single",
        }
    )

    # Q55B
    questions_data.append(
        {
            "variable": "q55b",
            "question_text": "Au cours des 12 derniers mois, avez-vous signé une pétition sur un enjeu politique ou social?",  # noqa: E501
            "response_options": opts(
                (1, "Oui"),
                (2, "Non"),
                (3, "Je ne sais pas"),
                (4, "Pas applicable"),
                (99, "Je préfère ne pas répondre"),
            ),
            "var_type": "single",
        }
    )

    # Q56
    questions_data.append(
        {
            "variable": "q56",
            "question_text": "Dans quel groupe de revenu total du ménage (avant impôts) vous situez-vous pour l'année 2017?",  # noqa: E501
            "response_options": opts(
                (1, "Moins de 30 000 $"),
                (2, "De 30 000 $ à moins de 60 000 $"),
                (3, "De 60 000 $ à moins de 90 000 $"),
                (4, "90 000 $ ou plus"),
                (98, "Je ne sais pas"),
                (99, "Je préfère ne pas répondre"),
            ),
            "var_type": "single",
        }
    )

    # Q57
    questions_data.append(
        {
            "variable": "q57",
            "question_text": "Dans quel sous-groupe de revenu vous situez-vous?",
            "response_options": opts(
                (1, "Moins de 20 000 $"),
                (2, "20 000 $ à moins de 40 000 $"),
                (3, "40 000 $ à moins de 60 000 $"),
                (4, "60 000 $ à moins de 80 000 $"),
                (5, "80 000 $ à moins de 100 000 $"),
                (6, "100 000 $ à moins de 120 000 $"),
                (7, "120 000 $ ou plus"),
                (98, "Je ne sais pas"),
                (99, "Je préfère ne pas répondre"),
            ),
            "var_type": "single",
        }
    )

    # Q58
    questions_data.append(
        {
            "variable": "q58",
            "question_text": "Quelle est votre religion, si vous en avez une?",
            "response_options": opts(
                (1, "Catholique"),
                (2, "Protestante / autre chrétienne"),
                (3, "Musulmane"),
                (4, "Juive"),
                (5, "Autre religion"),
                (6, "Aucune religion / athée / agnostique"),
                (98, "Je ne sais pas"),
                (99, "Je préfère ne pas répondre"),
            ),
            "var_type": "single",
        }
    )

    # Q59 battery: Veuillez indiquer à quel point vous êtes d’accord ou non avec les énoncés suivants:  # noqa: E501
    q59_items = [
        ("q59_1", "Je voudrais explorer des endroits étranges, différents."),
        ("q59_2", "J’aime faire de nouvelles choses, même si cela comporte des risques."),
        ("q59_3", "Je préfère m’en tenir aux habitudes et aux choses que je connais bien."),
    ]
    for var, item in q59_items:
        questions_data.append(
            {
                "variable": var,
                "question_text": f"Veuillez indiquer à quel point vous êtes d’accord ou non avec cet énoncé : {item}",  # noqa: E501
                "response_options": opt_accord_5,
                "var_type": "single",
            }
        )

    # Q60
    questions_data.append(
        {
            "variable": "q60",
            "question_text": "À quelle fréquence assistez-vous à des services religieux?",
            "response_options": opts(
                (1, "Au moins une fois par semaine"),
                (2, "Au moins une fois par mois"),
                (3, "Quelques fois par année"),
                (4, "Seulement pour les occasions spéciales (mariages, funérailles, etc.)"),
                (5, "Jamais"),
                (8, "Je ne sais pas"),
                (9, "Je préfère ne pas répondre"),
            ),
            "var_type": "single",
        }
    )

    # Q61
    questions_data.append(
        {
            "variable": "q61",
            "question_text": "À quelle fréquence priez-vous ou méditez-vous?",
            "response_options": opts(
                (1, "Chaque jour"),
                (2, "Plusieurs fois par semaine"),
                (3, "Une fois par semaine"),
                (4, "Une à trois fois par mois"),
                (5, "Moins d'une fois par mois"),
                (6, "Jamais"),
                (98, "Je ne sais pas"),
                (99, "Je préfère ne pas répondre"),
            ),
            "var_type": "single",
        }
    )

    # Q62A
    questions_data.append(
        {
            "variable": "q62a",
            "question_text": "Où vous situez-vous sur une échelle de 0 à 10 de sentiment d'appartenance au Québec (0 = aucun sentiment, 10 = très fort sentiment)?",  # noqa: E501
            "response_options": opts(
                (0, "0 - Aucun sentiment d'appartenance"),
                (1, "1"),
                (2, "2"),
                (3, "3"),
                (4, "4"),
                (5, "5"),
                (6, "6"),
                (7, "7"),
                (8, "8"),
                (9, "9"),
                (10, "10 - Très fort sentiment d'appartenance"),
                (98, "Je ne sais pas"),
                (99, "Je préfère ne pas répondre"),
            ),
            "var_type": "scale",
        }
    )

    # Q62B
    questions_data.append(
        {
            "variable": "q62b",
            "question_text": "Où vous situez-vous sur une échelle de 0 à 10 de sentiment d'appartenance au Canada (0 = aucun sentiment, 10 = très fort sentiment)?",  # noqa: E501
            "response_options": opts(
                (0, "0 - Aucun sentiment d'appartenance"),
                (1, "1"),
                (2, "2"),
                (3, "3"),
                (4, "4"),
                (5, "5"),
                (6, "6"),
                (7, "7"),
                (8, "8"),
                (9, "9"),
                (10, "10 - Très fort sentiment d'appartenance"),
                (98, "Je ne sais pas"),
                (99, "Je préfère ne pas répondre"),
            ),
            "var_type": "scale",
        }
    )

    # Q63A battery (PARENT != 1)
    q63a_items = [
        ("q63a_1", "Compte épargne dans une banque"),
        ("q63a_2", "Compte dans une société de fiducie"),
        ("q63a_3", "REER ou CELI"),
        ("q63a_4", "Actions ou parts d’entreprise"),
        ("q63a_5", "Obligations (obligations d’épargne du Canada, etc.)"),
        ("q63a_6", "Portefeuille d’actifs financiers (CPG, fonds mutuels, etc.)"),
        ("q63a_7", "Autre type de placement financier"),
    ]
    for var, item in q63a_items:
        questions_data.append(
            {
                "variable": var,
                "question_text": f"Parmi les types de placements financiers suivants, détenez-vous ou l'un des membres de votre foyer détient-il : {item}?",  # noqa: E501
                "response_options": opt_yes_no_sais,
                "var_type": "single",
            }
        )

    # Q63B battery (PARENT == 1)
    q63b_items = [
        ("q63b_1", "Compte épargne dans une banque"),
        ("q63b_2", "Compte dans une société de fiducie"),
        ("q63b_3", "REER ou CELI"),
        ("q63b_4", "Actions ou parts d’entreprise"),
        ("q63b_5", "Obligations (obligations d’épargne du Canada, etc.)"),
        ("q63b_6", "Portefeuille d’actifs financiers (CPG, fonds mutuels, etc.)"),
        ("q63b_7", "Autre type de placement financier"),
    ]
    for var, item in q63b_items:
        questions_data.append(
            {
                "variable": var,
                "question_text": f"Parmi les types de placements financiers suivants, vos parents (ou l'un d'eux) détiennent-ils : {item}?",  # noqa: E501
                "response_options": opt_yes_no_sais,
                "var_type": "single",
            }
        )

    # Q64A battery (PARENT != 1)
    q64a_items = [
        ("q64a_1", "De votre résidence principale?"),
        ("q64a_2", "D’une résidence secondaire (maison de campagne, chalet, etc.)?"),
        ("q64a_3", "D’autres biens immobiliers ou de propriétés que vous louez (duplex, etc.)?"),
        ("q64a_4", "D’un commerce ou d’une entreprise?"),
        ("q64a_5", "D’un terrain ou d’une ferme?"),
    ]
    for var, item in q64a_items:
        questions_data.append(
            {
                "variable": var,
                "question_text": f"Aujourd’hui, êtes-vous propriétaire : {item}",
                "response_options": opt_yes_no_sais,
                "var_type": "single",
            }
        )

    # Q64B battery (PARENT == 1)
    q64b_items = [
        ("q64b_1", "De votre résidence principale?"),
        ("q64b_2", "D’une résidence secondaire (maison de campagne, chalet, etc.)?"),
        ("q64b_3", "D’autres biens immobiliers ou de propriétés que vous louez (duplex, etc.)?"),
        ("q64b_4", "D’un commerce ou d’une entreprise?"),
        ("q64b_5", "D’un terrain ou d’une ferme?"),
    ]
    for var, item in q64b_items:
        questions_data.append(
            {
                "variable": var,
                "question_text": f"Est-ce que vos parents (ou un de vos parents) sont aujourd’hui propriétaires : {item}",  # noqa: E501
                "response_options": opt_yes_no_sais,
                "var_type": "single",
            }
        )

    # Q65A
    questions_data.append(
        {
            "variable": "q65a",
            "question_text": "Avez-vous une hypothèque sur votre résidence principale?",
            "response_options": opt_yes_no_sais,
            "var_type": "single",
        }
    )

    # Q65B
    questions_data.append(
        {
            "variable": "q65b",
            "question_text": "Est-ce que vos parents ont une hypothèque sur leur résidence principale?",  # noqa: E501
            "response_options": opt_yes_no_sais,
            "var_type": "single",
        }
    )

    # Q66
    questions_data.append(
        {
            "variable": "q66",
            "question_text": "Êtes-vous né(e) au Canada?",
            "response_options": opt_yes_no,
            "var_type": "single",
        }
    )

    # Q67
    questions_data.append(
        {
            "variable": "q67",
            "question_text": "En quelle année êtes-vous arrivé(e) au Canada?",
            "response_options": opts(
                (1, "Avant 1980"),
                (2, "1980 à 1989"),
                (3, "1990 à 1999"),
                (4, "2000 à 2009"),
                (5, "2010 ou après"),
                (99, "Je préfère ne pas répondre"),
            ),
            "var_type": "single",
        }
    )

    # Q68
    questions_data.append(
        {
            "variable": "q68",
            "question_text": "Dans quel pays êtes-vous né(e)?",
            "response_options": opts(
                (1, "Canada"),
                (2, "France"),
                (3, "Haïti"),
                (4, "Maroc / Algérie / Tunisie"),
                (5, "Autre pays d'Afrique"),
                (6, "Autre pays d'Europe"),
                (7, "Autre pays d'Amérique"),
                (8, "Autre pays d'Asie / Océanie"),
                (98, "Je ne sais pas"),
                (99, "Je préfère ne pas répondre"),
            ),
            "var_type": "single",
        }
    )

    # Q69
    questions_data.append(
        {
            "variable": "q69",
            "question_text": "Vos deux parents sont-ils nés au Canada?",
            "response_options": opts(
                (1, "Oui, les deux parents sont nés au Canada"),
                (2, "Un seul parent est né au Canada"),
                (3, "Aucun parent n'est né au Canada"),
                (98, "Je ne sais pas"),
                (99, "Je préfère ne pas répondre"),
            ),
            "var_type": "single",
        }
    )

    # Q70
    questions_data.append(
        {
            "variable": "q70",
            "question_text": "Quelle langue parlez-vous le plus souvent à la maison?",
            "response_options": opts(
                (1, "Anglais"),
                (2, "Français"),
                (3, "Chinois"),
                (4, "Italien"),
                (5, "Portugais"),
                (6, "Espagnol"),
                (7, "Allemand"),
                (8, "Polonais"),
                (9, "Punjabi"),
                (10, "Grec"),
                (11, "Vietnamien"),
                (12, "Arabe"),
                (13, "Inuktitut"),
                (14, "Cri"),
                (15, "Tagal (Philippin)"),
                (16, "Ukrainien / Russe"),
                (96, "Autre"),
                (98, "Je ne sais pas"),
                (99, "Je préfère ne pas répondre"),
            ),
            "var_type": "single",
        }
    )

    # Q71 multiple choice dummy variables (q71_1 to q71_99)
    q71_labels = [
        ("q71_1", "Canadienne, Québécoise"),
        ("q71_2", "Autochtone (Amérindienne, Premières nations)"),
        ("q71_3", "Afrique du Nord (Maroc, Algérie, Tunisie, Libye, Égypte)"),
        (
            "q71_4",
            "Afrique (Gabon, Congo, Côte d’Ivoire, Éthiopie, Kenya, Cameroun, Mauritanie, ...) et Afrique du Sud",  # noqa: E501
        ),
        (
            "q71_5",
            "Amérique centrale et sud (Nicaragua, Pérou, Bolivie, Vénézuela, Argentine, El Salvador, Guatemala, ...)",  # noqa: E501
        ),
        ("q71_6", "Américaine (États-Unis)"),
        ("q71_7", "Mexicaine"),
        ("q71_8", "Antillaise (Haïti, Jamaïque, République Dominicaine, ....)"),
        ("q71_9", "Asiatique (Japon, Chine, Vietnam, Corée, Cambodge, ...)"),
        (
            "q71_10",
            "Européenne (France, Belgique, Italie, Espagne, Portugal, Allemagne, Autriche, Suède, Norvège, Danemark, Pays-Bas, Grande-Bretagne, Irlande, Écosse, Pologne, Russie, ...)",  # noqa: E501
        ),
        ("q71_11", "Océanie (Australie, Nouvelle-Zélande)"),
        ("q71_12", "Autre pays d'origine de la personne interrogée"),
        ("q71_13", "Autre pays d'origine des ancêtres"),
        ("q71_96", "Autre, précisez"),
        ("q71_98", "Je ne sais pas"),
        ("q71_99", "Je préfère ne pas répondre"),
    ]
    q71_opts = opts((1, "Mentionné"), (0, "Non mentionné"))
    for var, eth_label in q71_labels:
        questions_data.append(
            {
                "variable": var,
                "question_text": f"De quelle origine ethnique êtes-vous? — {eth_label}",
                "response_options": q71_opts,
                "var_type": "multiple",
            }
        )

    # Formater les questions selon le schéma Pydantic
    questions = []
    for item in questions_data:
        var_name = item["variable"]
        raw_text = item["question_text"]

        sociodemo_type = SOCIODEMO_VARS.get(var_name)
        is_sociodemo = sociodemo_type is not None

        # Application de la règle sociodémo canonique en dernier recours si nécessaire
        if is_sociodemo and (not raw_text or fabrication_reason(var_name, raw_text)):
            question_text = canonical_sociodemo_text(sociodemo_type)
            if question_text is None:
                continue
        else:
            question_text = raw_text
            if not question_text:
                continue

        questions.append(
            {
                "variable": var_name,
                "question_text": _clean_text(question_text),
                "response_options": item["response_options"],
                "var_type": item.get("var_type", "single")
                if item["response_options"] or item.get("var_type") == "open"
                else "single",
                "is_sociodemo": is_sociodemo,
                "sociodemo_type": sociodemo_type,
            }
        )

    return {
        "survey": {
            "survey_id": SURVEY_ID,
            "survey_name": SURVEY_NAME,
            "year": YEAR,
            "pollster": POLLSTER,
            "language": LANGUAGE,
            "n_respondents": int(df.shape[0]),
            "raw_data_file": "data/eeq_2018/Quebec Election Study 2018.dta",
            "tags": ["élections", "québec", "eeq", "2018"],
        },
        "questions": questions,
    }


if __name__ == "__main__":
    extracted = extract()

    # 1. Validation Pydantic
    sf = SurveyFile.model_validate(extracted)
    print(f"Validation Pydantic OK : {len(sf.questions)} questions extraites.")

    # 2. Validation anti-fabrication
    assert_no_fabricated_text(sf)
    print("Validation assert_no_fabricated_text OK.")

    # 3. Validation de couverture des variables
    df_check, meta_check = pyreadstat.read_dta(str(DTA_FILE))
    raw_vars = list(meta_check.column_names)
    qv = {q.variable for q in sf.questions}
    missing = [v for v in raw_vars if v not in (qv | set(EXCLUDED_VARS))]
    print(
        f"Total variables RAW: {len(raw_vars)} | Questions: {len(sf.questions)} | Exclues: {len(EXCLUDED_VARS)} | Non comptées: {len(missing)}"  # noqa: E501
    )
    assert not missing, f"Couverture incomplète : {missing}"
    print("Couverture 100% OK.")

    # 4. Écriture du fichier JSON normalisé
    OUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(OUT_FILE, "w", encoding="utf-8") as f:
        json.dump(extracted, f, ensure_ascii=False, indent=2)
    print(f"Fichier normalisé écrit : {OUT_FILE}")
