"""Extraction normalisée — eeq_2022.

Source : 2022 Quebec Election Study v1.dta (Stata)
         Quebec Election Study 2022 (Mahéo, Bélanger, Stephenson & Harell),
         panel DEUX VAGUES administré en ligne (Qualtrics) : préfixe `cps_`
         = Campaign Period Survey (pré-électorale, n=1521), préfixe `pes_`
         = Post-Election Survey (post-électorale, n=1220 — attrition panel
         normale, ~301 non-répondants à cette vague). Élection québécoise du
         3 octobre 2022.
         Décision (orchestrateur, 2026-08-28) : les deux vagues sont ingérées
         ENSEMBLE sous un seul `survey_id` `eeq_2022`, comme un sondage simple
         (pas de split cps/pes en deux survey_id).
         Cf. « 2022 Quebec Election Study Codebook v1-1.pdf ».

Langue : les libellés du DTA fourni sont en ANGLAIS (questionnaire bilingue,
         mais labels DTA = EN) — conservés VERBATIM, jamais traduits.

Encodage : lu avec pyreadstat.read_dta (encodage par défaut, aucune option
         requise — accents/caractères spéciaux français des noms de partis
         restitués correctement, ex. « Parti libéral du Québec »).

Libellés tronqués : Stata limite historiquement les variable labels à 80
         caractères (contrainte format .dta, pas SPSS 256c). De nombreuses
         batteries d'items (ex. `cps_intelligent_1..5`, un item par chef de
         parti) partagent donc un libellé IDENTIQUE tronqué avant le nom du
         chef — c'est le raw verbatim, on ne le complète PAS (le wording
         complet par item sera récupéré à l'étape enrichissement via le
         codebook PDF).

Particularité pyreadstat sur ce fichier : plusieurs colonnes numériques sans
         value labels (sliders 0-100, codes de routing) sont exposées en
         dtype pandas `object` (à cause du sentinel de valeur manquante -99)
         plutôt qu'un dtype numérique franc. `is_text_column` (qui teste
         `dtype == object` en repli) les aurait donc mal classées "open" à
         tort. `_is_actually_numeric` ci-dessous inspecte le CONTENU réel
         (pas seulement le dtype) pour lever cette ambiguïté avant tout appel
         à `is_text_column`.

Usage :
    uv run python ingestion/surveys/eeq_2022.py
    → écrit ingestion/normalized/eeq_2022.json
"""

from __future__ import annotations

import json
import re
from pathlib import Path

import pandas as pd
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
DATA_DIR = REPO_ROOT / "data" / "eeq_2022"
SAV_FILE = DATA_DIR / "2022 Quebec Election Study v1.dta"
OUT_FILE = REPO_ROOT / "ingestion" / "normalized" / "eeq_2022.json"

# Rail microdonnées (étape 4) : 4 colonnes de pondération existent
# (`cps_weight_general[_trimmed]`, `pes_weight_general[_trimmed]`). On retient
# cps_weight_general : couverture plein-échantillon (0 null sur 1521), alors que
# pes_weight_general a 301 nulls (attrition normale de la vague post-électorale).
WEIGHT_VAR = "cps_weight_general"

# ---------------------------------------------------------------------------
# Constantes du sondage
# ---------------------------------------------------------------------------

SURVEY_ID = "eeq_2022"
SURVEY_NAME = "Quebec Election Study 2022 (panel pré/post-électoral)"
YEAR = 2022
POLLSTER = "Mahéo, Bélanger, Stephenson & Harell (Quebec Election Study team)"
LANGUAGE = "en"

# ---------------------------------------------------------------------------
# Variables EXCLUES — administratives / techniques (raison individuelle)
# ---------------------------------------------------------------------------

