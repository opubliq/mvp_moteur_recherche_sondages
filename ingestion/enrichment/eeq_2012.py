"""Enrichment authoré — eeq_2012. Produit par subagent LLM (2026-08-28)."""

SURVEY = {
    "description": (
        "Étude électorale québécoise 2012 (Quebec Election Study), menée par "
        "Léger Marketing pour une équipe de l'Université McGill (É. Bélanger, "
        "R. Nadeau, A. Henderson, E. Hepburn) auprès de 1505 adultes québécois "
        "(panel web LégerWeb), autour de l'élection provinciale du 4 septembre "
        "2012 qui a porté le Parti québécois de Pauline Marois au pouvoir. "
        "Couvre l'identité québécoise/canadienne, le vote provincial et fédéral, "
        "la souveraineté du Québec, la confiance envers les institutions, les "
        "enjeux de la grève étudiante de 2012 (frais de scolarité, Loi 78), "
        "l'évaluation des chefs de parti, les valeurs sociales et la sociodémo."
    ),
    "month": 9,
}

_QUEL_PARTI = "Quel parti est le meilleur pour {}? (élection provinciale 2012)"
_FACTEUR_VOTE_FED = "Importance du facteur « {} » dans le vote aux élections fédérales"
_FACTEUR_VOTE_PROV = "Importance du facteur « {} » dans le vote aux élections provinciales"
_DOMAINE_COMPETENCE = "Qui devrait décider en matière de {} : l'Assemblée nationale du Québec ou le Parlement du Canada?"
_GAUCHE_DROITE_PARTI = "Positionnement gauche-droite du {} (échelle 0-10)"
_THERMOMETRE = "Thermomètre d'évaluation (0-100) : {}"
_ACCORD_DESACCORD = "Accord ou désaccord : « {} »"
_PLACEMENT = "Détient un placement financier de type « {} » dans le ménage"

