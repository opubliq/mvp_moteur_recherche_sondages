"""Enrichment authoré — eeq_2014. Produit par subagent LLM (2026-07-06).

Étude électorale québécoise 2014, Université McGill.
Élection provinciale du 7 avril 2014.
"""

SURVEY = {
    "description": "Étude électorale online menée par l'Université McGill auprès de résidents du Québec, portant sur les attitudes politiques, économiques et constitutionnelles avant l'élection provinciale du 7 avril 2014.",
    "month": 4,
}

QUESTIONS = {
    # =========================================================================
    # DÉMOGRAPHIE ET CARACTÉRISTIQUES PERSONNELLES
    # =========================================================================
    "QAGE": {
        "display_label": "Année de naissance",
        "concepts": ["âge"],
        "themes": ["démographie"],
    },
    "CLAGE": {
        "display_label": "Groupe d'âge",
        "concepts": ["âge"],
        "themes": ["démographie"],
        "is_ordinal": True,
    },
    "QSEXE": {
        "display_label": "Sexe",
        "concepts": [],
        "themes": ["démographie"],
    },
    "QLANG": {
        "display_label": "Langue maternelle",
        "concepts": ["langue"],
        "themes": ["démographie"],
    },
    "QREGION": {
        "display_label": "Région de résidence",
        "concepts": ["région"],
        "themes": ["géographie"],
    },
    "REGIO": {
        "display_label": "Région métropolitaine",
        "concepts": ["région"],
        "themes": ["géographie"],
    },
    "QENFAN": {
        "display_label": "Enfants dans le ménage",
        "concepts": ["famille"],
        "themes": ["démographie"],
    },
    "QSCOL": {
        "display_label": "Niveau de scolarité",
        "concepts": ["éducation"],
        "themes": ["démographie"],
        "is_ordinal": True,
    },
    "Q57": {
        "display_label": "Revenu total du ménage (2013)",
        "concepts": ["revenu"],
        "themes": ["économie personnelle"],
        "is_ordinal": True,
    },
    "Q58": {
        "display_label": "Situation d'emploi",
        "concepts": ["emploi"],
        "themes": ["économie personnelle"],
    },
    "Q59A": {
        "display_label": "Détention : compte épargne bancaire",
        "concepts": ["épargne", "placements"],
        "themes": ["économie personnelle"],
    },
    "Q59B": {
        "display_label": "Détention : compte société de fiducie",
        "concepts": ["épargne", "placements"],
        "themes": ["économie personnelle"],
    },
    "Q59C": {
        "display_label": "Détention : REER ou CELI",
        "concepts": ["épargne", "placements"],
        "themes": ["économie personnelle"],
    },
    "Q59D": {
        "display_label": "Détention : actions ou parts d'entreprise",
        "concepts": ["investissements"],
        "themes": ["économie personnelle"],
    },
    "Q59E": {
        "display_label": "Détention : obligations",
        "concepts": ["investissements"],
        "themes": ["économie personnelle"],
    },
    "Q59F": {
        "display_label": "Détention : CPG ou fonds mutuels",
        "concepts": ["investissements"],
        "themes": ["économie personnelle"],
    },
    "Q59G": {
        "display_label": "Détention : régime d'épargne-retraite",
        "concepts": ["épargne"],
        "themes": ["économie personnelle"],
    },
    "Q60A": {
        "display_label": "Propriétaire : résidence principale",
        "concepts": ["immobilier"],
        "themes": ["économie personnelle"],
    },
    "Q60B": {
        "display_label": "Propriétaire : résidence secondaire",
        "concepts": ["immobilier"],
        "themes": ["économie personnelle"],
    },
    "Q60C": {
        "display_label": "Propriétaire : biens immobiliers loués",
        "concepts": ["immobilier"],
        "themes": ["économie personnelle"],
    },
    "Q60D": {
        "display_label": "Propriétaire : autres biens immobiliers",
        "concepts": ["immobilier"],
        "themes": ["économie personnelle"],
    },
    "Q60E": {
        "display_label": "Propriétaire : terrains",
        "concepts": ["immobilier"],
        "themes": ["économie personnelle"],
    },
    "Q61": {
        "display_label": "Syndicalisation",
        "concepts": ["syndicats"],
        "themes": ["économie personnelle"],
    },
    "Q62": {
        "display_label": "Appartenance à une religion ou dénomination",
        "concepts": ["religion"],
        "themes": ["démographie"],
    },
    "Q63": {
        "display_label": "Dénomination religieuse",
        "concepts": ["religion"],
        "themes": ["démographie"],
    },
    "Q64": {
        "display_label": "Fréquence de pratique religieuse",
        "concepts": ["religion"],
        "themes": ["démographie"],
        "is_ordinal": True,
    },
    "Q65": {
        "display_label": "Lieu de naissance",
        "concepts": ["migration"],
        "themes": ["démographie"],
    },
    "Q66": {
        "display_label": "Langue parlée à la maison",
        "concepts": ["langue"],
        "themes": ["démographie"],
    },
    "Q67": {
        "display_label": "Origine ethnique",
        "concepts": ["ethnicité"],
        "themes": ["démographie"],
    },
    "Q68": {
        "display_label": "Statut civil",
        "concepts": ["famille"],
        "themes": ["démographie"],
    },
    # =========================================================================
    # COMPORTEMENT ÉLECTORAL (2014)
    # =========================================================================
    "Q1": {
        "display_label": "Enjeu principal de l'élection",
        "concepts": ["enjeux électoraux"],
        "themes": ["élections"],
    },
    "Q2": {
        "display_label": "Participation au vote (7 avril 2014)",
        "concepts": ["participation électorale"],
        "themes": ["élections"],
    },
    "Q3": {
        "display_label": "Parti pour lequel vous avez voté",
        "concepts": ["choix partisan"],
        "themes": ["élections"],
    },
    "Q4": {
        "display_label": "Était-ce votre premier choix partisan?",
        "concepts": ["préférence partisane"],
        "themes": ["élections"],
    },
    "Q5": {
        "display_label": "Premier choix partisan",
        "concepts": ["préférence partisane"],
        "themes": ["élections"],
    },
    "Q6": {
        "display_label": "Parti vote (4 septembre 2012)",
        "concepts": ["comportement électoral antérieur"],
        "themes": ["élections"],
    },
    "Q7A": {
        "display_label": "Importance du vote : positions politiques du parti",
        "concepts": ["facteurs de vote"],
        "themes": ["élections"],
        "is_ordinal": True,
    },
    "Q7B": {
        "display_label": "Importance du vote : qualité de la candidate locale",
        "concepts": ["facteurs de vote"],
        "themes": ["élections"],
        "is_ordinal": True,
    },
    "Q7C": {
        "display_label": "Importance du vote : le chef du parti",
        "concepts": ["facteurs de vote"],
        "themes": ["élections"],
        "is_ordinal": True,
    },
    "Q7D": {
        "display_label": "Importance du vote : capacité à défendre les intérêts du Québec",
        "concepts": ["facteurs de vote", "intérêts québécois"],
        "themes": ["élections"],
        "is_ordinal": True,
    },
    "Q7E": {
        "display_label": "Importance du vote : compréhension de l'histoire et culture québécoise",
        "concepts": ["facteurs de vote", "identité québécoise"],
        "themes": ["élections"],
        "is_ordinal": True,
    },
    "Q7F": {
        "display_label": "Importance du vote : probabilité de former gouvernement",
        "concepts": ["facteurs de vote", "viabilité électorale"],
        "themes": ["élections"],
        "is_ordinal": True,
    },
    "Q7G": {
        "display_label": "Importance du vote : préférences constitutionnelles du parti",
        "concepts": ["facteurs de vote", "constitution"],
        "themes": ["élections"],
        "is_ordinal": True,
    },
    "Q8": {
        "display_label": "Évaluation : meilleure campagne",
        "concepts": ["campagnes électorales"],
        "themes": ["élections"],
    },
    "Q9": {
        "display_label": "Évaluation : moins bonne campagne",
        "concepts": ["campagnes électorales"],
        "themes": ["élections"],
    },
    # =========================================================================
    # SATISFACTION GOUVERNEMENTALE ET DÉMOCRATIE
    # =========================================================================
    "Q10": {
        "display_label": "Satisfaction : performance gouvernement péquiste",
        "concepts": ["satisfaction gouvernementale"],
        "themes": ["démocratie"],
        "is_ordinal": True,
    },
    "Q11": {
        "display_label": "Satisfaction : gestion économique gouvernement",
        "concepts": ["satisfaction gouvernementale", "économie"],
        "themes": ["démocratie", "économie"],
        "is_ordinal": True,
    },
    "Q35": {
        "display_label": "Satisfaction : fonctionnement de la démocratie québécoise",
        "concepts": ["satisfaction démocratique"],
        "themes": ["démocratie"],
        "is_ordinal": True,
    },
    # =========================================================================
    # IDENTITÉ ET ATTACHEMENT
    # =========================================================================
    "Q12": {
        "display_label": "Degré d'attachement au Québec",
        "concepts": ["identité québécoise", "attachement"],
        "themes": ["identité"],
        "is_ordinal": True,
    },
    "Q13": {
        "display_label": "Degré d'attachement au Canada",
        "concepts": ["identité canadienne", "attachement"],
        "themes": ["identité"],
        "is_ordinal": True,
    },
    "Q14A": {
        "display_label": "Identité : Québécois vs Canadien (ordre 1)",
        "concepts": ["identité"],
        "themes": ["identité"],
        "is_ordinal": True,
    },
    "Q14B": {
        "display_label": "Identité : Canadien vs Québécois (ordre 2)",
        "concepts": ["identité"],
        "themes": ["identité"],
        "is_ordinal": True,
    },
    "Q15": {
        "display_label": "Valeurs québécoises distinctes du reste du Canada",
        "concepts": ["identité québécoise", "distinctivité"],
        "themes": ["identité"],
        "is_ordinal": True,
    },
    # =========================================================================
    # SOUVERAINETÉ ET CONSTITUTION
    # =========================================================================
    "Q16": {
        "display_label": "Participation au référendum de 1995",
        "concepts": ["souveraineté", "historique"],
        "themes": ["constitution"],
    },
    "Q17": {
        "display_label": "Vote au référendum de 1995",
        "concepts": ["souveraineté", "historique"],
        "themes": ["constitution"],
    },
    "Q18": {
        "display_label": "Importance de l'indépendance politique du Québec",
        "concepts": ["souveraineté"],
        "themes": ["constitution"],
        "is_ordinal": True,
    },
    "Q19": {
        "display_label": "Referendum : indépendance du Québec",
        "concepts": ["souveraineté"],
        "themes": ["constitution"],
    },
    "Q20": {
        "display_label": "Referendum : plus de pouvoirs pour l'Assemblée nationale",
        "concepts": ["pouvoirs provinciaux"],
        "themes": ["constitution"],
    },
    "Q21": {
        "display_label": "Referendum : signature de la Constitution canadienne (1982)",
        "concepts": ["constitution"],
        "themes": ["constitution"],
    },
    "Q22": {
        "display_label": "Choix d'options constitutionnelles",
        "concepts": ["constitution"],
        "themes": ["constitution"],
    },
    "Q23": {
        "display_label": "Deuxième préférence d'options constitutionnelles",
        "concepts": ["constitution"],
        "themes": ["constitution"],
    },
    "Q24A": {
        "display_label": "Classement : Constitution (1er choix)",
        "concepts": ["constitution"],
        "themes": ["constitution"],
    },
    "Q24B": {
        "display_label": "Classement : Constitution (2e choix)",
        "concepts": ["constitution"],
        "themes": ["constitution"],
    },
    "Q24C": {
        "display_label": "Classement : Constitution (3e choix)",
        "concepts": ["constitution"],
        "themes": ["constitution"],
    },
    "Q25": {
        "display_label": "Question préférée pour un référendum",
        "concepts": ["constitution"],
        "themes": ["constitution"],
    },
    "Q26A": {
        "display_label": "Referendum : plus de pouvoirs (scénario PQ)",
        "concepts": ["pouvoirs provinciaux"],
        "themes": ["constitution"],
    },
    "Q26B": {
        "display_label": "Referendum : plus de pouvoirs (scénario PLQ)",
        "concepts": ["pouvoirs provinciaux"],
        "themes": ["constitution"],
    },
    "Q27A": {
        "display_label": "Majorité claire en referendum : indépendance",
        "concepts": ["souveraineté", "règles référendaires"],
        "themes": ["constitution"],
        "is_ordinal": True,
    },
    "Q27B": {
        "display_label": "Majorité claire en referendum : Constitution 1982",
        "concepts": ["constitution", "règles référendaires"],
        "themes": ["constitution"],
        "is_ordinal": True,
    },
    # =========================================================================
    # INTÉRÊT POLITIQUE ET AUTO-POSITIONNEMENT
    # =========================================================================
    "Q28": {
        "display_label": "Intérêt pour la politique en général",
        "concepts": ["engagement politique"],
        "themes": ["participation politique"],
        "is_ordinal": True,
    },
    "Q32": {
        "display_label": "Auto-positionnement : échelle gauche-droite",
        "concepts": ["idéologie"],
        "themes": ["idéologie"],
    },
    "Q55": {
        "display_label": "Affiliation partisane habituelle",
        "concepts": ["identification partisane"],
        "themes": ["affiliation partisane"],
    },
    "Q56": {
        "display_label": "Force de l'affiliation partisane",
        "concepts": ["identification partisane"],
        "themes": ["affiliation partisane"],
        "is_ordinal": True,
    },
    # =========================================================================
    # ÉVALUATIONS DE POLITICIENS (0-100)
    # =========================================================================
    "Q29A": {
        "display_label": "Thermomètre : Philippe Couillard",
        "concepts": ["évaluation politique", "leadership"],
        "themes": ["politiciens"],
    },
    "Q29B": {
        "display_label": "Thermomètre : Pauline Marois",
        "concepts": ["évaluation politique", "leadership"],
        "themes": ["politiciens"],
    },
    "Q29C": {
        "display_label": "Thermomètre : François Legault",
        "concepts": ["évaluation politique", "leadership"],
        "themes": ["politiciens"],
    },
    "Q29D": {
        "display_label": "Thermomètre : Françoise David",
        "concepts": ["évaluation politique", "leadership"],
        "themes": ["politiciens"],
    },
    "Q29E": {
        "display_label": "Thermomètre : Sol Zanetti",
        "concepts": ["évaluation politique", "leadership"],
        "themes": ["politiciens"],
    },
    "Q29F": {
        "display_label": "Thermomètre : Alex Tyrrell",
        "concepts": ["évaluation politique", "leadership"],
        "themes": ["politiciens"],
    },
    "Q29G": {
        "display_label": "Thermomètre : Pierre Karl Péladeau",
        "concepts": ["évaluation politique", "leadership"],
        "themes": ["politiciens"],
    },
    # =========================================================================
    # TRAITS DE LEADERSHIP DES CHEFS DE PARTI
    # =========================================================================
    "Q30A": {
        "display_label": "Chef le plus compétent",
        "concepts": ["compétence", "leadership"],
        "themes": ["politiciens"],
    },
    "Q30B": {
        "display_label": "Chef le plus honnête",
        "concepts": ["intégrité", "leadership"],
        "themes": ["politiciens"],
    },
    "Q30C": {
        "display_label": "Chef le plus proche des gens",
        "concepts": ["proximité", "leadership"],
        "themes": ["politiciens"],
    },
    # =========================================================================
    # POSITIONNEMENT IDÉOLOGIQUE DES PARTIS (0-10)
    # =========================================================================
    "Q31A": {
        "display_label": "Positionnement gauche-droite : Parti libéral du Québec",
        "concepts": ["idéologie", "positionnement partisan"],
        "themes": ["idéologie"],
    },
    "Q31B": {
        "display_label": "Positionnement gauche-droite : Parti québécois",
        "concepts": ["idéologie", "positionnement partisan"],
        "themes": ["idéologie"],
    },
    "Q31C": {
        "display_label": "Positionnement gauche-droite : Coalition avenir Québec",
        "concepts": ["idéologie", "positionnement partisan"],
        "themes": ["idéologie"],
    },
    "Q31D": {
        "display_label": "Positionnement gauche-droite : Québec solidaire",
        "concepts": ["idéologie", "positionnement partisan"],
        "themes": ["idéologie"],
    },
    "Q31E": {
        "display_label": "Positionnement gauche-droite : Option nationale",
        "concepts": ["idéologie", "positionnement partisan"],
        "themes": ["idéologie"],
    },
    "Q31F": {
        "display_label": "Positionnement gauche-droite : Parti vert du Québec",
        "concepts": ["idéologie", "positionnement partisan"],
        "themes": ["idéologie"],
    },
    # =========================================================================
    # CONFIANCE SOCIALE ET ÉNONCÉS POLITIQUES
    # =========================================================================
    "Q33": {
        "display_label": "Confiance envers les gens",
        "concepts": ["confiance interpersonnelle"],
        "themes": ["société"],
    },
    "Q34A": {
        "display_label": "Accord : gouvernement responsable de satisfaire les besoins fondamentaux",
        "concepts": ["responsabilité gouvernementale", "filet social"],
        "themes": ["politique sociale"],
        "is_ordinal": True,
    },
    "Q34B": {
        "display_label": "Accord : Assemblée nationale ne tient pas compte de gens comme moi",
        "concepts": ["représentation politique"],
        "themes": ["démocratie"],
        "is_ordinal": True,
    },
    "Q34C": {
        "display_label": "Accord : gens comme moi n'ont rien à dire au gouvernement",
        "concepts": ["efficacité politique"],
        "themes": ["démocratie"],
        "is_ordinal": True,
    },
    "Q34D": {
        "display_label": "Accord : politique provinciale trop compliquée à comprendre",
        "concepts": ["compréhension politique"],
        "themes": ["participation politique"],
        "is_ordinal": True,
    },
    "Q36A": {
        "display_label": "Accord : garantir égalité des chances pour tous",
        "concepts": ["égalité", "justice sociale"],
        "themes": ["politique sociale"],
        "is_ordinal": True,
    },
    "Q36B": {
        "display_label": "Accord : inégalité des chances n'est pas grave",
        "concepts": ["égalité"],
        "themes": ["politique sociale"],
        "is_ordinal": True,
    },
    "Q36C": {
        "display_label": "Accord : action gouvernementale nécessaire pour combattre pauvreté",
        "concepts": ["pauvreté", "responsabilité gouvernementale"],
        "themes": ["politique sociale"],
        "is_ordinal": True,
    },
    "Q36D": {
        "display_label": "Accord : profits de entreprises bénéficient à tous",
        "concepts": ["économie", "redistribution"],
        "themes": ["économie"],
        "is_ordinal": True,
    },
    "Q36E": {
        "display_label": "Accord : trop d'immigrants au Québec",
        "concepts": ["immigration", "démographie"],
        "themes": ["immigration"],
        "is_ordinal": True,
    },
    # =========================================================================
    # QUESTIONS DE VALEURS / ENJEUX SOCIÉTAUX
    # =========================================================================
    "Q37": {
        "display_label": "Avortement : devrait-il être illégal?",
        "concepts": ["avortement", "droits reproductifs"],
        "themes": ["valeurs sociales"],
    },
    "Q38": {
        "display_label": "Mariage entre personnes de même sexe",
        "concepts": ["droits LGBTQ+"],
        "themes": ["valeurs sociales"],
    },
    "Q39": {
        "display_label": "Peine de mort",
        "concepts": ["justice criminelle"],
        "themes": ["valeurs sociales"],
    },
    "Q41": {
        "display_label": "Intégration d'immigrants : adaptation ou diversité?",
        "concepts": ["immigration", "intégration"],
        "themes": ["immigration"],
    },
    # =========================================================================
    # RÔLE DE L'ÉTAT ET ÉCONOMIE
    # =========================================================================
    "Q40": {
        "display_label": "Rôle gouvernement : emploi et qualité de vie",
        "concepts": ["interventionnisme", "filet social"],
        "themes": ["économie"],
        "is_ordinal": True,
    },
    "Q43A": {
        "display_label": "Thermomètre : syndicats",
        "concepts": ["syndicats", "relations industrielles"],
        "themes": ["économie"],
    },
    "Q43B": {
        "display_label": "Thermomètre : entreprises",
        "concepts": ["entreprises", "capitalisme"],
        "themes": ["économie"],
    },
    # =========================================================================
    # ENJEUX MAJEURS : CHARTE ET ÉCONOMIE
    # =========================================================================
    "Q44A": {
        "display_label": "Accord : projet de charte de la laïcité",
        "concepts": ["laïcité", "religion"],
        "themes": ["valeurs sociales"],
        "is_ordinal": True,
    },
    "Q44B": {
        "display_label": "Accord : projet de charte des valeurs",
        "concepts": ["charte des valeurs"],
        "themes": ["valeurs sociales"],
        "is_ordinal": True,
    },
    "Q53": {
        "display_label": "Importance de tenir un referendum sur l'indépendance",
        "concepts": ["souveraineté", "référendum"],
        "themes": ["constitution"],
    },
    "Q54": {
        "display_label": "Importance d'adopter une charte de la laïcité",
        "concepts": ["laïcité"],
        "themes": ["valeurs sociales"],
    },
    # =========================================================================
    # ÉVALUATIONS PARTISANES PAR ENJEU
    # =========================================================================
    "Q42A": {
        "display_label": "Meilleur parti : défendre intérêts du Québec",
        "concepts": ["compétence partisane", "intérêts québécois"],
        "themes": ["élections"],
    },
    "Q42B": {
        "display_label": "Meilleur parti : défendre identité et culture québécoise",
        "concepts": ["compétence partisane", "identité québécoise"],
        "themes": ["élections"],
    },
    "Q42C": {
        "display_label": "Meilleur parti : gérer l'économie",
        "concepts": ["compétence partisane", "économie"],
        "themes": ["élections"],
    },
    "Q42D": {
        "display_label": "Meilleur parti : améliorer l'éducation",
        "concepts": ["compétence partisane", "éducation"],
        "themes": ["élections"],
    },
    "Q42E": {
        "display_label": "Meilleur parti : protéger l'environnement",
        "concepts": ["compétence partisane", "environnement"],
        "themes": ["élections"],
    },
    "Q42F": {
        "display_label": "Meilleur parti : gérer le système de santé",
        "concepts": ["compétence partisane", "santé"],
        "themes": ["élections"],
    },
    "Q42G": {
        "display_label": "Meilleur parti : combattre la pauvreté",
        "concepts": ["compétence partisane", "pauvreté"],
        "themes": ["élections"],
    },
    "Q42H": {
        "display_label": "Meilleur parti : lutter contre la corruption",
        "concepts": ["compétence partisane", "intégrité"],
        "themes": ["élections"],
    },
    "Q42I": {
        "display_label": "Meilleur parti : baisser les taxes",
        "concepts": ["compétence partisane", "fiscalité"],
        "themes": ["élections"],
    },
    # =========================================================================
    # ÉCONOMIE : QUÉBEC VIS-À-VIS CANADA ET INDÉPENDANCE
    # =========================================================================
    "Q45": {
        "display_label": "Comparaison : situation économique Québec vs Canada",
        "concepts": ["économie comparée", "relations fédérales"],
        "themes": ["économie", "fédéralisme"],
        "is_ordinal": True,
        "response_order": [1, 3, 2],
    },
    "Q46": {
        "display_label": "Impact sur économie Québec si indépendance",
        "concepts": ["souveraineté", "économie"],
        "themes": ["constitution", "économie"],
        "is_ordinal": True,
        "response_order": [1, 3, 2],
    },
    "Q47": {
        "display_label": "Impact sur situation financière personnelle si indépendance",
        "concepts": ["souveraineté", "économie personnelle"],
        "themes": ["constitution", "économie"],
        "is_ordinal": True,
        "response_order": [1, 3, 2],
    },
    "Q48": {
        "display_label": "Devise si Québec indépendant : dollar canadien ou nouvelle devise?",
        "concepts": ["souveraineté", "politique monétaire"],
        "themes": ["constitution"],
    },
    "Q49": {
        "display_label": "Faire partie du Canada : effet sur économie du Québec",
        "concepts": ["fédéralisme", "économie"],
        "themes": ["économie", "fédéralisme"],
        "is_ordinal": True,
    },
    "Q50": {
        "display_label": "Choix : grand marché vs souveraineté",
        "concepts": ["souveraineté", "économie"],
        "themes": ["constitution", "économie"],
        "is_ordinal": True,
    },
    "Q51": {
        "display_label": "Relations économiques futures : Canada ou États-Unis?",
        "concepts": ["relations commerciales"],
        "themes": ["économie", "commerce"],
    },
    "Q52": {
        "display_label": "Tendance économie Québec : amélioration ou détérioration?",
        "concepts": ["perceptions économiques"],
        "themes": ["économie"],
        "is_ordinal": True,
        "response_order": [1, 3, 2],
    },
}