EXCLUDED_META: dict[str, str] = {
    # --- Métadonnées de session Qualtrics (vague CPS) ---
    "cps_StartDate": "métadonnée Qualtrics (horodatage de début de session, technique)",
    "cps_EndDate": "métadonnée Qualtrics (horodatage de fin de session, technique)",
    "cps_Duration__in_seconds_": (
        "métadonnée Qualtrics (durée de complétion en secondes, technique)"
    ),
    "cps_time": "métadonnée Qualtrics (durée de complétion en minutes, technique)",
    "cps_RecordedDate": "métadonnée Qualtrics (horodatage d'enregistrement, technique)",
    "ResponseId": "identifiant de réponse Qualtrics (technique, commun aux 2 vagues)",
    "cps_UserLanguage": "métadonnée Qualtrics (langue d'interface du répondant, technique)",
    "cps_consent": (
        "formulaire de consentement à l'étude (administratif/éthique, "
        "pas une question analytique)"
    ),
    # --- Métadonnées de session Qualtrics (vague PES) ---
    "pes_StartDate": "métadonnée Qualtrics (horodatage de début de session, technique)",
    "pes_EndDate": "métadonnée Qualtrics (horodatage de fin de session, technique)",
    "pes_Duration__in_seconds_": (
        "métadonnée Qualtrics (durée de complétion en secondes, technique)"
    ),
    "pes_time": "métadonnée Qualtrics (durée de complétion en minutes, technique)",
    "pes_RecordedDate": "métadonnée Qualtrics (horodatage d'enregistrement, technique)",
    "pes_UserLanguage": "métadonnée Qualtrics (langue d'interface du répondant, technique)",
    "pes_consent": (
        "formulaire de consentement à l'étude (administratif/éthique, "
        "pas une question analytique)"
    ),
    # --- Minuteur de page (bloc govresp) ---
    "timer_govresp_First_Click": (
        "minuteur Qualtrics (temps de premier clic sur la page, technique)"
    ),
    "timer_govresp_Last_Click": (
        "minuteur Qualtrics (temps de dernier clic sur la page, technique)"
    ),
    "timer_govresp_Page_Submit": "minuteur Qualtrics (temps de soumission de la page, technique)",
    "timer_govresp_Click_Count": "minuteur Qualtrics (nombre de clics sur la page, technique)",
    # --- Géocodage / identifiants administratifs ---
    "pccf_problem": (
        "flag technique de géocodage postal (Postal Code Conversion File), pas une question"
    ),
    "feduid": (
        "identifiant de circonscription fédérale dérivé du code postal du répondant "
        "(géographie administrative appariée par le fournisseur, jamais posée au répondant)"
    ),
    "fedname": (
        "nom de circonscription fédérale dérivé du code postal du répondant "
        "(géographie administrative appariée par le fournisseur, jamais posée au répondant)"
    ),
    # --- Fragments de texte interne (piping Qualtrics) ---
    "pid_fr": (
        "fragment de texte interne utilisé par Qualtrics pour composer dynamiquement le "
        "libellé français d'une autre question (piping) — libellé SAV dégénéré, identique "
        "au nom de variable, valeurs = bouts de phrase ('du Parti libéral'…), pas une question"
    ),
    "fr_pid_pr": (
        "fragment de texte interne utilisé par Qualtrics pour composer dynamiquement le "
        "libellé français d'une autre question (piping) — libellé SAV dégénéré, identique "
        "au nom de variable, valeurs = bouts de phrase ('caquiste'…), pas une question"
    ),
    # --- Pondérations statistiques ---
    "cps_weight_general": "pondération statistique (vague CPS)",
    "cps_weight_general_trimmed": "pondération statistique (vague CPS, tronquée)",
    "pes_weight_general": "pondération statistique (vague PES)",
    "pes_weight_general_trimmed": "pondération statistique (vague PES, tronquée)",
}

# ---------------------------------------------------------------------------
# Variables EXCLUES — ordre d'affichage / randomisation Qualtrics ("_DO_")
# ---------------------------------------------------------------------------
# Qualtrics enregistre, pour chaque item randomisé/matrice, l'ORDRE dans
# lequel les choix ont été présentés à ce répondant ('Display Order') — une
# métadonnée de présentation, jamais une réponse substantielle. Vérifié sur
# un échantillon : les valeurs sont des rangs (1..k), les libellés SAV se
# terminent tous par « - Display Order … » ou sont des flags de randomisation
# de bloc (Spending_DO_*, Environmentalism_DO_*, FL_361_DO_*, GenderID_DO_*).
_DO_REASON = (
    "ordre d'affichage/randomisation Qualtrics ('Display Order' ou randomizer de bloc) "
    "— métadonnée de présentation, pas une réponse substantielle du répondant"
)

