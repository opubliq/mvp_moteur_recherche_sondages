"""Extraction normalisée -- eeq_2012.

Source : Quebec Election Study 2012 (SPSS).sav
         Etude electorale quebecoise 2012, Universite McGill
         (E. Belanger, R. Nadeau, A. Henderson, E. Hepburn).

DEVIATION ASSUMEE ET VALIDEE (voir docs/EXTRACTOR_BRIEF.md et
ingestion/CONVENTIONS.md pour la regle par defaut) : le fichier SAV a ses
variable labels et value labels en ANGLAIS, alors que ce sondage a ete
administre en FRANCAIS a des Quebecois. Un questionnaire francais integral
existe ("Quebec Election Study 2012 FR.md", export Word -> Markdown, avec
les codes de question Q1..Q111 explicites). Decision validee par
l'utilisateur : `question_text` et les `response_options[].label` PROVIENNENT
DE CE .md FRANCAIS, pas du SAV anglais. Le SAV sert uniquement a : la liste
complete des variables (couverture), les codes numeriques de valeur (pour
aligner `response_options[].code`), les metadonnees structurelles
(exclusions techniques, sociodemo) et le nombre de repondants. L'invariant
zero-fabrication reste intact : tout texte vient d'un raw, juste un raw
different (le questionnaire .md plutot que le SAV) -- rien n'est invente.

Le mapping SAV <-> .md (question simple, batterie intro+item, sociodemo,
variables non resolues) a ete construit variable par variable et est
documente dans le rapport du subagent d'extraction (voir commit associe).
Les variables de batterie (ex. Q33A..Q33G) combinent le texte d'intro de la
question-chapeau et le texte de l'item lettre avec " / " (convention deja
utilisee pour les batteries de eeq_2014.py, ex. Q31A..Q31F).

Encodage : fichier SAV lu avec pyreadstat (encodage SPSS par defaut).

Usage :
    uv run python ingestion/surveys/eeq_2012.py
    -> ecrit ingestion/normalized/eeq_2012.json
"""

from __future__ import annotations

import json
import re
from pathlib import Path

import pyreadstat

from ingestion.models import SurveyFile
from ingestion.open_text import is_text_column

# ---------------------------------------------------------------------------
# Chemins
# ---------------------------------------------------------------------------

_HERE = Path(__file__).parent
REPO_ROOT = _HERE.parent.parent
DATA_DIR = REPO_ROOT / "data" / "eeq_2012"
SAV_FILE = DATA_DIR / "Quebec Election Study 2012 (SPSS).sav"
MD_QUESTIONNAIRE_FILE = DATA_DIR / "Quebec Election Study 2012 FR.md"  # source FR (deviation)
OUT_FILE = REPO_ROOT / "ingestion" / "normalized" / "eeq_2012.json"

# ---------------------------------------------------------------------------
# Constantes du sondage
# ---------------------------------------------------------------------------

# Rail microdonnees (v33.3) -- declaratif, lu en LECTURE SEULE par
# ingestion/microdata.py. N'affecte PAS l'extraction catalogue (extract()
# ne les reference pas).
WEIGHT_VAR = "POND"  # poids fourni par la maison de sondage -> weight_source='provided'
RESPONDENT_ID_VAR = "QUEST"  # numero de questionnaire RAW = identite de ligne

SURVEY_ID = "eeq_2012"
SURVEY_NAME = "Étude électorale québécoise 2012 (EEQ)"
YEAR = 2012
POLLSTER = "Université McGill"
LANGUAGE = "fr"

# ---------------------------------------------------------------------------
# Variables EXCLUES (techniques / derivees / sans contenu exploitable)
# ---------------------------------------------------------------------------

EXCLUDED_VARS: dict[str, str] = {
    'QUEST': 'numéro de questionnaire (identifiant technique, pas de libellé de question)',
    'REGIO': 'région agrégée dérivée (3 groupes : MTL RMR / QC RMR / Autres régions) — '
             'recodage de Q0QC (17 régions administratives), déjà couverte comme source',
    'AGE': 'âge calculé ("CALCUL VARIABLE"), dérivé de AGEX (année de naissance brute, '
           'déjà couverte comme source)',
    'Q62AA': 'flag "autre, précisez" pour l\'item a. (Éducation) de Q62 — libellé de '
             'valeur vide dans le SAV (code 96 : ""), contenu du write-in non capturé',
    'Q62AB': 'flag "autre, précisez" pour l\'item b. (Politique d\'immigration) de Q62 — '
             'libellé de valeur vide dans le SAV (code 96 : "")',
    'Q62AC': 'flag "autre, précisez" pour l\'item c. (Protection de l\'environnement) de '
             'Q62 — libellé de valeur vide dans le SAV (code 96 : "")',
    'Q62AD': 'flag "autre, précisez" pour l\'item d. (Politique culturelle) de Q62 — '
             'libellé de valeur vide dans le SAV (code 96 : "")',
    'Q62AE': 'flag "autre, précisez" pour l\'item e. (Santé) de Q62 — libellé de valeur '
             'vide dans le SAV (code 96 : "")',
    'Q62AF': 'flag "autre, précisez" pour l\'item f. (Défense) de Q62 — libellé de '
             'valeur vide dans le SAV (code 96 : "")',
    'Q62AG': 'flag "autre, précisez" pour l\'item g. (Politique monétaire) de Q62 — '
             'libellé de valeur vide dans le SAV (code 96 : "")',
    'Q62AH': 'flag "autre, précisez" pour l\'item h. (Politique économique) de Q62 — '
             'libellé de valeur vide dans le SAV (code 96 : "")',
    'Q62AI': 'flag "autre, précisez" pour l\'item i. (Affaires étrangères) de Q62 — '
             'libellé de valeur vide dans le SAV (code 96 : "")',
    'POND': 'pondération — poids statistique',
}

# ---------------------------------------------------------------------------
# Variables socio-demographiques
# ---------------------------------------------------------------------------

SOCIODEMO_VARS: dict[str, str] = {
    "Q0QC": "region",
    "AGEX": "age",
    "SEXE": "gender",
    "LANGU": "language",
    "SCOL": "education",
    "REVEN": "income",
    "OCCUP": "employment",
    "Q102": "religion",
    "Q103": "religion_type",
    "Q104": "religion_practice",
    "Q105": "place_of_birth",
    "Q107": "language_home",
    "Q108": "ethnicity",
    "Q109": "civil_status"
}

# ---------------------------------------------------------------------------
# Variables de type echelle (thermometres 0-100, echelles 0-10, 1-5)
# ---------------------------------------------------------------------------

# Q7      : echelle 0-10 valeurs distinctes / memes valeurs (Quebecois vs Canadiens)
# Q68 sq  : thermometres 0-100 pour les politiciens (Charest, Marois, Legault,
#           Khadir, Aussant, Sabourin)
# Q69     : thermometre 0-100 pour Stephen Harper
# Q69B-C  : thermometres 0-100 pour syndicats / entreprises
# Q70A-F  : echelle gauche-droite 0-10 pour les partis
# Q71     : position gauche-droite personnelle 0-10
# Q81     : echelle 1-5 emploi garanti / debrouille seul
# Q89     : echelle 0-10 marche vs souverainete
SCALE_VARS: set[str] = {
    "Q68",
    "Q68B",
    "Q68C",
    "Q68D",
    "Q68E",
    "Q68F",
    "Q69",
    "Q69B",
    "Q69C",
    "Q7",
    "Q70A",
    "Q70B",
    "Q70C",
    "Q70D",
    "Q70E",
    "Q70F",
    "Q71",
    "Q81",
    "Q89",
}

