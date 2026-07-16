"""Enrichment authoré — cecd_elxn_qc_2007. Produit par subagent LLM (2026-07-07)."""

SURVEY = {
    "description": "Panel électoral du Québec 2007 (firme CROP). Sondage mené par entrevue téléphonique auprès de 2442 répondants québécois en trois vagues : deux sondages de campagne en mars 2007 (avant et après le débat des chefs du 13 mars), plus sondage post-électoral en avril 2007 sur l'élection générale du 26 mars.",
    "month": 3,
}

QUESTIONS = {
    "sexe": {
        "display_label": "Sexe du répondant",
        "concepts": ["sexe"],
        "themes": ["démographie"],
    },
    "reg": {
        "display_label": "Région de résidence du répondant",
        "concepts": ["géographie"],
        "themes": ["démographie"],
    },
    "reg2": {
        "display_label": "Sous-région de résidence du répondant",
        "concepts": ["géographie"],
        "themes": ["démographie"],
    },
    "age": {
        "display_label": "Groupe d'âge du répondant",
        "concepts": ["âge"],
        "themes": ["démographie"],
        "is_ordinal": True,
    },
    "occup": {
        "display_label": "Occupation principale du répondant",
        "concepts": ["emploi", "occupation"],
        "themes": ["démographie"],
    },
    "scol": {
        "display_label": "Nombre d'années d'études complétées",
        "concepts": ["éducation", "scolarité"],
        "themes": ["démographie"],
        "is_ordinal": True,
    },
    "revenu": {
        "display_label": "Revenu annuel total du foyer avant impôts",
        "concepts": ["revenu", "statut économique"],
        "themes": ["démographie"],
        "is_ordinal": True,
    },
    "lmat": {
        "display_label": "Langue maternelle du répondant",
        "concepts": ["langue maternelle"],
        "themes": ["démographie", "identité"],
    },
    "lusage": {
        "display_label": "Langue parlée le plus souvent dans le foyer",
        "concepts": ["langue d'usage"],
        "themes": ["démographie", "identité"],
    },
    "nbms18": {
        "display_label": "Nombre de personnes de moins de 18 ans dans le foyer",
        "concepts": ["composition familiale"],
        "themes": ["démographie"],
    },
    "interet": {
        "display_label": "Intérêt personnel pour la campagne électorale",
        "concepts": ["engagement politique", "intérêt électoral"],
        "themes": ["engagement civique", "comportement électoral"],
        "is_ordinal": True,
    },
    "z1q2": {
        "display_label": "Lequel des 5 chefs a fait la meilleure campagne jusqu'à maintenant (première vague)",
        "concepts": ["évaluation des chefs", "campagne électorale"],
        "themes": ["leadership politique", "communication politique"],
    },
    "satisf": {
        "display_label": "Satisfaction envers le gouvernement du Québec",
        "concepts": ["satisfaction gouvernementale", "évaluation gouvernementale"],
        "themes": ["leadership politique", "gouvernance"],
        "is_ordinal": True,
    },
    "intvote1": {
        "display_label": "Intention de vote provincial si élection aujourd'hui (première mention)",
        "concepts": ["intention de vote", "préférences électorales"],
        "themes": ["démocratie", "comportement électoral"],
    },
    "intvote2": {
        "display_label": "Intention de vote provincial flexible (si pas complètement décidé)",
        "concepts": ["intention de vote", "préférences électorales"],
        "themes": ["comportement électoral"],
    },
    "defini": {
        "display_label": "Fermeté de la décision de vote : choix définitif ou possibilité de changer",
        "concepts": ["certitude électorale", "indécision"],
        "themes": ["comportement électoral", "volatilité électorale"],
    },
    "deuxint": {
        "display_label": "Deuxième choix de parti si changement d'idée",
        "concepts": ["intentions flexibles", "vote secondaire"],
        "themes": ["comportement électoral"],
    },
    "apte": {
        "display_label": "Chef le plus apte à diriger le prochain gouvernement du Québec",
        "concepts": ["évaluation des chefs", "leadership", "compétence"],
        "themes": ["leadership politique", "démocratie"],
    },
    "z1q9": {
        "display_label": "Principal enjeu de la campagne électorale",
        "concepts": ["enjeux électoraux", "saillance"],
        "themes": ["élections", "enjeux publics"],
    },
    "z1q10": {
        "display_label": "Parti ayant recruté l'équipe de candidats la plus apte",
        "concepts": ["évaluation des équipes", "compétence"],
        "themes": ["campagne électorale", "leadership politique"],
    },
    "gagne": {
        "display_label": "Parti qui va gagner l'élection provinciale selon le répondant (indépendamment de sa préférence personnelle)",
        "concepts": ["attentes électorales", "prévisions électorales"],
        "themes": ["comportement électoral", "prévisions électorales"],
    },
    "libgagne": {
        "display_label": "Opinion : le Parti libéral va-t-il gagner l'élection",
        "concepts": ["attentes électorales"],
        "themes": ["prévisions électorales"],
    },
    "z1abandon": {
        "display_label": "Opinion : le Parti québécois abandonnerait projet de référendum sur souveraineté en cas de victoire",
        "concepts": ["souveraineté", "référendum", "politique identitaire"],
        "themes": ["question nationale", "identité"],
    },
    "intref1": {
        "display_label": "Intention de vote référendaire sur la souveraineté du Québec",
        "concepts": ["souveraineté", "référendum", "nationalisme"],
        "themes": ["question nationale", "identité"],
    },
    "intref2": {
        "display_label": "Intention de vote flexible sur référendum souveraineté",
        "concepts": ["souveraineté", "référendum"],
        "themes": ["question nationale"],
    },
    "z1q15": {
        "display_label": "Évaluation de l'accès au système de santé au Québec (meilleur, pire ou semblable à il y a 4 ans)",
        "concepts": ["santé publique", "évaluation gouvernementale"],
        "themes": ["politiques publiques", "gouvernance"],
    },
    "z1q16": {
        "display_label": "Préférence de politique sur les frais de scolarité à l'université",
        "concepts": ["éducation", "politique publique"],
        "themes": ["politiques publiques", "enjeux électoraux"],
    },
    "z1q17": {
        "display_label": "Préférence de politique sur les frais de garderie",
        "concepts": ["garde d'enfants", "politique familiale"],
        "themes": ["politiques publiques", "enjeux électoraux"],
    },
    "z1q18": {
        "display_label": "Préférence de politique sur la durée de la journée scolaire primaire",
        "concepts": ["éducation", "politique publique"],
        "themes": ["politiques publiques", "enjeux électoraux"],
    },
    "z1q19": {
        "display_label": "Opinion sur la privatisation partielle du Mont-Orford",
        "concepts": ["environnement", "développement", "bien public"],
        "themes": ["politiques publiques", "enjeux électoraux"],
        "is_ordinal": True,
    },
    "luentend": {
        "display_label": "Exposition à la lecture ou audition de résultats de sondages électoraux",
        "concepts": ["exposition médiatique", "sondages"],
        "themes": ["opinion publique", "communication politique"],
    },
    "quiavance": {
        "display_label": "Quel parti est en avance selon les sondages lus ou entendus",
        "concepts": ["sondages", "perception des résultats"],
        "themes": ["opinion publique", "influence des sondages"],
    },
    "beaucoup": {
        "display_label": "Ampleur de l'avance du parti en tête dans les sondages : beaucoup ou peu en avance",
        "concepts": ["sondages", "perception des écarts"],
        "themes": ["opinion publique"],
        "is_ordinal": True,
    },
    "avancelib": {
        "display_label": "Opinion sur l'avance déclarée du Parti libéral dans les récents sondages",
        "concepts": ["sondages", "perception des résultats"],
        "themes": ["opinion publique"],
    },
    "influence": {
        "display_label": "Influence perçue des sondages électoraux sur le vote des gens en général",
        "concepts": ["influence des sondages", "effet sondage"],
        "themes": ["opinion publique", "influence médiatique"],
    },
    "sefie": {
        "display_label": "Confiance personnelle envers les sondages pour prédire qui va gagner",
        "concepts": ["confiance", "crédibilité des sondages"],
        "themes": ["opinion publique"],
        "is_ordinal": True,
    },
    "sondbons": {
        "display_label": "Opinion : les sondages durant les campagnes électorales sont-ils une bonne ou mauvaise chose",
        "concepts": ["opinion sur les sondages", "jugement normatif"],
        "themes": ["opinion publique", "démocratie"],
        "is_ordinal": True,
    },
    "z2q2": {
        "display_label": "Visionnement du débat télévisé entre les trois chefs (13 mars 2007)",
        "concepts": ["débat des chefs", "exposition médiatique", "participation"],
        "themes": ["communication politique", "campagne électorale"],
    },
    "z2q3": {
        "display_label": "Chef le plus convaincant du débat de la campagne",
        "concepts": ["évaluation des chefs", "débat électoral"],
        "themes": ["leadership politique", "communication politique"],
    },
    "z2q6": {
        "display_label": "Opinion : continuer avec le gouvernement Charest ou vote pour changement",
        "concepts": ["évaluation gouvernementale", "enjeu électoral"],
        "themes": ["gouvernance", "élections"],
    },
    "z2q9": {
        "display_label": "Timing de la décision d'appui au parti choisi : avant, pendant campagne, ou juste avant vote",
        "concepts": ["timing de décision", "campagne électorale"],
        "themes": ["comportement électoral"],
    },
    "z2q13": {
        "display_label": "Opinion : le prochain gouvernement sera-t-il majoritaire ou minoritaire",
        "concepts": ["attentes électorales", "structure gouvernementale"],
        "themes": ["élections", "gouvernance"],
    },
    "z2q14": {
        "display_label": "Inquiétude face à la perspective d'un gouvernement minoritaire",
        "concepts": ["stabilité gouvernementale", "préoccupations"],
        "themes": ["gouvernance"],
    },
    "voteprec": {
        "display_label": "Vote déclaré aux élections provinciales de 2003",
        "concepts": ["historique électoral"],
        "themes": ["comportement électoral"],
    },
    "voteoui": {
        "display_label": "Participation électorale : est-il allé voter à l'élection du 26 mars 2007",
        "concepts": ["participation électorale", "taux de vote"],
        "themes": ["démocratie", "comportement électoral"],
    },
    "indecis": {
        "display_label": "Indécision électorale dans la semaine précédant le vote",
        "concepts": ["indécision", "volatilité électorale"],
        "themes": ["comportement électoral"],
    },
    "vote": {
        "display_label": "Vote déclaré aux élections provinciales du 26 mars 2007",
        "concepts": ["vote", "comportement électoral"],
        "themes": ["démocratie"],
    },
    "raischang": {
        "display_label": "Principale raison pour laquelle a voté pour ce parti",
        "concepts": ["motivations électorales", "raison du vote"],
        "themes": ["comportement électoral"],
    },
    "raisannul": {
        "display_label": "Principale raison pour laquelle a annulé ou gâté le bulletin",
        "concepts": ["abstention partielle", "raison du non-vote"],
        "themes": ["comportement électoral"],
    },
    "sondtrop": {
        "display_label": "Perception du volume de sondages durant la dernière campagne électorale",
        "concepts": ["saturation médiatique", "sondages"],
        "themes": ["communication politique", "opinion publique"],
        "is_ordinal": True,
    },
    "sonddiff": {
        "display_label": "Impact des résultats de sondages sur sa propre décision de vote",
        "concepts": ["influence des sondages", "comportement électoral"],
        "themes": ["opinion publique", "influence médiatique"],
    },
}