DISPLAY_ORDER_VARS: set[str] = {
    "Environmental_Pt2_DO_cps_jobsfis", "Environmental_Pt2_DO_cps_qc_env",
    "Environmentalism_DO_cps_qc_carbo", "Environmentalism_DO_cps_qc_energ",
    "FL_361_DO_Issues_Canada_", "FL_361_DO_Issues_Quebec_", "GenderID_DO_pes_feminine",
    "GenderID_DO_pes_masculine", "Spending_DO_cps_spendcrime",
    "Spending_DO_cps_spendedu", "Spending_DO_cps_spendenv",
    "Spending_DO_cps_spendhealth", "Spending_DO_cps_spendsocial", "cps_candtherm_DO_23",
    "cps_candtherm_DO_25", "cps_candtherm_DO_27", "cps_candtherm_DO_29",
    "cps_candtherm_DO_30", "cps_cares_DO_1", "cps_cares_DO_2", "cps_cares_DO_3",
    "cps_cares_DO_4", "cps_cares_DO_5", "cps_fedpid_DO_1", "cps_fedpid_DO_2",
    "cps_fedpid_DO_3", "cps_fedpid_DO_4", "cps_fedpid_DO_5", "cps_fedpid_DO_6",
    "cps_fedpid_DO_7", "cps_fedpid_DO_8", "cps_ideoparty_DO_1", "cps_ideoparty_DO_3",
    "cps_ideoparty_DO_5", "cps_ideoparty_DO_7", "cps_ideoparty_DO_8",
    "cps_impissue_matrix_DO_1", "cps_impissue_matrix_DO_10",
    "cps_impissue_matrix_DO_11", "cps_impissue_matrix_DO_12",
    "cps_impissue_matrix_DO_13", "cps_impissue_matrix_DO_14",
    "cps_impissue_matrix_DO_2", "cps_impissue_matrix_DO_3", "cps_impissue_matrix_DO_4",
    "cps_impissue_matrix_DO_5", "cps_impissue_matrix_DO_6", "cps_impissue_matrix_DO_7",
    "cps_impissue_matrix_DO_8", "cps_impissue_matrix_DO_9", "cps_intelligent_DO_1",
    "cps_intelligent_DO_2", "cps_intelligent_DO_3", "cps_intelligent_DO_4",
    "cps_intelligent_DO_5", "cps_leadertherm_DO_1", "cps_leadertherm_DO_2",
    "cps_leadertherm_DO_3", "cps_leadertherm_DO_7", "cps_leadertherm_DO_8",
    "cps_negativevote_DO_1", "cps_negativevote_DO_2", "cps_negativevote_DO_3",
    "cps_negativevote_DO_4", "cps_negativevote_DO_5", "cps_negativevote_DO_6",
    "cps_negativevote_DO_7", "cps_partybest_DO_1", "cps_partybest_DO_2",
    "cps_partybest_DO_3", "cps_partybest_DO_4", "cps_partybest_DO_5",
    "cps_partybest_DO_8", "cps_partybest_issues_DO_1", "cps_partybest_issues_DO_10",
    "cps_partybest_issues_DO_2", "cps_partybest_issues_DO_3",
    "cps_partybest_issues_DO_4", "cps_partybest_issues_DO_5",
    "cps_partybest_issues_DO_6", "cps_partybest_issues_DO_7",
    "cps_partybest_issues_DO_8", "cps_partybest_issues_DO_9", "cps_partytherm_DO_23",
    "cps_partytherm_DO_25", "cps_partytherm_DO_27", "cps_partytherm_DO_30",
    "cps_partytherm_DO_33", "cps_pastpartyvote_DO_1", "cps_pastpartyvote_DO_2",
    "cps_pastpartyvote_DO_3", "cps_pastpartyvote_DO_4", "cps_pastpartyvote_DO_5",
    "cps_pastpartyvote_DO_6", "cps_pastpartyvote_DO_7", "cps_provpid_DO_1",
    "cps_provpid_DO_2", "cps_provpid_DO_3", "cps_provpid_DO_4", "cps_provpid_DO_5",
    "cps_provpid_DO_6", "cps_provpid_DO_7", "cps_qc_vote_2018_DO_1",
    "cps_qc_vote_2018_DO_2", "cps_qc_vote_2018_DO_3", "cps_qc_vote_2018_DO_4",
    "cps_qc_vote_2018_DO_5", "cps_socialmedia_DO_1", "cps_socialmedia_DO_10",
    "cps_socialmedia_DO_2", "cps_socialmedia_DO_3", "cps_socialmedia_DO_4",
    "cps_socialmedia_DO_5", "cps_socialmedia_DO_6", "cps_socialmedia_DO_7",
    "cps_socialmedia_DO_8", "cps_socialmedia_DO_9", "cps_stronglead_DO_1",
    "cps_stronglead_DO_2", "cps_stronglead_DO_3", "cps_stronglead_DO_4",
    "cps_stronglead_DO_5", "cps_trustworthy_DO_74", "cps_trustworthy_DO_75",
    "cps_trustworthy_DO_76", "cps_trustworthy_DO_77", "cps_trustworthy_DO_82",
    "cps_votechoice1_DO_1", "cps_votechoice1_DO_10", "cps_votechoice1_DO_2",
    "cps_votechoice1_DO_3", "cps_votechoice1_DO_4", "cps_votechoice1_DO_5",
    "cps_votechoice1_DO_8", "cps_votechoice1_DO_9", "cps_votechoice2_DO_1",
    "cps_votechoice2_DO_10", "cps_votechoice2_DO_2", "cps_votechoice2_DO_3",
    "cps_votechoice2_DO_4", "cps_votechoice2_DO_5", "cps_votechoice2_DO_8",
    "cps_votechoice2_DO_9", "cps_votechoice3_DO_1", "cps_votechoice3_DO_2",
    "cps_votechoice3_DO_3", "cps_votechoice3_DO_4", "cps_votechoice3_DO_5",
    "cps_votechoice3_DO_6", "cps_votechoice3_DO_7", "cps_votelean_DO_1",
    "cps_votelean_DO_10", "cps_votelean_DO_2", "cps_votelean_DO_3", "cps_votelean_DO_4",
    "cps_votelean_DO_5", "cps_votelean_DO_8", "cps_votelean_DO_9",
    "cps_votesecond_DO_1", "cps_votesecond_DO_2", "cps_votesecond_DO_3",
    "cps_votesecond_DO_4", "cps_votesecond_DO_5", "cps_votesecond_DO_6",
    "cps_votesecond_DO_7", "pes_confidence_DO_1", "pes_confidence_DO_2",
    "pes_confidence_DO_3", "pes_confidence_DO_4", "pes_contactparty_DO_1",
    "pes_contactparty_DO_2", "pes_contactparty_DO_3", "pes_contactparty_DO_4",
    "pes_contactparty_DO_5", "pes_contactparty_DO_8", "pes_contactparty_DO_9",
    "pes_emb_info_DO_2", "pes_emb_info_DO_3", "pes_emb_info_DO_5", "pes_emb_info_DO_6",
    "pes_emb_info_DO_7", "pes_fedpower_DO_1", "pes_fedpower_DO_2",
    "pes_groupdiscrim_DO_1", "pes_groupdiscrim_DO_2", "pes_groupdiscrim_DO_3",
    "pes_groupdiscrim_DO_4", "pes_groupdiscrim_DO_5", "pes_groupdiscrim_DO_6",
    "pes_groupdiscrim_DO_7", "pes_groups_DO_2", "pes_groups_DO_4", "pes_groups_DO_5",
    "pes_identify_DO_1", "pes_identify_DO_2", "pes_identify_DO_3",
    "pes_identity_qc_ca_DO_1", "pes_identity_qc_ca_DO_2", "pes_identity_qc_ca_DO_3",
    "pes_identity_qc_ca_DO_4", "pes_identity_qc_ca_DO_5", "pes_identity_qc_ca_DO_6",
    "pes_participation1_DO_1", "pes_participation1_DO_2", "pes_participation1_DO_3",
    "pes_participation2_DO_1", "pes_participation2_DO_2", "pes_participation2_DO_3",
    "pes_participation2_DO_4", "pes_participation3_DO_1", "pes_participation3_DO_2",
    "pes_participation3_DO_3", "pes_participation3_DO_4", "pes_participation3_DO_5",
    "pes_participation3_DO_6", "pes_q8_DO_1", "pes_q8_DO_4", "pes_q8_DO_5",
    "pes_q8_DO_6", "pes_q8_DO_7", "pes_q8_DO_8", "pes_q8_DO_9",
    "pes_qc_priorities2_DO_1", "pes_qc_priorities2_DO_2", "pes_qc_priorities2_DO_3",
    "pes_qc_priorities2_DO_4", "pes_qc_priorities2_DO_5", "pes_qc_priorities2_DO_6",
    "pes_qc_priorities2_DO_7", "pes_qc_priorities2_DO_8", "pes_trust_DO_1",
    "pes_trust_DO_2", "pes_votechoice_DO_1", "pes_votechoice_DO_2",
    "pes_votechoice_DO_3", "pes_votechoice_DO_4", "pes_votechoice_DO_5",
    "pes_votechoice_DO_6", "pes_votechoice_DO_7",
}