# ---------------------------------------------------------------------------
# Contenu FR (question_text + response_options) extrait du questionnaire
# francais integral (Quebec Election Study 2012 FR.md), aligne aux codes
# numeriques du SAV. Cle = variable SAV. Valeur = (question_text,
# [(code, label), ...]). Construit variable par variable ; voir le rapport
# du subagent d'extraction pour la table de correspondance SAV <-> .md et
# la liste des cas particuliers (batteries, sociodemo, variables au wording
# reconstruit -- ex. Q82E dont l'ordre des options .md differe du SAV, ou
# SCOL dont le compte d'options .md/SAV ne concorde pas exactement).
QUESTION_DATA: dict[str, tuple[str, list[tuple[object, str]]]] = {
    'AGEX': (
        'En quelle année êtes-vous né(e)?',
        [
            (9999, 'Pas de réponse'),
        ]
    ),
    'LANGU': (
        'Quelle est la langue que vous avez apprise en premier lieu à la maison dans '
        'votre enfance et que vous comprenez toujours?',
        [
            (1, 'Français'), (2, 'Anglais'), (3, 'Autre'), (9, 'Pas de réponse'),
        ]
    ),
    'OCCUP': (
        'Travaillez-vous actuellement à votre compte, êtes-vous salarié(e), avez-vous '
        'pris votre retraite, êtes-vous au chômage ou cherchez-vous du travail, '
        "êtes-vous étudiant(e), ménager(ère), ou quelque chose d'autre?",
        [
            (1, 'Travaille à son compte (avec ou sans employés)'),
            (2,
                'Travaille pour un salaire (à temps plein ou à temps partiel, inclut '
                'congé payé)'),
            (3, 'Retraité(e)'), (4, 'Au chômage/cherche du travail'), (5, 'Étudiant(e)'),
            (6, 'Ménager(ère)'), (7, 'Handicapé(e)'),
            (8, 'Occupe deux ou plus de deux emplois rémunérés'),
            (9, 'Étudiant(e) et salarié(e)'), (10, 'Ménager(ère) et salarié(e)'),
            (11, 'Retraité(e) et salarié(e)'), (96, 'Autre'), (99, 'Pas de réponse'),
        ]
    ),
    'Q0QC': (
        'Dans quelle région du Québec habitez-vous?',
        [
            (1, 'Bas-Saint-Laurent'), (2, 'Saguenay-Lac-Saint-Jean'),
            (3, 'Capitale-Nationale'), (4, 'Mauricie'), (5, 'Estrie'), (6, 'Montréal'),
            (7, 'Outaouais'), (8, 'Abitibi-Témiscamingue'), (9, 'Côte-Nord'),
            (10, 'Nord-du-Québec'), (11, 'Gaspésie-Îles-de-la-Madeleine'),
            (12, 'Chaudière-Appalaches'), (13, 'Laval'), (14, 'Lanaudière'),
            (15, 'Laurentides'), (16, 'Montérégie'), (17, 'Centre-du-Québec'),
        ]
    ),
    'Q1': (
        "Quel est votre degré d'attachement au Québec?",
        [
            (1, 'Très attaché(e)'), (2, 'Plutôt attaché(e)'), (3, 'Pas très attaché(e)'),
            (4, 'Pas du tout attaché(e)'), (8, 'Ne sais pas'), (9, 'Pas de réponse'),
        ]
    ),
    'Q10': (
        'Si vous deviez choisir, à quel niveau est-il plus important que vous votiez? '
        '(ROTATION DES TROIS PREMIÈRES RÉPONSES)',
        [
            (1, 'Élections provinciales'), (2, 'Élections fédérales'),
            (3, 'Élections municipales'), (8, 'Ne sais pas'), (9, 'Pas de réponse'),
        ]
    ),
    'Q101A': (
        'Parmi les types de placements financiers suivants, quels sont ceux que vous '
        "détenez ou que détient l'un des membres de votre foyer? (Plusieurs réponses "
        'possibles) / Compte épargne dans une banque',
        [
            (1, 'Oui'), (2, 'Non'), (8, 'Je ne sais pas'),
            (9, 'Je préfère ne pas répondre'),
        ]
    ),
    'Q101B': (
        'Parmi les types de placements financiers suivants, quels sont ceux que vous '
        "détenez ou que détient l'un des membres de votre foyer? (Plusieurs réponses "
        'possibles) / Compte dans une société de fiducie',
        [
            (1, 'Oui'), (2, 'Non'), (8, 'Je ne sais pas'),
            (9, 'Je préfère ne pas répondre'),
        ]
    ),
    'Q101C': (
        'Parmi les types de placements financiers suivants, quels sont ceux que vous '
        "détenez ou que détient l'un des membres de votre foyer? (Plusieurs réponses "
        'possibles) / REER ou CELI',
        [
            (1, 'Oui'), (2, 'Non'), (8, 'Je ne sais pas'),
            (9, 'Je préfère ne pas répondre'),
        ]
    ),
    'Q101D': (
        'Parmi les types de placements financiers suivants, quels sont ceux que vous '
        "détenez ou que détient l'un des membres de votre foyer? (Plusieurs réponses "
        "possibles) / Actions ou parts d'entreprise",
        [
            (1, 'Oui'), (2, 'Non'), (8, 'Je ne sais pas'),
            (9, 'Je préfère ne pas répondre'),
        ]
    ),
    'Q101E': (
        'Parmi les types de placements financiers suivants, quels sont ceux que vous '
        "détenez ou que détient l'un des membres de votre foyer? (Plusieurs réponses "
        "possibles) / Obligations (obligations d'épargne du Canada, etc.)",
        [
            (1, 'Oui'), (2, 'Non'), (8, 'Je ne sais pas'),
            (9, 'Je préfère ne pas répondre'),
        ]
    ),
    'Q101F': (
        'Parmi les types de placements financiers suivants, quels sont ceux que vous '
        "détenez ou que détient l'un des membres de votre foyer? (Plusieurs réponses "
        "possibles) / Portefeuille d'actifs financiers (CPG, fonds mutuels, etc.)",
        [
            (1, 'Oui'), (2, 'Non'), (8, 'Je ne sais pas'),
            (9, 'Je préfère ne pas répondre'),
        ]
    ),
    'Q101G': (
        'Parmi les types de placements financiers suivants, quels sont ceux que vous '
        "détenez ou que détient l'un des membres de votre foyer? (Plusieurs réponses "
        "possibles) / Régime d'épargne-retraite",
        [
            (1, 'Oui'), (2, 'Non'), (8, 'Je ne sais pas'),
            (9, 'Je préfère ne pas répondre'),
        ]
    ),
    'Q102': (
        'Considérez-vous appartenir à une religion ou à une dénomination particulière?',
        [
            (1, 'Oui'), (2, 'Non'), (3, 'Pas de réponse'),
        ]
    ),
    'Q103': (
        'Quelle religion?',
        [
            (1, 'Christianisme (Catholicisme)'), (2, 'Christianisme (Protestant)'),
            (3, 'Christianisme (autre)'), (4, 'Judaïsme'), (5, 'Islam'), (6, 'Autre'),
            (9, 'Pas de réponse'),
        ]
    ),
    'Q104': (
        'Sans compter les mariages et les funérailles, combien de fois assistez-vous aux '
        'messes à votre lieu de culte?',
        [
            (1, 'Chaque semaine'), (2, 'Deux fois par mois'), (3, 'Une fois par mois'),
            (4, 'Une ou deux fois par année'), (5, 'Presque jamais (ou jamais)'),
            (8, 'Ne sais pas'), (9, 'Pas de réponse'),
        ]
    ),
    'Q105': (
        'Où êtes-vous né(e)?',
        [
            (1, 'Au Québec'), (2, 'Ailleurs au Canada'), (3, 'Hors du Canada'),
            (8, 'Ne sais pas'), (9, 'Pas de réponse'),
        ]
    ),
    'Q107': (
        'Quelle langue parlez-vous le plus souvent à la maison?',
        [
            (1, 'Anglais'), (2, 'Français'), (3, 'Chinois'), (4, 'Italien'),
            (5, 'Portugais'), (6, 'Espagnol'), (7, 'Allemand'), (8, 'Polonais'),
            (9, 'Punjabi'), (10, 'Grec'), (11, 'Vietnamien'), (12, 'Arabe'),
            (13, 'Inuktitut'), (14, 'Cri'), (15, 'Tagal (Philippin)'),
            (16, 'Ukrainien / Russe'), (96, 'Autre'), (98, 'Ne sais pas'),
            (99, 'Pas de réponse'),
        ]
    ),
    'Q108': (
        'De quelle origine ethnique êtes-vous?',
        [
            (1, 'Canadienne, Québécoise'),
            (2, 'Autochtone (Amérindienne, Premières nations)'),
            (3, 'Afrique du Nord (Maroc, Algérie, Tunisie, Libye, Égypte)'),
            (4,
                'Afrique (Gabon, Congo, Côte d’Ivoire, Éthiopie, Kenya, Cameroun, '
                'Mauritanie, ...) et Afrique du Sud'),
            (5, 'Américaine (États-Unis)'),
            (6,
                'Amérique centrale et sud (Nicaragua, Pérou, Bolivie, Vénézuela, '
                'Argentine, El Salvador, Guatemala, …)'),
            (7, 'Mexicaine'),
            (8, 'Antillaise (Haïti, Jamaïque, République Dominicaine, ….)'),
            (9, 'Asiatique (Japon, Chine, Vietnam, Corée, Cambodge, ...)'),
            (10,
                'Européenne (France, Belgique, Italie, Espagne, Portugal, Allemagne, '
                'Autriche, Suède, Norvège, Danemark, Pays-Bas, Grèce, …)'),
            (11,
                'Europe de l’Est (Russie, Ukraine, Pologne, Roumanie, Ex-Yougoslavie, '
                'Croatie, République Tchèque, République Slovaque, Hongrie, …)'),
            (12,
                'Moyen-Orient, sauf l’Afrique du Nord (Jordanie, Arabie Saoudite, Irak, '
                'Liban,...)'),
            (13, 'Turquie, Arménie, Iran, Kurde'), (96, 'Autre origine'),
            (98, 'Ne sais pas'), (99, 'Pas de réponse'),
        ]
    ),
    'Q109': (
        'Quel est votre statut civil officiel?',
        [
            (1, 'Marié(e)'), (2, 'Marié(e), mais séparé(e)'), (3, 'Célibataire'),
            (4, 'Divorcé(e)'), (5, 'Veuf/veuve'), (6, 'Dans une union civile'),
            (9, 'Pas de réponse'),
        ]
    ),
    'Q11': (
        "Dans quelle mesure les décisions prises à l'Assemblée nationale du Québec "
        'sont-elles importantes pour vous, personnellement?',
        [
            (1, 'Très importantes'), (2, 'Plutôt importantes'),
            (3, 'Pas très importantes'), (4, 'Pas du tout importantes'),
            (8, 'Ne sais pas'), (9, 'Pas de réponse'),
        ]
    ),
    'Q12': (
        'Et dans quelle mesure les décisions prises au Parlement du Canada sont- elles '
        'importantes pour vous, personnellement?',
        [
            (1, 'Très importantes'), (2, 'Plutôt importantes'),
            (3, 'Pas très importantes'), (4, 'Pas du tout importantes'),
            (8, 'Ne sais pas'), (9, 'Pas de réponse'),
        ]
    ),
    'Q13': (
        'Quel parti est le meilleur pour défendre les intérêts du Québec? (ROTATION DES '
        'CHOIX)',
        [
            (1, 'Parti libéral du Québec'), (2, 'Parti québécois'),
            (3, 'Coalition avenir Québec'), (4, 'Québec solidaire'),
            (5, 'Option nationale'), (6, 'Parti vert du Québec'), (96, 'Un autre parti'),
            (98, 'Ne sais pas'), (99, 'Pas de réponse'),
        ]
    ),
    'Q14': (
        "Quel parti est le meilleur pour défendre l'identité et la culture québécoise? "
        '(ROTATION DES CHOIX)',
        [
            (1, 'Parti libéral du Québec'), (2, 'Parti québécois'),
            (3, 'Coalition avenir Québec'), (4, 'Québec solidaire'),
            (5, 'Option nationale'), (6, 'Parti vert du Québec'), (96, 'Un autre parti'),
            (98, 'Ne sais pas'), (99, 'Pas de réponse'),
        ]
    ),
    'Q15': (
        "Quel parti est le meilleur pour gérer l'économie? (ROTATION DES CHOIX)",
        [
            (1, 'Parti libéral du Québec'), (2, 'Parti québécois'),
            (3, 'Coalition avenir Québec'), (4, 'Québec solidaire'),
            (5, 'Option nationale'), (6, 'Parti vert du Québec'), (96, 'Un autre parti'),
            (98, 'Ne sais pas'), (99, 'Pas de réponse'),
        ]
    ),
    'Q16': (
        "Quel parti est le meilleur pour améliorer l'éducation? (ROTATION DES CHOIX)",
        [
            (1, 'Parti libéral du Québec'), (2, 'Parti québécois'),
            (3, 'Coalition avenir Québec'), (4, 'Québec solidaire'),
            (5, 'Option nationale'), (6, 'Parti vert du Québec'), (96, 'Un autre parti'),
            (98, 'Ne sais pas'), (99, 'Pas de réponse'),
        ]
    ),
    'Q17': (
        "Quel parti est le meilleur pour protéger l'environnement? (ROTATION DES CHOIX)",
        [
            (1, 'Parti libéral du Québec'), (2, 'Parti québécois'),
            (3, 'Coalition avenir Québec'), (4, 'Québec solidaire'),
            (5, 'Option nationale'), (6, 'Parti vert du Québec'), (96, 'Un autre parti'),
            (98, 'Ne sais pas'), (99, 'Pas de réponse'),
        ]
    ),
    'Q18': (
        'Quel parti est le meilleur pour gérer le système de santé? (ROTATION DES CHOIX)',
        [
            (1, 'Parti libéral du Québec'), (2, 'Parti québécois'),
            (3, 'Coalition avenir Québec'), (4, 'Québec solidaire'),
            (5, 'Option nationale'), (6, 'Parti vert du Québec'), (96, 'Un autre parti'),
            (98, 'Ne sais pas'), (99, 'Pas de réponse'),
        ]
    ),
    'Q19': (
        'Quel parti est le meilleur pour négocier avec le Parlement du Canada? (ROTATION '
        'DES CHOIX)',
        [
            (1, 'Parti libéral du Québec'), (2, 'Parti québécois'),
            (3, 'Coalition avenir Québec'), (4, 'Québec solidaire'),
            (5, 'Option nationale'), (6, 'Parti vert du Québec'), (96, 'Un autre parti'),
            (98, 'Ne sais pas'), (99, 'Pas de réponse'),
        ]
    ),
    'Q2': (
        "Et quel est votre degré d'attachement au Canada?",
        [
            (1, 'Très attaché(e)'), (2, 'Plutôt attaché(e)'), (3, 'Pas très attaché(e)'),
            (4, 'Pas du tout attaché(e)'), (8, 'Ne sais pas'), (9, 'Pas de réponse'),
        ]
    ),
    'Q20': (
        'Quel parti est le meilleur pour combattre la pauvreté? (ROTATION DES CHOIX)',
        [
            (1, 'Parti libéral du Québec'), (2, 'Parti québécois'),
            (3, 'Coalition avenir Québec'), (4, 'Québec solidaire'),
            (5, 'Option nationale'), (6, 'Parti vert du Québec'), (96, 'Un autre parti'),
            (98, 'Ne sais pas'), (99, 'Pas de réponse'),
        ]
    ),
    'Q20B': (
        'Et quel parti est le meilleur pour lutter contre la corruption? (ROTATION DES '
        'CHOIX)',
        [
            (1, 'Parti libéral du Québec'), (2, 'Parti québécois'),
            (3, 'Coalition avenir Québec'), (4, 'Québec solidaire'),
            (5, 'Option nationale'), (6, 'Parti vert du Québec'), (96, 'Un autre parti'),
            (98, 'Ne sais pas'), (99, 'Pas de réponse'),
        ]
    ),
    'Q21': (
        "Avez-vous voté lors de l'élection provinciale du 4 septembre 2012?",
        [
            (1, 'Oui'), (2, 'Non'), (8, 'Ne sais pas'), (9, 'Pas de réponse'),
        ]
    ),
    'Q22': (
        'Et avez-vous voté lors de la dernière élection fédérale en mai 2011?',
        [
            (1, 'Oui'), (2, 'Non'), (8, 'Ne sais pas'), (9, 'Pas de réponse'),
        ]
    ),
    'Q23': (
        "Lorsque vous décidiez comment voter à l'élection fédérale, avez-vous voté selon "
        "ce qui se passait au Québec ou selon ce qui se passait dans l'ensemble du "
        'Canada?',
        [
            (1, 'Québec'), (2, 'Canada'), (3, 'Les deux également'), (8, 'Ne sais pas'),
            (9, 'Pas de réponse'),
        ]
    ),
    'Q24': (
        "Lorsque vous décidiez comment voter à l'élection provinciale, avez- vous voté "
        "selon ce qui se passait au Québec ou selon ce qui se passait dans l'ensemble du "
        'Canada?',
        [
            (1, 'Québec'), (2, 'Canada'), (3, 'Les deux également'), (8, 'Ne sais pas'),
            (9, 'Pas de réponse'),
        ]
    ),
    'Q25': (
        'Pour quel parti avez-vous voté lors de la dernière élection provinciale le 4 '
        'septembre 2012? (ROTATION DES CHOIX)',
        [
            (1, 'Parti libéral du Québec'), (2, 'Parti québécois'),
            (3, 'Coalition avenir Québec'), (4, 'Québec solidaire'),
            (5, 'Parti vert du Québec'), (6, 'Option nationale'), (96, 'Un autre parti'),
            (98, 'Ne sais pas'), (99, 'Pas de réponse'),
        ]
    ),
    'Q27': (
        'Et lors de la dernière élection fédérale en mai 2011? Avez-vous voté pour: '
        '(ROTATION DES CHOIX)',
        [
            (1, 'Parti conservateur du Canada'), (2, 'Parti libéral du Canada'),
            (3, 'Nouveau parti démocratique (NPD)'), (4, 'Bloc québécois'),
            (5, 'Parti vert du Canada'), (96, 'Un autre parti'), (98, 'Ne sais pas'),
            (99, 'Pas de réponse'),
        ]
    ),
    'Q3': (
        'Les gens ont différentes façons de se définir. Diriez-vous que vous vous '
        "considérez...? (INVERSER L'ORDRE DES CHOIX DE RÉPONSES POUR LA MOITIÉ DE "
        "L'ÉCHANTILLON)",
        [
            (1, 'Uniquement comme Québécois(e), pas du tout comme Canadien(ne)'),
            (2, 'D’abord comme Québécois(e), puis comme Canadien(ne)'),
            (3, 'Également comme Canadien(ne) et comme Québécois(e)'),
            (4, 'D’abord comme Canadien(ne), puis comme Québécois(e)'),
            (5, 'Uniquement comme Canadien(ne), pas du tout comme Québécois(e)'),
            (8, 'Ne sais pas'), (9, 'Pas de réponse'),
        ]
    ),
    'Q31': (
        'Si une élection fédérale avait lieu la semaine prochaine, pour quel parti '
        'voteriez-vous? (ROTATION DES CHOIX)',
        [
            (1, 'Parti conservateur du Canada'), (2, 'Parti libéral du Canada'),
            (3, 'Nouveau parti démocratique (NPD)'), (4, 'Bloc québécois'),
            (5, 'Parti vert du Canada'), (96, 'Un autre parti'), (97, 'Ne voterait pas'),
            (98, 'Ne sais pas'), (99, 'Pas de réponse'),
        ]
    ),
    'Q32': (
        'Vous avez dit que vous ne saviez pas pour quel parti voter, mais si vous deviez '
        'faire un choix, quel parti choisiriez-vous? (ROTATION DES CHOIX)',
        [
            (1, 'Parti conservateur du Canada'), (2, 'Parti libéral du Canada'),
            (3, 'Nouveau parti démocratique (NPD)'), (4, 'Bloc québécois'),
            (5, 'Parti vert du Canada'), (96, 'Un autre parti'), (97, 'Ne voterait pas'),
            (98, 'Ne sais pas'), (99, 'Pas de réponse'),
        ]
    ),
    'Q33A': (
        "Lorsque vous votez aux élections fédérales, quelle est l'importance de chacun "
        'des facteurs suivants dans votre décision? (4 = très important, 3 = plutôt '
        'important, 2 = pas très important, 1 = pas du tout important) / Les positions '
        'politiques du parti',
        [
            (1, '4: très important'), (2, '3'), (3, '2'), (4, '1: pas du tout important'),
            (8, 'Ne sais pas'), (9, 'Pas de réponse'),
        ]
    ),
    'Q33B': (
        "Lorsque vous votez aux élections fédérales, quelle est l'importance de chacun "
        'des facteurs suivants dans votre décision? (4 = très important, 3 = plutôt '
        'important, 2 = pas très important, 1 = pas du tout important) / La qualité '
        'du/de la candidat(e) local(e)',
        [
            (1, '4: très important'), (2, '3'), (3, '2'), (4, '1: pas du tout important'),
            (8, 'Ne sais pas'), (9, 'Pas de réponse'),
        ]
    ),
    'Q33C': (
        "Lorsque vous votez aux élections fédérales, quelle est l'importance de chacun "
        'des facteurs suivants dans votre décision? (4 = très important, 3 = plutôt '
        'important, 2 = pas très important, 1 = pas du tout important) / Le/la chef du '
        'parti',
        [
            (1, '4: très important'), (2, '3'), (3, '2'), (4, '1: pas du tout important'),
            (8, 'Ne sais pas'), (9, 'Pas de réponse'),
        ]
    ),
    'Q33D': (
        "Lorsque vous votez aux élections fédérales, quelle est l'importance de chacun "
        'des facteurs suivants dans votre décision? (4 = très important, 3 = plutôt '
        'important, 2 = pas très important, 1 = pas du tout important) / La capacité du '
        'parti à défendre les intérêts actuels et futurs du Québec',
        [
            (1, '4: très important'), (2, '3'), (3, '2'), (4, '1: pas du tout important'),
            (8, 'Ne sais pas'), (9, 'Pas de réponse'),
        ]
    ),
    'Q33E': (
        "Lorsque vous votez aux élections fédérales, quelle est l'importance de chacun "
        'des facteurs suivants dans votre décision? (4 = très important, 3 = plutôt '
        'important, 2 = pas très important, 1 = pas du tout important) / La capacité du '
        "parti à comprendre l'histoire et la culture du Québec",
        [
            (1, '4: très important'), (2, '3'), (3, '2'), (4, '1: pas du tout important'),
            (8, 'Ne sais pas'), (9, 'Pas de réponse'),
        ]
    ),
    'Q33F': (
        "Lorsque vous votez aux élections fédérales, quelle est l'importance de chacun "
        'des facteurs suivants dans votre décision? (4 = très important, 3 = plutôt '
        'important, 2 = pas très important, 1 = pas du tout important) / La probabilité '
        'que le parti forme un gouvernement',
        [
            (1, '4: très important'), (2, '3'), (3, '2'), (4, '1: pas du tout important'),
            (8, 'Ne sais pas'), (9, 'Pas de réponse'),
        ]
    ),
    'Q33G': (
        "Lorsque vous votez aux élections fédérales, quelle est l'importance de chacun "
        'des facteurs suivants dans votre décision? (4 = très important, 3 = plutôt '
        'important, 2 = pas très important, 1 = pas du tout important) / Les préférences '
        'constitutionnelles du parti',
        [
            (1, '4: très important'), (2, '3'), (3, '2'), (4, '1: pas du tout important'),
            (8, 'Ne sais pas'), (9, 'Pas de réponse'),
        ]
    ),
    'Q34A': (
        "Et lors des élections provinciales? Quelle est l'importance de chacun des "
        'facteurs suivants dans votre décision? (4 = très important, 3 = plutôt '
        'important, 2 = pas très important, 1 = pas du tout important) / Les positions '
        'politiques du parti',
        [
            (1, '4: très important'), (2, '3'), (3, '2'), (4, '1: pas du tout important'),
            (8, 'Ne sais pas'), (9, 'Pas de réponse'),
        ]
    ),
    'Q34B': (
        "Et lors des élections provinciales? Quelle est l'importance de chacun des "
        'facteurs suivants dans votre décision? (4 = très important, 3 = plutôt '
        'important, 2 = pas très important, 1 = pas du tout important) / La qualité '
        'du/de la candidat(e) local(e)',
        [
            (1, '4: très important'), (2, '3'), (3, '2'), (4, '1: pas du tout important'),
            (8, 'Ne sais pas'), (9, 'Pas de réponse'),
        ]
    ),
    'Q34BB': (
        'Parmi les enjeux suivants, lequel était, pour vous personnellement, le plus '
        "important lors de l'élection provinciale du 4 septembre dernier? \\[ROTATION "
        'DES CHOIX DE RÉPONSES\\]',
        [
            (1, 'L’économie'), (2, 'La santé'), (3, 'L’environnement'),
            (4, 'L’éducation'), (5, 'L’aide aux familles'), (6, 'La pauvreté'),
            (7, 'La corruption'), (8, 'La souveraineté du Québec'), (98, 'Ne sais pas'),
            (99, 'Pas de réponse'),
        ]
    ),
    'Q34C': (
        "Et lors des élections provinciales? Quelle est l'importance de chacun des "
        'facteurs suivants dans votre décision? (4 = très important, 3 = plutôt '
        'important, 2 = pas très important, 1 = pas du tout important) / Le/la chef du '
        'parti',
        [
            (1, '4: très important'), (2, '3'), (3, '2'), (4, '1: pas du tout important'),
            (8, 'Ne sais pas'), (9, 'Pas de réponse'),
        ]
    ),
    'Q34CC': (
        'Vos préférences partisanes mises à part, quel parti a selon vous mené la '
        'meilleure campagne? \\[ROTATION DES CHOIX DE RÉPONSES\\]',
        [
            (1, 'Parti libéral du Québec'), (2, 'Parti québécois'),
            (3, 'Coalition avenir Québec'), (4, 'Québec solidaire'),
            (5, 'Parti vert du Québec'), (6, 'Option nationale'), (96, 'Un autre parti'),
            (98, 'Ne sais pas'), (99, 'Pas de réponse'),
        ]
    ),
    'Q34D': (
        "Et lors des élections provinciales? Quelle est l'importance de chacun des "
        'facteurs suivants dans votre décision? (4 = très important, 3 = plutôt '
        'important, 2 = pas très important, 1 = pas du tout important) / La capacité du '
        'parti à défendre les intérêts actuels et futurs du Québec',
        [
            (1, '4: très important'), (2, '3'), (3, '2'), (4, '1: pas du tout important'),
            (8, 'Ne sais pas'), (9, 'Pas de réponse'),
        ]
    ),
    'Q34DD': (
        'Et quel parti a selon vous mené la moins bonne campagne? \\[ROTATION DES CHOIX '
        'DE RÉPONSES\\]',
        [
            (1, 'Parti libéral du Québec'), (2, 'Parti québécois'),
            (3, 'Coalition avenir Québec'), (4, 'Québec solidaire'),
            (5, 'Parti vert du Québec'), (6, 'Option nationale'), (96, 'Un autre parti'),
            (98, 'Ne sais pas'), (99, 'Pas de réponse'),
        ]
    ),
    'Q34E': (
        "Et lors des élections provinciales? Quelle est l'importance de chacun des "
        'facteurs suivants dans votre décision? (4 = très important, 3 = plutôt '
        'important, 2 = pas très important, 1 = pas du tout important) / La capacité du '
        "parti à comprendre l'histoire et la culture du Québec",
        [
            (1, '4: très important'), (2, '3'), (3, '2'), (4, '1: pas du tout important'),
            (8, 'Ne sais pas'), (9, 'Pas de réponse'),
        ]
    ),
    'Q34F': (
        "Et lors des élections provinciales? Quelle est l'importance de chacun des "
        'facteurs suivants dans votre décision? (4 = très important, 3 = plutôt '
        'important, 2 = pas très important, 1 = pas du tout important) / La probabilité '
        'que le parti forme un gouvernement',
        [
            (1, '4: très important'), (2, '3'), (3, '2'), (4, '1: pas du tout important'),
            (8, 'Ne sais pas'), (9, 'Pas de réponse'),
        ]
    ),
    'Q34G': (
        "Et lors des élections provinciales? Quelle est l'importance de chacun des "
        'facteurs suivants dans votre décision? (4 = très important, 3 = plutôt '
        'important, 2 = pas très important, 1 = pas du tout important) / Les préférences '
        'constitutionnelles du parti',
        [
            (1, '4: très important'), (2, '3'), (3, '2'), (4, '1: pas du tout important'),
            (8, 'Ne sais pas'), (9, 'Pas de réponse'),
        ]
    ),
    'Q35': (
        'À quel point êtes-vous satisfait(e) de la performance du gouvernement libéral '
        'provincial en général?',
        [
            (1, 'Très satisfait(e)'), (2, 'Assez satisfait(e)'),
            (3, 'Pas très satisfait(e)'), (4, 'Pas du tout satisfait(e)'),
            (8, 'Ne sais pas'), (9, 'Pas de réponse'),
        ]
    ),
    'Q36': (
        'Et à quel point êtes-vous satisfait(e) de la performance du gouvernement '
        "libéral provincial dans la gestion de l'économie?",
        [
            (1, 'Très satisfait(e)'), (2, 'Assez satisfait(e)'),
            (3, 'Pas très satisfait(e)'), (4, 'Pas du tout satisfait(e)'),
            (8, 'Ne sais pas'), (9, 'Pas de réponse'),
        ]
    ),
    'Q37': (
        "Selon vous, laquelle des institutions suivantes POSSÈDE le plus d'influence sur "
        'la façon dont le Québec est gouverné?',
        [
            (1, 'L’Assemblée nationale du Québec'), (2, 'Le Parlement du Canada'),
            (8, 'Ne sais pas'), (9, 'Pas de réponse'),
        ]
    ),
    'Q38': (
        'Et selon vous, laquelle des institutions suivantes DEVRAIT avoir le plus '
        "d'influence sur la façon dont le Québec est gouverné?",
        [
            (1, 'L’Assemblée nationale du Québec'), (2, 'Le Parlement du Canada'),
            (8, 'Ne sais pas'), (9, 'Pas de réponse'),
        ]
    ),
    'Q4': (
        'Selon vous, quelle est la différence principale entre les Québécois et les gens '
        'du reste du Canada?',
        [
            (1, 'Langue'), (2, 'Religion'), (3, 'Culture'), (4, 'Valeurs'),
            (5, 'Histoire'),
            (7, 'Il n’y a pas de différence importante entre les deux groupes'),
            (8, 'Ne sais pas'), (9, 'Pas de réponse'),
        ]
    ),
    'Q41': (
        "Qui se préoccupe le plus des soucis et besoins du peuple québécois: l'Assemblée "
        'nationale du Québec ou le Parlement du Canada?',
        [
            (1, 'L’Assemblée nationale du Québec'), (2, 'Le Parlement du Canada'),
            (8, 'Ne sais pas'), (9, 'Pas de réponse'),
        ]
    ),
    'Q42': (
        'Dans quelle mesure faites-vous confiance au Parlement du Canada pour défendre '
        'les intérêts à long terme du Québec?',
        [
            (1, 'Beaucoup'), (2, 'Un peu'), (3, 'Assez peu'), (4, 'Pas du tout'),
            (8, 'Ne sais pas'), (9, 'Pas de réponse'),
        ]
    ),
    'Q43': (
        "Et dans quelle mesure faites-vous confiance à l'Assemblée nationale du Québec "
        'pour défendre les intérêts à long terme du Québec?',
        [
            (1, 'Beaucoup'), (2, 'Un peu'), (3, 'Assez peu'), (4, 'Pas du tout'),
            (8, 'Ne sais pas'), (9, 'Pas de réponse'),
        ]
    ),
    'Q44': (
        "Diriez-vous qu'en comparaison avec le reste du Canada, le Québec reçoit sa "
        'juste part des dépenses publiques, plus que sa juste part, ou moins que sa '
        'juste part?',
        [
            (1, 'Le Québec reçoit sa juste part'),
            (2, 'Le Québec reçoit plus que sa juste part'),
            (3, 'Le Québec reçoit moins que sa juste part'), (8, 'Ne sais pas'),
            (9, 'Pas de réponse'),
        ]
    ),
    'Q45': (
        'Diriez-vous que le gouvernement canadien intervient trop dans les affaires de '
        "l'Assemblée nationale du Québec?",
        [
            (1, 'Fortement d’accord'), (2, 'Plutôt d’accord'),
            (3, 'Ni d’accord ni en désaccord'), (4, 'Plutôt en désaccord'),
            (5, 'Fortement en désaccord'), (8, 'Ne sais pas'), (9, 'Pas de réponse'),
        ]
    ),
    'Q47': (
        'Avez-vous voté lors du référendum de 1995 sur la souveraineté du Québec?',
        [
            (1, 'Oui'), (2, 'Non'), (9, 'Pas de réponse'),
        ]
    ),
    'Q48': (
        'Pour quelle option avez-vous voté?',
        [
            (1, 'Oui'), (2, 'Non'), (9, 'Pas de réponse'),
        ]
    ),
    'Q5': (
        "Dans quelle mesure la langue française est-elle importante pour l'identité "
        'québécoise?',
        [
            (1, 'Très importante'), (2, 'Plutôt importante'), (3, 'Pas très importante'),
            (4, 'Pas du tout importante'), (8, 'Ne sais pas'), (9, 'Pas de réponse'),
        ]
    ),
    'Q50': (
        "À quel point l'enjeu de l'indépendance politique du Québec est-il important "
        'pour vous, personnellement?',
        [
            (1, 'Très important'), (2, 'Plutôt important'), (3, 'Pas très important'),
            (4, 'Pas du tout important'), (8, 'Ne sais pas'), (9, 'Pas de réponse'),
        ]
    ),
    'Q51': (
        'Lequel des énoncés suivants est plus proche de votre point de vue?',
        [
            (1, 'Le Québec devrait devenir indépendant, séparé du Canada'),
            (2, 'L’Assemblée nationale du Québec devrait avoir plus de pouvoirs'),
            (3, 'On devrait laisser les choses telles qu’elles sont'),
            (4, 'L’Assemblée nationale du Québec devrait avoir moins de pouvoirs'),
            (5, 'Il ne devrait pas y avoir de gouvernement provincial au Québec'),
            (8, 'Ne sais pas'), (9, 'Pas de réponse'),
        ]
    ),
    'Q52': (
        "Si un référendum sur l'indépendance avait lieu vous demandant si vous voulez "
        'que le Québec devienne un pays indépendant, voteriez-vous OUI ou voteriez-vous '
        'NON?',
        [
            (1, 'Oui'), (2, 'Non'), (8, 'Ne sais pas'), (9, 'Pas de réponse'),
        ]
    ),
    'Q53': (
        "Et si un référendum avait lieu vous demandant si vous voulez que l'Assemblée "
        'nationale du Québec ait beaucoup plus de pouvoirs, voteriez- vous OUI ou '
        'voteriez-vous NON?',
        [
            (1, 'Oui'), (2, 'Non'), (8, 'Ne sais pas'), (9, 'Pas de réponse'),
        ]
    ),
    'Q54': (
        "Et s'il y avait un référendum avec trois options. Voteriez-vous pour: le statu "
        "quo, plus de pouvoirs pour le Québec, ou l'indépendance?",
        [
            (1, 'Statu quo'), (2, 'Plus de pouvoirs pour le Québec'), (3, 'Indépendance'),
            (8, 'Ne sais pas'), (9, 'Pas de réponse'),
        ]
    ),
    'Q55': (
        "Si vous deviez choisir entre plus de pouvoirs pour le Québec et l'indépendance, "
        'lequel préféreriez-vous?',
        [
            (1, 'Plus de pouvoirs pour le Québec'), (2, 'Indépendance'),
            (8, 'Ne sais pas'), (9, 'Pas de réponse'),
        ]
    ),
    'Q56': (
        'Si vous deviez choisir entre le statu quo et plus de pouvoirs pour le Québec, '
        'lequel préféreriez-vous?',
        [
            (1, 'Statu quo'), (2, 'Plus de pouvoirs pour le Québec'), (8, 'Ne sais pas'),
            (9, 'Pas de réponse'),
        ]
    ),
    'Q57': (
        "Si vous deviez choisir entre le statu quo et l'indépendance, lequel "
        'préféreriez-vous?',
        [
            (1, 'Statu quo'), (2, 'Indépendance'), (8, 'Ne sais pas'),
            (9, 'Pas de réponse'),
        ]
    ),
    'Q58': (
        'Quel terme préférez-vous pour décrire le Québec? Le Québec est-il...',
        [
            (1, '…une nation?'), (2, '…une province?'), (8, 'Ne sais pas'),
            (9, 'Pas de réponse'),
        ]
    ),
    'Q59': (
        "Il est important que l'Assemblée nationale du Québec ait des pouvoirs "
        'suffisants pour avoir un impact sur la qualité de vie au Québec.',
        [
            (1, 'Fortement d’accord'), (2, 'Plutôt d’accord'),
            (3, 'Ni d’accord ni en désaccord'), (4, 'Plutôt en désaccord'),
            (5, 'Fortement en désaccord'), (8, 'Ne sais pas'), (9, 'Pas de réponse'),
        ]
    ),
    'Q60': (
        'Il est important que le Québec ait une voix suffisante dans les prises de '
        'décisions au Parlement du Canada.',
        [
            (1, 'Fortement d’accord'), (2, 'Plutôt d’accord'),
            (3, 'Ni d’accord ni en désaccord'), (4, 'Plutôt en désaccord'),
            (5, 'Fortement en désaccord'), (8, 'Ne sais pas'), (9, 'Pas de réponse'),
        ]
    ),
    'Q61': (
        "Qu'est-ce qui est le plus important: que l'Assemblée nationale du Québec "
        'contrôle un nombre de domaines politiques suffisant pour avoir un impact sur la '
        'qualité de vie au Québec OU que les intérêts du Québec soient représentés dans '
        'les décisions prises au Parlement du Canada quant à la qualité de vie?',
        [
            (1,
                'Que l’Assemblée nationale contrôle un nombre de domaines politiques '
                'suffisant'),
            (2, 'Que les intérêts du Québec soient représentés au Parlement du Canada'),
            (8, 'Ne sais pas'), (9, 'Pas de réponse'),
        ]
    ),
    'Q62A': (
        'Pour chacun des domaines suivants, pensez-vous que les décisions doivent être '
        "prises par l'Assemblée nationale du Québec ou par le Parlement du Canada? / "
        'Éducation',
        [
            (1, 'Assemblée nationale du Québec'), (2, 'Parlement du Canada'),
            (6, 'Autre (spécifiez)'), (8, 'Ne sais pas'), (9, 'Pas de réponse'),
        ]
    ),
    'Q62B': (
        'Pour chacun des domaines suivants, pensez-vous que les décisions doivent être '
        "prises par l'Assemblée nationale du Québec ou par le Parlement du Canada? / "
        "Politique d'immigration",
        [
            (1, 'Assemblée nationale du Québec'), (2, 'Parlement du Canada'),
            (6, 'Autre (spécifiez)'), (8, 'Ne sais pas'), (9, 'Pas de réponse'),
        ]
    ),
    'Q62C': (
        'Pour chacun des domaines suivants, pensez-vous que les décisions doivent être '
        "prises par l'Assemblée nationale du Québec ou par le Parlement du Canada? / "
        "Protection de l'environnement",
        [
            (1, 'Assemblée nationale du Québec'), (2, 'Parlement du Canada'),
            (6, 'Autre (spécifiez)'), (8, 'Ne sais pas'), (9, 'Pas de réponse'),
        ]
    ),
    'Q62D': (
        'Pour chacun des domaines suivants, pensez-vous que les décisions doivent être '
        "prises par l'Assemblée nationale du Québec ou par le Parlement du Canada? / "
        'Politique culturelle',
        [
            (1, 'Assemblée nationale du Québec'), (2, 'Parlement du Canada'),
            (6, 'Autre (spécifiez)'), (8, 'Ne sais pas'), (9, 'Pas de réponse'),
        ]
    ),
    'Q62E': (
        'Pour chacun des domaines suivants, pensez-vous que les décisions doivent être '
        "prises par l'Assemblée nationale du Québec ou par le Parlement du Canada? / "
        'Santé',
        [
            (1, 'Assemblée nationale du Québec'), (2, 'Parlement du Canada'),
            (6, 'Autre (spécifiez)'), (8, 'Ne sais pas'), (9, 'Pas de réponse'),
        ]
    ),
    'Q62F': (
        'Pour chacun des domaines suivants, pensez-vous que les décisions doivent être '
        "prises par l'Assemblée nationale du Québec ou par le Parlement du Canada? / "
        'Défense',
        [
            (1, 'Assemblée nationale du Québec'), (2, 'Parlement du Canada'),
            (6, 'Autre (spécifiez)'), (8, 'Ne sais pas'), (9, 'Pas de réponse'),
        ]
    ),
    'Q62G': (
        'Pour chacun des domaines suivants, pensez-vous que les décisions doivent être '
        "prises par l'Assemblée nationale du Québec ou par le Parlement du Canada? / "
        'Politique monétaire',
        [
            (1, 'Assemblée nationale du Québec'), (2, 'Parlement du Canada'),
            (6, 'Autre (spécifiez)'), (8, 'Ne sais pas'), (9, 'Pas de réponse'),
        ]
    ),
    'Q62H': (
        'Pour chacun des domaines suivants, pensez-vous que les décisions doivent être '
        "prises par l'Assemblée nationale du Québec ou par le Parlement du Canada? / "
        'Politique économique',
        [
            (1, 'Assemblée nationale du Québec'), (2, 'Parlement du Canada'),
            (6, 'Autre (spécifiez)'), (8, 'Ne sais pas'), (9, 'Pas de réponse'),
        ]
    ),
    'Q62I': (
        'Pour chacun des domaines suivants, pensez-vous que les décisions doivent être '
        "prises par l'Assemblée nationale du Québec ou par le Parlement du Canada? / "
        'Affaires étrangères',
        [
            (1, 'Assemblée nationale du Québec'), (2, 'Parlement du Canada'),
            (6, 'Autre (spécifiez)'), (8, 'Ne sais pas'), (9, 'Pas de réponse'),
        ]
    ),
    'Q63': (
        "Qui a l'autorité sur la politique d'éducation au Québec? (ROTATION DES CHOIX)",
        [
            (1, 'Assemblée nationale du Québec'), (2, 'Parlement du Canada'),
            (8, 'Ne sais pas'), (9, 'Pas de réponse'),
        ]
    ),
    'Q64': (
        'Qui est le chef de la Coalition avenir Québec?',
        [
            (1, 'François Legault'), (2, 'F. Legault'), (3, 'Legault'),
            (4, 'André/ Claude/ Benoît/ Paul/ Jacques/ Jean-François Legau'),
            (98, 'Ne sais pas'), (99, 'Pas de réponse'),
        ]
    ),
    'Q65': (
        'Quel est le nom de votre circonscription au niveau fédéral?',
        [
            (1, 'Abitibi-Témiscamingue'), (2, 'Ahuntsic'), (3, 'Alfred-Pellan'),
            (4, 'Argenteuil-Papineau-Mirabel'), (5, 'Beauce'),
            (6, 'Beauharnois-Salaberry'), (7, 'Beauport-Limoilou'),
            (8, 'Berthier-Maskinongé'), (9, 'Bourassa'), (10, 'Brome-Missisquoi'),
            (11, 'Brossard-La Prairie'), (12, 'Chambly-Borduas'),
            (13, 'Charlesbourg-Haute-Saint-Charles'),
            (14, 'Montmorency-Charlevoix-Haute-Côte-Nord'),
            (15, 'Châteauguay-Saint-Constant'), (16, 'Chicoutimi-Le Fjord'),
            (17, 'Compton-Stanstead'), (18, 'Drummond'),
            (19, 'Gaspésie–Îles-de-la-Madeleine'), (20, 'Gatineau'), (21, 'Hochelaga'),
            (22, 'Honoré-Mercier'), (23, 'Hull–Aylmer'), (24, 'Jeanne-Le Ber'),
            (25, 'Joliette'), (26, 'Jonquière-Alma'), (27, 'Lac-Saint-Louis'),
            (28, "La Pointe-de-l'Île"), (29, 'LaSalle-Émard'),
            (30, 'Laurentides-Labelle'), (31, 'Laurier-Sainte-Marie'), (32, 'Laval'),
            (33, 'Laval-Les Îles'), (34, 'Lévis-Bellechasse'),
            (35, 'Longueuil-Pierre-Boucher'), (36, 'Lotbinière-Chutes-de-la-Chaudière'),
            (37, 'Louis-Hébert'), (38, 'Louis-Saint-Laurent'), (39, 'Manicouagan'),
            (40, 'Marc-Aurèle-Fortin'), (41, 'Haute-Gaspésie-La Mitis-Matane-Matapédia'),
            (42, "Mégantic-L'Érable"), (43, 'Montcalm'), (44, 'Mont-Royal'),
            (45, 'Notre-Dame-de-Grâce-Lachine'), (46, 'Abitibi-Baie-James-Nunavik-Eeyou'),
            (47, 'Outremont'), (48, 'Papineau'), (49, 'Pierrefonds-Dollard'),
            (50, 'Pontiac'), (51, 'Portneuf-Jacques-Cartier'), (52, 'Québec'),
            (53, 'Repentigny'), (54, 'Bas-Richelieu-Nicolet-Bécancour'),
            (55, 'Richmond-Arthabaska'),
            (56, 'Rimouski-Neigette-Témiscouata-Les Basques'),
            (57, 'Rivière-des-Mille-Îles'),
            (58, "Montmagny-L'Islet-Kamouraska-Rivière-du-Loup"), (59, 'Rivière-du-Nord'),
            (60, 'Roberval-Lac-Saint-Jean'), (61, 'Rosemont-La Petite-Patrie'),
            (62, 'Saint-Bruno-Saint-Hubert'), (63, 'Saint-Hyacinthe-Bagot'),
            (64, 'Saint-Jean'), (65, 'Saint-Lambert'), (66, 'Saint-Laurent-Cartierville'),
            (67, 'Saint-Léonard-Saint-Michel'), (68, 'Saint-Maurice-Champlain'),
            (69, 'Shefford'), (70, 'Sherbrooke'), (71, 'Terrebonne-Blainville'),
            (72, 'Trois-Rivières'), (73, 'Vaudreuil-Soulanges'),
            (74, 'Verchères-Les Patriotes'), (75, 'Westmount-Ville-Marie'),
            (98, 'Ne sais pas'), (99, 'Pas de réponse'),
        ]
    ),
    'Q66': (
        "Combien de députés y a-t-il à l'Assemblée nationale du Québec?",
        [
            (998, 'Ne sais pas'), (999, 'Pas de réponse'),
        ]
    ),
    'Q67': (
        'Quel est votre intérêt pour la politique en général? Êtes-vous:',
        [
            (1, 'Très intéressé(e)'), (2, 'Plutôt intéressé(e)'),
            (3, 'Pas très intéressé(e)'), (4, 'Pas du tout intéressé(e)'),
            (8, 'Ne sais pas'), (9, 'Pas de réponse'),
        ]
    ),
    'Q68': (
        "Sur une échelle de ZERO à CENT, où zéro veut dire que vous N'AIMEZ VRAIMENT PAS "
        "DU TOUT un politicien, et cent veut dire que vous L'AIMEZ VRAIMENT BEAUCOUP, "
        'que pensez-vous de JEAN CHAREST?',
        [
            (997, 'Ne le connaît pas'),
            (998, 'Ne sais pas / Ne sais pas comment l’évaluer'), (999, 'Pas de réponse'),
        ]
    ),
    'Q68B': (
        'Sur la même échelle, que pensez-vous de PAULINE MAROIS?',
        [
            (997, 'Ne la connaît pas'),
            (998, 'Ne sais pas / Ne sais pas comment l’évaluer'), (999, 'Pas de réponse'),
        ]
    ),
    'Q68C': (
        'Sur la même échelle, que pensez-vous de FRANÇOIS LEGAULT?',
        [
            (997, 'Ne le connaît pas'),
            (998, 'Ne sais pas / Ne sais pas comment l’évaluer'), (999, 'Pas de réponse'),
        ]
    ),
    'Q68D': (
        'Sur la même échelle, que pensez-vous de AMIR KHADIR?',
        [
            (997, 'Ne le connaît pas'),
            (998, 'Ne sais pas / Ne sais pas comment l’évaluer'), (999, 'Pas de réponse'),
        ]
    ),
    'Q68E': (
        'Sur la même échelle, que pensez-vous de JEAN-MARTIN AUSSANT?',
        [
            (997, 'Ne le connaît pas'),
            (998, 'Ne sais pas / Ne sais pas comment l’évaluer'), (999, 'Pas de réponse'),
        ]
    ),
    'Q68F': (
        'Sur la même échelle, que pensez-vous de CLAUDE SABOURIN?',
        [
            (997, 'Ne le connaît pas'),
            (998, 'Ne sais pas / Ne sais pas comment l’évaluer'), (999, 'Pas de réponse'),
        ]
    ),
    'Q69': (
        'Sur la même échelle, que pensez-vous de STEPHEN HARPER?',
        [
            (997, 'Ne le connaît pas'),
            (998, 'Ne sais pas / Ne sais pas comment l’évaluer'), (999, 'Pas de réponse'),
        ]
    ),
    'Q69B': (
        'Sur la même échelle, que pensez-vous des SYNDICATS en général?',
        [
            (998, 'Ne sais pas / Ne sais pas comment les évaluer'),
            (999, 'Pas de réponse'),
        ]
    ),
    'Q69C': (
        'Et sur la même échelle, que pensez-vous des ENTREPRISES en général?',
        [
            (998, 'Ne sais pas / Ne sais pas comment les évaluer'),
            (999, 'Pas de réponse'),
        ]
    ),
    'Q69D': (
        'Selon vous, lequel des chefs de parti est le plus compétent? (ROTATION DES '
        'CHOIX)',
        [
            (1, 'Jean Charest'), (2, 'Pauline Marois'), (3, 'François Legault'),
            (4, 'Amir Khadir'), (5, 'Jean-Martin Aussant'), (6, 'Claude Sabourin'),
            (95, 'Aucun'), (97, 'Tous'), (98, 'Ne sais pas'), (99, 'Pas de réponse'),
        ]
    ),
    'Q69E': (
        'Selon vous, lequel des chefs de parti est le plus honnête? (ROTATION DES CHOIX)',
        [
            (1, 'Jean Charest'), (2, 'Pauline Marois'), (3, 'François Legault'),
            (4, 'Amir Khadir'), (5, 'Jean-Martin Aussant'), (6, 'Claude Sabourin'),
            (95, 'Aucun'), (97, 'Tous'), (98, 'Ne sais pas'), (99, 'Pas de réponse'),
        ]
    ),
    'Q69F': (
        'Selon vous, lequel des chefs de parti est le plus proche des gens? (ROTATION '
        'DES CHOIX)',
        [
            (1, 'Jean Charest'), (2, 'Pauline Marois'), (3, 'François Legault'),
            (4, 'Amir Khadir'), (5, 'Jean-Martin Aussant'), (6, 'Claude Sabourin'),
            (95, 'Aucun'), (97, 'Tous'), (98, 'Ne sais pas'), (99, 'Pas de réponse'),
        ]
    ),
    'Q7': (
        'Certaines personnes croient que les Québécois ont des valeurs et priorités qui '
        "les rendent distincts au sein du Canada. D'autres croient que les Québécois ont "
        "les mêmes valeurs et priorités que les autres Canadiens. Et d'autres se situent "
        'entre ces deux positions. Où vous situeriez-vous sur une échelle de 0 à 10, où '
        '0 veut dire que les Québécois ont des valeurs et priorités distinctes et 10 '
        'veut dire que les Québécois ont les mêmes valeurs que les autres Canadiens?',
        [
            (0, '0: Valeurs distinctes'), (1, '1'), (2, '2'), (3, '3'), (4, '4'),
            (5, '5'), (6, '6'), (7, '7'), (8, '8'), (9, '9'), (10, '10: Mêmes valeurs'),
            (98, 'Ne sais pas'), (99, 'Pas de réponse'),
        ]
    ),
    'Q70A': (
        'En politique, les gens parlent de la « gauche » et de la « droite ». Sur une '
        'échelle allant de 0 à 10, où 0 est le plus à gauche et 10 est le plus à droite, '
        'où placeriez-vous chacun des partis politiques suivants? / Parti libéral du '
        'Québec',
        [
            (0, '0: le plus à gauche'), (1, '1'), (2, '2'), (3, '3'), (4, '4'), (5, '5'),
            (6, '6'), (7, '7'), (8, '8'), (9, '9'), (10, '10: le plus à droite'),
            (98, 'Ne sais pas'), (99, 'Pas de réponse'),
        ]
    ),
    'Q70B': (
        'En politique, les gens parlent de la « gauche » et de la « droite ». Sur une '
        'échelle allant de 0 à 10, où 0 est le plus à gauche et 10 est le plus à droite, '
        'où placeriez-vous chacun des partis politiques suivants? / Parti québécois',
        [
            (0, '0: le plus à gauche'), (1, '1'), (2, '2'), (3, '3'), (4, '4'), (5, '5'),
            (6, '6'), (7, '7'), (8, '8'), (9, '9'), (10, '10: le plus à droite'),
            (98, 'Ne sais pas'), (99, 'Pas de réponse'),
        ]
    ),
    'Q70C': (
        'En politique, les gens parlent de la « gauche » et de la « droite ». Sur une '
        'échelle allant de 0 à 10, où 0 est le plus à gauche et 10 est le plus à droite, '
        'où placeriez-vous chacun des partis politiques suivants? / Coalition avenir '
        'Québec',
        [
            (0, '0: le plus à gauche'), (1, '1'), (2, '2'), (3, '3'), (4, '4'), (5, '5'),
            (6, '6'), (7, '7'), (8, '8'), (9, '9'), (10, '10: le plus à droite'),
            (98, 'Ne sais pas'), (99, 'Pas de réponse'),
        ]
    ),
    'Q70D': (
        'En politique, les gens parlent de la « gauche » et de la « droite ». Sur une '
        'échelle allant de 0 à 10, où 0 est le plus à gauche et 10 est le plus à droite, '
        'où placeriez-vous chacun des partis politiques suivants? / Québec solidaire',
        [
            (0, '0: le plus à gauche'), (1, '1'), (2, '2'), (3, '3'), (4, '4'), (5, '5'),
            (6, '6'), (7, '7'), (8, '8'), (9, '9'), (10, '10: le plus à droite'),
            (98, 'Ne sais pas'), (99, 'Pas de réponse'),
        ]
    ),
    'Q70E': (
        'En politique, les gens parlent de la « gauche » et de la « droite ». Sur une '
        'échelle allant de 0 à 10, où 0 est le plus à gauche et 10 est le plus à droite, '
        'où placeriez-vous chacun des partis politiques suivants? / Option nationale',
        [
            (0, '0: le plus à gauche'), (1, '1'), (2, '2'), (3, '3'), (4, '4'), (5, '5'),
            (6, '6'), (7, '7'), (8, '8'), (9, '9'), (10, '10: le plus à droite'),
            (98, 'Ne sais pas'), (99, 'Pas de réponse'),
        ]
    ),
    'Q70F': (
        'En politique, les gens parlent de la « gauche » et de la « droite ». Sur une '
        'échelle allant de 0 à 10, où 0 est le plus à gauche et 10 est le plus à droite, '
        'où placeriez-vous chacun des partis politiques suivants? / Parti vert du Québec',
        [
            (0, '0: le plus à gauche'), (1, '1'), (2, '2'), (3, '3'), (4, '4'), (5, '5'),
            (6, '6'), (7, '7'), (8, '8'), (9, '9'), (10, '10: le plus à droite'),
            (98, 'Ne sais pas'), (99, 'Pas de réponse'),
        ]
    ),
    'Q71': (
        'Et sur la même échelle, où vous placeriez-vous, de manière générale?',
        [
            (0, '0: le plus à gauche'), (1, '1'), (2, '2'), (3, '3'), (4, '4'), (5, '5'),
            (6, '6'), (7, '7'), (8, '8'), (9, '9'), (10, '10: le plus à droite'),
            (98, 'Ne sais pas'), (99, 'Pas de réponse'),
        ]
    ),
    'Q72': (
        "Diriez-vous que l'on peut faire confiance à la plupart des gens ou qu'on n'est "
        'jamais trop prudent dans nos relations avec les autres?',
        [
            (1, 'On peut faire confiance à la plupart des gens'),
            (2, 'On n’est jamais trop prudent dans nos relations avec les autres'),
            (8, 'Ne sais pas'), (9, 'Pas de réponse'),
        ]
    ),
    'Q73A': (
        "Veuillez indiquer si vous êtes fortement d'accord, plutôt d'accord, plutôt en "
        "désaccord, ou fortement en désaccord avec les énoncés suivants: / « C'est la "
        'responsabilité du gouvernement de garantir que les besoins fondamentaux sont '
        'satisfaits pour tous. »',
        [
            (1, "Fortement d'accord"), (2, "Plutôt d'accord"), (3, 'Plutôt en désaccord'),
            (4, 'Fortement en désaccord'), (8, 'Ne sais pas'), (9, 'Pas de réponse'),
        ]
    ),
    'Q73B': (
        "Veuillez indiquer si vous êtes fortement d'accord, plutôt d'accord, plutôt en "
        "désaccord, ou fortement en désaccord avec les énoncés suivants: / « L'Assemblée "
        'nationale du Québec ne se soucie pas beaucoup de ce que les gens comme moi '
        'pensent. »',
        [
            (1, "Fortement d'accord"), (2, "Plutôt d'accord"), (3, 'Plutôt en désaccord'),
            (4, 'Fortement en désaccord'), (8, 'Ne sais pas'), (9, 'Pas de réponse'),
        ]
    ),
    'Q73C': (
        "Veuillez indiquer si vous êtes fortement d'accord, plutôt d'accord, plutôt en "
        'désaccord, ou fortement en désaccord avec les énoncés suivants: / « Le '
        'Parlement du Canada ne se soucie pas beaucoup de ce que les gens comme moi '
        'pensent. »',
        [
            (1, "Fortement d'accord"), (2, "Plutôt d'accord"), (3, 'Plutôt en désaccord'),
            (4, 'Fortement en désaccord'), (8, 'Ne sais pas'), (9, 'Pas de réponse'),
        ]
    ),
    'Q73D': (
        "Veuillez indiquer si vous êtes fortement d'accord, plutôt d'accord, plutôt en "
        'désaccord, ou fortement en désaccord avec les énoncés suivants: / « Les gens '
        "comme moi n'ont rien à dire sur ce que fait le gouvernement provincial à "
        'Québec. »',
        [
            (1, "Fortement d'accord"), (2, "Plutôt d'accord"), (3, 'Plutôt en désaccord'),
            (4, 'Fortement en désaccord'), (8, 'Ne sais pas'), (9, 'Pas de réponse'),
        ]
    ),
    'Q73E': (
        "Veuillez indiquer si vous êtes fortement d'accord, plutôt d'accord, plutôt en "
        'désaccord, ou fortement en désaccord avec les énoncés suivants: / « Les gens '
        "comme moi n'ont rien à dire sur ce que fait le gouvernement fédéral à Ottawa. »",
        [
            (1, "Fortement d'accord"), (2, "Plutôt d'accord"), (3, 'Plutôt en désaccord'),
            (4, 'Fortement en désaccord'), (8, 'Ne sais pas'), (9, 'Pas de réponse'),
        ]
    ),
    'Q73F': (
        "Veuillez indiquer si vous êtes fortement d'accord, plutôt d'accord, plutôt en "
        'désaccord, ou fortement en désaccord avec les énoncés suivants: / « Parfois la '
        "politique et le gouvernement au niveau provincial semblent si compliqués qu'une "
        'personne comme moi ne peut pas comprendre ce qui se passe. »',
        [
            (1, "Fortement d'accord"), (2, "Plutôt d'accord"), (3, 'Plutôt en désaccord'),
            (4, 'Fortement en désaccord'), (8, 'Ne sais pas'), (9, 'Pas de réponse'),
        ]
    ),
    'Q73G': (
        "Veuillez indiquer si vous êtes fortement d'accord, plutôt d'accord, plutôt en "
        'désaccord, ou fortement en désaccord avec les énoncés suivants: / « Parfois la '
        "politique et le gouvernement au niveau fédéral semblent si compliqués qu'une "
        'personne comme moi ne peut pas comprendre ce qui se passe. »',
        [
            (1, "Fortement d'accord"), (2, "Plutôt d'accord"), (3, 'Plutôt en désaccord'),
            (4, 'Fortement en désaccord'), (8, 'Ne sais pas'), (9, 'Pas de réponse'),
        ]
    ),
    'Q74': (
        "Dans l'ensemble, êtes-vous satisfait(e) de la façon dont la démocratie "
        'fonctionne au Québec? Êtes-vous:',
        [
            (1, 'Très satisfait(e)'), (2, 'Assez satisfait(e)'),
            (3, 'Pas très satisfait(e)'), (4, 'Pas du tout satisfait(e)'),
            (8, 'Ne sais pas'), (9, 'Pas de réponse'),
        ]
    ),
    'Q75': (
        "Voici quelques objectifs pour le Québec. Pourriez-vous me dire lequel d'après "
        'vous est le plus important?',
        [
            (1, 'Maintenir l’ordre dans la nation'),
            (2,
                'Donner plus de voix aux citoyens dans les décisions politiques '
                'importantes'),
            (3, 'Combattre l’augmentation des prix'),
            (4, 'Protéger la liberté d’expression'), (8, 'Ne sais pas'),
            (9, 'Pas de réponse'),
        ]
    ),
    'Q76': (
        'Et lequel est le deuxième plus important?',
        [
            (1, 'Maintenir l’ordre dans la nation'),
            (2,
                'Donner plus de voix aux citoyens dans les décisions politiques '
                'importantes'),
            (3, 'Combattre l’augmentation des prix'),
            (4, 'Protéger la liberté d’expression'), (8, 'Ne sais pas'),
            (9, 'Pas de réponse'),
        ]
    ),
    'Q77A': (
        "Veuillez indiquer si vous êtes fortement d'accord, plutôt d'accord, plutôt en "
        'désaccord, ou fortement en désaccord avec les énoncés suivants: / « Notre '
        "société doit faire tout ce qui est nécessaire pour s'assurer que chacun ait une "
        'chance égale de réussir. »',
        [
            (1, "Fortement d'accord"), (2, "Plutôt d'accord"), (3, 'Plutôt en désaccord'),
            (4, 'Fortement en désaccord'), (8, 'Ne sais pas'), (9, 'Pas de réponse'),
        ]
    ),
    'Q77B': (
        "Veuillez indiquer si vous êtes fortement d'accord, plutôt d'accord, plutôt en "
        "désaccord, ou fortement en désaccord avec les énoncés suivants: / « Ce n'est "
        "pas si grave si certaines personnes ont plus de chance que d'autres dans la "
        'vie. »',
        [
            (1, "Fortement d'accord"), (2, "Plutôt d'accord"), (3, 'Plutôt en désaccord'),
            (4, 'Fortement en désaccord'), (8, 'Ne sais pas'), (9, 'Pas de réponse'),
        ]
    ),
    'Q77C': (
        "Veuillez indiquer si vous êtes fortement d'accord, plutôt d'accord, plutôt en "
        'désaccord, ou fortement en désaccord avec les énoncés suivants: / « Sans '
        "l'action du gouvernement, il y aurait beaucoup plus de pauvreté dans nos "
        'sociétés. »',
        [
            (1, "Fortement d'accord"), (2, "Plutôt d'accord"), (3, 'Plutôt en désaccord'),
            (4, 'Fortement en désaccord'), (8, 'Ne sais pas'), (9, 'Pas de réponse'),
        ]
    ),
    'Q77D': (
        "Veuillez indiquer si vous êtes fortement d'accord, plutôt d'accord, plutôt en "
        'désaccord, ou fortement en désaccord avec les énoncés suivants: / « Quand les '
        "entreprises font beaucoup d'argent, tout le monde y gagne, y compris les "
        'pauvres. »',
        [
            (1, "Fortement d'accord"), (2, "Plutôt d'accord"), (3, 'Plutôt en désaccord'),
            (4, 'Fortement en désaccord'), (8, 'Ne sais pas'), (9, 'Pas de réponse'),
        ]
    ),
    'Q77E': (
        "Veuillez indiquer si vous êtes fortement d'accord, plutôt d'accord, plutôt en "
        'désaccord, ou fortement en désaccord avec les énoncés suivants: / « Il y a trop '
        "d'immigrants au Québec. »",
        [
            (1, "Fortement d'accord"), (2, "Plutôt d'accord"), (3, 'Plutôt en désaccord'),
            (4, 'Fortement en désaccord'), (8, 'Ne sais pas'), (9, 'Pas de réponse'),
        ]
    ),
    'Q78': (
        "L'avortement devrait-il être illégal?",
        [
            (1, 'Oui'), (2, 'Non'), (8, 'Ne sais pas'), (9, 'Pas de réponse'),
        ]
    ),
    'Q79': (
        'Êtes-vous pour ou contre le mariage entre personnes de même sexe?',
        [
            (1, 'Pour'), (2, 'Contre'), (8, 'Ne sais pas'), (9, 'Pas de réponse'),
        ]
    ),
    'Q8': (
        'Dans quelle mesure est-il important pour vous de voter lors des élections '
        'provinciales?',
        [
            (1, 'Très important'), (2, 'Plutôt important'), (3, 'Pas très important'),
            (4, 'Pas du tout important'), (8, 'Ne sais pas'), (9, 'Pas de réponse'),
        ]
    ),
    'Q80': (
        'Êtes-vous pour ou contre la peine de mort?',
        [
            (1, 'Pour'), (2, 'Contre'), (8, 'Ne sais pas'), (9, 'Pas de réponse'),
        ]
    ),
    'Q81': (
        "Certaines personnes disent que les gouvernements devraient s'assurer que chaque "
        "personne ait un emploi et une bonne qualité de vie. D'autres personnes disent "
        'que les gouvernements devraient plutôt laisser chaque personne se débrouiller '
        "par elle-même. Et d'autres personnes ont une opinion entre ces deux positions. "
        "Où vous situez-vous sur l'échelle ci- dessous?",
        [
            (1,
                '1: Les gouvernements devraient s’assurer que chaque personne a un '
                'emploi et une bonne qualité de vie'),
            (2, '2'), (3, '3'), (4, '4'),
            (5,
                '5: Les gouvernements devraient laisser chaque personne se débrouiller '
                'par elle-même'),
            (8, 'Ne sais pas'), (9, 'Pas de réponse'),
        ]
    ),
    'Q82': (
        "Il existe des opinions différentes à propos de ceux qui viennent de l'extérieur "
        'du Québec, qui apportent souvent avec eux leurs propres coutumes, religions et '
        "traditions. Croyez-vous qu'il vaut mieux que ces nouveaux arrivants essaient de "
        "s'adapter et de s'intégrer à la culture locale? Ou vaut-il mieux qu'ils restent "
        "différents et qu'ils contribuent à la diversité des coutumes et traditions "
        'locales?',
        [
            (1, 'Les nouveaux arrivants devraient s’adapter et s’intégrer'),
            (2,
                'Les nouveaux arrivants devraient rester différents et contribuer à la '
                'diversité des coutumes et traditions'),
            (8, 'Ne sais pas'), (9, 'Pas de réponse'),
        ]
    ),
    'Q82B': (
        'Concernant la hausse des droits de scolarité proposée par le gouvernement le '
        "printemps dernier, diriez-vous que vous êtes fortement d'accord avec cette "
        "hausse, plutôt d'accord, plutôt en désaccord ou fortement en désaccord?",
        [
            (1, 'Fortement d’accord'), (2, 'Plutôt d’accord'), (3, 'Plutôt en désaccord'),
            (4, 'Fortement en désaccord'), (8, 'Ne sais pas'), (9, 'Refus'),
        ]
    ),
    'Q82C': (
        "Concernant l'adoption de la Loi 78 par le gouvernement le printemps dernier, "
        "diriez-vous que vous êtes fortement d'accord avec cette loi, plutôt d'accord, "
        'plutôt en désaccord ou fortement en désaccord?',
        [
            (1, 'Fortement d’accord'), (2, 'Plutôt d’accord'), (3, 'Plutôt en désaccord'),
            (4, 'Fortement en désaccord'), (8, 'Ne sais pas'), (9, 'Refus'),
        ]
    ),
    'Q82D_M1': (
        'Le printemps dernier, avez-vous à un moment ou à un autre posé une des actions '
        "suivantes (cliquez pour chacune qui s'applique à votre cas) :",
        [
            (1, 'Porté un carré rouge'),
            (2, 'Participé à une grande manifestation du 22 (mars, avril, mai, etc.)'),
            (3, 'Participé à une manifestation de casseroles'),
            (4, 'Participé à une manifestation étudiante nocturne'),
            (5,
                'Utilisé les médias sociaux pour exprimer votre mécontentement '
                'concernant la hausse/Loi 78/gouvernement Charest'),
            (7, 'Aucune de ces actions'), (9, 'Refus'),
        ]
    ),
    'Q82D_M2': (
        'Le printemps dernier, avez-vous à un moment ou à un autre posé une des actions '
        "suivantes (cliquez pour chacune qui s'applique à votre cas) :",
        [
            (1, 'Porté un carré rouge'),
            (2, 'Participé à une grande manifestation du 22 (mars, avril, mai, etc.)'),
            (3, 'Participé à une manifestation de casseroles'),
            (4, 'Participé à une manifestation étudiante nocturne'),
            (5,
                'Utilisé les médias sociaux pour exprimer votre mécontentement '
                'concernant la hausse/Loi 78/gouvernement Charest'),
            (7, 'Aucune de ces actions'), (9, 'Refus'),
        ]
    ),
    'Q82D_M3': (
        'Le printemps dernier, avez-vous à un moment ou à un autre posé une des actions '
        "suivantes (cliquez pour chacune qui s'applique à votre cas) :",
        [
            (1, 'Porté un carré rouge'),
            (2, 'Participé à une grande manifestation du 22 (mars, avril, mai, etc.)'),
            (3, 'Participé à une manifestation de casseroles'),
            (4, 'Participé à une manifestation étudiante nocturne'),
            (5,
                'Utilisé les médias sociaux pour exprimer votre mécontentement '
                'concernant la hausse/Loi 78/gouvernement Charest'),
            (7, 'Aucune de ces actions'), (9, 'Refus'),
        ]
    ),
    'Q82D_M4': (
        'Le printemps dernier, avez-vous à un moment ou à un autre posé une des actions '
        "suivantes (cliquez pour chacune qui s'applique à votre cas) :",
        [
            (1, 'Porté un carré rouge'),
            (2, 'Participé à une grande manifestation du 22 (mars, avril, mai, etc.)'),
            (3, 'Participé à une manifestation de casseroles'),
            (4, 'Participé à une manifestation étudiante nocturne'),
            (5,
                'Utilisé les médias sociaux pour exprimer votre mécontentement '
                'concernant la hausse/Loi 78/gouvernement Charest'),
            (7, 'Aucune de ces actions'), (9, 'Refus'),
        ]
    ),
    'Q82D_M5': (
        'Le printemps dernier, avez-vous à un moment ou à un autre posé une des actions '
        "suivantes (cliquez pour chacune qui s'applique à votre cas) :",
        [
            (1, 'Porté un carré rouge'),
            (2, 'Participé à une grande manifestation du 22 (mars, avril, mai, etc.)'),
            (3, 'Participé à une manifestation de casseroles'),
            (4, 'Participé à une manifestation étudiante nocturne'),
            (5,
                'Utilisé les médias sociaux pour exprimer votre mécontentement '
                'concernant la hausse/Loi 78/gouvernement Charest'),
            (7, 'Aucune de ces actions'), (9, 'Refus'),
        ]
    ),
    'Q82E': (
        '\\[Si au moins une participation mentionnée à Q82d\\] Quelle était la raison '
        'principale pour laquelle vous avez manifesté?',
        [
            (1, 'Pour vous opposer à la hausse des droits de scolarité'),
            (2, 'Pour vous opposer à l’adoption de la Loi 78'),
            (3, 'Pour vous opposer à une autre politique du gouvernement'),
            (4, 'Pour vous opposer au gouvernement Charest en général'),
            (96, 'Pour une autre raison: spécifiez'), (98, 'Ne sais pas'), (99, 'Refus'),
        ]
    ),
    'Q83': (
        'Si vous comparez la situation économique au Québec avec le reste du Canada, '
        'pensez-vous que la situation est meilleure au Québec, pire ou la même?',
        [
            (1, 'Meilleure'), (2, 'Pire'), (3, 'La même'), (8, 'Ne sais pas'),
            (9, 'Pas de réponse'),
        ]
    ),
    'Q84': (
        'Si le Québec devenait un pays indépendant, croyez-vous que la situation '
        "économique au Québec s'améliorerait, se détériorerait ou resterait à peu près "
        'la même?',
        [
            (1, 'S’améliorerait'), (2, 'Se détériorerait'),
            (3, 'Resterait à peu près la même'), (8, 'Ne sais pas'),
            (9, 'Pas de réponse'),
        ]
    ),
    'Q85': (
        'Et si le Québec devenait un pays indépendant, croyez-vous que votre situation '
        "financière personnelle s'améliorerait, se détériorerait ou resterait à peu près "
        'la même?',
        [
            (1, 'S’améliorerait'), (2, 'Se détériorerait'),
            (3, 'Resterait à peu près la même'), (8, 'Ne sais pas'),
            (9, 'Pas de réponse'),
        ]
    ),
    'Q87': (
        "Si le Québec devenait un pays indépendant, croyez-vous qu'il devrait garder le "
        'dollar canadien ou utiliser sa propre devise monétaire?',
        [
            (1, 'Garder le dollar canadien'), (2, 'Utiliser sa propre devise monétaire'),
            (8, 'Ne sais pas'), (9, 'Pas de réponse'),
        ]
    ),
    'Q88': (
        'En général, diriez-vous que faire partie du Canada est très positif, plutôt '
        "positif, plutôt négatif ou très négatif pour l'économie du Québec?",
        [
            (1, 'Très positif'), (2, 'Plutôt positif'), (3, 'Plutôt négatif'),
            (4, 'Très négatif'), (8, 'Ne sais pas'), (9, 'Pas de réponse'),
        ]
    ),
    'Q89': (
        "Certaines personnes croient qu'il est mieux pour un pays de faire partie d'un "
        'plus grand marché, même si cela veut dire perdre une partie de sa souveraineté. '
        "D'autres croient qu'il est mieux pour un pays de garder sa souveraineté, même "
        "si cela veut dire faire partie d'un plus petit marché. Et d'autres se situent "
        'entre ces deux positions. Où vous situeriez-vous, sur une échelle de 0 à 10, où '
        '0 veut dire que vous préférez un plus grand marché avec moins de souveraineté '
        'et 10 veut dire que vous préférez plus de souveraineté et un plus petit marché?',
        [
            (0, '0: un plus grand marché avec moins de souveraineté'), (1, '1'), (2, '2'),
            (3, '3'), (4, '4'), (5, '5'), (6, '6'), (7, '7'), (8, '8'), (9, '9'),
            (10, '10: plus de souveraineté avec un plus petit marché'),
            (98, 'Ne sais pas'), (99, 'Pas de réponse'),
        ]
    ),
    'Q9': (
        'Dans quelle mesure est-il important pour vous de voter lors des élections '
        'fédérales?',
        [
            (1, 'Très important'), (2, 'Plutôt important'), (3, 'Pas très important'),
            (4, 'Pas du tout important'), (8, 'Ne sais pas'), (9, 'Pas de réponse'),
        ]
    ),
    'Q90': (
        "Dans l'avenir, quelle serait la meilleure option pour l'économie du Québec: "
        'renforcer ses relations avec le reste du Canada ou renforcer ses relations avec '
        'les États-Unis?',
        [
            (1, 'Renforcer ses relations avec le reste du Canada'),
            (2, 'Renforcer ses relations avec les États-Unis'), (8, 'Ne sais pas'),
            (9, 'Pas de réponse'),
        ]
    ),
    'Q91': (
        "Selon vous, l'économie du Québec s'est-elle améliorée, détériorée ou est-elle "
        'restée à peu près la même depuis un an?',
        [
            (1, 'S’est améliorée'), (2, 'S’est détériorée'),
            (3, 'Restée à peu près le même'), (8, 'Ne sais pas'), (9, 'Pas de réponse'),
        ]
    ),
    'Q92': (
        'En politique provinciale, vous considérez-vous habituellement comme un...? '
        '(ROTATION DES CHOIX)',
        [
            (1, 'Libéral'), (2, 'Péquiste'), (3, 'Caquiste'), (4, 'Solidaire'),
            (5, 'Oniste'), (6, 'Vert'), (97, 'Rien de cela'), (98, 'Ne sais pas'),
            (99, 'Pas de réponse'),
        ]
    ),
    'Q93': (
        'Vous sentez-vous très fortement \\[insérer réponse de Q92\\], assez fortement, '
        'ou pas très fortement?',
        [
            (1, 'Très fortement'), (2, 'Assez fortement'), (3, 'Pas très fortement'),
            (8, 'Ne sais pas'), (9, 'Pas de réponse'),
        ]
    ),
    'Q94': (
        'En politique fédérale, vous considérez-vous habituellement comme un...? '
        '(ROTATION DES CHOIX)',
        [
            (1, 'Libéral'), (2, 'Conservateur'), (3, 'NPD'), (4, 'Bloquiste'),
            (5, 'Vert'), (97, 'Rien de cela'), (98, 'Ne sais pas'),
            (99, 'Pas de réponse'),
        ]
    ),
    'Q95': (
        'Vous sentez-vous très fortement \\[insérer réponse de Q94\\], assez fortement, '
        'ou pas très fortement?',
        [
            (1, 'Très fortement'), (2, 'Assez fortement'), (3, 'Pas très fortement'),
            (8, 'Ne sais pas'), (9, 'Pas de réponse'),
        ]
    ),
    'Q96': (
        'Finalement, croyez-vous que le Québec sera un pays indépendant un jour?',
        [
            (1, 'Oui'), (2, 'Non'), (8, 'Ne sais pas'), (9, 'Pas de réponse'),
        ]
    ),
    'REVEN': (
        "Et maintenant le revenu total de votre ménage avant impôts pour l'année 2011. "
        "Ceci inclut les revenus de toutes les sources telles l'épargne, les pensions, "
        'les loyers, en plus des salaires. Était-ce:',
        [
            (1, 'Moins de 8 000$'), (2, '8 000$ - 15 999$'), (3, '16 000$ - 23 999$'),
            (4, '24 000$ - 39 999$'), (5, '40 000$ - 55 999$'), (6, '56 000$ - 71 999$'),
            (7, '72 000$ - 87 999$'), (8, '88 000$ - 103 999$'), (9, '104 000$ ou plus'),
            (98, 'Ne sais pas'), (99, 'Pas de réponse'),
        ]
    ),
    'SCOL': (
        'À quel niveau se situe la dernière année de scolarité que vous avez complétée?',
        [
            (1, 'Aucune scolarité'), (2, 'Cours primaire (sans diplôme)'),
            (3, 'Cours primaire (avec diplôme)'), (4, 'Cours secondaire (sans diplôme)'),
            (5, 'Cours secondaire (avec diplôme)'), (6, 'CÉGEP (sans diplôme)'),
            (7, 'CÉGEP (avec diplôme)'), (8, 'Cours technique'),
            (9, 'Université non complétée'), (10, 'Certificat ou diplôme'),
            (11, 'Baccalauréat'), (12, 'Maîtrise ou doctorat'), (98, 'Ne sais pas'),
            (99, 'Pas de réponse'),
        ]
    ),
    'SEXE': (
        'Quel est votre sexe?',
        [
            (1, 'Masculin'), (2, 'Féminin'),
        ]
    ),
}

