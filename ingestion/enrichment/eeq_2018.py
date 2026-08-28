"""Enrichment authoré — eeq_2018. Produit par subagent LLM (2026-08-28)."""

SURVEY = {
    "description": "Élection générale québécoise du 1er octobre 2018. Étude électorale menée par l'Université de Montréal auprès des électeurs du Québec sur leurs comportements électoraux, leurs valeurs politiques et leurs opinions sur les enjeux de la campagne 2018.",
    "month": 10,
}

QUESTIONS = {
    # Démographie et localisation
    "q0qc": {
        "display_label": "Région administrative de résidence",
        "concepts": ["région"],
        "themes": ["géographie"],
    },
    "regio": {
        "display_label": "Région métropolitaine de résidence (RMR)",
        "concepts": ["région"],
        "themes": ["géographie"],
    },
    "qsexe": {
        "display_label": "Sexe du répondant",
        "concepts": [],
        "themes": ["démographie"],
    },
    "agenum": {
        "display_label": "Âge du répondant (numérique)",
        "concepts": ["âge"],
        "themes": ["démographie"],
    },
    "age": {
        "display_label": "Groupe d'âge / cohorte",
        "concepts": ["âge"],
        "themes": ["démographie"],
    },
    "qparents": {
        "display_label": "Résidence chez les parents",
        "concepts": ["famille", "logement"],
        "themes": ["démographie"],
    },
    "qlangue": {
        "display_label": "Langue maternelle",
        "concepts": ["langue"],
        "themes": ["démographie"],
    },
    "qstat": {
        "display_label": "Statut civil",
        "concepts": ["statut civil"],
        "themes": ["démographie"],
    },
    "qenfan": {
        "display_label": "Présence d'enfants de 18 ans ou moins au foyer",
        "concepts": ["famille", "enfants"],
        "themes": ["démographie"],
    },
    "qenfan2": {
        "display_label": "Âge du plus jeune enfant au foyer",
        "concepts": ["famille", "enfants"],
        "themes": ["démographie"],
    },
    "qscol": {
        "display_label": "Niveau d'études complété",
        "concepts": ["éducation"],
        "themes": ["démographie"],
    },
    "qoccup": {
        "display_label": "Occupation principale",
        "concepts": ["emploi"],
        "themes": ["démographie"],
    },

    # Démocratie, enjeux et comportement électoral provincial
    "q1": {
        "display_label": "Satisfaction envers la démocratie au Québec",
        "concepts": ["démocratie", "satisfaction"],
        "themes": ["politique"],
    },
    "q2": {
        "display_label": "Enjeu principal de l'élection provinciale 2018",
        "concepts": ["enjeux électoraux"],
        "themes": ["politique", "élections"],
    },
    "q2_96_other": {
        "display_label": "Autre enjeu électoral principal spécifié",
        "concepts": ["enjeux électoraux"],
        "themes": ["politique", "élections"],
    },
    "q3": {
        "display_label": "Intention de vote au niveau provincial",
        "concepts": ["intentions de vote", "élections provinciales"],
        "themes": ["politique", "élections"],
    },
    "q4": {
        "display_label": "Certitude du choix de vote provincial",
        "concepts": ["intentions de vote"],
        "themes": ["politique", "élections"],
    },
    "q5": {
        "display_label": "Participation à l'élection provinciale du 1er octobre 2018",
        "concepts": ["participation électorale", "abstention"],
        "themes": ["politique", "élections"],
    },
    "q5a": {
        "display_label": "Probabilité perçue de voter",
        "concepts": ["participation électorale"],
        "themes": ["politique", "élections"],
    },
    "q6": {
        "display_label": "Parti pour lequel le répondant a voté le 1er octobre 2018",
        "concepts": ["vote", "élections provinciales"],
        "themes": ["politique", "élections"],
    },
    "q6a": {
        "display_label": "Mode de vote (jour du scrutin, anticipation, poste)",
        "concepts": ["mode de vote", "participation électorale"],
        "themes": ["politique", "élections"],
    },
    "q7": {
        "display_label": "Motivation du vote : adhésion vs vote stratégique",
        "concepts": ["vote stratégique", "motivation de vote"],
        "themes": ["politique", "élections"],
    },
    "q8": {
        "display_label": "Parti qu'on voulait empêcher de gagner (vote stratégique)",
        "concepts": ["vote stratégique"],
        "themes": ["politique", "élections"],
    },
    "q9": {
        "display_label": "Choix de vote contrefactuel (si la personne avait voté)",
        "concepts": ["vote", "intentions de vote"],
        "themes": ["politique", "élections"],
    },
    "q10": {
        "display_label": "Intérêt pour la politique",
        "concepts": ["intérêt politique"],
        "themes": ["politique"],
    },

    # Connaissances politiques et compétences gouvernementales
    "q11_1": {
        "display_label": "Responsabilité gouvernementale : éducation",
        "concepts": ["connaissances politiques", "fédéralisme", "éducation"],
        "themes": ["politique", "gouvernement"],
    },
    "q11_2": {
        "display_label": "Responsabilité gouvernementale : services d'aqueduc",
        "concepts": ["connaissances politiques", "fédéralisme", "services publics"],
        "themes": ["politique", "gouvernement"],
    },
    "q12_1": {
        "display_label": "Connaissance politique : rôle de Rachel Notley",
        "concepts": ["connaissances politiques", "personnalités politiques"],
        "themes": ["politique"],
    },
    "q12_2": {
        "display_label": "Connaissance politique : rôle de Carlos Leitão",
        "concepts": ["connaissances politiques", "personnalités politiques"],
        "themes": ["politique"],
    },
    "q12_3": {
        "display_label": "Connaissance politique : rôle d'Emmanuel Macron",
        "concepts": ["connaissances politiques", "personnalités politiques"],
        "themes": ["politique"],
    },
    "q12_4": {
        "display_label": "Connaissance politique : rôle de Chrystia Freeland",
        "concepts": ["connaissances politiques", "personnalités politiques"],
        "themes": ["politique"],
    },

    # Vote fédéral, slogans et promesses
    "q13": {
        "display_label": "Intention de vote aux élections fédérales",
        "concepts": ["intentions de vote", "élections fédérales"],
        "themes": ["politique", "élections"],
    },
    "q14_1": {
        "display_label": "Association du slogan : « Maintenant »",
        "concepts": ["slogans politiques", "campagne électorale"],
        "themes": ["politique", "élections"],
    },
    "q14_2": {
        "display_label": "Association du slogan : « Sérieusement »",
        "concepts": ["slogans politiques", "campagne électorale"],
        "themes": ["politique", "élections"],
    },
    "q14_3": {
        "display_label": "Association du slogan : « Populaires »",
        "concepts": ["slogans politiques", "campagne électorale"],
        "themes": ["politique", "élections"],
    },
    "q14_4": {
        "display_label": "Association du slogan : « Pour faire évoluer le Québec »",
        "concepts": ["slogans politiques", "campagne électorale"],
        "themes": ["politique", "élections"],
    },
    "q14_5": {
        "display_label": "Association du slogan : « Changer de cap »",
        "concepts": ["slogans politiques", "campagne électorale"],
        "themes": ["politique", "élections"],
    },
    "q15_1": {
        "display_label": "Association de la promesse : Assurance dentaire pour tous",
        "concepts": ["promesses électorales", "santé"],
        "themes": ["politique", "élections", "santé"],
    },
    "q15_2": {
        "display_label": "Association de la promesse : Maternelle dès 4 ans",
        "concepts": ["promesses électorales", "éducation", "petite enfance"],
        "themes": ["politique", "élections", "éducation"],
    },
    "q15_3": {
        "display_label": "Association de la promesse : Réduction de l'impôt sur le revenu",
        "concepts": ["promesses électorales", "impôts", "fiscalité"],
        "themes": ["politique", "élections", "économie"],
    },
    "q15_4": {
        "display_label": "Association de la promesse : Tarif unique en service de garde subventionné",
        "concepts": ["promesses électorales", "services de garde", "famille"],
        "themes": ["politique", "élections", "famille"],
    },

    # Image des partis et représentation des groupes
    "q16_1": {
        "display_label": "Association spontanée : Parti pour les intérêts du Québec",
        "concepts": ["image des partis", "identité"],
        "themes": ["politique"],
    },
    "q16_2": {
        "display_label": "Association spontanée : Parti pour l'économie",
        "concepts": ["image des partis", "économie"],
        "themes": ["politique", "économie"],
    },
    "q16_3": {
        "display_label": "Association spontanée : Parti pour la santé",
        "concepts": ["image des partis", "santé"],
        "themes": ["politique", "santé"],
    },
    "q16_4": {
        "display_label": "Association spontanée : Parti pour l'environnement",
        "concepts": ["image des partis", "environnement"],
        "themes": ["politique", "environnement"],
    },
    "q16_5": {
        "display_label": "Association spontanée : Parti pour l'éducation",
        "concepts": ["image des partis", "éducation"],
        "themes": ["politique", "éducation"],
    },
    "q16_6": {
        "display_label": "Association spontanée : Parti pour les taxes et finances publiques",
        "concepts": ["image des partis", "finances publiques", "impôts"],
        "themes": ["politique", "économie"],
    },
    "q16_7": {
        "display_label": "Association spontanée : Parti pour l'immigration",
        "concepts": ["image des partis", "immigration"],
        "themes": ["politique", "immigration"],
    },
    "q16_8": {
        "display_label": "Association spontanée : Parti pour l'intégrité et la lutte contre la corruption",
        "concepts": ["image des partis", "éthique", "corruption"],
        "themes": ["politique"],
    },
    "q17_1": {
        "display_label": "Association spontanée : Parti représentant les 18-34 ans",
        "concepts": ["image des partis", "jeunesse"],
        "themes": ["politique"],
    },
    "q17_2": {
        "display_label": "Association spontanée : Parti représentant les 35-54 ans",
        "concepts": ["image des partis"],
        "themes": ["politique"],
    },
    "q17_3": {
        "display_label": "Association spontanée : Parti représentant les 55 ans et plus",
        "concepts": ["image des partis", "aînés"],
        "themes": ["politique"],
    },

    # Interventionnisme, conjoncture et identité
    "q18": {
        "display_label": "Rôle de l'État : Réduction de l'écart riches/pauvres",
        "concepts": ["inégalités", "redistribution", "rôle de l'État"],
        "themes": ["économie", "politique sociale"],
    },
    "q19": {
        "display_label": "Évolution de l'économie du Québec dans la dernière année",
        "concepts": ["économie"],
        "themes": ["économie"],
    },
    "q20a": {
        "display_label": "Autodéfinition identitaire : Québécois vs Canadien (Option A)",
        "concepts": ["identité", "nationalisme"],
        "themes": ["identité", "souveraineté"],
    },
    "q20b": {
        "display_label": "Autodéfinition identitaire : Canadien vs Québécois (Option B)",
        "concepts": ["identité", "nationalisme"],
        "themes": ["identité", "souveraineté"],
    },
    "q21_1": {
        "display_label": "Valeurs et priorités : Québécois distincts vs semblables aux Canadiens",
        "concepts": ["valeurs", "identité"],
        "themes": ["identité"],
    },
    "q22_1": {
        "display_label": "Critère identitaire québécois : Être né au Québec",
        "concepts": ["identité", "nationalisme"],
        "themes": ["identité"],
    },
    "q22_2": {
        "display_label": "Critère identitaire québécois : Vivre au Québec depuis longtemps",
        "concepts": ["identité"],
        "themes": ["identité"],
    },
    "q22_3": {
        "display_label": "Critère identitaire québécois : Parler français",
        "concepts": ["langue française", "identité"],
        "themes": ["identité", "langue"],
    },
    "q22_4": {
        "display_label": "Critère identitaire québécois : Partager la culture québécoise",
        "concepts": ["culture", "identité"],
        "themes": ["identité"],
    },
    "q22_5": {
        "display_label": "Critère identitaire québécois : Respecter les lois et institutions",
        "concepts": ["civisme", "identité"],
        "themes": ["identité"],
    },
    "q22_6": {
        "display_label": "Critère identitaire québécois : Se sentir Québécois",
        "concepts": ["sentiment d'appartenance", "identité"],
        "themes": ["identité"],
    },
    "q22_7": {
        "display_label": "Critère identitaire québécois : Être de religion catholique ou chrétienne",
        "concepts": ["religion", "identité"],
        "themes": ["identité"],
    },
    "q22_8": {
        "display_label": "Critère identitaire québécois : Avoir des ancêtres canadiens-français",
        "concepts": ["origine", "identité"],
        "themes": ["identité"],
    },

    # Référendum, attachement et bilans sectoriels
    "q23": {
        "display_label": "Participation au référendum de 1995 sur la souveraineté",
        "concepts": ["référendum 1995", "souveraineté"],
        "themes": ["politique", "souveraineté"],
    },
    "q24": {
        "display_label": "Choix de vote au référendum de 1995 (Oui / Non)",
        "concepts": ["référendum 1995", "souveraineté"],
        "themes": ["politique", "souveraineté"],
    },
    "q25": {
        "display_label": "Sentiment d'attachement au Québec",
        "concepts": ["sentiment d'appartenance", "identité"],
        "themes": ["identité"],
    },
    "q26": {
        "display_label": "Sentiment d'attachement au Canada",
        "concepts": ["sentiment d'appartenance", "identité"],
        "themes": ["identité"],
    },
    "q27": {
        "display_label": "Évolution de la qualité des services de santé au Québec",
        "concepts": ["santé", "services publics"],
        "themes": ["santé", "services publics"],
    },
    "q28": {
        "display_label": "Évolution de la qualité du système d'éducation au Québec",
        "concepts": ["éducation", "services publics"],
        "themes": ["éducation", "services publics"],
    },

    # Discussions politiques
    "q29_1": {
        "display_label": "Fréquence de discussion politique : avec les parents",
        "concepts": ["discussion politique"],
        "themes": ["politique", "société"],
    },
    "q29_2": {
        "display_label": "Fréquence de discussion politique : avec la famille",
        "concepts": ["discussion politique"],
        "themes": ["politique", "société"],
    },
    "q29_3": {
        "display_label": "Fréquence de discussion politique : avec les amis",
        "concepts": ["discussion politique"],
        "themes": ["politique", "société"],
    },
    "q29_4": {
        "display_label": "Fréquence de discussion politique : avec le partenaire de vie",
        "concepts": ["discussion politique"],
        "themes": ["politique", "société"],
    },
    "q29_5": {
        "display_label": "Fréquence de discussion politique : avec les collègues de travail",
        "concepts": ["discussion politique"],
        "themes": ["politique", "société"],
    },
    "q29_6": {
        "display_label": "Fréquence de discussion politique : avec les voisins",
        "concepts": ["discussion politique"],
        "themes": ["politique", "société"],
    },
    "q29_7": {
        "display_label": "Fréquence de discussion politique : avec des inconnus",
        "concepts": ["discussion politique"],
        "themes": ["politique", "société"],
    },

    # Discussion sur la campagne récente
    "q30_1": {
        "display_label": "Discussion sur l'élection provinciale 2018 : avec les parents",
        "concepts": ["discussion politique", "élections provinciales"],
        "themes": ["politique", "élections"],
    },
    "q30_2": {
        "display_label": "Discussion sur l'élection provinciale 2018 : avec la famille",
        "concepts": ["discussion politique", "élections provinciales"],
        "themes": ["politique", "élections"],
    },
    "q30_3": {
        "display_label": "Discussion sur l'élection provinciale 2018 : avec les amis",
        "concepts": ["discussion politique", "élections provinciales"],
        "themes": ["politique", "élections"],
    },
    "q30_4": {
        "display_label": "Discussion sur l'élection provinciale 2018 : avec le partenaire de vie",
        "concepts": ["discussion politique", "élections provinciales"],
        "themes": ["politique", "élections"],
    },
    "q30_5": {
        "display_label": "Discussion sur l'élection provinciale 2018 : avec les collègues de travail",
        "concepts": ["discussion politique", "élections provinciales"],
        "themes": ["politique", "élections"],
    },
    "q30_6": {
        "display_label": "Discussion sur l'élection provinciale 2018 : avec les voisins",
        "concepts": ["discussion politique", "élections provinciales"],
        "themes": ["politique", "élections"],
    },
    "q30_7": {
        "display_label": "Discussion sur l'élection provinciale 2018 : avec des inconnus",
        "concepts": ["discussion politique", "élections provinciales"],
        "themes": ["politique", "élections"],
    },

    # Participation et engagement politique durant la campagne
    "q31_1": {
        "display_label": "Activité électorale : Assistance à une séance d'information",
        "concepts": ["participation politique"],
        "themes": ["politique", "élections"],
    },
    "q31_2": {
        "display_label": "Activité électorale : Recherche d'information sur les élections",
        "concepts": ["information politique", "participation politique"],
        "themes": ["politique", "élections"],
    },
    "q31_3": {
        "display_label": "Activité électorale : Échange avec un candidat politique",
        "concepts": ["participation politique"],
        "themes": ["politique", "élections"],
    },
    "q31_4": {
        "display_label": "Activité électorale : Écoute des débats des chefs",
        "concepts": ["débats des chefs", "information politique"],
        "themes": ["politique", "élections"],
    },
    "q31_5": {
        "display_label": "Activité électorale : Assistance à un débat à l'école ou au travail",
        "concepts": ["participation politique"],
        "themes": ["politique", "élections"],
    },
    "q31_6": {
        "display_label": "Activité électorale : Persuasion d'un tiers à voter pour un parti",
        "concepts": ["persuasion politique", "participation politique"],
        "themes": ["politique", "élections"],
    },

    # Disposition à l'engagement politique
    "q32_1": {
        "display_label": "Disposition à participer : Voter à des élections",
        "concepts": ["participation électorale"],
        "themes": ["politique", "élections"],
    },
    "q32_2": {
        "display_label": "Disposition à participer : Travailler pour un parti ou un candidat",
        "concepts": ["militantisme", "participation politique"],
        "themes": ["politique"],
    },
    "q32_3": {
        "display_label": "Disposition à participer : Faire un don d'argent politique",
        "concepts": ["financement politique", "participation politique"],
        "themes": ["politique"],
    },
    "q32_4": {
        "display_label": "Disposition à participer : Assister à une manifestation politique",
        "concepts": ["manifestation", "participation politique"],
        "themes": ["politique"],
    },

    # Évaluation des chefs politiques
    "q33_a": {
        "display_label": "Évaluation de Philippe Couillard (échelle 0-10)",
        "concepts": ["personnalités politiques", "évaluation des chefs"],
        "themes": ["politique"],
    },
    "q33_b": {
        "display_label": "Évaluation de Jean-François Lisée (échelle 0-10)",
        "concepts": ["personnalités politiques", "évaluation des chefs"],
        "themes": ["politique"],
    },
    "q33_c": {
        "display_label": "Évaluation de François Legault (échelle 0-10)",
        "concepts": ["personnalités politiques", "évaluation des chefs"],
        "themes": ["politique"],
    },
    "q33_d": {
        "display_label": "Évaluation de Manon Massé (échelle 0-10)",
        "concepts": ["personnalités politiques", "évaluation des chefs"],
        "themes": ["politique"],
    },
    "q33_e": {
        "display_label": "Évaluation de Gabriel Nadeau-Dubois (échelle 0-10)",
        "concepts": ["personnalités politiques", "évaluation des chefs"],
        "themes": ["politique"],
    },
    "q33_f": {
        "display_label": "Évaluation d'Adrien Pouliot (échelle 0-10)",
        "concepts": ["personnalités politiques", "évaluation des chefs"],
        "themes": ["politique"],
    },

    # Thermomètre des groupes sociaux
    "q34_a": {
        "display_label": "Évaluation des minorités ethnoculturelles (échelle 0-10)",
        "concepts": ["minorités", "diversité"],
        "themes": ["société", "diversité"],
    },
    "q34_b": {
        "display_label": "Évaluation des immigrants (échelle 0-10)",
        "concepts": ["immigrants", "immigration"],
        "themes": ["immigration", "société"],
    },
    "q34_c": {
        "display_label": "Évaluation des anglophones du Québec (échelle 0-10)",
        "concepts": ["anglophones", "linguistique"],
        "themes": ["société", "langue"],
    },
    "q34_d": {
        "display_label": "Évaluation des francophones du Québec (échelle 0-10)",
        "concepts": ["francophones", "linguistique"],
        "themes": ["société", "langue"],
    },
    "q34_e": {
        "display_label": "Évaluation des musulmans (échelle 0-10)",
        "concepts": ["musulmans", "religion"],
        "themes": ["société", "diversité"],
    },

    # Positionnement axe gauche-droite
    "q35_1": {
        "display_label": "Positionnement gauche-droite : Parti libéral du Québec",
        "concepts": ["axe gauche-droite", "idées politiques"],
        "themes": ["politique"],
    },
    "q35_2": {
        "display_label": "Positionnement gauche-droite : Parti québécois",
        "concepts": ["axe gauche-droite", "idées politiques"],
        "themes": ["politique"],
    },
    "q35_3": {
        "display_label": "Positionnement gauche-droite : Coalition avenir Québec",
        "concepts": ["axe gauche-droite", "idées politiques"],
        "themes": ["politique"],
    },
    "q35_4": {
        "display_label": "Positionnement gauche-droite : Québec solidaire",
        "concepts": ["axe gauche-droite", "idées politiques"],
        "themes": ["politique"],
    },
    "q36_1": {
        "display_label": "Positionnement gauche-droite personnel",
        "concepts": ["axe gauche-droite", "idées politiques"],
        "themes": ["politique"],
    },

    # Prise de décision publique et démocratie
    "q37a_1": {
        "display_label": "Prise de décision : Citoyens vs politiciens élus",
        "concepts": ["démocratie directe", "prise de décision"],
        "themes": ["démocratie"],
    },
    "q37b_1": {
        "display_label": "Prise de décision : Politiciens élus vs experts indépendants",
        "concepts": ["technocratie", "prise de décision"],
        "themes": ["démocratie"],
    },
    "q37c_1": {
        "display_label": "Prise de décision : Experts indépendants vs citoyens",
        "concepts": ["démocratie directe", "technocratie"],
        "themes": ["démocratie"],
    },

    # Attitudes socio-économiques et valeurs
    "q38_1": {
        "display_label": "Accord : Responsabilité du gouvernement pour les besoins fondamentaux",
        "concepts": ["filet social", "rôle de l'État"],
        "themes": ["politique sociale"],
    },
    "q38_2": {
        "display_label": "Accord : Augmentation des taxes/impôts pour financer les services publics",
        "concepts": ["impôts", "services publics"],
        "themes": ["économie", "fiscalité"],
    },
    "q38_3": {
        "display_label": "Accord : Plus de place aux entreprises privées dans l'économie",
        "concepts": ["libre marché", "privatisation"],
        "themes": ["économie"],
    },
    "q38_4": {
        "display_label": "Accord : Plus de dépenses publiques pour l'environnement",
        "concepts": ["environnement", "dépenses publiques"],
        "themes": ["environnement"],
    },
    "q38_5": {
        "display_label": "Accord : Plus d'importance aux traditions et valeurs morales",
        "concepts": ["conservatisme", "valeurs"],
        "themes": ["société"],
    },

    # Immigration, diversité, égalité et cynisme politique
    "q39a": {
        "display_label": "Accord : Contribution importante des immigrants au Québec",
        "concepts": ["immigration"],
        "themes": ["immigration", "société"],
    },
    "q39b": {
        "display_label": "Accord : Adaptation des immigrants aux valeurs québécoises",
        "concepts": ["intégration", "immigration"],
        "themes": ["immigration", "société"],
    },
    "q39c": {
        "display_label": "Accord : Mesures gouvernementales pour l'égalité homme-femme",
        "concepts": ["égalité des sexes", "féminisme"],
        "themes": ["société", "droits"],
    },
    "q39d": {
        "display_label": "Accord : Droits égaux au mariage et à l'adoption pour couples de même sexe",
        "concepts": ["droits LGBTQ+", "mariage égalitaire"],
        "themes": ["société", "droits"],
    },
    "q39e": {
        "display_label": "Accord : Le gouvernement fait trop pour les minorités ethniques et religieuses",
        "concepts": ["minorités", "multiculturalisme"],
        "themes": ["diversité", "société"],
    },
    "q39f": {
        "display_label": "Accord : Présence des minorités ethniques enrichit la vie culturelle",
        "concepts": ["diversité", "culture"],
        "themes": ["diversité", "société"],
    },
    "q39g": {
        "display_label": "Accord : Obligation de maîtriser le français pour les arrivants",
        "concepts": ["langue française", "immigration"],
        "themes": ["langue", "immigration"],
    },
    "q39h": {
        "display_label": "Accord : Les politiciens ne se soucient pas des gens comme moi",
        "concepts": ["cynisme politique", "confiance politique"],
        "themes": ["politique"],
    },
    "q39i": {
        "display_label": "Accord : Le gouvernement est géré par quelques grands intérêts",
        "concepts": ["cynisme politique", "confiance politique"],
        "themes": ["politique"],
    },
    "q39j": {
        "display_label": "Accord : Les citoyens ont suffisamment d'influence sur le gouvernement",
        "concepts": ["efficacité politique", "démocratie"],
        "themes": ["politique"],
    },

    # Syndicats, privatisation, services publics, éducation et souveraineté
    "q40a": {
        "display_label": "Accord : Les syndicats ont trop de pouvoir au Québec",
        "concepts": ["syndicalisme", "relations de travail"],
        "themes": ["économie", "travail"],
    },
    "q40b": {
        "display_label": "Accord : Entreprises privées gèrent mieux les services que le gouvernement",
        "concepts": ["privatisation", "services publics"],
        "themes": ["économie"],
    },
    "q40c": {
        "display_label": "Accord : Plus d'investissements dans les transports en commun",
        "concepts": ["transports en commun"],
        "themes": ["environnement", "infrastructures"],
    },
    "q40d": {
        "display_label": "Accord : Baisser les impôts même si cela réduit les services publics",
        "concepts": ["impôts", "services publics"],
        "themes": ["économie", "fiscalité"],
    },
    "q40e": {
        "display_label": "Accord : Étudiants universitaires devraient payer plus pour leurs études",
        "concepts": ["frais de scolarité", "enseignement supérieur"],
        "themes": ["éducation"],
    },
    "q40f": {
        "display_label": "Accord : Normes environnementales plus strictes pour les entreprises",
        "concepts": ["réglementation environnementale"],
        "themes": ["environnement", "économie"],
    },
    "q40g": {
        "display_label": "Accord : Le Québec devrait chercher à devenir un pays souverain",
        "concepts": ["souveraineté"],
        "themes": ["souveraineté"],
    },
    "q40h": {
        "display_label": "Accord : Souveraineté pour mieux protéger la langue et la culture",
        "concepts": ["souveraineté", "langue française", "culture"],
        "themes": ["souveraineté", "culture"],
    },
    "q40i": {
        "display_label": "Accord : La souveraineté entraînerait une instabilité économique importante",
        "concepts": ["souveraineté", "économie"],
        "themes": ["souveraineté", "économie"],
    },
    "q41_1": {
        "display_label": "Arbitrage fiscal : Plus de taxes/services vs Moins de taxes/services",
        "concepts": ["impôts", "services publics"],
        "themes": ["économie", "fiscalité"],
    },
    "q42": {
        "display_label": "Opinion sur la souveraineté / indépendance du Québec",
        "concepts": ["souveraineté", "indépendance"],
        "themes": ["souveraineté"],
    },

    # Polémiques et enjeux spécifiques de politiques publiques
    "q43": {
        "display_label": "Restrictions plus sévères sur la vente de cannabis",
        "concepts": ["cannabis", "drogues"],
        "themes": ["santé", "société"],
    },
    "q44": {
        "display_label": "Symboles religieux visibles chez les enseignants des écoles publiques",
        "concepts": ["laïcité", "symboles religieux"],
        "themes": ["laïcité", "société"],
    },
    "q45": {
        "display_label": "Découverture du visage (voile intégral) pour services gouvernementaux",
        "concepts": ["laïcité", "voile intégral"],
        "themes": ["laïcité", "société"],
    },
    "q46": {
        "display_label": "Test de français obligatoire pour la résidence permanente",
        "concepts": ["langue française", "immigration"],
        "themes": ["immigration", "langue"],
    },
    "q47_1": {
        "display_label": "Rôle de l'État : Garant de l'emploi/qualité de vie vs Autonomie individuelle",
        "concepts": ["rôle de l'État", "responsabilité individuelle"],
        "themes": ["économie", "politique sociale"],
    },
    "q48": {
        "display_label": "Réduction du nombre d'immigrants admis chaque année",
        "concepts": ["seuils d'immigration", "immigration"],
        "themes": ["immigration"],
    },
    "q49": {
        "display_label": "Abolition des commissions scolaires",
        "concepts": ["commissions scolaires", "réforme de l'éducation"],
        "themes": ["éducation"],
    },
    "q50x1": {
        "display_label": "Abaissement de l'âge de voter à 16 ans (Neutre)",
        "concepts": ["droit de vote", "âge de voter", "jeunesse"],
        "themes": ["démocratie", "élections"],
    },
    "q50x2": {
        "display_label": "Abaissement de l'âge de voter à 16 ans (Argument participation électorale)",
        "concepts": ["droit de vote", "âge de voter", "jeunesse"],
        "themes": ["démocratie", "élections"],
    },
    "q50x3": {
        "display_label": "Abaissement de l'âge de voter à 16 ans (Argument travail et impôts)",
        "concepts": ["droit de vote", "âge de voter", "jeunesse"],
        "themes": ["démocratie", "élections"],
    },

    # Meilleur parti selon l'enjeu
    "q51a_1": {
        "display_label": "Meilleur parti pour : Défendre les intérêts du Québec",
        "concepts": ["image des partis", "identité"],
        "themes": ["politique"],
    },
    "q51a_2": {
        "display_label": "Meilleur parti pour : Défendre l'identité et la culture québécoises",
        "concepts": ["image des partis", "identité", "culture"],
        "themes": ["politique", "culture"],
    },
    "q51a_3": {
        "display_label": "Meilleur parti pour : Gérer les finances publiques",
        "concepts": ["image des partis", "finances publiques"],
        "themes": ["politique", "économie"],
    },
    "q51a_4": {
        "display_label": "Meilleur parti pour : Améliorer les services de santé",
        "concepts": ["image des partis", "santé"],
        "themes": ["politique", "santé"],
    },
    "q51a_5": {
        "display_label": "Meilleur parti pour : Améliorer le système d'éducation",
        "concepts": ["image des partis", "éducation"],
        "themes": ["politique", "éducation"],
    },
    "q51a_6": {
        "display_label": "Meilleur parti pour : Protéger l'environnement",
        "concepts": ["image des partis", "environnement"],
        "themes": ["politique", "environnement"],
    },
    "q51a_7": {
        "display_label": "Meilleur parti pour : Lutter contre la pauvreté et les inégalités",
        "concepts": ["image des partis", "pauvreté", "inégalités"],
        "themes": ["politique", "politique sociale"],
    },
    "q51a_8": {
        "display_label": "Meilleur parti pour : Gérer les enjeux d'immigration",
        "concepts": ["image des partis", "immigration"],
        "themes": ["politique", "immigration"],
    },
    "q52_1": {
        "display_label": "Meilleur parti pour : Défendre les intérêts des 18-34 ans",
        "concepts": ["image des partis", "jeunesse"],
        "themes": ["politique"],
    },
    "q52_2": {
        "display_label": "Meilleur parti pour : Défendre les intérêts des familles avec enfants",
        "concepts": ["image des partis", "famille"],
        "themes": ["politique", "famille"],
    },
    "q52_3": {
        "display_label": "Meilleur parti pour : Défendre les intérêts des personnes aînées",
        "concepts": ["image des partis", "aînés"],
        "themes": ["politique"],
    },

    # Engagement citoyen et social
    "q53": {
        "display_label": "Bénévolat dans les 12 derniers mois",
        "concepts": ["bénévolat", "engagement communautaire"],
        "themes": ["société"],
    },
    "q54": {
        "display_label": "Don d'argent dans les 12 derniers mois",
        "concepts": ["philanthropie", "dons"],
        "themes": ["société"],
    },
    "q55a": {
        "display_label": "Boycottage ou achat éthique/politique dans les 12 derniers mois",
        "concepts": ["consommation engagée", "boycottage"],
        "themes": ["société", "politique"],
    },
    "q55b": {
        "display_label": "Signature de pétition politique ou sociale dans les 12 derniers mois",
        "concepts": ["pétitions", "participation politique"],
        "themes": ["politique"],
    },

    # Revenu, religion et personnalité
    "q56": {
        "display_label": "Revenu total du ménage (2017)",
        "concepts": ["revenu"],
        "themes": ["économie personnelle", "démographie"],
    },
    "q57": {
        "display_label": "Sous-groupe de revenu du ménage",
        "concepts": ["revenu"],
        "themes": ["économie personnelle", "démographie"],
    },
    "q58": {
        "display_label": "Appartenance religieuse",
        "concepts": ["religion"],
        "themes": ["démographie", "société"],
    },
    "q59_1": {
        "display_label": "Trait de personnalité : Désir d'explorer des endroits différents",
        "concepts": ["personnalité"],
        "themes": ["sociologie"],
    },
    "q59_2": {
        "display_label": "Trait de personnalité : Goût pour la nouveauté et prise de risques",
        "concepts": ["personnalité"],
        "themes": ["sociologie"],
    },
    "q59_3": {
        "display_label": "Trait de personnalité : Préférence pour les habitudes",
        "concepts": ["personnalité"],
        "themes": ["sociologie"],
    },
    "q60": {
        "display_label": "Fréquence d'assistance aux services religieux",
        "concepts": ["pratique religieuse", "religion"],
        "themes": ["société"],
    },
    "q61": {
        "display_label": "Fréquence de prière ou méditation",
        "concepts": ["spiritualité", "religion"],
        "themes": ["société"],
    },
    "q62a": {
        "display_label": "Niveau de sentiment d'appartenance au Québec (échelle 0-10)",
        "concepts": ["sentiment d'appartenance", "identité"],
        "themes": ["identité"],
    },
    "q62b": {
        "display_label": "Niveau de sentiment d'appartenance au Canada (échelle 0-10)",
        "concepts": ["sentiment d'appartenance", "identité"],
        "themes": ["identité"],
    },

    # Patrimoine financier du répondant
    "q63a_1": {
        "display_label": "Détention par le ménage : Compte épargne bancaire",
        "concepts": ["placements", "épargne"],
        "themes": ["économie personnelle"],
    },
    "q63a_2": {
        "display_label": "Détention par le ménage : Compte en société de fiducie",
        "concepts": ["placements", "épargne"],
        "themes": ["économie personnelle"],
    },
    "q63a_3": {
        "display_label": "Détention par le ménage : REER ou CELI",
        "concepts": ["placements", "épargne"],
        "themes": ["économie personnelle"],
    },
    "q63a_4": {
        "display_label": "Détention par le ménage : Actions ou parts d'entreprise",
        "concepts": ["placements", "investissements"],
        "themes": ["économie personnelle"],
    },
    "q63a_5": {
        "display_label": "Détention par le ménage : Obligations",
        "concepts": ["placements", "investissements"],
        "themes": ["économie personnelle"],
    },
    "q63a_6": {
        "display_label": "Détention par le ménage : CPG ou fonds mutuels",
        "concepts": ["placements", "investissements"],
        "themes": ["économie personnelle"],
    },
    "q63a_7": {
        "display_label": "Détention par le ménage : Autre placement financier",
        "concepts": ["placements"],
        "themes": ["économie personnelle"],
    },

    # Patrimoine financier des parents
    "q63b_1": {
        "display_label": "Détention par les parents : Compte épargne bancaire",
        "concepts": ["patrimoine familial", "placements"],
        "themes": ["économie personnelle"],
    },
    "q63b_2": {
        "display_label": "Détention par les parents : Compte en société de fiducie",
        "concepts": ["patrimoine familial", "placements"],
        "themes": ["économie personnelle"],
    },
    "q63b_3": {
        "display_label": "Détention par les parents : REER ou CELI",
        "concepts": ["patrimoine familial", "placements"],
        "themes": ["économie personnelle"],
    },
    "q63b_4": {
        "display_label": "Détention par les parents : Actions ou parts d'entreprise",
        "concepts": ["patrimoine familial", "placements"],
        "themes": ["économie personnelle"],
    },
    "q63b_5": {
        "display_label": "Détention par les parents : Obligations",
        "concepts": ["patrimoine familial", "placements"],
        "themes": ["économie personnelle"],
    },
    "q63b_6": {
        "display_label": "Détention par les parents : CPG ou fonds mutuels",
        "concepts": ["patrimoine familial", "placements"],
        "themes": ["économie personnelle"],
    },
    "q63b_7": {
        "display_label": "Détention par les parents : Autre placement financier",
        "concepts": ["patrimoine familial", "placements"],
        "themes": ["économie personnelle"],
    },

    # Patrimoine immobilier/d'entreprise du répondant
    "q64a_1": {
        "display_label": "Propriété : Résidence principale",
        "concepts": ["propriété immobilière", "patrimoine"],
        "themes": ["économie personnelle"],
    },
    "q64a_2": {
        "display_label": "Propriété : Résidence secondaire ou chalet",
        "concepts": ["propriété immobilière", "patrimoine"],
        "themes": ["économie personnelle"],
    },
    "q64a_3": {
        "display_label": "Propriété : Immeubles locatifs / duplex",
        "concepts": ["propriété immobilière", "patrimoine"],
        "themes": ["économie personnelle"],
    },
    "q64a_4": {
        "display_label": "Propriété : Commerce ou entreprise",
        "concepts": ["entreprise", "patrimoine"],
        "themes": ["économie personnelle"],
    },
    "q64a_5": {
        "display_label": "Propriété : Terrain ou ferme",
        "concepts": ["propriété foncière", "patrimoine"],
        "themes": ["économie personnelle"],
    },

    # Patrimoine immobilier/d'entreprise des parents
    "q64b_1": {
        "display_label": "Propriété des parents : Résidence principale",
        "concepts": ["propriété immobilière", "patrimoine familial"],
        "themes": ["économie personnelle"],
    },
    "q64b_2": {
        "display_label": "Propriété des parents : Résidence secondaire ou chalet",
        "concepts": ["propriété immobilière", "patrimoine familial"],
        "themes": ["économie personnelle"],
    },
    "q64b_3": {
        "display_label": "Propriété des parents : Immeubles locatifs / duplex",
        "concepts": ["propriété immobilière", "patrimoine familial"],
        "themes": ["économie personnelle"],
    },
    "q64b_4": {
        "display_label": "Propriété des parents : Commerce ou entreprise",
        "concepts": ["entreprise", "patrimoine familial"],
        "themes": ["économie personnelle"],
    },
    "q64b_5": {
        "display_label": "Propriété des parents : Terrain ou ferme",
        "concepts": ["propriété foncière", "patrimoine familial"],
        "themes": ["économie personnelle"],
    },

    # Hypothèques
    "q65a": {
        "display_label": "Hypothèque sur la résidence principale du répondant",
        "concepts": ["hypothèque", "dette"],
        "themes": ["économie personnelle"],
    },
    "q65b": {
        "display_label": "Hypothèque sur la résidence principale des parents",
        "concepts": ["hypothèque", "dette"],
        "themes": ["économie personnelle"],
    },

    # Immigration et origines
    "q66": {
        "display_label": "Lieu de naissance (Canada ou étranger)",
        "concepts": ["immigration", "origine"],
        "themes": ["démographie"],
    },
    "q67": {
        "display_label": "Période d'arrivée au Canada",
        "concepts": ["immigration"],
        "themes": ["démographie"],
    },
    "q68": {
        "display_label": "Pays de naissance",
        "concepts": ["immigration", "origine"],
        "themes": ["démographie"],
    },
    "q69": {
        "display_label": "Lieu de naissance des parents (au Canada ou non)",
        "concepts": ["immigration", "origine"],
        "themes": ["démographie"],
    },
    "q70": {
        "display_label": "Langue parlée le plus souvent à la maison",
        "concepts": ["langue"],
        "themes": ["démographie", "langue"],
    },

    # Origine ethnique
    "q71_1": {
        "display_label": "Origine ethnique : Canadienne ou Québécoise",
        "concepts": ["origine ethnique", "diversité"],
        "themes": ["démographie"],
    },
    "q71_2": {
        "display_label": "Origine ethnique : Autochtone",
        "concepts": ["origine ethnique", "diversité"],
        "themes": ["démographie"],
    },
    "q71_3": {
        "display_label": "Origine ethnique : Afrique du Nord",
        "concepts": ["origine ethnique", "diversité"],
        "themes": ["démographie"],
    },
    "q71_4": {
        "display_label": "Origine ethnique : Afrique subsaharienne et Afrique du Sud",
        "concepts": ["origine ethnique", "diversité"],
        "themes": ["démographie"],
    },
    "q71_5": {
        "display_label": "Origine ethnique : Amérique centrale et du Sud",
        "concepts": ["origine ethnique", "diversité"],
        "themes": ["démographie"],
    },
    "q71_6": {
        "display_label": "Origine ethnique : Américaine (États-Unis)",
        "concepts": ["origine ethnique", "diversité"],
        "themes": ["démographie"],
    },
    "q71_7": {
        "display_label": "Origine ethnique : Mexicaine",
        "concepts": ["origine ethnique", "diversité"],
        "themes": ["démographie"],
    },
    "q71_8": {
        "display_label": "Origine ethnique : Antillaise",
        "concepts": ["origine ethnique", "diversité"],
        "themes": ["démographie"],
    },
    "q71_9": {
        "display_label": "Origine ethnique : Asiatique",
        "concepts": ["origine ethnique", "diversité"],
        "themes": ["démographie"],
    },
    "q71_10": {
        "display_label": "Origine ethnique : Européenne",
        "concepts": ["origine ethnique", "diversité"],
        "themes": ["démographie"],
    },
    "q71_11": {
        "display_label": "Origine ethnique : Océanie",
        "concepts": ["origine ethnique", "diversité"],
        "themes": ["démographie"],
    },
    "q71_12": {
        "display_label": "Origine ethnique : Autre pays d'origine du répondant",
        "concepts": ["origine ethnique", "diversité"],
        "themes": ["démographie"],
    },
    "q71_13": {
        "display_label": "Origine ethnique : Autre pays d'origine des ancêtres",
        "concepts": ["origine ethnique", "diversité"],
        "themes": ["démographie"],
    },
    "q71_96": {
        "display_label": "Origine ethnique : Autre origine précisée",
        "concepts": ["origine ethnique", "diversité"],
        "themes": ["démographie"],
    },
    "q71_98": {
        "display_label": "Origine ethnique : Ne sait pas",
        "concepts": ["origine ethnique", "diversité"],
        "themes": ["démographie"],
    },
    "q71_99": {
        "display_label": "Origine ethnique : Refus de répondre",
        "concepts": ["origine ethnique", "diversité"],
        "themes": ["démographie"],
    },
}