# ---------------------------------------------------------------------------
# Variables EXCLUES — texte libre "autre, précisez" accessoire ("_TEXT")
# ---------------------------------------------------------------------------
# Chaque variable `*_TEXT` est la boîte de texte libre associée à un choix
# "Autre (précisez)" déjà présent parmi les options d'une question fermée
# déjà couverte (ex. `cps_genderid_4_TEXT` = case "Another gender, please
# specify" de `cps_genderid`). Sans value labels, pas de libellé de question
# autonome distinct de la question fermée parente — vérifié individuellement
# sur les 29 colonnes (aucune n'est une question ouverte substantielle
# autonome ; à distinguer de `pes_mostimpissue`/`pes_whymail`, deux VRAIES
# questions ouvertes conservées ci-dessous, qui ne portent PAS le suffixe
# `_TEXT`).
_TEXT_ACCESSORY_REASON = (
    "texte libre 'autre, précisez' accessoire d'un choix déjà présent dans une question "
    "fermée déjà couverte par ailleurs — sans value labels, pas de libellé de question "
    "autonome"
)

TEXT_ACCESSORY_VARS: set[str] = {
    "cps_fedpid_5_TEXT", "cps_genderid_4_TEXT", "cps_lang_3_TEXT",
    "cps_negativevote_5_TEXT", "cps_partybest_8_TEXT", "cps_pastpartyvote_5_TEXT",
    "cps_provpid_5_TEXT", "cps_qc_vote_2018_5_TEXT", "cps_religion_22_TEXT",
    "cps_socialmedia_9_TEXT", "cps_votechoice1_8_TEXT", "cps_votechoice2_8_TEXT",
    "cps_votechoice3_5_TEXT", "cps_votelean_8_TEXT", "cps_votesecond_5_TEXT",
    "pes_contactparty_8_TEXT", "pes_covid_employ2_5_TEXT", "pes_emb_registerhow_4_TEXT",
    "pes_emb_voteinfo_14_TEXT", "pes_employed_12_TEXT", "pes_langhome_17_TEXT",
    "pes_langhome_3_TEXT", "pes_maildifficult_11_TEXT", "pes_orientation_4_TEXT",
    "pes_q8_7_TEXT", "pes_qc_priorities2_8_TEXT", "pes_race_13_TEXT",
    "pes_reasonnotvote_17_TEXT", "pes_votechoice_5_TEXT",
}