# ---------------------------------------------------------------------------
# Nettoyage residuel (le texte FR du .md est deja propre ; on ne fait que
# collapser les espaces multiples, au cas ou -- pas de balises SPSS ici
# puisque le texte ne vient PAS du SAV).
# ---------------------------------------------------------------------------

def _clean_text(text: str) -> str:
    return re.sub(r" {2,}", " ", text).strip()


# ---------------------------------------------------------------------------
# Fonction principale
# ---------------------------------------------------------------------------


def extract() -> dict:
    """Lit le fichier SAV pour la structure/couverture/codes, et le
    questionnaire FR (.md) pour le texte -- voir la docstring du module pour
    la justification de cette deviation validee. Aucun accès reseau, aucun
    embedding -- pure extraction de structure.
    """
    df, meta = pyreadstat.read_sav(str(SAV_FILE), apply_value_formats=False)

    questions = []
    for col in df.columns:
        if col in EXCLUDED_VARS:
            continue

        entry = QUESTION_DATA.get(col)
        if entry is None:
            # Couverture incomplete : variable ni traitee, ni exclue -- ne
            # devine rien, echoue fort pour forcer la decision humaine.
            raise RuntimeError(
                f"Variable {col!r} non couverte (ni QUESTION_DATA, ni EXCLUDED_VARS)"
            )
        question_text, options = entry
        question_text = _clean_text(question_text)
        response_options = [
            {"code": code, "label": _clean_text(label)} for code, label in options
        ]

        if is_text_column(df[col]):
            var_type = "open"
        elif col in SCALE_VARS:
            var_type = "scale"
        elif response_options:
            var_type = "single"
        else:
            var_type = "continuous"

        is_sociodemo = col in SOCIODEMO_VARS
        sociodemo_type = SOCIODEMO_VARS.get(col)

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
            "tags": ["electoral", "provincial", "québec", "2012", "eeq"],
        },
        "questions": questions,
    }
    return result


# ---------------------------------------------------------------------------
# Point d'entree CLI
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    data = extract()

    validated = SurveyFile.model_validate(data)

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

    print("\nSocio-démo flaggées :")
    for q in validated.questions:
        if q.is_sociodemo:
            print(f"  {q.variable} ({q.sociodemo_type}): {q.question_text[:80]!r}")

    print(f"\nVariables exclues ({len(EXCLUDED_VARS)}) :")
    for v in sorted(EXCLUDED_VARS):
        print(f"  {v}: {EXCLUDED_VARS[v]}")

