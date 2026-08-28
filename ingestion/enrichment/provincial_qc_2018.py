"""Enrichment authoré — provincial_qc_2018. Produit par subagent LLM (2026-08-28)."""

SURVEY = {
    "description": "Sondage panel IPSOS réalisé auprès de 1250 Québécois en mode mixte (web et téléphone) lors de l'élection provinciale québécoise de 2018, mené en vagues pré-électorale (septembre 2018) et post-électorale (octobre 2018).",
    "month": 10,
}

QUESTIONS = {
    "fsa_tabl": {
        "display_label": "Région administrative / géographique de résidence au Québec",
        "concepts": ["géographie", "région"],
        "themes": ["démographie"],
    },
    "qa": {
        "display_label": "Éligibilité au droit de vote aux élections provinciales",
        "concepts": ["éligibilité électorale", "droit de vote"],
        "themes": ["démocratie", "élections"],
    },
    "s1": {
        "display_label": "Première langue apprise et encore comprise par le répondant",
        "concepts": ["langue maternelle", "langue"],
        "themes": ["démographie", "identité"],
    },
    "rv1a": {
        "display_label": "Intention de vote aux élections provinciales québécoises",
        "concepts": ["intention de vote", "préférences électorales"],
        "themes": ["politique provinciale", "élections"],
    },
    "rv1b": {
        "display_label": "Tendance ou second choix d'intention de vote (pour les indécis)",
        "concepts": ["intention de vote", "deuxième choix", "indécision électorale"],
        "themes": ["politique provinciale", "élections"],
    },
    "qc": {
        "display_label": "Degré de certitude du choix de vote",
        "concepts": ["certitude de vote", "stabilité du vote"],
        "themes": ["politique provinciale", "élections"],
        "is_ordinal": True,
    },
    "q1": {
        "display_label": "Chef de parti jugé le plus apte à occuper le poste de Premier ministre du Québec",
        "concepts": ["premier ministre préféré", "leadership politique", "évaluation des chefs"],
        "themes": ["politique provinciale", "chefs politiques"],
    },
    "q1a": {
        "display_label": "Certitude d'aller voter lors de l'élection provinciale du 1er octobre (échelle 1-10)",
        "concepts": ["intention de voter", "participation électorale"],
        "themes": ["politique provinciale", "élections"],
        "is_ordinal": True,
    },
    "q2": {
        "display_label": "Souhait de maintien du gouvernement sortant ou de changement de gouvernement",
        "concepts": ["changement de gouvernement", "satisfaction gouvernementale", "alternance politique"],
        "themes": ["politique provinciale", "élections"],
    },
    "q2a": {
        "display_label": "Chef de parti jugé comme ayant fait la meilleure campagne électorale",
        "concepts": ["campagne électorale", "évaluation des chefs", "performance des chefs"],
        "themes": ["politique provinciale", "campagne électorale"],
    },
    "q2b": {
        "display_label": "Parti pressenti comme le plus susceptible de remporter l'élection",
        "concepts": ["anticipation électorale", "prédiction du gagnant"],
        "themes": ["politique provinciale", "élections"],
    },
    "q5_1": {
        "display_label": "État d'esprit face au vote : sentiment d'enthousiasme (échelle 1-7)",
        "concepts": ["état d'esprit", "enthousiasme", "motivation électorale"],
        "themes": ["comportement électoral", "psychologie politique"],
        "is_ordinal": True,
    },
    "q5_2": {
        "display_label": "État d'esprit face au vote : sentiment d'excitation (échelle 1-7)",
        "concepts": ["état d'esprit", "excitation", "motivation électorale"],
        "themes": ["comportement électoral", "psychologie politique"],
        "is_ordinal": True,
    },
    "q6_01": {
        "display_label": "Attitude envers le vote : perception des bénéfices clairs de voter",
        "concepts": ["bénéfices du vote", "utilité du vote"],
        "themes": ["démocratie", "comportement électoral"],
        "is_ordinal": True,
    },
    "q6_02": {
        "display_label": "Attitude envers le vote : habitude personnelle de voter",
        "concepts": ["habitude électorale", "participation habituelle"],
        "themes": ["démocratie", "comportement électoral"],
        "is_ordinal": True,
    },
    "q6_03": {
        "display_label": "Attitude envers le vote : sentiment de devoir civique de voter",
        "concepts": ["devoir civique", "norme électorale"],
        "themes": ["démocratie", "comportement électoral"],
        "is_ordinal": True,
    },
    "q6_04": {
        "display_label": "Attitude envers le vote : importance du vote dans l'identité personnelle",
        "concepts": ["identité citoyenne", "devoir civique"],
        "themes": ["démocratie", "comportement électoral"],
        "is_ordinal": True,
    },
    "q6_05": {
        "display_label": "Attitude envers le vote : niveau de réflexion récente sur son choix de vote",
        "concepts": ["réflexion électorale", "prise de décision"],
        "themes": ["démocratie", "comportement électoral"],
        "is_ordinal": True,
    },
    "q6_06": {
        "display_label": "Attitude envers le vote : sentiment d'avoir l'information et les moyens nécessaires pour voter",
        "concepts": ["information électorale", "compétence électorale"],
        "themes": ["démocratie", "comportement électoral"],
        "is_ordinal": True,
    },
    "q6_07": {
        "display_label": "Attitude envers le vote : clarté du choix de vote et des raisons du choix",
        "concepts": ["clarté du choix", "décision électorale"],
        "themes": ["démocratie", "comportement électoral"],
        "is_ordinal": True,
    },
    "q6_08": {
        "display_label": "Attitude envers le vote : nécessité du vote des citoyens pour le bon fonctionnement de la démocratie",
        "concepts": ["fonctionnement démocratique", "devoir civique"],
        "themes": ["démocratie", "comportement électoral"],
        "is_ordinal": True,
    },
    "q6_09": {
        "display_label": "Attitude envers le vote : sentiment que son vote est important et fait une différence",
        "concepts": ["efficacité politique", "impact du vote"],
        "themes": ["démocratie", "comportement électoral"],
        "is_ordinal": True,
    },
    "q6_10": {
        "display_label": "Attitude envers le vote : connaissance pratique du moment, du lieu et du déroulement du vote",
        "concepts": ["connaissance électorale", "modalités de vote"],
        "themes": ["démocratie", "comportement électoral"],
        "is_ordinal": True,
    },
    "q6_11": {
        "display_label": "Attitude envers le vote : rappels environnementaux ou personnels de l'importance du vote",
        "concepts": ["stimulus civique", "saillance électorale"],
        "themes": ["démocratie", "comportement électoral"],
        "is_ordinal": True,
    },
    "q6_12": {
        "display_label": "Attitude envers le vote : perception de la croyance des amis et de la famille en l'importance du vote",
        "concepts": ["norme sociale", "influence de l'entourage"],
        "themes": ["démocratie", "comportement électoral"],
        "is_ordinal": True,
    },
    "q6_13": {
        "display_label": "Attitude envers le vote : sentiment que les gens de son groupe de pairs ont tendance à voter",
        "concepts": ["norme de groupe", "comportement électoral"],
        "themes": ["démocratie", "comportement électoral"],
        "is_ordinal": True,
    },
    "q6_14": {
        "display_label": "Attitude envers le vote : anticipation de regret en cas de non-participation au vote",
        "concepts": ["regret électoral", "motivation électorale"],
        "themes": ["démocratie", "comportement électoral"],
        "is_ordinal": True,
    },
    "age": {
        "display_label": "Groupe d'âge du répondant",
        "concepts": ["âge"],
        "themes": ["démographie"],
        "is_ordinal": True,
    },
    "d3": {
        "display_label": "Plus haut niveau de scolarité atteint",
        "concepts": ["scolarité", "éducation"],
        "themes": ["démographie"],
    },
    "d4": {
        "display_label": "Situation d'emploi actuelle du répondant",
        "concepts": ["emploi", "statut professionnel"],
        "themes": ["démographie", "économie"],
    },
    "d5": {
        "display_label": "Revenu total annuel du foyer",
        "concepts": ["revenu du ménage", "statut socio-économique"],
        "themes": ["démographie", "économie"],
        "is_ordinal": True,
    },
    "d6": {
        "display_label": "Présence d'enfants de moins de 18 ans au foyer",
        "concepts": ["composition familiale", "enfants"],
        "themes": ["démographie"],
    },
    "sexfix": {
        "display_label": "Sexe du répondant",
        "concepts": ["sexe", "genre"],
        "themes": ["démographie"],
    },
    "rts_q1": {
        "display_label": "Statut de participation ou raison d'empêchement au scrutin du 1er octobre 2018",
        "concepts": ["participation électorale", "abstention"],
        "themes": ["politique provinciale", "comportement électoral"],
    },
    "rts_q2": {
        "display_label": "Vote déclaré lors de l'élection provinciale du 1er octobre 2018",
        "concepts": ["vote déclaré", "choix électoral"],
        "themes": ["politique provinciale", "élections"],
    },
    "rts_q2a": {
        "display_label": "Moment de la campagne où le choix de vote final a été arrêté",
        "concepts": ["timing de décision", "moment de la décision"],
        "themes": ["politique provinciale", "comportement électoral"],
    },
    "q3a_verb": {
        "display_label": "Principale raison du choix de parti lors du vote (réponse ouverte verbatim)",
        "concepts": ["raison du vote", "motivation électorale"],
        "themes": ["politique provinciale", "comportement électoral"],
    },
    "rts_q3a": {
        "display_label": "Principale raison du choix du parti lors du vote",
        "concepts": ["raison du vote", "motivation électorale"],
        "themes": ["politique provinciale", "comportement électoral"],
    },
    "q3a2": {
        "display_label": "Deuxième raison du choix du parti lors du vote",
        "concepts": ["raison du vote", "motivation électorale"],
        "themes": ["politique provinciale", "comportement électoral"],
    },
    "rts_q3b": {
        "display_label": "Raison de l'annulation du bulletin de vote",
        "concepts": ["bulletin annulé", "vote blanc"],
        "themes": ["politique provinciale", "comportement électoral"],
    },
    "q3b_verb": {
        "display_label": "Raison de l'annulation du bulletin de vote (réponse ouverte verbatim)",
        "concepts": ["bulletin annulé", "vote blanc"],
        "themes": ["politique provinciale", "comportement électoral"],
    },
    "rts_q4": {
        "display_label": "Principale raison de l'abstention électorale",
        "concepts": ["abstention", "raisons du non-vote"],
        "themes": ["politique provinciale", "comportement électoral"],
    },
    "q4_verb": {
        "display_label": "Principale raison de l'abstention électorale (réponse ouverte verbatim)",
        "concepts": ["abstention", "raisons du non-vote"],
        "themes": ["politique provinciale", "comportement électoral"],
    },
    "rts_q5": {
        "display_label": "Exposition à la couverture des sondages durant la campagne électorale",
        "concepts": ["sondages d'opinion", "exposition médiatique"],
        "themes": ["médias", "campagne électorale"],
    },
    "rts_q6": {
        "display_label": "Opinion sur le niveau des seuils d'immigration au Québec (réduire, maintenir, augmenter)",
        "concepts": ["immigration", "seuil d'immigration"],
        "themes": ["immigration", "politique publique"],
    },
    "rts_q7": {
        "display_label": "Opinion sur l'indépendance et la souveraineté du Québec",
        "concepts": ["souveraineté", "indépendance du québec"],
        "themes": ["politique provinciale", "souveraineté"],
        "is_ordinal": True,
    },
    "rts_q8": {
        "display_label": "Auto-positionnement idéologique sur l'axe gauche-droite (échelle 0-10)",
        "concepts": ["gauche-droite", "idéologie politique"],
        "themes": ["politique", "idéologie"],
        "is_ordinal": True,
    },
}