EXCLUDED_VARS: dict[str, str] = {
    **EXCLUDED_META,
    **{v: _DO_REASON for v in DISPLAY_ORDER_VARS},
    **{v: _TEXT_ACCESSORY_REASON for v in TEXT_ACCESSORY_VARS},
}

# ---------------------------------------------------------------------------
# Variables "scale" — batteries ordinales (accord/désaccord, fréquence,
# satisfaction, importance, durée…) identifiées en regroupant les variables
# qui partagent EXACTEMENT le même jeu de value labels ordonné (ex. 'Strongly
# disagree'..'Strongly agree'). Vérifié par inspection des groupes récurrents
# sur les 718 variables du DTA.
# ---------------------------------------------------------------------------

SCALE_VARS: set[str] = {
    "cps_can_attach", "cps_cares_1", "cps_cares_2", "cps_cares_3", "cps_cares_4",
    "cps_cares_5", "cps_complicated", "cps_covid_handle_1", "cps_covid_handle_2",
    "cps_covid_handle_3", "cps_covid_votecomf1", "cps_covid_votecomf2",
    "cps_covid_votecomf3", "cps_fedpidstr", "cps_govperf_1", "cps_govperf_2",
    "cps_govperf_3", "cps_govperf_4", "cps_intelligent_1", "cps_intelligent_2",
    "cps_intelligent_3", "cps_intelligent_4", "cps_intelligent_5", "cps_jobsfirst",
    "cps_nosay", "cps_ownfin", "cps_ownfinblame", "cps_provecon", "cps_proveconblame",
    "cps_province_gov_sat", "cps_provpidstr", "cps_qc_attach", "cps_qc_carbon",
    "cps_qc_energy", "cps_qc_env", "cps_satis_can", "cps_satis_prov", "cps_spendcrime",
    "cps_spendedu", "cps_spendenv", "cps_spendhealth", "cps_spendsocial",
    "cps_stronglead_1", "cps_stronglead_2", "cps_stronglead_3", "cps_stronglead_4",
    "cps_stronglead_5", "cps_trustworthy_74", "cps_trustworthy_75",
    "cps_trustworthy_76", "cps_trustworthy_77", "cps_trustworthy_82", "cps_volunteer",
    "pes_bendrules", "pes_biling", "pes_confidence_1", "pes_confidence_2",
    "pes_confidence_3", "pes_confidence_4", "pes_cultureharm", "pes_disagreefriends",
    "pes_dogays", "pes_doindigenous", "pes_dolangmin", "pes_dominorities",
    "pes_dowomen", "pes_emb_age", "pes_emb_safe", "pes_embsatisfy", "pes_equalrights",
    "pes_equalrights_qc", "pes_fallingbehind", "pes_familyvalues",
    "pes_familyvalues_qc", "pes_friendsethnic", "pes_govtcare", "pes_groupdiscrim_1",
    "pes_groupdiscrim_2", "pes_groupdiscrim_3", "pes_groupdiscrim_4",
    "pes_groupdiscrim_5", "pes_groupdiscrim_6", "pes_groupdiscrim_7", "pes_identify_1",
    "pes_identify_2", "pes_identify_3", "pes_immecon", "pes_immfitin",
    "pes_immfitin_qc", "pes_immigrantcrime", "pes_immjobs", "pes_immjobs_qc",
    "pes_livedincomm", "pes_mailrequest", "pes_mailtrust", "pes_medical",
    "pes_minoritiesadapt", "pes_nativism_1", "pes_nativism_2", "pes_nativism_3",
    "pes_nativism_4", "pes_nativism_5", "pes_nativism_6", "pes_nativism_7",
    "pes_nativism_8", "pes_nativism_9", "pes_network", "pes_newlifestyles",
    "pes_othersahead", "pes_participation1_1", "pes_participation1_2",
    "pes_participation1_3", "pes_participation2_1", "pes_participation2_2",
    "pes_participation2_3", "pes_participation2_4", "pes_participation3_1",
    "pes_participation3_2", "pes_participation3_3", "pes_participation3_4",
    "pes_participation3_5", "pes_participation3_6", "pes_peopledecide", "pes_politprob",
    "pes_pollie", "pes_privjobs", "pes_provcommon", "pes_provid_fact",
    "pes_provid_glad", "pes_provlegis_women", "pes_provlosetouch", "pes_reducegap",
    "pes_resent1", "pes_resent2", "pes_resent3", "pes_resent4", "pes_richinterests",
    "pes_stdofliving", "pes_willmajority", "pes_womenhome", "pes_yearsprov",
    "pes_zerosum",
}