QUESTIONS = {
    # --- Sociodémo ---
    "Q0QC": {
        "display_label": "Région du Québec (lieu de résidence)",
        "concepts": ["région", "sociodémo"],
        "themes": ["sociodémo"],
    },
    "AGEX": {
        "display_label": "Année de naissance",
        "concepts": ["âge", "sociodémo"],
        "themes": ["sociodémo"],
    },
    "SEXE": {
        "display_label": "Sexe du répondant",
        "concepts": ["sexe", "sociodémo"],
        "themes": ["sociodémo"],
    },
    "LANGU": {
        "display_label": "Langue maternelle (apprise en premier à la maison)",
        "concepts": ["langue", "sociodémo"],
        "themes": ["sociodémo", "identité"],
    },
    "SCOL": {
        "display_label": "Dernier niveau de scolarité complété",
        "concepts": ["scolarité", "sociodémo"],
        "themes": ["sociodémo"],
    },
    "REVEN": {
        "display_label": "Revenu total du ménage avant impôts (2011)",
        "concepts": ["revenu", "sociodémo"],
        "themes": ["sociodémo", "économie"],
    },
    "OCCUP": {
        "display_label": "Situation d'occupation (emploi, retraite, études, etc.)",
        "concepts": ["occupation", "sociodémo"],
        "themes": ["sociodémo"],
    },
    "Q102": {
        "display_label": "Appartenance à une religion ou dénomination",
        "concepts": ["religion", "sociodémo"],
        "themes": ["sociodémo"],
    },
    "Q103": {
        "display_label": "Religion ou dénomination déclarée",
        "concepts": ["religion", "sociodémo"],
        "themes": ["sociodémo"],
    },
    "Q104": {
        "display_label": "Fréquence de participation aux offices religieux",
        "concepts": ["religion", "pratique religieuse", "sociodémo"],
        "themes": ["sociodémo"],
    },
    "Q105": {
        "display_label": "Lieu de naissance",
        "concepts": ["immigration", "sociodémo"],
        "themes": ["sociodémo", "identité"],
    },
    "Q107": {
        "display_label": "Langue parlée le plus souvent à la maison",
        "concepts": ["langue", "sociodémo"],
        "themes": ["sociodémo", "identité"],
    },
    "Q108": {
        "display_label": "Origine ethnique",
        "concepts": ["origine ethnique", "sociodémo"],
        "themes": ["sociodémo", "identité"],
    },
    "Q109": {
        "display_label": "Statut civil (état matrimonial)",
        "concepts": ["statut civil", "sociodémo"],
        "themes": ["sociodémo"],
    },

    # --- Identité ---
    "Q1": {
        "display_label": "Degré d'attachement au Québec",
        "concepts": ["attachement", "identité québécoise"],
        "themes": ["identité"],
    },
    "Q2": {
        "display_label": "Degré d'attachement au Canada",
        "concepts": ["attachement", "identité canadienne"],
        "themes": ["identité"],
    },
    "Q3": {
        "display_label": "Auto-identification comme Québécois et/ou Canadien",
        "concepts": ["identité québécoise", "identité canadienne"],
        "themes": ["identité"],
    },
    "Q4": {
        "display_label": "Différence principale perçue entre les Québécois et le reste du Canada",
        "concepts": ["identité québécoise", "distinction culturelle"],
        "themes": ["identité"],
    },
    "Q5": {
        "display_label": "Importance de la langue française pour l'identité québécoise",
        "concepts": ["langue française", "identité québécoise"],
        "themes": ["identité"],
    },
    "Q7": {
        "display_label": "Perception de la distinction des valeurs québécoises par rapport aux autres Canadiens (échelle 0-10)",
        "concepts": ["identité québécoise", "valeurs distinctes"],
        "themes": ["identité"],
    },
    "Q58": {
        "display_label": "Terme préféré pour décrire le Québec (nation ou province)",
        "concepts": ["identité québécoise", "statut du Québec"],
        "themes": ["identité", "souveraineté"],
    },

    # --- Importance du vote / décisions ---
    "Q8": {
        "display_label": "Importance de voter aux élections provinciales",
        "concepts": ["importance du vote", "élections provinciales"],
        "themes": ["vote", "démocratie"],
    },
    "Q9": {
        "display_label": "Importance de voter aux élections fédérales",
        "concepts": ["importance du vote", "élections fédérales"],
        "themes": ["vote", "démocratie"],
    },
    "Q10": {
        "display_label": "Niveau de gouvernement où il est le plus important de voter",
        "concepts": ["importance du vote", "palier de gouvernement"],
        "themes": ["vote", "démocratie"],
    },
    "Q11": {
        "display_label": "Importance personnelle des décisions prises à l'Assemblée nationale du Québec",
        "concepts": ["Assemblée nationale", "importance des décisions"],
        "themes": ["démocratie", "souveraineté"],
    },
    "Q12": {
        "display_label": "Importance personnelle des décisions prises au Parlement du Canada",
        "concepts": ["Parlement du Canada", "importance des décisions"],
        "themes": ["démocratie", "souveraineté"],
    },

    # --- Quel parti est le meilleur pour... (Q13-Q20B) ---
    "Q13": {
        "display_label": _QUEL_PARTI.format("défendre les intérêts du Québec"),
        "concepts": ["évaluation des partis", "intérêts du Québec"],
        "themes": ["partis", "souveraineté"],
    },
    "Q14": {
        "display_label": _QUEL_PARTI.format("défendre l'identité et la culture québécoise"),
        "concepts": ["évaluation des partis", "identité québécoise"],
        "themes": ["partis", "identité"],
    },
    "Q15": {
        "display_label": _QUEL_PARTI.format("gérer l'économie"),
        "concepts": ["évaluation des partis", "économie"],
        "themes": ["partis", "économie"],
    },
    "Q16": {
        "display_label": _QUEL_PARTI.format("améliorer l'éducation"),
        "concepts": ["évaluation des partis", "éducation"],
        "themes": ["partis"],
    },
    "Q17": {
        "display_label": _QUEL_PARTI.format("protéger l'environnement"),
        "concepts": ["évaluation des partis", "environnement"],
        "themes": ["partis"],
    },
    "Q18": {
        "display_label": _QUEL_PARTI.format("gérer le système de santé"),
        "concepts": ["évaluation des partis", "santé"],
        "themes": ["partis"],
    },
    "Q19": {
        "display_label": _QUEL_PARTI.format("négocier avec le Parlement du Canada"),
        "concepts": ["évaluation des partis", "négociation fédérale-provinciale"],
        "themes": ["partis", "souveraineté"],
    },
    "Q20": {
        "display_label": _QUEL_PARTI.format("combattre la pauvreté"),
        "concepts": ["évaluation des partis", "pauvreté"],
        "themes": ["partis", "économie"],
    },
    "Q20B": {
        "display_label": _QUEL_PARTI.format("lutter contre la corruption"),
        "concepts": ["évaluation des partis", "corruption"],
        "themes": ["partis", "démocratie"],
    },

    # --- Comportement électoral ---
    "Q21": {
        "display_label": "A voté à l'élection provinciale du 4 septembre 2012",
        "concepts": ["participation électorale", "élection provinciale 2012"],
        "themes": ["vote"],
    },
    "Q22": {
        "display_label": "A voté à l'élection fédérale de mai 2011",
        "concepts": ["participation électorale", "élection fédérale 2011"],
        "themes": ["vote"],
    },
    "Q23": {
        "display_label": "Vote fédéral déterminé par les enjeux québécois ou canadiens",
        "concepts": ["décision de vote", "élections fédérales"],
        "themes": ["vote", "identité"],
    },
    "Q24": {
        "display_label": "Vote provincial déterminé par les enjeux québécois ou canadiens",
        "concepts": ["décision de vote", "élections provinciales"],
        "themes": ["vote", "identité"],
    },
    "Q25": {
        "display_label": "Parti pour lequel le répondant a voté à l'élection provinciale de 2012",
        "concepts": ["vote provincial", "élection provinciale 2012"],
        "themes": ["vote"],
    },
    "Q27": {
        "display_label": "Parti pour lequel le répondant a voté à l'élection fédérale de mai 2011",
        "concepts": ["vote fédéral", "élection fédérale 2011"],
        "themes": ["vote"],
    },
    "Q31": {
        "display_label": "Intention de vote fédéral si une élection avait lieu la semaine prochaine",
        "concepts": ["intention de vote", "élections fédérales"],
        "themes": ["vote"],
    },
    "Q32": {
        "display_label": "Intention de vote fédéral forcée (chez les indécis)",
        "concepts": ["intention de vote", "élections fédérales"],
        "themes": ["vote"],
    },
    "Q33A": {
        "display_label": _FACTEUR_VOTE_FED.format("positions politiques du parti"),
        "concepts": ["facteurs de vote", "positions politiques"],
        "themes": ["vote"],
    },
    "Q33B": {
        "display_label": _FACTEUR_VOTE_FED.format("qualité du candidat local"),
        "concepts": ["facteurs de vote", "candidat local"],
        "themes": ["vote"],
    },
    "Q33C": {
        "display_label": _FACTEUR_VOTE_FED.format("chef du parti"),
        "concepts": ["facteurs de vote", "chef de parti"],
        "themes": ["vote"],
    },
    "Q33D": {
        "display_label": _FACTEUR_VOTE_FED.format("capacité à défendre les intérêts du Québec"),
        "concepts": ["facteurs de vote", "intérêts du Québec"],
        "themes": ["vote", "souveraineté"],
    },
    "Q33E": {
        "display_label": _FACTEUR_VOTE_FED.format("capacité à comprendre l'histoire et la culture du Québec"),
        "concepts": ["facteurs de vote", "identité québécoise"],
        "themes": ["vote", "identité"],
    },
    "Q33F": {
        "display_label": _FACTEUR_VOTE_FED.format("probabilité que le parti forme un gouvernement"),
        "concepts": ["facteurs de vote", "vote stratégique"],
        "themes": ["vote"],
    },
    "Q33G": {
        "display_label": _FACTEUR_VOTE_FED.format("préférences constitutionnelles du parti"),
        "concepts": ["facteurs de vote", "position constitutionnelle"],
        "themes": ["vote", "souveraineté"],
    },
    "Q34A": {
        "display_label": _FACTEUR_VOTE_PROV.format("positions politiques du parti"),
        "concepts": ["facteurs de vote", "positions politiques"],
        "themes": ["vote"],
    },
    "Q34B": {
        "display_label": _FACTEUR_VOTE_PROV.format("qualité du candidat local"),
        "concepts": ["facteurs de vote", "candidat local"],
        "themes": ["vote"],
    },
    "Q34C": {
        "display_label": _FACTEUR_VOTE_PROV.format("chef du parti"),
        "concepts": ["facteurs de vote", "chef de parti"],
        "themes": ["vote"],
    },
    "Q34D": {
        "display_label": _FACTEUR_VOTE_PROV.format("capacité à défendre les intérêts du Québec"),
        "concepts": ["facteurs de vote", "intérêts du Québec"],
        "themes": ["vote", "souveraineté"],
    },
    "Q34E": {
        "display_label": _FACTEUR_VOTE_PROV.format("capacité à comprendre l'histoire et la culture du Québec"),
        "concepts": ["facteurs de vote", "identité québécoise"],
        "themes": ["vote", "identité"],
    },
    "Q34F": {
        "display_label": _FACTEUR_VOTE_PROV.format("probabilité que le parti forme un gouvernement"),
        "concepts": ["facteurs de vote", "vote stratégique"],
        "themes": ["vote"],
    },
    "Q34G": {
        "display_label": _FACTEUR_VOTE_PROV.format("préférences constitutionnelles du parti"),
        "concepts": ["facteurs de vote", "position constitutionnelle"],
        "themes": ["vote", "souveraineté"],
    },
    "Q34BB": {
        "display_label": "Enjeu le plus important lors de l'élection provinciale du 4 septembre 2012",
        "concepts": ["enjeux électoraux", "élection provinciale 2012"],
        "themes": ["vote", "enjeux"],
    },
    "Q34CC": {
        "display_label": "Parti ayant mené la meilleure campagne électorale (2012)",
        "concepts": ["évaluation de campagne", "élection provinciale 2012"],
        "themes": ["vote", "partis"],
    },
    "Q34DD": {
        "display_label": "Parti ayant mené la moins bonne campagne électorale (2012)",
        "concepts": ["évaluation de campagne", "élection provinciale 2012"],
        "themes": ["vote", "partis"],
    },
    "Q35": {
        "display_label": "Satisfaction générale envers la performance du gouvernement libéral provincial (Charest)",
        "concepts": ["satisfaction gouvernementale", "performance du gouvernement"],
        "themes": ["évaluation du gouvernement"],
    },
    "Q36": {
        "display_label": "Satisfaction envers la gestion de l'économie par le gouvernement libéral provincial",
        "concepts": ["satisfaction gouvernementale", "gestion de l'économie"],
        "themes": ["évaluation du gouvernement", "économie"],
    },

    # --- Institutions / confiance ---
    "Q37": {
        "display_label": "Institution possédant le plus d'influence sur la façon dont le Québec est gouverné (ANQ ou Parlement du Canada)",
        "concepts": ["Assemblée nationale", "Parlement du Canada", "influence politique"],
        "themes": ["souveraineté", "démocratie"],
    },
    "Q38": {
        "display_label": "Institution qui devrait avoir le plus d'influence sur la façon dont le Québec est gouverné",
        "concepts": ["Assemblée nationale", "Parlement du Canada", "influence politique"],
        "themes": ["souveraineté", "démocratie"],
    },
    "Q41": {
        "display_label": "Institution la plus préoccupée par les besoins du peuple québécois (ANQ ou Parlement du Canada)",
        "concepts": ["Assemblée nationale", "Parlement du Canada", "représentation"],
        "themes": ["souveraineté", "confiance"],
    },
    "Q42": {
        "display_label": "Confiance envers le Parlement du Canada pour défendre les intérêts à long terme du Québec",
        "concepts": ["confiance", "Parlement du Canada", "intérêts du Québec"],
        "themes": ["confiance", "souveraineté"],
    },
    "Q43": {
        "display_label": "Confiance envers l'Assemblée nationale du Québec pour défendre les intérêts à long terme du Québec",
        "concepts": ["confiance", "Assemblée nationale", "intérêts du Québec"],
        "themes": ["confiance", "souveraineté"],
    },
    "Q44": {
        "display_label": "Perception du partage des dépenses publiques fédérales entre le Québec et le reste du Canada",
        "concepts": ["dépenses publiques fédérales", "juste part"],
        "themes": ["souveraineté", "économie"],
    },
    "Q45": {
        "display_label": "Perception d'une intervention excessive du gouvernement canadien dans les affaires de l'Assemblée nationale",
        "concepts": ["intervention fédérale", "Assemblée nationale"],
        "themes": ["souveraineté"],
    },

    # --- Souveraineté / référendum ---
    "Q47": {
        "display_label": "A voté au référendum de 1995 sur la souveraineté du Québec",
        "concepts": ["référendum de 1995", "participation électorale"],
        "themes": ["souveraineté", "vote"],
    },
    "Q48": {
        "display_label": "Option votée au référendum de 1995 (Oui ou Non)",
        "concepts": ["référendum de 1995", "vote souveraineté"],
        "themes": ["souveraineté", "vote"],
    },
    "Q50": {
        "display_label": "Importance personnelle de l'enjeu de l'indépendance du Québec",
        "concepts": ["indépendance", "importance de l'enjeu"],
        "themes": ["souveraineté"],
    },
    "Q51": {
        "display_label": "Énoncé le plus proche du point de vue personnel sur le statut politique du Québec (indépendance, plus/moins de pouvoirs, statu quo, abolition du gouvernement provincial)",
        "concepts": ["statut politique du Québec", "indépendance", "pouvoirs du Québec"],
        "themes": ["souveraineté"],
    },
    "Q52": {
        "display_label": "Vote hypothétique à un référendum sur l'indépendance du Québec (Oui/Non)",
        "concepts": ["référendum", "indépendance"],
        "themes": ["souveraineté", "vote"],
    },
    "Q53": {
        "display_label": "Vote hypothétique à un référendum donnant beaucoup plus de pouvoirs à l'Assemblée nationale (Oui/Non)",
        "concepts": ["référendum", "pouvoirs du Québec"],
        "themes": ["souveraineté", "vote"],
    },
    "Q54": {
        "display_label": "Vote hypothétique à un référendum à trois options : statu quo, plus de pouvoirs, ou indépendance",
        "concepts": ["référendum", "indépendance", "pouvoirs du Québec", "statu quo"],
        "themes": ["souveraineté", "vote"],
    },
    "Q55": {
        "display_label": "Choix entre plus de pouvoirs pour le Québec et l'indépendance",
        "concepts": ["indépendance", "pouvoirs du Québec"],
        "themes": ["souveraineté"],
    },
    "Q56": {
        "display_label": "Choix entre le statu quo et plus de pouvoirs pour le Québec",
        "concepts": ["statu quo", "pouvoirs du Québec"],
        "themes": ["souveraineté"],
    },
    "Q57": {
        "display_label": "Choix entre le statu quo et l'indépendance",
        "concepts": ["statu quo", "indépendance"],
        "themes": ["souveraineté"],
    },
    "Q59": {
        "display_label": _ACCORD_DESACCORD.format(
            "Il est important que l'Assemblée nationale du Québec ait des "
            "pouvoirs suffisants pour avoir un impact sur la qualité de vie "
            "au Québec"
        ),
        "concepts": ["pouvoirs du Québec", "Assemblée nationale"],
        "themes": ["souveraineté"],
    },
    "Q60": {
        "display_label": _ACCORD_DESACCORD.format(
            "Il est important que le Québec ait une voix suffisante dans les "
            "prises de décisions au Parlement du Canada"
        ),
        "concepts": ["représentation du Québec", "Parlement du Canada"],
        "themes": ["souveraineté"],
    },
    "Q61": {
        "display_label": "Priorité entre le contrôle de domaines politiques par l'Assemblée nationale et la représentation des intérêts du Québec au Parlement du Canada",
        "concepts": ["pouvoirs du Québec", "représentation du Québec"],
        "themes": ["souveraineté"],
    },
    "Q62A": {
        "display_label": _DOMAINE_COMPETENCE.format("l'éducation"),
        "concepts": ["partage des compétences", "éducation"],
        "themes": ["souveraineté"],
    },
    "Q62B": {
        "display_label": _DOMAINE_COMPETENCE.format("la politique d'immigration"),
        "concepts": ["partage des compétences", "immigration"],
        "themes": ["souveraineté"],
    },
    "Q62C": {
        "display_label": _DOMAINE_COMPETENCE.format("la protection de l'environnement"),
        "concepts": ["partage des compétences", "environnement"],
        "themes": ["souveraineté"],
    },
    "Q62D": {
        "display_label": _DOMAINE_COMPETENCE.format("la politique culturelle"),
        "concepts": ["partage des compétences", "politique culturelle"],
        "themes": ["souveraineté", "identité"],
    },
    "Q62E": {
        "display_label": _DOMAINE_COMPETENCE.format("la santé"),
        "concepts": ["partage des compétences", "santé"],
        "themes": ["souveraineté"],
    },
    "Q62F": {
        "display_label": _DOMAINE_COMPETENCE.format("la défense"),
        "concepts": ["partage des compétences", "défense"],
        "themes": ["souveraineté"],
    },
    "Q62G": {
        "display_label": _DOMAINE_COMPETENCE.format("la politique monétaire"),
        "concepts": ["partage des compétences", "politique monétaire"],
        "themes": ["souveraineté", "économie"],
    },
    "Q62H": {
        "display_label": _DOMAINE_COMPETENCE.format("la politique économique"),
        "concepts": ["partage des compétences", "politique économique"],
        "themes": ["souveraineté", "économie"],
    },
    "Q62I": {
        "display_label": _DOMAINE_COMPETENCE.format("les affaires étrangères"),
        "concepts": ["partage des compétences", "affaires étrangères"],
        "themes": ["souveraineté"],
    },
    "Q63": {
        "display_label": "Connaissance de qui a l'autorité sur la politique d'éducation au Québec",
        "concepts": ["connaissances politiques", "partage des compétences", "éducation"],
        "themes": ["souveraineté", "connaissances politiques"],
    },

    # --- Connaissances politiques / intérêt ---
    "Q64": {
        "display_label": "Connaissance du chef de la Coalition avenir Québec",
        "concepts": ["connaissances politiques", "chef de parti"],
        "themes": ["connaissances politiques"],
    },
    "Q65": {
        "display_label": "Nom de la circonscription fédérale du répondant",
        "concepts": ["connaissances politiques", "circonscription"],
        "themes": ["connaissances politiques"],
    },
    "Q66": {
        "display_label": "Connaissance du nombre de députés à l'Assemblée nationale du Québec",
        "concepts": ["connaissances politiques", "Assemblée nationale"],
        "themes": ["connaissances politiques"],
    },
    "Q67": {
        "display_label": "Intérêt général pour la politique",
        "concepts": ["intérêt politique"],
        "themes": ["démocratie"],
    },

    # --- Thermomètres / évaluations de chefs ---
    "Q68": {
        "display_label": _THERMOMETRE.format("Jean Charest"),
        "concepts": ["thermomètre", "évaluation de chef"],
        "themes": ["partis"],
    },
    "Q68B": {
        "display_label": _THERMOMETRE.format("Pauline Marois"),
        "concepts": ["thermomètre", "évaluation de chef"],
        "themes": ["partis"],
    },
    "Q68C": {
        "display_label": _THERMOMETRE.format("François Legault"),
        "concepts": ["thermomètre", "évaluation de chef"],
        "themes": ["partis"],
    },
    "Q68D": {
        "display_label": _THERMOMETRE.format("Amir Khadir"),
        "concepts": ["thermomètre", "évaluation de chef"],
        "themes": ["partis"],
    },
    "Q68E": {
        "display_label": _THERMOMETRE.format("Jean-Martin Aussant"),
        "concepts": ["thermomètre", "évaluation de chef"],
        "themes": ["partis"],
    },
    "Q68F": {
        "display_label": _THERMOMETRE.format("Claude Sabourin"),
        "concepts": ["thermomètre", "évaluation de chef"],
        "themes": ["partis"],
    },
    "Q69": {
        "display_label": _THERMOMETRE.format("Stephen Harper"),
        "concepts": ["thermomètre", "évaluation de chef"],
        "themes": ["partis"],
    },
    "Q69B": {
        "display_label": _THERMOMETRE.format("les syndicats en général"),
        "concepts": ["thermomètre", "syndicats"],
        "themes": ["économie"],
    },
    "Q69C": {
        "display_label": _THERMOMETRE.format("les entreprises en général"),
        "concepts": ["thermomètre", "entreprises"],
        "themes": ["économie"],
    },
    "Q69D": {
        "display_label": "Chef de parti perçu comme le plus compétent",
        "concepts": ["évaluation de chef", "compétence"],
        "themes": ["partis"],
    },
    "Q69E": {
        "display_label": "Chef de parti perçu comme le plus honnête",
        "concepts": ["évaluation de chef", "honnêteté"],
        "themes": ["partis"],
    },
    "Q69F": {
        "display_label": "Chef de parti perçu comme le plus proche des gens",
        "concepts": ["évaluation de chef", "proximité avec les citoyens"],
        "themes": ["partis"],
    },

    # --- Gauche-droite ---
    "Q70A": {
        "display_label": _GAUCHE_DROITE_PARTI.format("Parti libéral du Québec"),
        "concepts": ["gauche-droite", "positionnement des partis"],
        "themes": ["partis"],
    },
    "Q70B": {
        "display_label": _GAUCHE_DROITE_PARTI.format("Parti québécois"),
        "concepts": ["gauche-droite", "positionnement des partis"],
        "themes": ["partis"],
    },
    "Q70C": {
        "display_label": _GAUCHE_DROITE_PARTI.format("Coalition avenir Québec"),
        "concepts": ["gauche-droite", "positionnement des partis"],
        "themes": ["partis"],
    },
    "Q70D": {
        "display_label": _GAUCHE_DROITE_PARTI.format("Québec solidaire"),
        "concepts": ["gauche-droite", "positionnement des partis"],
        "themes": ["partis"],
    },
    "Q70E": {
        "display_label": _GAUCHE_DROITE_PARTI.format("Option nationale"),
        "concepts": ["gauche-droite", "positionnement des partis"],
        "themes": ["partis"],
    },
    "Q70F": {
        "display_label": _GAUCHE_DROITE_PARTI.format("Parti vert du Québec"),
        "concepts": ["gauche-droite", "positionnement des partis"],
        "themes": ["partis"],
    },
    "Q71": {
        "display_label": "Auto-positionnement personnel sur l'échelle gauche-droite (0-10)",
        "concepts": ["gauche-droite", "auto-positionnement"],
        "themes": ["identité"],
    },

    # --- Confiance / efficacité politique ---
    "Q72": {
        "display_label": "Confiance interpersonnelle généralisée",
        "concepts": ["confiance interpersonnelle"],
        "themes": ["confiance"],
    },
    "Q73A": {
        "display_label": _ACCORD_DESACCORD.format(
            "C'est la responsabilité du gouvernement de garantir que les "
            "besoins fondamentaux sont satisfaits pour tous"
        ),
        "concepts": ["rôle de l'État", "besoins fondamentaux"],
        "themes": ["économie", "valeurs sociales"],
    },
    "Q73B": {
        "display_label": _ACCORD_DESACCORD.format(
            "L'Assemblée nationale du Québec ne se soucie pas beaucoup de ce "
            "que les gens comme moi pensent"
        ),
        "concepts": ["efficacité politique interne", "Assemblée nationale"],
        "themes": ["démocratie", "confiance"],
    },
    "Q73C": {
        "display_label": _ACCORD_DESACCORD.format(
            "Le Parlement du Canada ne se soucie pas beaucoup de ce que les "
            "gens comme moi pensent"
        ),
        "concepts": ["efficacité politique interne", "Parlement du Canada"],
        "themes": ["démocratie", "confiance"],
    },
    "Q73D": {
        "display_label": _ACCORD_DESACCORD.format(
            "Les gens comme moi n'ont rien à dire sur ce que fait le "
            "gouvernement provincial à Québec"
        ),
        "concepts": ["efficacité politique interne", "gouvernement provincial"],
        "themes": ["démocratie"],
    },
    "Q73E": {
        "display_label": _ACCORD_DESACCORD.format(
            "Les gens comme moi n'ont rien à dire sur ce que fait le "
            "gouvernement fédéral à Ottawa"
        ),
        "concepts": ["efficacité politique interne", "gouvernement fédéral"],
        "themes": ["démocratie"],
    },
    "Q73F": {
        "display_label": _ACCORD_DESACCORD.format(
            "Parfois la politique et le gouvernement au niveau provincial "
            "semblent si compliqués qu'une personne comme moi ne peut pas "
            "comprendre ce qui se passe"
        ),
        "concepts": ["efficacité politique interne", "gouvernement provincial"],
        "themes": ["démocratie"],
    },
    "Q73G": {
        "display_label": _ACCORD_DESACCORD.format(
            "Parfois la politique et le gouvernement au niveau fédéral "
            "semblent si compliqués qu'une personne comme moi ne peut pas "
            "comprendre ce qui se passe"
        ),
        "concepts": ["efficacité politique interne", "gouvernement fédéral"],
        "themes": ["démocratie"],
    },
    "Q74": {
        "display_label": "Satisfaction envers le fonctionnement de la démocratie au Québec",
        "concepts": ["satisfaction démocratique"],
        "themes": ["démocratie"],
    },
    "Q75": {
        "display_label": "Objectif le plus important pour le Québec (ordre, participation citoyenne, prix, liberté d'expression)",
        "concepts": ["priorités nationales", "valeurs postmatérialistes"],
        "themes": ["valeurs sociales", "démocratie"],
    },
    "Q76": {
        "display_label": "Deuxième objectif le plus important pour le Québec",
        "concepts": ["priorités nationales", "valeurs postmatérialistes"],
        "themes": ["valeurs sociales", "démocratie"],
    },
    "Q77A": {
        "display_label": _ACCORD_DESACCORD.format(
            "Notre société doit faire tout ce qui est nécessaire pour "
            "s'assurer que chacun ait une chance égale de réussir"
        ),
        "concepts": ["égalité des chances"],
        "themes": ["valeurs sociales", "économie"],
    },
    "Q77B": {
        "display_label": _ACCORD_DESACCORD.format(
            "Ce n'est pas si grave si certaines personnes ont plus de chance "
            "que d'autres dans la vie"
        ),
        "concepts": ["égalité des chances"],
        "themes": ["valeurs sociales", "économie"],
    },
    "Q77C": {
        "display_label": _ACCORD_DESACCORD.format(
            "Sans l'action du gouvernement, il y aurait beaucoup plus de "
            "pauvreté dans nos sociétés"
        ),
        "concepts": ["rôle de l'État", "pauvreté"],
        "themes": ["valeurs sociales", "économie"],
    },
    "Q77D": {
        "display_label": _ACCORD_DESACCORD.format(
            "Quand les entreprises font beaucoup d'argent, tout le monde y "
            "gagne, y compris les pauvres"
        ),
        "concepts": ["ruissellement économique", "entreprises"],
        "themes": ["valeurs sociales", "économie"],
    },
    "Q77E": {
        "display_label": _ACCORD_DESACCORD.format(
            "Il y a trop d'immigrants au Québec"
        ),
        "concepts": ["immigration"],
        "themes": ["valeurs sociales", "identité"],
    },

    # --- Valeurs sociales ---
    "Q78": {
        "display_label": "L'avortement devrait-il être illégal?",
        "concepts": ["avortement"],
        "themes": ["valeurs sociales"],
    },
    "Q79": {
        "display_label": "Pour ou contre le mariage entre personnes de même sexe",
        "concepts": ["mariage gai"],
        "themes": ["valeurs sociales"],
    },
    "Q80": {
        "display_label": "Pour ou contre la peine de mort",
        "concepts": ["peine de mort"],
        "themes": ["valeurs sociales"],
    },
    "Q81": {
        "display_label": "Positionnement entre l'État garant de l'emploi et de la qualité de vie versus la responsabilité individuelle (échelle)",
        "concepts": ["rôle de l'État", "responsabilité individuelle"],
        "themes": ["valeurs sociales", "économie"],
    },
    "Q82": {
        "display_label": "Attentes envers l'intégration culturelle des nouveaux arrivants (assimilation ou maintien de la diversité)",
        "concepts": ["immigration", "intégration culturelle"],
        "themes": ["valeurs sociales", "identité"],
    },

    # --- Grève étudiante 2012 / Loi 78 ---
    "Q82B": {
        "display_label": "Accord ou désaccord avec la hausse des droits de scolarité proposée au printemps 2012",
        "concepts": ["frais de scolarité", "grève étudiante"],
        "themes": ["enjeux", "grève étudiante 2012"],
    },
    "Q82C": {
        "display_label": "Accord ou désaccord avec l'adoption de la Loi 78 au printemps 2012",
        "concepts": ["Loi 78", "grève étudiante"],
        "themes": ["enjeux", "grève étudiante 2012"],
    },
    "Q82D_M1": {
        "display_label": "Actions posées lors de la grève étudiante du printemps 2012 (mentions multiples : carré rouge, manifestations, réseaux sociaux)",
        "concepts": ["grève étudiante", "mobilisation", "carré rouge"],
        "themes": ["enjeux", "grève étudiante 2012"],
    },
    "Q82D_M2": {
        "display_label": "Actions posées lors de la grève étudiante du printemps 2012 (mentions multiples : carré rouge, manifestations, réseaux sociaux)",
        "concepts": ["grève étudiante", "mobilisation", "carré rouge"],
        "themes": ["enjeux", "grève étudiante 2012"],
    },
    "Q82D_M3": {
        "display_label": "Actions posées lors de la grève étudiante du printemps 2012 (mentions multiples : carré rouge, manifestations, réseaux sociaux)",
        "concepts": ["grève étudiante", "mobilisation", "carré rouge"],
        "themes": ["enjeux", "grève étudiante 2012"],
    },
    "Q82D_M4": {
        "display_label": "Actions posées lors de la grève étudiante du printemps 2012 (mentions multiples : carré rouge, manifestations, réseaux sociaux)",
        "concepts": ["grève étudiante", "mobilisation", "carré rouge"],
        "themes": ["enjeux", "grève étudiante 2012"],
    },
    "Q82D_M5": {
        "display_label": "Actions posées lors de la grève étudiante du printemps 2012 (mentions multiples : carré rouge, manifestations, réseaux sociaux)",
        "concepts": ["grève étudiante", "mobilisation", "carré rouge"],
        "themes": ["enjeux", "grève étudiante 2012"],
    },
    "Q82E": {
        "display_label": "Raison principale de la manifestation lors de la grève étudiante de 2012",
        "concepts": ["grève étudiante", "mobilisation"],
        "themes": ["enjeux", "grève étudiante 2012"],
    },

    # --- Économie ---
    "Q83": {
        "display_label": "Comparaison de la situation économique du Québec avec le reste du Canada",
        "concepts": ["économie du Québec", "comparaison Canada"],
        "themes": ["économie"],
    },
    "Q84": {
        "display_label": "Impact anticipé de l'indépendance du Québec sur la situation économique du Québec",
        "concepts": ["indépendance", "économie du Québec"],
        "themes": ["souveraineté", "économie"],
    },
    "Q85": {
        "display_label": "Impact anticipé de l'indépendance du Québec sur la situation financière personnelle",
        "concepts": ["indépendance", "situation financière personnelle"],
        "themes": ["souveraineté", "économie"],
    },
    "Q87": {
        "display_label": "Choix monétaire d'un Québec indépendant (dollar canadien ou devise propre)",
        "concepts": ["indépendance", "monnaie"],
        "themes": ["souveraineté", "économie"],
    },
    "Q88": {
        "display_label": "Impact de l'appartenance au Canada sur l'économie du Québec (positif ou négatif)",
        "concepts": ["appartenance au Canada", "économie du Québec"],
        "themes": ["souveraineté", "économie"],
    },
    "Q89": {
        "display_label": "Arbitrage entre l'accès à un plus grand marché et la souveraineté (échelle 0-10)",
        "concepts": ["souveraineté économique", "marché"],
        "themes": ["souveraineté", "économie"],
    },
    "Q90": {
        "display_label": "Meilleure option future pour l'économie du Québec : renforcer les relations avec le Canada ou avec les États-Unis",
        "concepts": ["économie du Québec", "relations commerciales"],
        "themes": ["économie"],
    },
    "Q91": {
        "display_label": "Évolution de l'économie du Québec depuis un an",
        "concepts": ["économie du Québec", "évolution économique"],
        "themes": ["économie"],
    },
    "Q101A": {
        "display_label": _PLACEMENT.format("compte d'épargne dans une banque"),
        "concepts": ["épargne", "placements financiers"],
        "themes": ["économie", "sociodémo"],
    },
    "Q101B": {
        "display_label": _PLACEMENT.format("compte dans une société de fiducie"),
        "concepts": ["épargne", "placements financiers"],
        "themes": ["économie", "sociodémo"],
    },
    "Q101C": {
        "display_label": _PLACEMENT.format("REER ou CELI"),
        "concepts": ["épargne", "placements financiers"],
        "themes": ["économie", "sociodémo"],
    },
    "Q101D": {
        "display_label": _PLACEMENT.format("actions ou parts d'entreprise"),
        "concepts": ["épargne", "placements financiers"],
        "themes": ["économie", "sociodémo"],
    },
    "Q101E": {
        "display_label": _PLACEMENT.format("obligations"),
        "concepts": ["épargne", "placements financiers"],
        "themes": ["économie", "sociodémo"],
    },
    "Q101F": {
        "display_label": _PLACEMENT.format("portefeuille d'actifs financiers"),
        "concepts": ["épargne", "placements financiers"],
        "themes": ["économie", "sociodémo"],
    },
    "Q101G": {
        "display_label": _PLACEMENT.format("régime d'épargne-retraite"),
        "concepts": ["épargne", "placements financiers"],
        "themes": ["économie", "sociodémo"],
    },

    # --- Identification partisane ---
    "Q92": {
        "display_label": "Identification partisane habituelle en politique provinciale",
        "concepts": ["identification partisane"],
        "themes": ["partis"],
    },
    "Q93": {
        "display_label": "Force de l'identification partisane provinciale",
        "concepts": ["identification partisane"],
        "themes": ["partis"],
    },
    "Q94": {
        "display_label": "Identification partisane habituelle en politique fédérale",
        "concepts": ["identification partisane"],
        "themes": ["partis"],
    },
    "Q95": {
        "display_label": "Force de l'identification partisane fédérale",
        "concepts": ["identification partisane"],
        "themes": ["partis"],
    },
    "Q96": {
        "display_label": "Croyance que le Québec sera un pays indépendant un jour",
        "concepts": ["indépendance", "anticipation"],
        "themes": ["souveraineté"],
    },
}
