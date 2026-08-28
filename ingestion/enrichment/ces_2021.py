"""Enrichment authoré — ces_2021. Produit par subagent LLM (2026-08-28)."""

SURVEY = {
    "description": "2021 Canadian Election Study (CES/ÉÉC 2021) — étude en deux vagues (CPS pendant la campagne électorale et PES post-électorale) sur la 44e élection générale du Canada du 20 septembre 2021.",
    "month": 9,
}

QUESTIONS = {
    'cps21_citizenship': {
        "display_label": 'Statut de citoyenneté canadienne',
        "concepts": ['citoyenneté'],
        "themes": ['démographie'],
    },
    'cps21_yob': {
        "display_label": 'Âge ou année de naissance du répondant',
        "concepts": ['âge'],
        "themes": ['démographie'],
    },
    'cps21_yob_2003_age': {
        "display_label": 'Âge ou année de naissance du répondant',
        "concepts": ['âge'],
        "themes": ['démographie'],
    },
    'cps21_genderid': {
        "display_label": 'Identité de genre',
        "concepts": ['genre'],
        "themes": ['démographie'],
    },
    'cps21_trans': {
        "display_label": 'Statut transgenre',
        "concepts": ['genre', 'minorités'],
        "themes": ['démographie'],
    },
    'cps21_province': {
        "display_label": 'Province ou territoire de résidence',
        "concepts": ['province', 'région'],
        "themes": ['démographie'],
    },
    'cps21_education': {
        "display_label": "Niveau d'études complété",
        "concepts": ['éducation'],
        "themes": ['démographie'],
    },
    'cps21_demsat': {
        "display_label": 'Satisfaction envers le fonctionnement de la démocratie au Canada',
        "concepts": ['démocratie', 'satisfaction'],
        "themes": ['démocratie', 'politique'],
    },
    'cps21_imp_iss': {
        "display_label": "Enjeu le plus important à l'échelle nationale à cette élection",
        "concepts": ['enjeux_électoraux'],
        "themes": ['élections', 'politique'],
    },
    'cps21_imp_iss_party': {
        "display_label": "Parti le plus compétent pour traiter l'enjeu national principal",
        "concepts": ['compétence_des_partis', 'enjeux_électoraux'],
        "themes": ['élections', 'partis_politiques'],
    },
    'cps21_imp_loc_iss': {
        "display_label": "Enjeu le plus important à l'échelle locale dans la circonscription",
        "concepts": ['enjeux_électoraux'],
        "themes": ['élections', 'politique'],
    },
    'cps21_imp_loc_iss_p': {
        "display_label": "Parti le plus compétent pour traiter l'enjeu local principal",
        "concepts": ['compétence_des_partis', 'enjeux_électoraux'],
        "themes": ['élections', 'partis_politiques'],
    },
    'cps21_camp_issue': {
        "display_label": 'Enjeu le plus discuté par les politiciens et les médias durant la campagne',
        "concepts": ['enjeux_électoraux', 'campagne_électorale'],
        "themes": ['élections', 'médias'],
    },
    'cps21_interest_gen_1': {
        "display_label": 'Intérêt général pour la politique (échelle 0-10)',
        "concepts": ['intérêt_politique'],
        "themes": ['politique'],
    },
    'cps21_interest_elxn_1': {
        "display_label": "Intérêt pour l'élection fédérale 2021 (échelle 0-10)",
        "concepts": ['intérêt_politique', 'campagne_électorale'],
        "themes": ['politique', 'élections'],
    },
    'cps21_v_likely': {
        "display_label": "Probabilité d'aller voter le jour du scrutin",
        "concepts": ['intentions_de_vote', 'participation_électorale'],
        "themes": ['élections', 'politique'],
    },
    'cps21_v_likely_pr': {
        "display_label": "Probabilité d'aller voter le jour du scrutin",
        "concepts": ['intentions_de_vote', 'participation_électorale'],
        "themes": ['élections', 'politique'],
    },
    'cps21_howvote1': {
        "display_label": 'Mode de vote prévu ou utilisé (bureau de vote, anticipation, poste)',
        "concepts": ['mode_de_vote', 'participation_électorale'],
        "themes": ['élections'],
    },
    'cps21_howvote2': {
        "display_label": 'Mode de vote prévu ou utilisé (bureau de vote, anticipation, poste)',
        "concepts": ['mode_de_vote', 'participation_électorale'],
        "themes": ['élections'],
    },
    'cps21_howvote3': {
        "display_label": 'Mode de vote prévu ou utilisé (bureau de vote, anticipation, poste)',
        "concepts": ['mode_de_vote', 'participation_électorale'],
        "themes": ['élections'],
    },
    'cps21_comfort1': {
        "display_label": "Niveau de confort à l'idée de voter en personne ou par la poste",
        "concepts": ['mode_de_vote', 'accessibilité_électorale'],
        "themes": ['élections'],
    },
    'cps21_comfort2': {
        "display_label": "Niveau de confort à l'idée de voter en personne ou par la poste",
        "concepts": ['mode_de_vote', 'accessibilité_électorale'],
        "themes": ['élections'],
    },
    'cps21_comfort3': {
        "display_label": "Niveau de confort à l'idée de voter en personne ou par la poste",
        "concepts": ['mode_de_vote', 'accessibilité_électorale'],
        "themes": ['élections'],
    },
    'cps21_votechoice': {
        "display_label": "Intention de vote pour l'élection fédérale 2021",
        "concepts": ['intentions_de_vote', 'choix_de_vote'],
        "themes": ['élections', 'partis_politiques'],
    },
    'cps21_votechoice_pr': {
        "display_label": "Intention de vote pour l'élection fédérale 2021",
        "concepts": ['intentions_de_vote', 'choix_de_vote'],
        "themes": ['élections', 'partis_politiques'],
    },
    'cps21_vote_unlikely': {
        "display_label": "Intention de vote pour l'élection fédérale 2021",
        "concepts": ['intentions_de_vote', 'choix_de_vote'],
        "themes": ['élections', 'partis_politiques'],
    },
    'cps21_vote_unlike_pr': {
        "display_label": "Intention de vote pour l'élection fédérale 2021",
        "concepts": ['intentions_de_vote', 'choix_de_vote'],
        "themes": ['élections', 'partis_politiques'],
    },
    'cps21_v_advance': {
        "display_label": "Intention de vote pour l'élection fédérale 2021",
        "concepts": ['intentions_de_vote', 'choix_de_vote'],
        "themes": ['élections', 'partis_politiques'],
    },
    'cps21_vote_lean': {
        "display_label": "Intention de vote pour l'élection fédérale 2021",
        "concepts": ['intentions_de_vote', 'choix_de_vote'],
        "themes": ['élections', 'partis_politiques'],
    },
    'cps21_vote_lean_pr': {
        "display_label": "Intention de vote pour l'élection fédérale 2021",
        "concepts": ['intentions_de_vote', 'choix_de_vote'],
        "themes": ['élections', 'partis_politiques'],
    },
    'cps21_2nd_choice': {
        "display_label": 'Deuxième choix de parti politique fédéral',
        "concepts": ['intentions_de_vote', 'choix_de_vote'],
        "themes": ['élections', 'partis_politiques'],
    },
    'cps21_2nd_choice_pr': {
        "display_label": 'Deuxième choix de parti politique fédéral',
        "concepts": ['intentions_de_vote', 'choix_de_vote'],
        "themes": ['élections', 'partis_politiques'],
    },
    'cps21_not_vote_for_1': {
        "display_label": 'Partis politiques pour lesquels le répondant refuserait de voter',
        "concepts": ['vote_négatif', 'partis_politiques'],
        "themes": ['élections', 'partis_politiques'],
    },
    'cps21_not_vote_for_2': {
        "display_label": 'Partis politiques pour lesquels le répondant refuserait de voter',
        "concepts": ['vote_négatif', 'partis_politiques'],
        "themes": ['élections', 'partis_politiques'],
    },
    'cps21_not_vote_for_3': {
        "display_label": 'Partis politiques pour lesquels le répondant refuserait de voter',
        "concepts": ['vote_négatif', 'partis_politiques'],
        "themes": ['élections', 'partis_politiques'],
    },
    'cps21_not_vote_for_4': {
        "display_label": 'Partis politiques pour lesquels le répondant refuserait de voter',
        "concepts": ['vote_négatif', 'partis_politiques'],
        "themes": ['élections', 'partis_politiques'],
    },
    'cps21_not_vote_for_5': {
        "display_label": 'Partis politiques pour lesquels le répondant refuserait de voter',
        "concepts": ['vote_négatif', 'partis_politiques'],
        "themes": ['élections', 'partis_politiques'],
    },
    'cps21_not_vote_for_6': {
        "display_label": 'Partis politiques pour lesquels le répondant refuserait de voter',
        "concepts": ['vote_négatif', 'partis_politiques'],
        "themes": ['élections', 'partis_politiques'],
    },
    'cps21_not_vote_for_7': {
        "display_label": 'Partis politiques pour lesquels le répondant refuserait de voter',
        "concepts": ['vote_négatif', 'partis_politiques'],
        "themes": ['élections', 'partis_politiques'],
    },
    'cps21_not_vote_for_8': {
        "display_label": 'Partis politiques pour lesquels le répondant refuserait de voter',
        "concepts": ['vote_négatif', 'partis_politiques'],
        "themes": ['élections', 'partis_politiques'],
    },
    'cps21_not_vote_for_w_1': {
        "display_label": 'Raisons de rejet et refus de voter pour certains partis',
        "concepts": ['vote_négatif', 'facteurs_de_vote'],
        "themes": ['élections', 'partis_politiques'],
    },
    'cps21_not_vote_for_w_2': {
        "display_label": 'Raisons de rejet et refus de voter pour certains partis',
        "concepts": ['vote_négatif', 'facteurs_de_vote'],
        "themes": ['élections', 'partis_politiques'],
    },
    'cps21_not_vote_for_w_3': {
        "display_label": 'Raisons de rejet et refus de voter pour certains partis',
        "concepts": ['vote_négatif', 'facteurs_de_vote'],
        "themes": ['élections', 'partis_politiques'],
    },
    'cps21_not_vote_for_w_4': {
        "display_label": 'Raisons de rejet et refus de voter pour certains partis',
        "concepts": ['vote_négatif', 'facteurs_de_vote'],
        "themes": ['élections', 'partis_politiques'],
    },
    'cps21_not_vote_for_w_5': {
        "display_label": 'Raisons de rejet et refus de voter pour certains partis',
        "concepts": ['vote_négatif', 'facteurs_de_vote'],
        "themes": ['élections', 'partis_politiques'],
    },
    'cps21_fed_gov_sat': {
        "display_label": 'Satisfaction envers la performance du gouvernement fédéral de Justin Trudeau',
        "concepts": ['satisfaction_gouvernementale'],
        "themes": ['politique', 'gouvernement'],
    },
    'cps21_party_rating_23': {
        "display_label": 'Évaluation du sentiment envers le Parti libéral (échelle 0-100)',
        "concepts": ['image_des_partis', 'thermomètre_des_partis'],
        "themes": ['partis_politiques'],
    },
    'cps21_party_rating_24': {
        "display_label": 'Évaluation du sentiment envers le Parti conservateur (échelle 0-100)',
        "concepts": ['image_des_partis', 'thermomètre_des_partis'],
        "themes": ['partis_politiques'],
    },
    'cps21_party_rating_25': {
        "display_label": 'Évaluation du sentiment envers le NPD (échelle 0-100)',
        "concepts": ['image_des_partis', 'thermomètre_des_partis'],
        "themes": ['partis_politiques'],
    },
    'cps21_party_rating_26': {
        "display_label": 'Évaluation du sentiment envers le Bloc Québécois (échelle 0-100)',
        "concepts": ['image_des_partis', 'thermomètre_des_partis'],
        "themes": ['partis_politiques'],
    },
    'cps21_party_rating_27': {
        "display_label": 'Évaluation du sentiment envers le Parti vert (échelle 0-100)',
        "concepts": ['image_des_partis', 'thermomètre_des_partis'],
        "themes": ['partis_politiques'],
    },
    'cps21_party_rating_29': {
        "display_label": 'Évaluation du sentiment envers le Parti populaire (PPC) (échelle 0-100)',
        "concepts": ['image_des_partis', 'thermomètre_des_partis'],
        "themes": ['partis_politiques'],
    },
    'cps21_lead_rating_23': {
        "display_label": 'Évaluation du sentiment envers Justin Trudeau (échelle 0-100)',
        "concepts": ['évaluation_des_chefs', 'chefs_de_partis'],
        "themes": ['politique', 'partis_politiques'],
    },
    'cps21_lead_rating_24': {
        "display_label": "Évaluation du sentiment envers Erin O'Toole (échelle 0-100)",
        "concepts": ['évaluation_des_chefs', 'chefs_de_partis'],
        "themes": ['politique', 'partis_politiques'],
    },
    'cps21_lead_rating_25': {
        "display_label": 'Évaluation du sentiment envers Jagmeet Singh (échelle 0-100)',
        "concepts": ['évaluation_des_chefs', 'chefs_de_partis'],
        "themes": ['politique', 'partis_politiques'],
    },
    'cps21_lead_rating_26': {
        "display_label": 'Évaluation du sentiment envers Yves-François Blanchet (échelle 0-100)',
        "concepts": ['évaluation_des_chefs', 'chefs_de_partis'],
        "themes": ['politique', 'partis_politiques'],
    },
    'cps21_lead_rating_27': {
        "display_label": 'Évaluation du sentiment envers Annamie Paul (échelle 0-100)',
        "concepts": ['évaluation_des_chefs', 'chefs_de_partis'],
        "themes": ['politique', 'partis_politiques'],
    },
    'cps21_lead_rating_29': {
        "display_label": 'Évaluation du sentiment envers Maxime Bernier (échelle 0-100)',
        "concepts": ['évaluation_des_chefs', 'chefs_de_partis'],
        "themes": ['politique', 'partis_politiques'],
    },
    'cps21_cand_rating_23': {
        "display_label": 'Évaluation du sentiment envers le Candidat libéral local (échelle 0-100)',
        "concepts": ['évaluation_des_candidats', 'candidats_locaux'],
        "themes": ['élections'],
    },
    'cps21_cand_rating_24': {
        "display_label": 'Évaluation du sentiment envers le Candidat conservateur local (échelle 0-100)',
        "concepts": ['évaluation_des_candidats', 'candidats_locaux'],
        "themes": ['élections'],
    },
    'cps21_cand_rating_25': {
        "display_label": 'Évaluation du sentiment envers le Candidat NPD local (échelle 0-100)',
        "concepts": ['évaluation_des_candidats', 'candidats_locaux'],
        "themes": ['élections'],
    },
    'cps21_cand_rating_26': {
        "display_label": 'Évaluation du sentiment envers le Candidat Bloc local (échelle 0-100)',
        "concepts": ['évaluation_des_candidats', 'candidats_locaux'],
        "themes": ['élections'],
    },
    'cps21_cand_rating_27': {
        "display_label": 'Évaluation du sentiment envers le Candidat Vert local (échelle 0-100)',
        "concepts": ['évaluation_des_candidats', 'candidats_locaux'],
        "themes": ['élections'],
    },
    'cps21_lr_parties_1': {
        "display_label": "Positionnement perçu du Parti libéral sur l'axe gauche-droite",
        "concepts": ['axe_gauche_droite', 'idéologie', 'partis_politiques'],
        "themes": ['politique', 'idéologie'],
    },
    'cps21_lr_parties_2': {
        "display_label": "Positionnement perçu du Parti conservateur sur l'axe gauche-droite",
        "concepts": ['axe_gauche_droite', 'idéologie', 'partis_politiques'],
        "themes": ['politique', 'idéologie'],
    },
    'cps21_lr_parties_3': {
        "display_label": "Positionnement perçu du NPD sur l'axe gauche-droite",
        "concepts": ['axe_gauche_droite', 'idéologie', 'partis_politiques'],
        "themes": ['politique', 'idéologie'],
    },
    'cps21_lr_parties_4': {
        "display_label": "Positionnement perçu du Bloc Québécois sur l'axe gauche-droite",
        "concepts": ['axe_gauche_droite', 'idéologie', 'partis_politiques'],
        "themes": ['politique', 'idéologie'],
    },
    'cps21_lr_parties_5': {
        "display_label": "Positionnement perçu du Parti vert sur l'axe gauche-droite",
        "concepts": ['axe_gauche_droite', 'idéologie', 'partis_politiques'],
        "themes": ['politique', 'idéologie'],
    },
    'cps21_lr_parties_7': {
        "display_label": "Positionnement perçu du Parti populaire (PPC) sur l'axe gauche-droite",
        "concepts": ['axe_gauche_droite', 'idéologie', 'partis_politiques'],
        "themes": ['politique', 'idéologie'],
    },
    'cps21_lr_scale_bef_1': {
        "display_label": "Auto-positionnement sur l'axe gauche-droite (échelle 0-10)",
        "concepts": ['axe_gauche_droite', 'idéologie'],
        "themes": ['politique', 'idéologie'],
    },
    'cps21_lead_int_1': {
        "display_label": 'Perception des chefs comme intelligents : Justin Trudeau',
        "concepts": ['évaluation_des_chefs', 'traits_de_personnalité'],
        "themes": ['politique'],
    },
    'cps21_lead_int_2': {
        "display_label": "Perception des chefs comme intelligents : Erin O'Toole",
        "concepts": ['évaluation_des_chefs', 'traits_de_personnalité'],
        "themes": ['politique'],
    },
    'cps21_lead_int_3': {
        "display_label": 'Perception des chefs comme intelligents : Jagmeet Singh',
        "concepts": ['évaluation_des_chefs', 'traits_de_personnalité'],
        "themes": ['politique'],
    },
    'cps21_lead_int_4': {
        "display_label": 'Perception des chefs comme intelligents : Yves-François Blanchet',
        "concepts": ['évaluation_des_chefs', 'traits_de_personnalité'],
        "themes": ['politique'],
    },
    'cps21_lead_int_5': {
        "display_label": 'Perception des chefs comme intelligents : Annamie Paul',
        "concepts": ['évaluation_des_chefs', 'traits_de_personnalité'],
        "themes": ['politique'],
    },
    'cps21_lead_int_6': {
        "display_label": 'Perception des chefs comme intelligents : Maxime Bernier',
        "concepts": ['évaluation_des_chefs', 'traits_de_personnalité'],
        "themes": ['politique'],
    },
    'cps21_lead_int_7': {
        "display_label": 'Perception des chefs comme intelligents : Aucun chef',
        "concepts": ['évaluation_des_chefs', 'traits_de_personnalité'],
        "themes": ['politique'],
    },
    'cps21_lead_strong_1': {
        "display_label": 'Perception des chefs comme ayant un leadership fort : Justin Trudeau',
        "concepts": ['évaluation_des_chefs', 'leadership'],
        "themes": ['politique'],
    },
    'cps21_lead_strong_2': {
        "display_label": "Perception des chefs comme ayant un leadership fort : Erin O'Toole",
        "concepts": ['évaluation_des_chefs', 'leadership'],
        "themes": ['politique'],
    },
    'cps21_lead_strong_3': {
        "display_label": 'Perception des chefs comme ayant un leadership fort : Jagmeet Singh',
        "concepts": ['évaluation_des_chefs', 'leadership'],
        "themes": ['politique'],
    },
    'cps21_lead_strong_4': {
        "display_label": 'Perception des chefs comme ayant un leadership fort : Yves-François Blanchet',
        "concepts": ['évaluation_des_chefs', 'leadership'],
        "themes": ['politique'],
    },
    'cps21_lead_strong_5': {
        "display_label": 'Perception des chefs comme ayant un leadership fort : Annamie Paul',
        "concepts": ['évaluation_des_chefs', 'leadership'],
        "themes": ['politique'],
    },
    'cps21_lead_strong_6': {
        "display_label": 'Perception des chefs comme ayant un leadership fort : Maxime Bernier',
        "concepts": ['évaluation_des_chefs', 'leadership'],
        "themes": ['politique'],
    },
    'cps21_lead_strong_7': {
        "display_label": 'Perception des chefs comme ayant un leadership fort : Aucun chef',
        "concepts": ['évaluation_des_chefs', 'leadership'],
        "themes": ['politique'],
    },
    'cps21_lead_trust_1': {
        "display_label": 'Perception des chefs comme dignes de confiance : Justin Trudeau',
        "concepts": ['évaluation_des_chefs', 'confiance_politique'],
        "themes": ['politique'],
    },
    'cps21_lead_trust_2': {
        "display_label": "Perception des chefs comme dignes de confiance : Erin O'Toole",
        "concepts": ['évaluation_des_chefs', 'confiance_politique'],
        "themes": ['politique'],
    },
    'cps21_lead_trust_3': {
        "display_label": 'Perception des chefs comme dignes de confiance : Jagmeet Singh',
        "concepts": ['évaluation_des_chefs', 'confiance_politique'],
        "themes": ['politique'],
    },
    'cps21_lead_trust_4': {
        "display_label": 'Perception des chefs comme dignes de confiance : Yves-François Blanchet',
        "concepts": ['évaluation_des_chefs', 'confiance_politique'],
        "themes": ['politique'],
    },
    'cps21_lead_trust_5': {
        "display_label": 'Perception des chefs comme dignes de confiance : Annamie Paul',
        "concepts": ['évaluation_des_chefs', 'confiance_politique'],
        "themes": ['politique'],
    },
    'cps21_lead_trust_6': {
        "display_label": 'Perception des chefs comme dignes de confiance : Maxime Bernier',
        "concepts": ['évaluation_des_chefs', 'confiance_politique'],
        "themes": ['politique'],
    },
    'cps21_lead_trust_7': {
        "display_label": 'Perception des chefs comme dignes de confiance : Aucun chef',
        "concepts": ['évaluation_des_chefs', 'confiance_politique'],
        "themes": ['politique'],
    },
    'cps21_lead_cares_1': {
        "display_label": 'Perception des chefs comme se souciant des gens : Justin Trudeau',
        "concepts": ['évaluation_des_chefs', 'empathie_politique'],
        "themes": ['politique'],
    },
    'cps21_lead_cares_2': {
        "display_label": "Perception des chefs comme se souciant des gens : Erin O'Toole",
        "concepts": ['évaluation_des_chefs', 'empathie_politique'],
        "themes": ['politique'],
    },
    'cps21_lead_cares_3': {
        "display_label": 'Perception des chefs comme se souciant des gens : Jagmeet Singh',
        "concepts": ['évaluation_des_chefs', 'empathie_politique'],
        "themes": ['politique'],
    },
    'cps21_lead_cares_4': {
        "display_label": 'Perception des chefs comme se souciant des gens : Yves-François Blanchet',
        "concepts": ['évaluation_des_chefs', 'empathie_politique'],
        "themes": ['politique'],
    },
    'cps21_lead_cares_5': {
        "display_label": 'Perception des chefs comme se souciant des gens : Annamie Paul',
        "concepts": ['évaluation_des_chefs', 'empathie_politique'],
        "themes": ['politique'],
    },
    'cps21_lead_cares_6': {
        "display_label": 'Perception des chefs comme se souciant des gens : Maxime Bernier',
        "concepts": ['évaluation_des_chefs', 'empathie_politique'],
        "themes": ['politique'],
    },
    'cps21_lead_cares_7': {
        "display_label": 'Perception des chefs comme se souciant des gens : Aucun chef',
        "concepts": ['évaluation_des_chefs', 'empathie_politique'],
        "themes": ['politique'],
    },
    'cps21_spend_educ': {
        "display_label": 'Priorité de dépenses publiques fédérales : Éducation',
        "concepts": ['dépenses_publiques', 'éducation'],
        "themes": ['économie', 'éducation'],
    },
    'cps21_spend_env': {
        "display_label": 'Priorité de dépenses publiques fédérales : Environnement',
        "concepts": ['dépenses_publiques', 'environnement'],
        "themes": ['économie', 'environnement'],
    },
    'cps21_spend_just_law': {
        "display_label": "Priorité de dépenses publiques fédérales : Justice et maintien de l'ordre",
        "concepts": ['dépenses_publiques', 'justice'],
        "themes": ['économie', 'société'],
    },
    'cps21_spend_defence': {
        "display_label": 'Priorité de dépenses publiques fédérales : Défense nationale',
        "concepts": ['dépenses_publiques', 'défense'],
        "themes": ['économie', 'politique'],
    },
    'cps21_spend_imm_min': {
        "display_label": 'Priorité de dépenses publiques fédérales : Immigrants et minorités',
        "concepts": ['dépenses_publiques', 'immigration', 'minorités'],
        "themes": ['économie', 'société'],
    },
    'cps21_spend_rec_indi': {
        "display_label": 'Priorité de dépenses publiques fédérales : Réconciliation avec les Peuples Autochtones',
        "concepts": ['dépenses_publiques', 'autochtones', 'réconciliation'],
        "themes": ['économie', 'société'],
    },
    'cps21_spend_afford_h': {
        "display_label": 'Priorité de dépenses publiques fédérales : Logement abordable',
        "concepts": ['dépenses_publiques', 'logement'],
        "themes": ['économie', 'politique_sociale'],
    },
    'cps21_spend_nation_c': {
        "display_label": 'Priorité de dépenses publiques fédérales : Système national de services de garde',
        "concepts": ['dépenses_publiques', 'services_de_garde', 'famille'],
        "themes": ['économie', 'politique_sociale'],
    },
    'cps21_pos_mailtrust': {
        "display_label": 'Confiance et attitudes envers le vote par la poste, par Internet et la sécurité électorale',
        "concepts": ['sécurité_électorale', 'vote_électronique', 'accessibilité_électorale'],
        "themes": ['démocratie', 'élections'],
    },
    'cps21_pos_fptp': {
        "display_label": 'Support à la réforme du mode de scrutin (abandon du uninominal à un tour)',
        "concepts": ['réforme_électorale', 'mode_de_scrutin'],
        "themes": ['démocratie'],
    },
    'cps21_pos_life': {
        "display_label": "Prises de position sur l'aide médicale à mourir et l'avortement",
        "concepts": ['avortement', 'éthique', 'santé'],
        "themes": ['santé', 'société'],
    },
    'cps21_pos_cannabis': {
        "display_label": 'Position sur la criminalisation de la possession de cannabis',
        "concepts": ['cannabis', 'drogues', 'justice'],
        "themes": ['société', 'justice'],
    },
    'cps21_pos_carbon': {
        "display_label": 'Maintien de la tarification fédérale du carbone pour réduire les émissions',
        "concepts": ['taxe_carbone', 'changement_climatique', 'environnement'],
        "themes": ['environnement', 'économie'],
    },
    'cps21_pos_energy': {
        "display_label": "Appui du gouvernement au secteur énergétique et à la construction d'oléoducs",
        "concepts": ['énergie', 'oléoducs', 'environnement'],
        "themes": ['environnement', 'économie'],
    },
    'cps21_pos_envreg': {
        "display_label": 'Réglementation environnementale plus stricte même si cela hausse les prix',
        "concepts": ['environnement', 'réglementation'],
        "themes": ['environnement', 'économie'],
    },
    'cps21_pos_jobs': {
        "display_label": "Arbitrage entre protection de l'environnement et création d'emplois",
        "concepts": ['environnement', 'emploi'],
        "themes": ['environnement', 'économie'],
    },
    'cps21_pos_subsid': {
        "display_label": 'Abolition de toutes les subventions fédérales aux entreprises',
        "concepts": ['subventions', 'économie'],
        "themes": ['économie'],
    },
    'cps21_pos_trade': {
        "display_label": "Appui au libre-échange international et à la création d'emplois",
        "concepts": ['libre_échange', 'commerce_international'],
        "themes": ['économie'],
    },
    'cps21_covid_liberty': {
        "display_label": 'Perception des restrictions sanitaires de COVID-19 sur les libertés individuelles',
        "concepts": ['covid19', 'libertés_civiles', 'mesures_sanitaires'],
        "themes": ['santé', 'société'],
    },
    'cps21_econ_retro': {
        "display_label": "Évaluation rétrospective de l'économie canadienne au cours de la dernière année",
        "concepts": ['évaluation_économique', 'économie'],
        "themes": ['économie'],
    },
    'cps21_econ_fed_bette': {
        "display_label": "Impact des politiques du gouvernement fédéral sur l'économie canadienne",
        "concepts": ['évaluation_économique', 'politique_économique'],
        "themes": ['économie', 'politique'],
    },
    'cps21_issue_handle_1': {
        "display_label": "Parti le plus compétent pour gérer l'enjeu : Santé",
        "concepts": ['compétence_des_partis', 'enjeux_électoraux'],
        "themes": ['partis_politiques', 'politique'],
    },
    'cps21_issue_handle_2': {
        "display_label": "Parti le plus compétent pour gérer l'enjeu : Éducation",
        "concepts": ['compétence_des_partis', 'enjeux_électoraux'],
        "themes": ['partis_politiques', 'politique'],
    },
    'cps21_issue_handle_3': {
        "display_label": "Parti le plus compétent pour gérer l'enjeu : Environnement",
        "concepts": ['compétence_des_partis', 'enjeux_électoraux'],
        "themes": ['partis_politiques', 'politique'],
    },
    'cps21_issue_handle_4': {
        "display_label": "Parti le plus compétent pour gérer l'enjeu : Criminalité et justice",
        "concepts": ['compétence_des_partis', 'enjeux_électoraux'],
        "themes": ['partis_politiques', 'politique'],
    },
    'cps21_issue_handle_5': {
        "display_label": "Parti le plus compétent pour gérer l'enjeu : Défense nationale",
        "concepts": ['compétence_des_partis', 'enjeux_électoraux'],
        "themes": ['partis_politiques', 'politique'],
    },
    'cps21_issue_handle_6': {
        "display_label": "Parti le plus compétent pour gérer l'enjeu : Enjeux autochtones",
        "concepts": ['compétence_des_partis', 'enjeux_électoraux'],
        "themes": ['partis_politiques', 'politique'],
    },
    'cps21_issue_handle_7': {
        "display_label": "Parti le plus compétent pour gérer l'enjeu : Immigration",
        "concepts": ['compétence_des_partis', 'enjeux_électoraux'],
        "themes": ['partis_politiques', 'politique'],
    },
    'cps21_issue_handle_8': {
        "display_label": "Parti le plus compétent pour gérer l'enjeu : Gestion de la COVID-19",
        "concepts": ['compétence_des_partis', 'enjeux_électoraux'],
        "themes": ['partis_politiques', 'politique'],
    },
    'cps21_issue_handle_9': {
        "display_label": "Parti le plus compétent pour gérer l'enjeu : Économie",
        "concepts": ['compétence_des_partis', 'enjeux_électoraux'],
        "themes": ['partis_politiques', 'politique'],
    },
    'cps21_issue_handle_ADO_1': {
        "display_label": "Parti le plus compétent pour gérer l'enjeu : Changement climatique",
        "concepts": ['compétence_des_partis', 'enjeux_électoraux'],
        "themes": ['partis_politiques', 'politique'],
    },
    'cps21_issue_handle_ADO_2': {
        "display_label": "Parti le plus compétent pour gérer l'enjeu : Dépenses gouvernementales",
        "concepts": ['compétence_des_partis', 'enjeux_électoraux'],
        "themes": ['partis_politiques', 'politique'],
    },
    'cps21_issue_handle_ADO_3': {
        "display_label": "Parti le plus compétent pour gérer l'enjeu : Inflation et coût de la vie",
        "concepts": ['compétence_des_partis', 'enjeux_électoraux'],
        "themes": ['partis_politiques', 'politique'],
    },
    'cps21_issue_handle_ADO_4': {
        "display_label": "Parti le plus compétent pour gérer l'enjeu : Relations étrangères",
        "concepts": ['compétence_des_partis', 'enjeux_électoraux'],
        "themes": ['partis_politiques', 'politique'],
    },
    'cps21_issue_handle_ADO_5': {
        "display_label": "Parti le plus compétent pour gérer l'enjeu : Services de garde",
        "concepts": ['compétence_des_partis', 'enjeux_électoraux'],
        "themes": ['partis_politiques', 'politique'],
    },
    'cps21_issue_handle_ADO_6': {
        "display_label": "Parti le plus compétent pour gérer l'enjeu : Impôts et taxes",
        "concepts": ['compétence_des_partis', 'enjeux_électoraux'],
        "themes": ['partis_politiques', 'politique'],
    },
    'cps21_most_seats_1': {
        "display_label": "Chances perçues du Parti libéral d'obtenir le plus de sièges",
        "concepts": ['prédictions_électorales'],
        "themes": ['élections'],
    },
    'cps21_most_seats_2': {
        "display_label": "Chances perçues du Parti conservateur d'obtenir le plus de sièges",
        "concepts": ['prédictions_électorales'],
        "themes": ['élections'],
    },
    'cps21_most_seats_3': {
        "display_label": "Chances perçues du NPD d'obtenir le plus de sièges",
        "concepts": ['prédictions_électorales'],
        "themes": ['élections'],
    },
    'cps21_most_seats_4': {
        "display_label": "Chances perçues du Bloc Québécois d'obtenir le plus de sièges",
        "concepts": ['prédictions_électorales'],
        "themes": ['élections'],
    },
    'cps21_most_seats_5': {
        "display_label": "Chances perçues du Parti vert d'obtenir le plus de sièges",
        "concepts": ['prédictions_électorales'],
        "themes": ['élections'],
    },
    'cps21_win_local_1': {
        "display_label": "Chances perçues du Candidat libéral de l'emporter dans la circonscription",
        "concepts": ['prédictions_électorales', 'candidats_locaux'],
        "themes": ['élections'],
    },
    'cps21_win_local_2': {
        "display_label": "Chances perçues du Candidat conservateur de l'emporter dans la circonscription",
        "concepts": ['prédictions_électorales', 'candidats_locaux'],
        "themes": ['élections'],
    },
    'cps21_win_local_3': {
        "display_label": "Chances perçues du Candidat NPD de l'emporter dans la circonscription",
        "concepts": ['prédictions_électorales', 'candidats_locaux'],
        "themes": ['élections'],
    },
    'cps21_win_local_4': {
        "display_label": "Chances perçues du Candidat Bloc de l'emporter dans la circonscription",
        "concepts": ['prédictions_électorales', 'candidats_locaux'],
        "themes": ['élections'],
    },
    'cps21_win_local_5': {
        "display_label": "Chances perçues du Candidat Vert de l'emporter dans la circonscription",
        "concepts": ['prédictions_électorales', 'candidats_locaux'],
        "themes": ['élections'],
    },
    'cps21__candidateref': {
        "display_label": 'Préférence de victoire pour le candidat dans la circonscription',
        "concepts": ['candidats_locaux', 'préférences_politiques'],
        "themes": ['élections'],
    },
    'cps21_candidate_imag': {
        "display_label": 'Préférence de victoire pour le candidat dans la circonscription',
        "concepts": ['candidats_locaux', 'préférences_politiques'],
        "themes": ['élections'],
    },
    'cps21_outcome_most': {
        "display_label": 'Résultat du gouvernement issu des élections le plus souhaité',
        "concepts": ['préférences_politiques', 'gouvernement'],
        "themes": ['élections', 'politique'],
    },
    'cps21_outcome_least': {
        "display_label": 'Résultat du gouvernement issu des élections le moins souhaité',
        "concepts": ['préférences_politiques', 'gouvernement'],
        "themes": ['élections', 'politique'],
    },
    'cps21_minority_gov': {
        "display_label": 'Opinion sur les gouvernements minoritaires (bonne vs mauvaise chose)',
        "concepts": ['gouvernement_minoritaire', 'démocratie'],
        "themes": ['démocratie', 'politique'],
    },
    'cps21_imm': {
        "display_label": "Attitudes envers les niveaux d'immigration, les réfugiés et l'intégration",
        "concepts": ['immigration', 'réfugiés', 'intégration'],
        "themes": ['immigration', 'société'],
    },
    'cps21_refugees': {
        "display_label": "Attitudes envers les niveaux d'immigration, les réfugiés et l'intégration",
        "concepts": ['immigration', 'réfugiés', 'intégration'],
        "themes": ['immigration', 'société'],
    },
    'cps21_attcheck': {
        "display_label": "Vérification de l'attention du répondant dans le questionnaire",
        "concepts": ['méthodologie'],
        "themes": ['méthodologie'],
    },
    'cps21_govt_confusing': {
        "display_label": 'Sentiment que la politique et le gouvernement sont trop complexes à comprendre',
        "concepts": ['efficacité_politique'],
        "themes": ['démocratie', 'politique'],
    },
    'cps21_govt_say': {
        "display_label": "Sentiment de n'avoir aucun mot à dire sur les actions du gouvernement",
        "concepts": ['efficacité_politique'],
        "themes": ['démocratie', 'politique'],
    },
    'cps21_pol_eth': {
        "display_label": "Importance d'un comportement éthique de la part des politiciens",
        "concepts": ['éthique_politique', 'confiance_politique'],
        "themes": ['démocratie', 'politique'],
    },
    'cps21_lib_promises': {
        "display_label": 'Perception du respect des promesses électorales de 2019 par Justin Trudeau',
        "concepts": ['promesses_électorales', 'confiance_politique'],
        "themes": ['démocratie', 'politique'],
    },
    'cps21_news_cons': {
        "display_label": "Temps quotidien consacré à suivre l'actualité politique",
        "concepts": ['médias', 'information_politique'],
        "themes": ['médias', 'politique'],
    },
    'cps21_premier_name': {
        "display_label": 'Connaissance politique : Nom du premier ministre provincial',
        "concepts": ['connaissances_politiques'],
        "themes": ['démocratie', 'politique'],
    },
    'cps21_finmin_name': {
        "display_label": 'Connaissance politique : Nom du ministre fédéral des Finances',
        "concepts": ['connaissances_politiques'],
        "themes": ['démocratie', 'politique'],
    },
    'cps21_govgen_name': {
        "display_label": 'Connaissance politique : Nom de la gouverneure générale du Canada',
        "concepts": ['connaissances_politiques'],
        "themes": ['démocratie', 'politique'],
    },
    'cps21_volunteer': {
        "display_label": 'Fréquence des activités de bénévolat dans les 12 derniers mois',
        "concepts": ['bénévolat', 'engagement_citoyen'],
        "themes": ['société'],
    },
    'cps21_duty_choice': {
        "display_label": 'Perception du vote : devoir civique vs choix personnel',
        "concepts": ['devoir_civique', 'participation_électorale'],
        "themes": ['démocratie', 'élections'],
    },
    'cps21_quebec_sov': {
        "display_label": 'Attitudes sur la souveraineté du Québec, la langue et la culture françaises',
        "concepts": ['souveraineté', 'québec', 'langue_française'],
        "themes": ['politique', 'démocratie'],
    },
    'cps21_own_fin_retro': {
        "display_label": 'Évolution de la situation financière personnelle au cours de la dernière année',
        "concepts": ['finances_personnelles'],
        "themes": ['économie'],
    },
    'cps21_ownfinanc_fed': {
        "display_label": 'Impact des politiques du gouvernement fédéral sur la situation financière personnelle',
        "concepts": ['finances_personnelles', 'politique_économique'],
        "themes": ['économie'],
    },
    'cps21_own_fin_future': {
        "display_label": "Perspectives d'évolution de la situation financière personnelle pour l'an prochain",
        "concepts": ['finances_personnelles'],
        "themes": ['économie'],
    },
    'cps21_covidrelief__1': {
        "display_label": "Demande de prestations d'aide d'urgence COVID-19 : PCU (CERB)",
        "concepts": ['covid19', 'aide_financière', 'programmes_sociaux'],
        "themes": ['économie', 'politique_sociale'],
    },
    'cps21_covidrelief__2': {
        "display_label": "Demande de prestations d'aide d'urgence COVID-19 : PCEE (CESB)",
        "concepts": ['covid19', 'aide_financière', 'programmes_sociaux'],
        "themes": ['économie', 'politique_sociale'],
    },
    'cps21_covidrelief__3': {
        "display_label": "Demande de prestations d'aide d'urgence COVID-19 : PCRE (CRB)",
        "concepts": ['covid19', 'aide_financière', 'programmes_sociaux'],
        "themes": ['économie', 'politique_sociale'],
    },
    'cps21_covidrelief__4': {
        "display_label": "Demande de prestations d'aide d'urgence COVID-19 : PCMRE (CRSB)",
        "concepts": ['covid19', 'aide_financière', 'programmes_sociaux'],
        "themes": ['économie', 'politique_sociale'],
    },
    'cps21_covidrelief__5': {
        "display_label": "Demande de prestations d'aide d'urgence COVID-19 : PCREPA (CRCB)",
        "concepts": ['covid19', 'aide_financière', 'programmes_sociaux'],
        "themes": ['économie', 'politique_sociale'],
    },
    'cps21_covidrelief__6': {
        "display_label": "Demande de prestations d'aide d'urgence COVID-19 : SSUC (CEWS)",
        "concepts": ['covid19', 'aide_financière', 'programmes_sociaux'],
        "themes": ['économie', 'politique_sociale'],
    },
    'cps21_covidrelief__7': {
        "display_label": "Demande de prestations d'aide d'urgence COVID-19 : SUCL (CERS)",
        "concepts": ['covid19', 'aide_financière', 'programmes_sociaux'],
        "themes": ['économie', 'politique_sociale'],
    },
    'cps21_covidrelief__8': {
        "display_label": "Demande de prestations d'aide d'urgence COVID-19 : Aucun programme",
        "concepts": ['covid19', 'aide_financière', 'programmes_sociaux'],
        "themes": ['économie', 'politique_sociale'],
    },
    'cps21_covidrelief__9': {
        "display_label": "Demande de prestations d'aide d'urgence COVID-19 : Refus",
        "concepts": ['covid19', 'aide_financière', 'programmes_sociaux'],
        "themes": ['économie', 'politique_sociale'],
    },
    'cps21_groupdiscrim_1': {
        "display_label": 'Discrimination perçue au Canada contre les Noirs',
        "concepts": ['discrimination', 'minorités'],
        "themes": ['société', 'droits'],
    },
    'cps21_groupdiscrim_2': {
        "display_label": 'Discrimination perçue au Canada contre les Peuples Autochtones',
        "concepts": ['discrimination', 'minorités'],
        "themes": ['société', 'droits'],
    },
    'cps21_groupdiscrim_3': {
        "display_label": 'Discrimination perçue au Canada contre les Asiatiques',
        "concepts": ['discrimination', 'minorités'],
        "themes": ['société', 'droits'],
    },
    'cps21_groupdiscrim_4': {
        "display_label": 'Discrimination perçue au Canada contre les Musulmans',
        "concepts": ['discrimination', 'minorités'],
        "themes": ['société', 'droits'],
    },
    'cps21_groupdiscrim_5': {
        "display_label": 'Discrimination perçue au Canada contre les Juifs',
        "concepts": ['discrimination', 'minorités'],
        "themes": ['société', 'droits'],
    },
    'cps21_groupdiscrim_6': {
        "display_label": 'Discrimination perçue au Canada contre les Femmes',
        "concepts": ['discrimination', 'minorités'],
        "themes": ['société', 'droits'],
    },
    'cps21_groupdiscrim_7': {
        "display_label": 'Discrimination perçue au Canada contre les Personnes LGBTQ+',
        "concepts": ['discrimination', 'minorités'],
        "themes": ['société', 'droits'],
    },
    'cps21_groupdiscrim_8': {
        "display_label": 'Discrimination perçue au Canada contre les Canadiens français',
        "concepts": ['discrimination', 'minorités'],
        "themes": ['société', 'droits'],
    },
    'cps21_prov_gov_sat': {
        "display_label": 'Satisfaction envers la performance du gouvernement provincial',
        "concepts": ['satisfaction_gouvernementale'],
        "themes": ['politique', 'gouvernement'],
    },
    'cps21_covid_sat_1': {
        "display_label": 'Satisfaction quant à la gestion du coronavirus : Gouvernement fédéral',
        "concepts": ['gestion_de_crise', 'covid19', 'satisfaction_gouvernementale'],
        "themes": ['santé', 'politique'],
    },
    'cps21_covid_sat_2': {
        "display_label": 'Satisfaction quant à la gestion du coronavirus : Gouvernement provincial',
        "concepts": ['gestion_de_crise', 'covid19', 'satisfaction_gouvernementale'],
        "themes": ['santé', 'politique'],
    },
    'cps21_covid_sat_3': {
        "display_label": 'Satisfaction quant à la gestion du coronavirus : Autorités locales de santé',
        "concepts": ['gestion_de_crise', 'covid19', 'satisfaction_gouvernementale'],
        "themes": ['santé', 'politique'],
    },
    'cps21_vaccine_mandat_1': {
        "display_label": 'Passeport ou obligation vaccinale COVID-19 : Transports aériens ou ferroviaires',
        "concepts": ['covid19', 'vaccination', 'obligation_vaccinale'],
        "themes": ['santé', 'société'],
    },
    'cps21_vaccine_mandat_2': {
        "display_label": 'Passeport ou obligation vaccinale COVID-19 : Bars et restaurants',
        "concepts": ['covid19', 'vaccination', 'obligation_vaccinale'],
        "themes": ['santé', 'société'],
    },
    'cps21_vaccine_mandat_3': {
        "display_label": 'Passeport ou obligation vaccinale COVID-19 : Milieu hospitalier',
        "concepts": ['covid19', 'vaccination', 'obligation_vaccinale'],
        "themes": ['santé', 'société'],
    },
    'cps21_vaccine1': {
        "display_label": 'Statut et intentions de vaccination contre la COVID-19',
        "concepts": ['covid19', 'vaccination'],
        "themes": ['santé'],
    },
    'cps21_vaccine2': {
        "display_label": 'Statut et intentions de vaccination contre la COVID-19',
        "concepts": ['covid19', 'vaccination'],
        "themes": ['santé'],
    },
    'cps21_vaccine3': {
        "display_label": 'Statut et intentions de vaccination contre la COVID-19',
        "concepts": ['covid19', 'vaccination'],
        "themes": ['santé'],
    },
    'cps21_fed_id': {
        "display_label": "Identification à un parti politique fédéral et force de l'attachement",
        "concepts": ['identification_partisane'],
        "themes": ['partis_politiques'],
    },
    'cps21_fed_id_str': {
        "display_label": "Identification à un parti politique fédéral et force de l'attachement",
        "concepts": ['identification_partisane'],
        "themes": ['partis_politiques'],
    },
    'cps21_prov_id': {
        "display_label": "Identification à un parti politique provincial et force de l'attachement",
        "concepts": ['identification_partisane'],
        "themes": ['partis_politiques'],
    },
    'cps21_prov_id_str': {
        "display_label": "Identification à un parti politique provincial et force de l'attachement",
        "concepts": ['identification_partisane'],
        "themes": ['partis_politiques'],
    },
    'cps21_groups_therm_1': {
        "display_label": 'Évaluation sur thermomètre des sentiments envers divers groupes sociaux',
        "concepts": ['minorités', 'diversité'],
        "themes": ['société'],
    },
    'cps21_groups_therm_2': {
        "display_label": 'Évaluation sur thermomètre des sentiments envers divers groupes sociaux',
        "concepts": ['minorités', 'diversité'],
        "themes": ['société'],
    },
    'cps21_groups_therm_7': {
        "display_label": 'Évaluation sur thermomètre des sentiments envers divers groupes sociaux',
        "concepts": ['minorités', 'diversité'],
        "themes": ['société'],
    },
    'cps21_groups_therm_3': {
        "display_label": 'Évaluation sur thermomètre des sentiments envers divers groupes sociaux',
        "concepts": ['minorités', 'diversité'],
        "themes": ['société'],
    },
    'cps21_groups_therm_4': {
        "display_label": 'Évaluation sur thermomètre des sentiments envers divers groupes sociaux',
        "concepts": ['minorités', 'diversité'],
        "themes": ['société'],
    },
    'cps21_groups_therm_6': {
        "display_label": 'Évaluation sur thermomètre des sentiments envers divers groupes sociaux',
        "concepts": ['minorités', 'diversité'],
        "themes": ['société'],
    },
    'cps21_spoil': {
        "display_label": 'Annulation intentionnelle du bulletin de vote dans le passé',
        "concepts": ['bulletin_annulé', 'protestation_électorale'],
        "themes": ['élections'],
    },
    'cps21_turnout_2019': {
        "display_label": "Participation à l'élection fédérale de 2019",
        "concepts": ['comportement_électoral_passé', 'participation_électorale'],
        "themes": ['élections'],
    },
    'cps21_vote_2019': {
        "display_label": "Parti pour lequel le répondant a voté à l'élection fédérale de 2019",
        "concepts": ['comportement_électoral_passé', 'vote'],
        "themes": ['élections', 'partis_politiques'],
    },
    'cps21_debate_fr': {
        "display_label": 'Écoute ou visionnement du débat des chefs en français',
        "concepts": ['débats_des_chefs', 'campagne_électorale'],
        "themes": ['élections', 'médias'],
    },
    'cps21_debate_fr2': {
        "display_label": 'Écoute ou visionnement du débat des chefs en français',
        "concepts": ['débats_des_chefs', 'campagne_électorale'],
        "themes": ['élections', 'médias'],
    },
    'cps21_debate_en': {
        "display_label": 'Écoute ou visionnement du débat des chefs en anglais',
        "concepts": ['débats_des_chefs', 'campagne_électorale'],
        "themes": ['élections', 'médias'],
    },
    'cps21_talkpolitics_1': {
        "display_label": 'Discussions politiques récentes avec des personnes aux opinions diverses',
        "concepts": ['discussion_politique', 'réseau_social'],
        "themes": ['politique', 'société'],
    },
    'cps21_talkpolitics_2': {
        "display_label": 'Discussions politiques récentes avec des personnes aux opinions diverses',
        "concepts": ['discussion_politique', 'réseau_social'],
        "themes": ['politique', 'société'],
    },
    'cps21_talkpolitics_3': {
        "display_label": 'Discussions politiques récentes avec des personnes aux opinions diverses',
        "concepts": ['discussion_politique', 'réseau_social'],
        "themes": ['politique', 'société'],
    },
    'cps21_talkpolitics_4': {
        "display_label": 'Discussions politiques récentes avec des personnes aux opinions diverses',
        "concepts": ['discussion_politique', 'réseau_social'],
        "themes": ['politique', 'société'],
    },
    'cps21_talkpolitics_5': {
        "display_label": 'Discussions politiques récentes avec des personnes aux opinions diverses',
        "concepts": ['discussion_politique', 'réseau_social'],
        "themes": ['politique', 'société'],
    },
    'cps21_talkpolitics_6': {
        "display_label": 'Discussions politiques récentes avec des personnes aux opinions diverses',
        "concepts": ['discussion_politique', 'réseau_social'],
        "themes": ['politique', 'société'],
    },
    'cps21_talkpolitics_7': {
        "display_label": 'Discussions politiques récentes avec des personnes aux opinions diverses',
        "concepts": ['discussion_politique', 'réseau_social'],
        "themes": ['politique', 'société'],
    },
    'cps21_residential_2a': {
        "display_label": 'Attitudes envers les Peuple Autochtones, la réconciliation et les pensionnats',
        "concepts": ['autochtones', 'réconciliation', 'pensionnats_autochtones'],
        "themes": ['société', 'droits'],
    },
    'cps21_residential_2b': {
        "display_label": 'Attitudes envers les Peuple Autochtones, la réconciliation et les pensionnats',
        "concepts": ['autochtones', 'réconciliation', 'pensionnats_autochtones'],
        "themes": ['société', 'droits'],
    },
    'cps21_residential_2c': {
        "display_label": 'Attitudes envers les Peuple Autochtones, la réconciliation et les pensionnats',
        "concepts": ['autochtones', 'réconciliation', 'pensionnats_autochtones'],
        "themes": ['société', 'droits'],
    },
    'cps21_residential_2d': {
        "display_label": 'Attitudes envers les Peuple Autochtones, la réconciliation et les pensionnats',
        "concepts": ['autochtones', 'réconciliation', 'pensionnats_autochtones'],
        "themes": ['société', 'droits'],
    },
    'cps21_religion': {
        "display_label": 'Appartenance religieuse',
        "concepts": ['religion'],
        "themes": ['démographie', 'société'],
    },
    'cps21_denomination': {
        "display_label": 'Dénomination religieuse spécifique',
        "concepts": ['religion'],
        "themes": ['démographie', 'société'],
    },
    'cps21_rel_imp': {
        "display_label": 'Importance de la religion dans la vie',
        "concepts": ['religion'],
        "themes": ['société'],
    },
    'cps21_bornin_canada': {
        "display_label": 'Naissance au Canada',
        "concepts": ['immigration', 'origine'],
        "themes": ['démographie'],
    },
    'cps21_bornin_other': {
        "display_label": 'Pays de naissance hors Canada',
        "concepts": ['immigration', 'origine'],
        "themes": ['démographie'],
    },
    'cps21_imm_year': {
        "display_label": "Année d'arrivée au Canada",
        "concepts": ['immigration'],
        "themes": ['démographie'],
    },
    'cps21_immig_status': {
        "display_label": "Catégorie d'immigration à l'arrivée",
        "concepts": ['immigration'],
        "themes": ['démographie'],
    },
    'cps21_origin_1': {
        "display_label": 'Origine ethnique ou culturelle des ancêtres (1)',
        "concepts": ['origine_ethnique', 'diversité'],
        "themes": ['démographie'],
    },
    'cps21_origin_2': {
        "display_label": 'Origine ethnique ou culturelle des ancêtres (2)',
        "concepts": ['origine_ethnique', 'diversité'],
        "themes": ['démographie'],
    },
    'cps21_origin_3': {
        "display_label": 'Origine ethnique ou culturelle des ancêtres (3)',
        "concepts": ['origine_ethnique', 'diversité'],
        "themes": ['démographie'],
    },
    'cps21_origin_4': {
        "display_label": 'Origine ethnique ou culturelle des ancêtres (4)',
        "concepts": ['origine_ethnique', 'diversité'],
        "themes": ['démographie'],
    },
    'cps21_origin_5': {
        "display_label": 'Origine ethnique ou culturelle des ancêtres (5)',
        "concepts": ['origine_ethnique', 'diversité'],
        "themes": ['démographie'],
    },
    'cps21_vismin_1': {
        "display_label": "Minorité visible ou groupe d'appartenance : Arabe",
        "concepts": ['minorités_visibles', 'diversité'],
        "themes": ['démographie', 'société'],
    },
    'cps21_vismin_2': {
        "display_label": "Minorité visible ou groupe d'appartenance : Asiatique",
        "concepts": ['minorités_visibles', 'diversité'],
        "themes": ['démographie', 'société'],
    },
    'cps21_vismin_3': {
        "display_label": "Minorité visible ou groupe d'appartenance : Noir",
        "concepts": ['minorités_visibles', 'diversité'],
        "themes": ['démographie', 'société'],
    },
    'cps21_vismin_4': {
        "display_label": "Minorité visible ou groupe d'appartenance : Autochtone",
        "concepts": ['minorités_visibles', 'diversité'],
        "themes": ['démographie', 'société'],
    },
    'cps21_vismin_5': {
        "display_label": "Minorité visible ou groupe d'appartenance : Latino",
        "concepts": ['minorités_visibles', 'diversité'],
        "themes": ['démographie', 'société'],
    },
    'cps21_vismin_6': {
        "display_label": "Minorité visible ou groupe d'appartenance : Sud-Asiatique",
        "concepts": ['minorités_visibles', 'diversité'],
        "themes": ['démographie', 'société'],
    },
    'cps21_vismin_7': {
        "display_label": "Minorité visible ou groupe d'appartenance : Sud-Est Asiatique",
        "concepts": ['minorités_visibles', 'diversité'],
        "themes": ['démographie', 'société'],
    },
    'cps21_vismin_8': {
        "display_label": "Minorité visible ou groupe d'appartenance : Ouest-Asiatique",
        "concepts": ['minorités_visibles', 'diversité'],
        "themes": ['démographie', 'société'],
    },
    'cps21_vismin_9': {
        "display_label": "Minorité visible ou groupe d'appartenance : Blanc",
        "concepts": ['minorités_visibles', 'diversité'],
        "themes": ['démographie', 'société'],
    },
    'cps21_vismin_10': {
        "display_label": "Minorité visible ou groupe d'appartenance : Autre",
        "concepts": ['minorités_visibles', 'diversité'],
        "themes": ['démographie', 'société'],
    },
    'cps21_vismin_11': {
        "display_label": "Minorité visible ou groupe d'appartenance : Aucun",
        "concepts": ['minorités_visibles', 'diversité'],
        "themes": ['démographie', 'société'],
    },
    'cps21_vismin_12': {
        "display_label": "Minorité visible ou groupe d'appartenance : Refus",
        "concepts": ['minorités_visibles', 'diversité'],
        "themes": ['démographie', 'société'],
    },
    'cps21_two_spirit': {
        "display_label": 'Identité Bi-spirituelle (Two-Spirit)',
        "concepts": ['lgbtq+', 'identité'],
        "themes": ['démographie', 'société'],
    },
    'cps21_sexuality': {
        "display_label": 'Orientation sexuelle',
        "concepts": ['lgbtq+', 'orientation_sexuelle'],
        "themes": ['démographie', 'société'],
    },
    'cps21_language_1': {
        "display_label": "Langue apprise dans l'enfance : Anglais",
        "concepts": ['langue'],
        "themes": ['démographie'],
    },
    'cps21_language_2': {
        "display_label": "Langue apprise dans l'enfance : Français",
        "concepts": ['langue'],
        "themes": ['démographie'],
    },
    'cps21_language_3': {
        "display_label": "Langue apprise dans l'enfance : Langue autochtone",
        "concepts": ['langue'],
        "themes": ['démographie'],
    },
    'cps21_language_4': {
        "display_label": "Langue apprise dans l'enfance : Arabe",
        "concepts": ['langue'],
        "themes": ['démographie'],
    },
    'cps21_language_5': {
        "display_label": "Langue apprise dans l'enfance : Chinois/Cantonais/Mandarin",
        "concepts": ['langue'],
        "themes": ['démographie'],
    },
    'cps21_language_6': {
        "display_label": "Langue apprise dans l'enfance : Filipino/Tagalog",
        "concepts": ['langue'],
        "themes": ['démographie'],
    },
    'cps21_language_7': {
        "display_label": "Langue apprise dans l'enfance : Allemand",
        "concepts": ['langue'],
        "themes": ['démographie'],
    },
    'cps21_language_8': {
        "display_label": "Langue apprise dans l'enfance : Hindi/Gujarati",
        "concepts": ['langue'],
        "themes": ['démographie'],
    },
    'cps21_language_9': {
        "display_label": "Langue apprise dans l'enfance : Italien",
        "concepts": ['langue'],
        "themes": ['démographie'],
    },
    'cps21_language_10': {
        "display_label": "Langue apprise dans l'enfance : Coréen",
        "concepts": ['langue'],
        "themes": ['démographie'],
    },
    'cps21_language_11': {
        "display_label": "Langue apprise dans l'enfance : Punjabi/Urdu",
        "concepts": ['langue'],
        "themes": ['démographie'],
    },
    'cps21_language_12': {
        "display_label": "Langue apprise dans l'enfance : Persan/Farsi",
        "concepts": ['langue'],
        "themes": ['démographie'],
    },
    'cps21_language_13': {
        "display_label": "Langue apprise dans l'enfance : Russe",
        "concepts": ['langue'],
        "themes": ['démographie'],
    },
    'cps21_language_14': {
        "display_label": "Langue apprise dans l'enfance : Espagnol",
        "concepts": ['langue'],
        "themes": ['démographie'],
    },
    'cps21_language_15': {
        "display_label": "Langue apprise dans l'enfance : Tamoul",
        "concepts": ['langue'],
        "themes": ['démographie'],
    },
    'cps21_language_16': {
        "display_label": "Langue apprise dans l'enfance : Vietnamien",
        "concepts": ['langue'],
        "themes": ['démographie'],
    },
    'cps21_language_17': {
        "display_label": "Langue apprise dans l'enfance : Autre",
        "concepts": ['langue'],
        "themes": ['démographie'],
    },
    'cps21_language_18': {
        "display_label": "Langue apprise dans l'enfance : Refus",
        "concepts": ['langue'],
        "themes": ['démographie'],
    },
    'cps21_employment': {
        "display_label": "Statut d'emploi",
        "concepts": ['emploi', 'travail'],
        "themes": ['démographie'],
    },
    'cps21_union': {
        "display_label": 'Appartenance syndicale',
        "concepts": ['syndicat', 'travail'],
        "themes": ['démographie'],
    },
    'cps21_children': {
        "display_label": "Nombre d'enfants au foyer",
        "concepts": ['famille', 'enfants'],
        "themes": ['démographie'],
    },
    'cps21_children_atten_1': {
        "display_label": 'Fréquentation scolaire des enfants : Garderie',
        "concepts": ['famille', 'éducation', 'enfants'],
        "themes": ['démographie'],
    },
    'cps21_children_atten_2': {
        "display_label": 'Fréquentation scolaire des enfants : École primaire',
        "concepts": ['famille', 'éducation', 'enfants'],
        "themes": ['démographie'],
    },
    'cps21_children_atten_3': {
        "display_label": 'Fréquentation scolaire des enfants : École secondaire',
        "concepts": ['famille', 'éducation', 'enfants'],
        "themes": ['démographie'],
    },
    'cps21_children_atten_4': {
        "display_label": 'Fréquentation scolaire des enfants : Études postsecondaires',
        "concepts": ['famille', 'éducation', 'enfants'],
        "themes": ['démographie'],
    },
    'cps21_children_atten_5': {
        "display_label": 'Fréquentation scolaire des enfants : Aucun établissement',
        "concepts": ['famille', 'éducation', 'enfants'],
        "themes": ['démographie'],
    },
    'cps21_children_atten_6': {
        "display_label": 'Fréquentation scolaire des enfants : Refus',
        "concepts": ['famille', 'éducation', 'enfants'],
        "themes": ['démographie'],
    },
    'cps21_income_number': {
        "display_label": 'Revenu annuel brut du ménage',
        "concepts": ['revenu', 'finances_personnelles'],
        "themes": ['démographie', 'économie'],
    },
    'cps21_income_cat': {
        "display_label": 'Revenu annuel brut du ménage',
        "concepts": ['revenu', 'finances_personnelles'],
        "themes": ['démographie', 'économie'],
    },
    'cps21_yob_2': {
        "display_label": 'Âge ou année de naissance du répondant',
        "concepts": ['âge'],
        "themes": ['démographie'],
    },
    'cps21_property_1': {
        "display_label": 'Possession de patrimoine : Résidence principale',
        "concepts": ['patrimoine', 'finances_personnelles'],
        "themes": ['démographie', 'économie'],
    },
    'cps21_property_2': {
        "display_label": 'Possession de patrimoine : Entreprise ou ferme',
        "concepts": ['patrimoine', 'finances_personnelles'],
        "themes": ['démographie', 'économie'],
    },
    'cps21_property_3': {
        "display_label": 'Possession de patrimoine : Actions ou obligations',
        "concepts": ['patrimoine', 'finances_personnelles'],
        "themes": ['démographie', 'économie'],
    },
    'cps21_property_4': {
        "display_label": 'Possession de patrimoine : Épargne',
        "concepts": ['patrimoine', 'finances_personnelles'],
        "themes": ['démographie', 'économie'],
    },
    'cps21_property_5': {
        "display_label": 'Possession de patrimoine : Aucun patrimoine',
        "concepts": ['patrimoine', 'finances_personnelles'],
        "themes": ['démographie', 'économie'],
    },
    'cps21_property_6': {
        "display_label": 'Possession de patrimoine : Refus',
        "concepts": ['patrimoine', 'finances_personnelles'],
        "themes": ['démographie', 'économie'],
    },
    'cps21_marital': {
        "display_label": 'Statut matrimonial',
        "concepts": ['statut_civil'],
        "themes": ['démographie'],
    },
    'cps21_household': {
        "display_label": "Taille du ménage (nombre d'occupants)",
        "concepts": ['famille', 'logement'],
        "themes": ['démographie'],
    },
    'pes21_province': {
        "display_label": 'Province ou territoire de résidence',
        "concepts": ['province', 'région'],
        "themes": ['démographie'],
    },
    'pes21_mostimpissue': {
        "display_label": "Enjeu le plus important à l'échelle nationale à cette élection",
        "concepts": ['enjeux_électoraux'],
        "themes": ['élections', 'politique'],
    },
    'pes21_partyissue_4': {
        "display_label": 'Enjeu ou message principal mis en avant par chaque parti',
        "concepts": ['campagne_électorale', 'enjeux_électoraux'],
        "themes": ['élections', 'partis_politiques'],
    },
    'pes21_partyissue_5': {
        "display_label": 'Enjeu ou message principal mis en avant par chaque parti',
        "concepts": ['campagne_électorale', 'enjeux_électoraux'],
        "themes": ['élections', 'partis_politiques'],
    },
    'pes21_partyissue_6': {
        "display_label": 'Enjeu ou message principal mis en avant par chaque parti',
        "concepts": ['campagne_électorale', 'enjeux_électoraux'],
        "themes": ['élections', 'partis_politiques'],
    },
    'pes21_partyissue_7': {
        "display_label": 'Enjeu ou message principal mis en avant par chaque parti',
        "concepts": ['campagne_électorale', 'enjeux_électoraux'],
        "themes": ['élections', 'partis_politiques'],
    },
    'pes21_partyissue_8': {
        "display_label": 'Enjeu ou message principal mis en avant par chaque parti',
        "concepts": ['campagne_électorale', 'enjeux_électoraux'],
        "themes": ['élections', 'partis_politiques'],
    },
    'pes21_partyissue_9': {
        "display_label": 'Enjeu ou message principal mis en avant par chaque parti',
        "concepts": ['campagne_électorale', 'enjeux_électoraux'],
        "themes": ['élections', 'partis_politiques'],
    },
    'pes21_turnout2021': {
        "display_label": "Participation à l'élection fédérale du 20 septembre 2021",
        "concepts": ['participation_électorale', 'abstention'],
        "themes": ['élections'],
    },
    'pes21_notvotereason1': {
        "display_label": 'Principale raison de la non-participation au scrutin',
        "concepts": ['abstention', 'participation_électorale'],
        "themes": ['élections'],
    },
    'pes21_howvote': {
        "display_label": 'Mode de vote prévu ou utilisé (bureau de vote, anticipation, poste)',
        "concepts": ['mode_de_vote', 'participation_électorale'],
        "themes": ['élections'],
    },
    'pes21_votingsafe': {
        "display_label": 'Sentiment de sécurité sanitaire lors du vote en personne',
        "concepts": ['sécurité_sanitaire', 'mode_de_vote'],
        "themes": ['élections', 'santé'],
    },
    'pes_maileasy': {
        "display_label": 'Évaluation de la facilité du vote par la poste',
        "concepts": ['vote_par_correspondance', 'accessibilité_électorale'],
        "themes": ['élections'],
    },
    'pes_maildifficult_1': {
        "display_label": 'Obstacles et difficultés rencontrés lors du vote par la poste',
        "concepts": ['vote_par_correspondance', 'accessibilité_électorale'],
        "themes": ['élections'],
    },
    'pes_maildifficult_2': {
        "display_label": 'Obstacles et difficultés rencontrés lors du vote par la poste',
        "concepts": ['vote_par_correspondance', 'accessibilité_électorale'],
        "themes": ['élections'],
    },
    'pes_maildifficult_3': {
        "display_label": 'Obstacles et difficultés rencontrés lors du vote par la poste',
        "concepts": ['vote_par_correspondance', 'accessibilité_électorale'],
        "themes": ['élections'],
    },
    'pes_maildifficult_4': {
        "display_label": 'Obstacles et difficultés rencontrés lors du vote par la poste',
        "concepts": ['vote_par_correspondance', 'accessibilité_électorale'],
        "themes": ['élections'],
    },
    'pes_maildifficult_5': {
        "display_label": 'Obstacles et difficultés rencontrés lors du vote par la poste',
        "concepts": ['vote_par_correspondance', 'accessibilité_électorale'],
        "themes": ['élections'],
    },
    'pes_maildifficult_6': {
        "display_label": 'Obstacles et difficultés rencontrés lors du vote par la poste',
        "concepts": ['vote_par_correspondance', 'accessibilité_électorale'],
        "themes": ['élections'],
    },
    'pes_maildifficult_7': {
        "display_label": 'Obstacles et difficultés rencontrés lors du vote par la poste',
        "concepts": ['vote_par_correspondance', 'accessibilité_électorale'],
        "themes": ['élections'],
    },
    'pes_maildifficult_8': {
        "display_label": 'Obstacles et difficultés rencontrés lors du vote par la poste',
        "concepts": ['vote_par_correspondance', 'accessibilité_électorale'],
        "themes": ['élections'],
    },
    'pes_maildifficult_9': {
        "display_label": 'Obstacles et difficultés rencontrés lors du vote par la poste',
        "concepts": ['vote_par_correspondance', 'accessibilité_électorale'],
        "themes": ['élections'],
    },
    'pes_maildifficult_10': {
        "display_label": 'Obstacles et difficultés rencontrés lors du vote par la poste',
        "concepts": ['vote_par_correspondance', 'accessibilité_électorale'],
        "themes": ['élections'],
    },
    'pes_maildifficult_11': {
        "display_label": 'Obstacles et difficultés rencontrés lors du vote par la poste',
        "concepts": ['vote_par_correspondance', 'accessibilité_électorale'],
        "themes": ['élections'],
    },
    'pes_maildifficult_12': {
        "display_label": 'Obstacles et difficultés rencontrés lors du vote par la poste',
        "concepts": ['vote_par_correspondance', 'accessibilité_électorale'],
        "themes": ['élections'],
    },
    'pes_maildifficult_13': {
        "display_label": 'Obstacles et difficultés rencontrés lors du vote par la poste',
        "concepts": ['vote_par_correspondance', 'accessibilité_électorale'],
        "themes": ['élections'],
    },
    'Q145': {
        "display_label": "Facilité d'utilisation du bulletin de vote par la poste",
        "concepts": ['vote_par_correspondance', 'accessibilité_électorale'],
        "themes": ['élections'],
    },
    'pes21_votechoice2021': {
        "display_label": 'Parti pour lequel le répondant a voté le 20 septembre 2021',
        "concepts": ['vote', 'choix_de_vote'],
        "themes": ['élections', 'partis_politiques'],
    },
    'pes21_resason_chose': {
        "display_label": 'Raison principale du choix de parti au scrutin (politiques, chef, candidat)',
        "concepts": ['facteurs_de_vote', 'motivation_de_vote'],
        "themes": ['élections', 'partis_politiques'],
    },
    'pes21_when_decide': {
        "display_label": 'Moment de la prise de décision de vote (avant/pendant la campagne, jour J)',
        "concepts": ['décision_de_vote', 'campagne_électorale'],
        "themes": ['élections'],
    },
    'pes21_pr_votechoice': {
        "display_label": 'Choix de vote contrefactuel si le répondant avait pu voter',
        "concepts": ['choix_de_vote'],
        "themes": ['élections', 'partis_politiques'],
    },
    'pes21_dem_sat': {
        "display_label": 'Satisfaction envers le fonctionnement de la démocratie au Canada',
        "concepts": ['démocratie', 'satisfaction'],
        "themes": ['démocratie', 'politique'],
    },
    'pes21_campatt': {
        "display_label": 'Attention accordée à la campagne électorale fédérale',
        "concepts": ['intérêt_politique', 'campagne_électorale'],
        "themes": ['politique', 'élections'],
    },
    'pes21_where_info': {
        "display_label": "Principale source d'information sur la campagne électorale",
        "concepts": ['médias', 'information_politique'],
        "themes": ['médias', 'politique'],
    },
    'pes21_contact1': {
        "display_label": 'Contact du répondant par les partis ou candidats pendant la campagne',
        "concepts": ['campagne_électorale', 'contact_partisan'],
        "themes": ['élections', 'partis_politiques'],
    },
    'pes21_contact2_1': {
        "display_label": 'Contact du répondant par les partis ou candidats pendant la campagne',
        "concepts": ['campagne_électorale', 'contact_partisan'],
        "themes": ['élections', 'partis_politiques'],
    },
    'pes21_contact2_2': {
        "display_label": 'Contact du répondant par les partis ou candidats pendant la campagne',
        "concepts": ['campagne_électorale', 'contact_partisan'],
        "themes": ['élections', 'partis_politiques'],
    },
    'pes21_contact2_3': {
        "display_label": 'Contact du répondant par les partis ou candidats pendant la campagne',
        "concepts": ['campagne_électorale', 'contact_partisan'],
        "themes": ['élections', 'partis_politiques'],
    },
    'pes21_contact2_4': {
        "display_label": 'Contact du répondant par les partis ou candidats pendant la campagne',
        "concepts": ['campagne_électorale', 'contact_partisan'],
        "themes": ['élections', 'partis_politiques'],
    },
    'pes21_contact2_5': {
        "display_label": 'Contact du répondant par les partis ou candidats pendant la campagne',
        "concepts": ['campagne_électorale', 'contact_partisan'],
        "themes": ['élections', 'partis_politiques'],
    },
    'pes21_contact2_6': {
        "display_label": 'Contact du répondant par les partis ou candidats pendant la campagne',
        "concepts": ['campagne_électorale', 'contact_partisan'],
        "themes": ['élections', 'partis_politiques'],
    },
    'pes21_contact2_7': {
        "display_label": 'Contact du répondant par les partis ou candidats pendant la campagne',
        "concepts": ['campagne_électorale', 'contact_partisan'],
        "themes": ['élections', 'partis_politiques'],
    },
    'pes21_contact2_8': {
        "display_label": 'Contact du répondant par les partis ou candidats pendant la campagne',
        "concepts": ['campagne_électorale', 'contact_partisan'],
        "themes": ['élections', 'partis_politiques'],
    },
    'pes21_formgovt': {
        "display_label": 'Principe de légitimité pour former le gouvernement (sièges vs votes)',
        "concepts": ['légitimité_gouvernementale', 'système_électoral'],
        "themes": ['démocratie'],
    },
    'pes21_keepromises': {
        "display_label": 'Perception générale du respect des promesses électorales par les partis',
        "concepts": ['promesses_électorales', 'confiance_politique'],
        "themes": ['démocratie', 'politique'],
    },
    'pes21_groups1_1': {
        "display_label": 'Évaluation sur thermomètre des sentiments envers divers groupes sociaux',
        "concepts": ['minorités', 'diversité'],
        "themes": ['société'],
    },
    'pes21_groups1_2': {
        "display_label": 'Évaluation sur thermomètre des sentiments envers divers groupes sociaux',
        "concepts": ['minorités', 'diversité'],
        "themes": ['société'],
    },
    'pes21_groups1_3': {
        "display_label": 'Évaluation sur thermomètre des sentiments envers divers groupes sociaux',
        "concepts": ['minorités', 'diversité'],
        "themes": ['société'],
    },
    'pes21_groups1_4': {
        "display_label": 'Évaluation sur thermomètre des sentiments envers divers groupes sociaux',
        "concepts": ['minorités', 'diversité'],
        "themes": ['société'],
    },
    'pes21_paymed': {
        "display_label": "Attitudes sur le rôle de l'État dans la santé, l'emploi et la réduction des inégalités",
        "concepts": ['rôle_de_l_état', 'inégalités', 'redistribution'],
        "themes": ['économie', 'politique_sociale'],
    },
    'pes21_senate': {
        "display_label": "Position sur l'abolition du Sénat du Canada",
        "concepts": ['réforme_institutionnelle', 'sénat'],
        "themes": ['démocratie'],
    },
    'pes21_losetouch': {
        "display_label": 'Sentiment que les députés élus perdent rapidement le contact avec les citoyens',
        "concepts": ['cynisme_politique', 'représentation'],
        "themes": ['démocratie', 'politique'],
    },
    'pes21_hatespeech': {
        "display_label": 'Interdiction légale du discours haineux visant les groupes minoritaires',
        "concepts": ['discours_haineux', 'liberté_d_expression'],
        "themes": ['société', 'droits'],
    },
    'pes21_envirojob': {
        "display_label": "Arbitrage entre protection de l'environnement et création d'emplois",
        "concepts": ['environnement', 'emploi'],
        "themes": ['environnement', 'économie'],
    },
    'pes21_govtcare': {
        "display_label": "Sentiment que le gouvernement ne se soucie pas de l'opinion des citoyens",
        "concepts": ['efficacité_politique', 'confiance_politique'],
        "themes": ['démocratie', 'politique'],
    },
    'pes21_famvalues': {
        "display_label": 'Importance accordée aux valeurs familiales traditionnelles',
        "concepts": ['conservatisme', 'valeurs_traditionnelles'],
        "themes": ['société'],
    },
    'pes21_bilingualism': {
        "display_label": 'Position sur la promotion du bilinguisme officiel au Canada',
        "concepts": ['bilinguisme', 'langues_officielles'],
        "themes": ['société', 'langue'],
    },
    'pes21_equalrights': {
        "display_label": "Attitudes envers l'égalité des sexes, les droits des femmes et des minorités",
        "concepts": ['égalité_des_sexes', 'minorités', 'droits'],
        "themes": ['société', 'droits'],
    },
    'pes21_fitin': {
        "display_label": "Attitudes envers les niveaux d'immigration, les réfugiés et l'intégration",
        "concepts": ['immigration', 'réfugiés', 'intégration'],
        "themes": ['immigration', 'société'],
    },
    'pes21_immigjobs': {
        "display_label": "Attitudes envers les niveaux d'immigration, les réfugiés et l'intégration",
        "concepts": ['immigration', 'réfugiés', 'intégration'],
        "themes": ['immigration', 'société'],
    },
    'pes21_ab_favors': {
        "display_label": 'Attitudes envers les Peuple Autochtones, la réconciliation et les pensionnats',
        "concepts": ['autochtones', 'réconciliation', 'pensionnats_autochtones'],
        "themes": ['société', 'droits'],
    },
    'pes21_ab_deserve': {
        "display_label": 'Attitudes envers les Peuple Autochtones, la réconciliation et les pensionnats',
        "concepts": ['autochtones', 'réconciliation', 'pensionnats_autochtones'],
        "themes": ['société', 'droits'],
    },
    'pes21_ab_col': {
        "display_label": 'Attitudes envers les Peuple Autochtones, la réconciliation et les pensionnats',
        "concepts": ['autochtones', 'réconciliation', 'pensionnats_autochtones'],
        "themes": ['société', 'droits'],
    },
    'pes21_govtprograms': {
        "display_label": 'Capacité du gouvernement à financer les services et programmes sociaux',
        "concepts": ['programmes_sociaux', 'rôle_de_l_état'],
        "themes": ['économie', 'politique_sociale'],
    },
    'pes21_tieus': {
        "display_label": 'Orientation des relations internationales du Canada (avec États-Unis / Chine)',
        "concepts": ['relations_internationales', 'politique_étrangère'],
        "themes": ['politique'],
    },
    'pes21_tiechina': {
        "display_label": 'Orientation des relations internationales du Canada (avec États-Unis / Chine)',
        "concepts": ['relations_internationales', 'politique_étrangère'],
        "themes": ['politique'],
    },
    'pes21_ethid_1': {
        "display_label": "Importance accordée à l'identité canadienne, ethnique et linguistique",
        "concepts": ['identité_canadienne', 'identité_nationale'],
        "themes": ['société'],
    },
    'pes21_ethid_2': {
        "display_label": "Importance accordée à l'identité canadienne, ethnique et linguistique",
        "concepts": ['identité_canadienne', 'identité_nationale'],
        "themes": ['société'],
    },
    'pes21_ethid_3': {
        "display_label": "Importance accordée à l'identité canadienne, ethnique et linguistique",
        "concepts": ['identité_canadienne', 'identité_nationale'],
        "themes": ['société'],
    },
    'pes21_can_id_1': {
        "display_label": "Importance accordée à l'identité canadienne, ethnique et linguistique",
        "concepts": ['identité_canadienne', 'identité_nationale'],
        "themes": ['société'],
    },
    'pes21_can_id_2': {
        "display_label": "Importance accordée à l'identité canadienne, ethnique et linguistique",
        "concepts": ['identité_canadienne', 'identité_nationale'],
        "themes": ['société'],
    },
    'pes21_can_id_3': {
        "display_label": "Importance accordée à l'identité canadienne, ethnique et linguistique",
        "concepts": ['identité_canadienne', 'identité_nationale'],
        "themes": ['société'],
    },
    'pes21_can_id_4': {
        "display_label": "Importance accordée à l'identité canadienne, ethnique et linguistique",
        "concepts": ['identité_canadienne', 'identité_nationale'],
        "themes": ['société'],
    },
    'pes21_can_id_5': {
        "display_label": "Importance accordée à l'identité canadienne, ethnique et linguistique",
        "concepts": ['identité_canadienne', 'identité_nationale'],
        "themes": ['société'],
    },
    'pes21_can_id_6': {
        "display_label": "Importance accordée à l'identité canadienne, ethnique et linguistique",
        "concepts": ['identité_canadienne', 'identité_nationale'],
        "themes": ['société'],
    },
    'pes21_conf_inst1_1': {
        "display_label": 'Confiance envers les institutions (gouvernement, médias, justice, police, armée)',
        "concepts": ['confiance_institutionnelle', 'confiance_politique'],
        "themes": ['démocratie', 'société'],
    },
    'pes21_conf_inst1_2': {
        "display_label": 'Confiance envers les institutions (gouvernement, médias, justice, police, armée)',
        "concepts": ['confiance_institutionnelle', 'confiance_politique'],
        "themes": ['démocratie', 'société'],
    },
    'pes21_conf_inst1_3': {
        "display_label": 'Confiance envers les institutions (gouvernement, médias, justice, police, armée)',
        "concepts": ['confiance_institutionnelle', 'confiance_politique'],
        "themes": ['démocratie', 'société'],
    },
    'pes21_conf_inst1_4': {
        "display_label": 'Confiance envers les institutions (gouvernement, médias, justice, police, armée)',
        "concepts": ['confiance_institutionnelle', 'confiance_politique'],
        "themes": ['démocratie', 'société'],
    },
    'pes21_conf_inst2_1': {
        "display_label": 'Confiance envers les institutions (gouvernement, médias, justice, police, armée)',
        "concepts": ['confiance_institutionnelle', 'confiance_politique'],
        "themes": ['démocratie', 'société'],
    },
    'pes21_conf_inst2_2': {
        "display_label": 'Confiance envers les institutions (gouvernement, médias, justice, police, armée)',
        "concepts": ['confiance_institutionnelle', 'confiance_politique'],
        "themes": ['démocratie', 'société'],
    },
    'pes21_conf_inst2_3': {
        "display_label": 'Confiance envers les institutions (gouvernement, médias, justice, police, armée)',
        "concepts": ['confiance_institutionnelle', 'confiance_politique'],
        "themes": ['démocratie', 'société'],
    },
    'pes21_conf_inst2_4': {
        "display_label": 'Confiance envers les institutions (gouvernement, médias, justice, police, armée)',
        "concepts": ['confiance_institutionnelle', 'confiance_politique'],
        "themes": ['démocratie', 'société'],
    },
    'pes21_conf_inst2_5': {
        "display_label": 'Confiance envers les institutions (gouvernement, médias, justice, police, armée)',
        "concepts": ['confiance_institutionnelle', 'confiance_politique'],
        "themes": ['démocratie', 'société'],
    },
    'pes21_conf_inst2_6': {
        "display_label": 'Confiance envers les institutions (gouvernement, médias, justice, police, armée)',
        "concepts": ['confiance_institutionnelle', 'confiance_politique'],
        "themes": ['démocratie', 'société'],
    },
    'pes21_emb_none': {
        "display_label": "Attitudes et évaluation de l'administration des élections par Élections Canada",
        "concepts": ['administration_électorale', 'elections_canada'],
        "themes": ['élections', 'démocratie'],
    },
    'pes21_internetvote1': {
        "display_label": 'Confiance et attitudes envers le vote par la poste, par Internet et la sécurité électorale',
        "concepts": ['sécurité_électorale', 'vote_électronique', 'accessibilité_électorale'],
        "themes": ['démocratie', 'élections'],
    },
    'pes21_internetvote2': {
        "display_label": 'Confiance et attitudes envers le vote par la poste, par Internet et la sécurité électorale',
        "concepts": ['sécurité_électorale', 'vote_électronique', 'accessibilité_électorale'],
        "themes": ['démocratie', 'élections'],
    },
    'pes21_foreign': {
        "display_label": 'Confiance et attitudes envers le vote par la poste, par Internet et la sécurité électorale',
        "concepts": ['sécurité_électorale', 'vote_électronique', 'accessibilité_électorale'],
        "themes": ['démocratie', 'élections'],
    },
    'pes21_emb_satif': {
        "display_label": "Attitudes et évaluation de l'administration des élections par Élections Canada",
        "concepts": ['administration_électorale', 'elections_canada'],
        "themes": ['élections', 'démocratie'],
    },
    'pes21_emb8': {
        "display_label": "Attitudes et évaluation de l'administration des élections par Élections Canada",
        "concepts": ['administration_électorale', 'elections_canada'],
        "themes": ['élections', 'démocratie'],
    },
    'pes21_internetregis': {
        "display_label": 'Confiance et attitudes envers le vote par la poste, par Internet et la sécurité électorale',
        "concepts": ['sécurité_électorale', 'vote_électronique', 'accessibilité_électorale'],
        "themes": ['démocratie', 'élections'],
    },
    'pes21_internetrisk1': {
        "display_label": 'Confiance et attitudes envers le vote par la poste, par Internet et la sécurité électorale',
        "concepts": ['sécurité_électorale', 'vote_électronique', 'accessibilité_électorale'],
        "themes": ['démocratie', 'élections'],
    },
    'pes21_internetrisk2': {
        "display_label": 'Confiance et attitudes envers le vote par la poste, par Internet et la sécurité électorale',
        "concepts": ['sécurité_électorale', 'vote_électronique', 'accessibilité_électorale'],
        "themes": ['démocratie', 'élections'],
    },
    'pes21_emb_register': {
        "display_label": "Attitudes et évaluation de l'administration des élections par Élections Canada",
        "concepts": ['administration_électorale', 'elections_canada'],
        "themes": ['élections', 'démocratie'],
    },
    'pes21_emb_card': {
        "display_label": "Attitudes et évaluation de l'administration des élections par Élections Canada",
        "concepts": ['administration_électorale', 'elections_canada'],
        "themes": ['élections', 'démocratie'],
    },
    'pes21_emb_register2': {
        "display_label": "Attitudes et évaluation de l'administration des élections par Élections Canada",
        "concepts": ['administration_électorale', 'elections_canada'],
        "themes": ['élections', 'démocratie'],
    },
    'pes21_emb_reg_how': {
        "display_label": "Attitudes et évaluation de l'administration des élections par Élections Canada",
        "concepts": ['administration_électorale', 'elections_canada'],
        "themes": ['élections', 'démocratie'],
    },
    'pes21_emb_register3': {
        "display_label": "Attitudes et évaluation de l'administration des élections par Élections Canada",
        "concepts": ['administration_électorale', 'elections_canada'],
        "themes": ['élections', 'démocratie'],
    },
    'pes21_emb4_1': {
        "display_label": "Attitudes et évaluation de l'administration des élections par Élections Canada",
        "concepts": ['administration_électorale', 'elections_canada'],
        "themes": ['élections', 'démocratie'],
    },
    'pes21_emb4_2': {
        "display_label": "Attitudes et évaluation de l'administration des élections par Élections Canada",
        "concepts": ['administration_électorale', 'elections_canada'],
        "themes": ['élections', 'démocratie'],
    },
    'pes21_emb4_3': {
        "display_label": "Attitudes et évaluation de l'administration des élections par Élections Canada",
        "concepts": ['administration_électorale', 'elections_canada'],
        "themes": ['élections', 'démocratie'],
    },
    'pes21_emb4_4': {
        "display_label": "Attitudes et évaluation de l'administration des élections par Élections Canada",
        "concepts": ['administration_électorale', 'elections_canada'],
        "themes": ['élections', 'démocratie'],
    },
    'pes21_emb4_5': {
        "display_label": "Attitudes et évaluation de l'administration des élections par Élections Canada",
        "concepts": ['administration_électorale', 'elections_canada'],
        "themes": ['élections', 'démocratie'],
    },
    'pes21_emb4_6': {
        "display_label": "Attitudes et évaluation de l'administration des élections par Élections Canada",
        "concepts": ['administration_électorale', 'elections_canada'],
        "themes": ['élections', 'démocratie'],
    },
    'pes21_emb4_7': {
        "display_label": "Attitudes et évaluation de l'administration des élections par Élections Canada",
        "concepts": ['administration_électorale', 'elections_canada'],
        "themes": ['élections', 'démocratie'],
    },
    'pes21_emb4_8': {
        "display_label": "Attitudes et évaluation de l'administration des élections par Élections Canada",
        "concepts": ['administration_électorale', 'elections_canada'],
        "themes": ['élections', 'démocratie'],
    },
    'pes21_emb4_9': {
        "display_label": "Attitudes et évaluation de l'administration des élections par Élections Canada",
        "concepts": ['administration_électorale', 'elections_canada'],
        "themes": ['élections', 'démocratie'],
    },
    'pes21_emb4_10': {
        "display_label": "Attitudes et évaluation de l'administration des élections par Élections Canada",
        "concepts": ['administration_électorale', 'elections_canada'],
        "themes": ['élections', 'démocratie'],
    },
    'pes21_emb4_11': {
        "display_label": "Attitudes et évaluation de l'administration des élections par Élections Canada",
        "concepts": ['administration_électorale', 'elections_canada'],
        "themes": ['élections', 'démocratie'],
    },
    'pes21_emb4_12': {
        "display_label": "Attitudes et évaluation de l'administration des élections par Élections Canada",
        "concepts": ['administration_électorale', 'elections_canada'],
        "themes": ['élections', 'démocratie'],
    },
    'pes21_emb4_13': {
        "display_label": "Attitudes et évaluation de l'administration des élections par Élections Canada",
        "concepts": ['administration_électorale', 'elections_canada'],
        "themes": ['élections', 'démocratie'],
    },
    'pes21_emb4_14': {
        "display_label": "Attitudes et évaluation de l'administration des élections par Élections Canada",
        "concepts": ['administration_électorale', 'elections_canada'],
        "themes": ['élections', 'démocratie'],
    },
    'pes21_emb4_15': {
        "display_label": "Attitudes et évaluation de l'administration des élections par Élections Canada",
        "concepts": ['administration_électorale', 'elections_canada'],
        "themes": ['élections', 'démocratie'],
    },
    'pes21_emb4_16': {
        "display_label": "Attitudes et évaluation de l'administration des élections par Élections Canada",
        "concepts": ['administration_électorale', 'elections_canada'],
        "themes": ['élections', 'démocratie'],
    },
    'pes21_emb7_2': {
        "display_label": "Attitudes et évaluation de l'administration des élections par Élections Canada",
        "concepts": ['administration_électorale', 'elections_canada'],
        "themes": ['élections', 'démocratie'],
    },
    'pes21_emb7_3': {
        "display_label": "Attitudes et évaluation de l'administration des élections par Élections Canada",
        "concepts": ['administration_électorale', 'elections_canada'],
        "themes": ['élections', 'démocratie'],
    },
    'pes21_emb7_5': {
        "display_label": "Attitudes et évaluation de l'administration des élections par Élections Canada",
        "concepts": ['administration_électorale', 'elections_canada'],
        "themes": ['élections', 'démocratie'],
    },
    'pes21_emb_info': {
        "display_label": "Attitudes et évaluation de l'administration des élections par Élections Canada",
        "concepts": ['administration_électorale', 'elections_canada'],
        "themes": ['élections', 'démocratie'],
    },
    'pes21_embsatisfy': {
        "display_label": "Attitudes et évaluation de l'administration des élections par Élections Canada",
        "concepts": ['administration_électorale', 'elections_canada'],
        "themes": ['élections', 'démocratie'],
    },
    'pes21_provvote': {
        "display_label": 'Intention de vote aux élections provinciales',
        "concepts": ['intentions_de_vote', 'élections_provinciales'],
        "themes": ['élections', 'partis_politiques'],
    },
    'pes21_friendswho_1_1': {
        "display_label": "Composition politique et partisane du réseau social d'amis",
        "concepts": ['réseau_social', 'discussion_politique'],
        "themes": ['société', 'politique'],
    },
    'pes21_friendswho_1_2': {
        "display_label": "Composition politique et partisane du réseau social d'amis",
        "concepts": ['réseau_social', 'discussion_politique'],
        "themes": ['société', 'politique'],
    },
    'pes21_friendswho_1_3': {
        "display_label": "Composition politique et partisane du réseau social d'amis",
        "concepts": ['réseau_social', 'discussion_politique'],
        "themes": ['société', 'politique'],
    },
    'pes21_friendswho_2_1': {
        "display_label": "Composition politique et partisane du réseau social d'amis",
        "concepts": ['réseau_social', 'discussion_politique'],
        "themes": ['société', 'politique'],
    },
    'pes21_friendswho_2_2': {
        "display_label": "Composition politique et partisane du réseau social d'amis",
        "concepts": ['réseau_social', 'discussion_politique'],
        "themes": ['société', 'politique'],
    },
    'pes21_friendswho_2_3': {
        "display_label": "Composition politique et partisane du réseau social d'amis",
        "concepts": ['réseau_social', 'discussion_politique'],
        "themes": ['société', 'politique'],
    },
    'pes21_friendswho_3_1': {
        "display_label": "Composition politique et partisane du réseau social d'amis",
        "concepts": ['réseau_social', 'discussion_politique'],
        "themes": ['société', 'politique'],
    },
    'pes21_friendswho_3_2': {
        "display_label": "Composition politique et partisane du réseau social d'amis",
        "concepts": ['réseau_social', 'discussion_politique'],
        "themes": ['société', 'politique'],
    },
    'pes21_friendswho_3_3': {
        "display_label": "Composition politique et partisane du réseau social d'amis",
        "concepts": ['réseau_social', 'discussion_politique'],
        "themes": ['société', 'politique'],
    },
    'pes21_friendswho_4_1': {
        "display_label": "Composition politique et partisane du réseau social d'amis",
        "concepts": ['réseau_social', 'discussion_politique'],
        "themes": ['société', 'politique'],
    },
    'pes21_friendswho_4_2': {
        "display_label": "Composition politique et partisane du réseau social d'amis",
        "concepts": ['réseau_social', 'discussion_politique'],
        "themes": ['société', 'politique'],
    },
    'pes21_friendswho_4_3': {
        "display_label": "Composition politique et partisane du réseau social d'amis",
        "concepts": ['réseau_social', 'discussion_politique'],
        "themes": ['société', 'politique'],
    },
    'pes21_friendswho_5_1': {
        "display_label": "Composition politique et partisane du réseau social d'amis",
        "concepts": ['réseau_social', 'discussion_politique'],
        "themes": ['société', 'politique'],
    },
    'pes21_friendswho_5_2': {
        "display_label": "Composition politique et partisane du réseau social d'amis",
        "concepts": ['réseau_social', 'discussion_politique'],
        "themes": ['société', 'politique'],
    },
    'pes21_friendswho_5_3': {
        "display_label": "Composition politique et partisane du réseau social d'amis",
        "concepts": ['réseau_social', 'discussion_politique'],
        "themes": ['société', 'politique'],
    },
    'pes21_discfam': {
        "display_label": 'Fréquence des discussions politiques avec la famille et les amis',
        "concepts": ['discussion_politique'],
        "themes": ['politique', 'société'],
    },
    'pes21_partic1_1': {
        "display_label": "Activités de participation et d'engagement politique",
        "concepts": ['participation_politique', 'engagement_citoyen'],
        "themes": ['politique', 'démocratie'],
    },
    'pes21_partic1_2': {
        "display_label": "Activités de participation et d'engagement politique",
        "concepts": ['participation_politique', 'engagement_citoyen'],
        "themes": ['politique', 'démocratie'],
    },
    'pes21_partic1_3': {
        "display_label": "Activités de participation et d'engagement politique",
        "concepts": ['participation_politique', 'engagement_citoyen'],
        "themes": ['politique', 'démocratie'],
    },
    'pes21_partic1_4': {
        "display_label": "Activités de participation et d'engagement politique",
        "concepts": ['participation_politique', 'engagement_citoyen'],
        "themes": ['politique', 'démocratie'],
    },
    'pes21_partic2_1': {
        "display_label": "Activités de participation et d'engagement politique",
        "concepts": ['participation_politique', 'engagement_citoyen'],
        "themes": ['politique', 'démocratie'],
    },
    'pes21_partic2_2': {
        "display_label": "Activités de participation et d'engagement politique",
        "concepts": ['participation_politique', 'engagement_citoyen'],
        "themes": ['politique', 'démocratie'],
    },
    'pes21_partic2_3': {
        "display_label": "Activités de participation et d'engagement politique",
        "concepts": ['participation_politique', 'engagement_citoyen'],
        "themes": ['politique', 'démocratie'],
    },
    'pes21_partic2_4': {
        "display_label": "Activités de participation et d'engagement politique",
        "concepts": ['participation_politique', 'engagement_citoyen'],
        "themes": ['politique', 'démocratie'],
    },
    'pes21_partic3_1': {
        "display_label": "Activités de participation et d'engagement politique",
        "concepts": ['participation_politique', 'engagement_citoyen'],
        "themes": ['politique', 'démocratie'],
    },
    'pes21_partic3_2': {
        "display_label": "Activités de participation et d'engagement politique",
        "concepts": ['participation_politique', 'engagement_citoyen'],
        "themes": ['politique', 'démocratie'],
    },
    'pes21_partic3_3': {
        "display_label": "Activités de participation et d'engagement politique",
        "concepts": ['participation_politique', 'engagement_citoyen'],
        "themes": ['politique', 'démocratie'],
    },
    'pes21_partic3_4': {
        "display_label": "Activités de participation et d'engagement politique",
        "concepts": ['participation_politique', 'engagement_citoyen'],
        "themes": ['politique', 'démocratie'],
    },
    'pes21_partymember': {
        "display_label": 'Adhésion passée ou actuelle à un parti politique',
        "concepts": ['militantisme', 'partis_politiques'],
        "themes": ['politique'],
    },
    'pes21_womenparl': {
        "display_label": "Attitudes envers l'égalité des sexes, les droits des femmes et des minorités",
        "concepts": ['égalité_des_sexes', 'minorités', 'droits'],
        "themes": ['société', 'droits'],
    },
    'pes21_populism_2': {
        "display_label": 'Attitudes populistes envers les politiciens et les élites',
        "concepts": ['populisme', 'confiance_politique'],
        "themes": ['démocratie', 'politique'],
    },
    'pes21_populism_3': {
        "display_label": 'Attitudes populistes envers les politiciens et les élites',
        "concepts": ['populisme', 'confiance_politique'],
        "themes": ['démocratie', 'politique'],
    },
    'pes21_populism_4': {
        "display_label": 'Attitudes populistes envers les politiciens et les élites',
        "concepts": ['populisme', 'confiance_politique'],
        "themes": ['démocratie', 'politique'],
    },
    'pes21_populism_6': {
        "display_label": 'Attitudes populistes envers les politiciens et les élites',
        "concepts": ['populisme', 'confiance_politique'],
        "themes": ['démocratie', 'politique'],
    },
    'pes21_populism_7': {
        "display_label": 'Attitudes populistes envers les politiciens et les élites',
        "concepts": ['populisme', 'confiance_politique'],
        "themes": ['démocratie', 'politique'],
    },
    'pes21_populism_8': {
        "display_label": 'Attitudes populistes envers les politiciens et les élites',
        "concepts": ['populisme', 'confiance_politique'],
        "themes": ['démocratie', 'politique'],
    },
    'pes21_donerm': {
        "display_label": "Attitudes envers l'égalité des sexes, les droits des femmes et des minorités",
        "concepts": ['égalité_des_sexes', 'minorités', 'droits'],
        "themes": ['société', 'droits'],
    },
    'pes21_donew': {
        "display_label": "Attitudes envers l'égalité des sexes, les droits des femmes et des minorités",
        "concepts": ['égalité_des_sexes', 'minorités', 'droits'],
        "themes": ['société', 'droits'],
    },
    'pes21_donegl': {
        "display_label": "Attitudes envers l'égalité des sexes, les droits des femmes et des minorités",
        "concepts": ['égalité_des_sexes', 'minorités', 'droits'],
        "themes": ['société', 'droits'],
    },
    'pes21_doneqc': {
        "display_label": 'Attitudes sur la souveraineté du Québec, la langue et la culture françaises',
        "concepts": ['souveraineté', 'québec', 'langue_française'],
        "themes": ['politique', 'démocratie'],
    },
    'pes21_abort2': {
        "display_label": "Prises de position sur l'aide médicale à mourir et l'avortement",
        "concepts": ['avortement', 'éthique', 'santé'],
        "themes": ['santé', 'société'],
    },
    'pes21_conversion_the': {
        "display_label": "Position sur l'interdiction des thérapies de conversion",
        "concepts": ['thérapies_de_conversion', 'droits_lgbtq+'],
        "themes": ['société', 'droits'],
    },
    'pes21_trade': {
        "display_label": "Appui au libre-échange international et à la création d'emplois",
        "concepts": ['libre_échange', 'commerce_international'],
        "themes": ['économie'],
    },
    'pes21_privjobs': {
        "display_label": "Attitudes sur le rôle de l'État dans la santé, l'emploi et la réduction des inégalités",
        "concepts": ['rôle_de_l_état', 'inégalités', 'redistribution'],
        "themes": ['économie', 'politique_sociale'],
    },
    'pes21_blame': {
        "display_label": "Attitudes sur le rôle de l'État dans la santé, l'emploi et la réduction des inégalités",
        "concepts": ['rôle_de_l_état', 'inégalités', 'redistribution'],
        "themes": ['économie', 'politique_sociale'],
    },
    'pes21_stdofliving': {
        "display_label": "Attitudes sur le rôle de l'État dans la santé, l'emploi et la réduction des inégalités",
        "concepts": ['rôle_de_l_état', 'inégalités', 'redistribution'],
        "themes": ['économie', 'politique_sociale'],
    },
    'pes21_trust': {
        "display_label": 'Niveau de confiance générale envers les personnes',
        "concepts": ['confiance_interpersonnelle'],
        "themes": ['société'],
    },
    'pes21_inequal': {
        "display_label": "Attitudes sur le rôle de l'État dans la santé, l'emploi et la réduction des inégalités",
        "concepts": ['rôle_de_l_état', 'inégalités', 'redistribution'],
        "themes": ['économie', 'politique_sociale'],
    },
    'pes21_gap': {
        "display_label": "Attitudes sur le rôle de l'État dans la santé, l'emploi et la réduction des inégalités",
        "concepts": ['rôle_de_l_état', 'inégalités', 'redistribution'],
        "themes": ['économie', 'politique_sociale'],
    },
    'pes21_prov_treatment': {
        "display_label": 'Attitudes envers le traitement des provinces et la répartition des pouvoirs fédéraux',
        "concepts": ['fédéralisme', 'relations_fédérales_provinciales'],
        "themes": ['politique'],
    },
    'pes21_provfed': {
        "display_label": 'Attitudes envers le traitement des provinces et la répartition des pouvoirs fédéraux',
        "concepts": ['fédéralisme', 'relations_fédérales_provinciales'],
        "themes": ['politique'],
    },
    'pes21_hostile2': {
        "display_label": "Attitudes envers l'égalité des sexes, les droits des femmes et des minorités",
        "concepts": ['égalité_des_sexes', 'minorités', 'droits'],
        "themes": ['société', 'droits'],
    },
    'pes21_hostile4': {
        "display_label": "Attitudes envers l'égalité des sexes, les droits des femmes et des minorités",
        "concepts": ['égalité_des_sexes', 'minorités', 'droits'],
        "themes": ['société', 'droits'],
    },
    'pes21_pos_carbon': {
        "display_label": 'Maintien de la tarification fédérale du carbone pour réduire les émissions',
        "concepts": ['taxe_carbone', 'changement_climatique', 'environnement'],
        "themes": ['environnement', 'économie'],
    },
    'pes21_pos_energy': {
        "display_label": "Appui du gouvernement au secteur énergétique et à la construction d'oléoducs",
        "concepts": ['énergie', 'oléoducs', 'environnement'],
        "themes": ['environnement', 'économie'],
    },
    'pes21_cc1': {
        "display_label": 'Perception de la réalité du changement climatique',
        "concepts": ['changement_climatique', 'environnement'],
        "themes": ['environnement'],
    },
    'pes21_cc2': {
        "display_label": 'Perception de la cause principale du changement climatique (humaine vs naturelle)',
        "concepts": ['changement_climatique', 'environnement'],
        "themes": ['environnement'],
    },
    'pes21_pidtrad': {
        "display_label": "Identification à un parti politique fédéral et force de l'attachement",
        "concepts": ['identification_partisane'],
        "themes": ['partis_politiques'],
    },
    'pes21_pidtradstrong': {
        "display_label": "Identification à un parti politique fédéral et force de l'attachement",
        "concepts": ['identification_partisane'],
        "themes": ['partis_politiques'],
    },
    'pes21_langQC': {
        "display_label": 'Attitudes sur la souveraineté du Québec, la langue et la culture françaises',
        "concepts": ['souveraineté', 'québec', 'langue_française'],
        "themes": ['politique', 'démocratie'],
    },
    'pes21_cultureQC': {
        "display_label": 'Attitudes sur la souveraineté du Québec, la langue et la culture françaises',
        "concepts": ['souveraineté', 'québec', 'langue_française'],
        "themes": ['politique', 'démocratie'],
    },
    'pes21_qclang': {
        "display_label": 'Attitudes sur la souveraineté du Québec, la langue et la culture françaises',
        "concepts": ['souveraineté', 'québec', 'langue_française'],
        "themes": ['politique', 'démocratie'],
    },
    'pes21_qcsol': {
        "display_label": 'Attitudes sur la souveraineté du Québec, la langue et la culture françaises',
        "concepts": ['souveraineté', 'québec', 'langue_française'],
        "themes": ['politique', 'démocratie'],
    },
    'pes21_newerlife': {
        "display_label": 'Attitudes envers les nouveaux modes de vie et la cohésion sociale',
        "concepts": ['valeurs_traditionnelles', 'conservatisme'],
        "themes": ['société'],
    },
    'pes21_cognition': {
        "display_label": 'Besoin de cognition et attirance pour la réflexion complexe',
        "concepts": ['cognition', 'psychologie'],
        "themes": ['société'],
    },
    'pes21_feminine_1': {
        "display_label": "Niveau d'identification à la féminité (échelle 0-100)",
        "concepts": ['genre', 'identité'],
        "themes": ['démographie', 'société'],
    },
    'pes21_masculine_1': {
        "display_label": "Niveau d'identification à la masculinité (échelle 0-100)",
        "concepts": ['genre', 'identité'],
        "themes": ['démographie', 'société'],
    },
    'pes21_big5_1': {
        "display_label": 'Trait de personnalité Big Five : Extraversion (enthousiaste)',
        "concepts": ['personnalité'],
        "themes": ['société'],
    },
    'pes21_big5_2': {
        "display_label": 'Trait de personnalité Big Five : Agréabilité (critique/querelleur)',
        "concepts": ['personnalité'],
        "themes": ['société'],
    },
    'pes21_big5_3': {
        "display_label": 'Trait de personnalité Big Five : Conscienciosité (digne de confiance)',
        "concepts": ['personnalité'],
        "themes": ['société'],
    },
    'pes21_big5_4': {
        "display_label": 'Trait de personnalité Big Five : Neuroticisme (anxieux/instable)',
        "concepts": ['personnalité'],
        "themes": ['société'],
    },
    'pes21_big5_5': {
        "display_label": 'Trait de personnalité Big Five : Ouverture (expériences nouvelles)',
        "concepts": ['personnalité'],
        "themes": ['société'],
    },
    'pes21_big5_6': {
        "display_label": 'Trait de personnalité Big Five : Extraversion (réservé/silencieux)',
        "concepts": ['personnalité'],
        "themes": ['société'],
    },
    'pes21_big5_7': {
        "display_label": 'Trait de personnalité Big Five : Agréabilité (sympathique/chaleureux)',
        "concepts": ['personnalité'],
        "themes": ['société'],
    },
    'pes21_big5_8': {
        "display_label": 'Trait de personnalité Big Five : Conscienciosité (désorganisé/careless)',
        "concepts": ['personnalité'],
        "themes": ['société'],
    },
    'pes21_big5_9': {
        "display_label": 'Trait de personnalité Big Five : Neuroticisme (calme/stable)',
        "concepts": ['personnalité'],
        "themes": ['société'],
    },
    'pes21_big5_10': {
        "display_label": 'Trait de personnalité Big Five : Ouverture (conventionnel/peu créatif)',
        "concepts": ['personnalité'],
        "themes": ['société'],
    },
    'pes21_health': {
        "display_label": 'Évaluation de la santé générale',
        "concepts": ['santé'],
        "themes": ['santé', 'démographie'],
    },
    'pes21_phealth': {
        "display_label": 'Évaluation de la santé physique',
        "concepts": ['santé'],
        "themes": ['santé', 'démographie'],
    },
    'pes21_mhealth': {
        "display_label": 'Évaluation de la santé mentale',
        "concepts": ['santé'],
        "themes": ['santé', 'démographie'],
    },
    'pes21_service_freq': {
        "display_label": "Fréquence d'assistance aux services religieux",
        "concepts": ['religion', 'pratique_religieuse'],
        "themes": ['société'],
    },
    'pes21_parents_born': {
        "display_label": "Naissance des parents à l'extérieur du Canada",
        "concepts": ['immigration', 'origine'],
        "themes": ['démographie'],
    },
    'pes21_rural_urban': {
        "display_label": 'Milieu de résidence (rural / urbain)',
        "concepts": ['région', 'logement'],
        "themes": ['démographie'],
    },
    'pes21_lived': {
        "display_label": 'Durée de résidence dans la communauté actuelle',
        "concepts": ['intégration', 'logement'],
        "themes": ['démographie'],
    },
    'pes21_follow_pol': {
        "display_label": "Suivi de la politique dans les médias d'information",
        "concepts": ['médias', 'intérêt_politique'],
        "themes": ['politique', 'médias'],
    },
    'pes21_lang': {
        "display_label": 'Langue principalement parlée à la maison',
        "concepts": ['langue'],
        "themes": ['démographie'],
    },
    'pes21_occ_cat': {
        "display_label": "Catégorie d'occupation professionnelle",
        "concepts": ['emploi', 'travail'],
        "themes": ['démographie'],
    },
    'cps21_age': {
        "display_label": 'Âge ou année de naissance du répondant',
        "concepts": ['âge'],
        "themes": ['démographie'],
    },
    'provcode': {
        "display_label": 'Province ou territoire de résidence',
        "concepts": ['province', 'région'],
        "themes": ['démographie'],
    },
}