# ---------------------------------------------------------------------------
# Variables "multiple" — items individuels de batteries "sélectionnez toutes
# celles qui s'appliquent" (checkbox). Chaque item porte UN SEUL value label
# (ex. {1: 'Facebook'}) qui code "cette option a été cochée" — identifiés en
# repérant les colonnes dont le dict de value labels ne contient qu'une paire
# code→label. Chacune a un libellé distinct et substantiel (nom de parti,
# plateforme, pays, langue…) : gardées comme sous-questions séparées, pas
# fusionnées ni exclues, conformément au brief.
# ---------------------------------------------------------------------------

CHECKBOX_VARS: set[str] = {
    "cps_lang_1", "cps_lang_2", "cps_lang_3", "cps_negativevote_1",
    "cps_negativevote_2", "cps_negativevote_3", "cps_negativevote_4",
    "cps_negativevote_5", "cps_negativevote_6", "cps_negativevote_7",
    "cps_socialmedia_1", "cps_socialmedia_10", "cps_socialmedia_2", "cps_socialmedia_3",
    "cps_socialmedia_4", "cps_socialmedia_5", "cps_socialmedia_6", "cps_socialmedia_7",
    "cps_socialmedia_8", "cps_socialmedia_9", "pes_contactparty_1",
    "pes_contactparty_2", "pes_contactparty_3", "pes_contactparty_4",
    "pes_contactparty_5", "pes_contactparty_8", "pes_contactparty_9",
    "pes_covid_employ2_1", "pes_covid_employ2_2", "pes_covid_employ2_3",
    "pes_covid_employ2_4", "pes_covid_employ2_5", "pes_emb_voteinfo_1",
    "pes_emb_voteinfo_10", "pes_emb_voteinfo_11", "pes_emb_voteinfo_12",
    "pes_emb_voteinfo_13", "pes_emb_voteinfo_14", "pes_emb_voteinfo_2",
    "pes_emb_voteinfo_3", "pes_emb_voteinfo_4", "pes_emb_voteinfo_5",
    "pes_emb_voteinfo_6", "pes_emb_voteinfo_7", "pes_emb_voteinfo_8",
    "pes_emb_voteinfo_9", "pes_langhome_1", "pes_langhome_10", "pes_langhome_11",
    "pes_langhome_12", "pes_langhome_13", "pes_langhome_14", "pes_langhome_15",
    "pes_langhome_16", "pes_langhome_17", "pes_langhome_2", "pes_langhome_3",
    "pes_langhome_4", "pes_langhome_5", "pes_langhome_6", "pes_langhome_7",
    "pes_langhome_8", "pes_langhome_9", "pes_maildifficult_1", "pes_maildifficult_10",
    "pes_maildifficult_11", "pes_maildifficult_12", "pes_maildifficult_2",
    "pes_maildifficult_3", "pes_maildifficult_4", "pes_maildifficult_5",
    "pes_maildifficult_6", "pes_maildifficult_7", "pes_maildifficult_8",
    "pes_maildifficult_9", "pes_otherprov_1", "pes_otherprov_10", "pes_otherprov_11",
    "pes_otherprov_12", "pes_otherprov_13", "pes_otherprov_2", "pes_otherprov_3",
    "pes_otherprov_4", "pes_otherprov_5", "pes_otherprov_6", "pes_otherprov_7",
    "pes_otherprov_8", "pes_otherprov_9", "pes_own_1", "pes_own_2", "pes_own_3",
    "pes_own_4", "pes_own_5", "pes_race_1", "pes_race_10", "pes_race_11", "pes_race_12",
    "pes_race_13", "pes_race_2", "pes_race_3", "pes_race_4", "pes_race_5", "pes_race_6",
    "pes_race_7", "pes_race_8", "pes_race_9", "pes_voteoptions_1", "pes_voteoptions_2",
    "pes_voteoptions_3", "pes_voteoptions_4", "pes_voteoptions_5", "pes_voteoptions_6",
    "pes_voteoptions_7", "pes_voteoptions_8",
}

# ---------------------------------------------------------------------------
# Variables socio-démographiques
# ---------------------------------------------------------------------------
# Tous les libellés raw ci-dessous sont riches (vraies questions posées),
# vérifiés non dégénérés — le wording canonique ne sera donc jamais déclenché
# ici, mais le mécanisme (cf. brief) reste en place par robustesse.
SOCIODEMO_VARS: dict[str, str] = {
    "cps_genderid": "gender",  # "Are you...? - Selected Choice"
    "cps_age_in_years": "age",  # âge exact demandé directement
    "cps_yob": "age",  # "in what year were you born?" — question de vérification distincte
    "cps_edu": "education",  # "highest level of education completed"
    "cps_income": "income",  # revenu exact du ménage (2021)
    "cps_income2": "income",  # revenu du ménage par tranche (repli si montant exact refusé)
    "cps_province": "region",  # province/territoire de résidence
    "pes_employed": "occupation",  # statut d'emploi actuel
    "pes_married": "marital_status",  # état civil
}

# ---------------------------------------------------------------------------
# Nettoyage du texte (markup SPSS résiduel + sauts de ligne internes Stata)
# ---------------------------------------------------------------------------

_HTML_TAG_RE = re.compile(r"\{/?[a-zA-Z]+\}")  # {u}, {/u}, {b}, {/b}, {br}
_NBSP_RE = re.compile(r"&nbsp;")


def _clean_text(text: str) -> str:
    """Nettoie le markup résiduel et les sauts de ligne internes SANS altérer le sens.

    Les libellés Qualtrics exportés en .dta contiennent souvent des '\\n' de
    retour à la ligne pur habillage (ex. « ...satisfied are you with\\nthe way
    democracy... ») : on les remplace par un espace, comme le ferait un
    navigateur affichant le questionnaire.
    """
    text = _HTML_TAG_RE.sub(" ", text)
    text = _NBSP_RE.sub(" ", text)
    text = text.replace("\n", " ").replace("\r", " ")
    text = re.sub(r" {2,}", " ", text)
    return text.strip()


def _is_actually_numeric(series: pd.Series) -> bool:
    """True si une colonne dtype `object` contient en réalité des nombres.

    pyreadstat expose certaines colonnes numériques SANS value labels (sliders
    0-100, codes bruts) en dtype pandas `object` à cause du sentinel de valeur
    manquante (-99) mêlé aux int — `is_text_column` (qui teste `dtype ==
    object` en repli) les classerait alors à tort comme "open". On inspecte le
    contenu réel des valeurs non nulles avant tout recours à `is_text_column`.
    """
    if series.dtype != object:
        return bool(pd.api.types.is_numeric_dtype(series))
    non_null = series.dropna()
    if non_null.empty:
        return False
    return all(isinstance(v, (int, float)) for v in non_null)


# ---------------------------------------------------------------------------
# Fonction principale
# ---------------------------------------------------------------------------


def extract() -> dict:
    """Lit le fichier DTA et retourne le dict SurveyFile normalisé.

    Aucun accès réseau, aucun embedding — pure extraction de structure.
    """
    df, meta = pyreadstat.read_dta(str(SAV_FILE))

    var_labels: dict[str, str] = dict(meta.column_names_to_labels or {})
    val_labels: dict[str, dict] = dict(meta.variable_value_labels or {})

    questions = []
    for col in df.columns:
        if col in EXCLUDED_VARS:
            continue

        raw_label = _clean_text((var_labels.get(col) or "").strip())
        sociodemo_type = SOCIODEMO_VARS.get(col)

        # Sociodémo au libellé raw absent/dégénéré : wording CANONIQUE en
        # dernier recours (cf. ingestion/canonical.py). Sinon, verbatim.
        if sociodemo_type and (not raw_label or fabrication_reason(col, raw_label)):
            question_text = canonical_sociodemo_text(sociodemo_type)
            if question_text is None:
                continue  # sociodemo_type sans wording canonique → exclu
        else:
            # Pas de fallback `or col` : interdit par CONVENTIONS.md.
            question_text = raw_label
            if not question_text:
                continue

        # Construire les options de réponse depuis les value labels du DTA.
        raw_opts: dict = val_labels.get(col, {})
        response_options = []
        for code, label in sorted(
            raw_opts.items(),
            key=lambda kv: float(kv[0]) if isinstance(kv[0], (int, float)) else str(kv[0]),
        ):
            if isinstance(code, float) and code == int(code):
                code = int(code)
            response_options.append({"code": code, "label": _clean_text(str(label))})

        # Inférer le type de variable. Les value labels priment TOUJOURS sur
        # le dtype (cf. `_is_actually_numeric` : plusieurs colonnes ont un
        # dtype `object` alors qu'elles sont catégorielles ou numériques).
        if raw_opts:
            if col in CHECKBOX_VARS:
                var_type = "multiple"
            elif col in SCALE_VARS:
                var_type = "scale"
            else:
                var_type = "single"
        elif _is_actually_numeric(df[col]):
            var_type = "continuous"
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
            "tags": ["electoral", "provincial", "québec", "panel", "2022", "eeq"],
        },
        "questions": questions,
    }
    return result


# ---------------------------------------------------------------------------
# Point d'entrée CLI
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
    non_empty_text = sum(1 for q in validated.questions if q.question_text.strip())

    print(f"Sondage   : {validated.survey.survey_id}")
    print(f"Répondants: {validated.survey.n_respondents}")
    print(f"Questions : {n_q} total, {n_with_opts} avec options de réponse")
    print(f"Exclues   : {len(EXCLUDED_VARS)}")
    print(f"Socio-démo: {n_sd}")
    print(f"question_text non vides : {non_empty_text}/{n_q}")
    print(f"Fichier JSON : {OUT_FILE}")

    print("\nSocio-démo flaggées :")
    for q in validated.questions:
        if q.is_sociodemo:
            print(f"  {q.variable} ({q.sociodemo_type}): {q.question_text!r}")
            if q.response_options:
                print(f"    options: {[o.label for o in q.response_options[:4]]}")

    from collections import Counter

    print("\nRépartition var_type :", Counter(q.var_type for q in validated.questions))
