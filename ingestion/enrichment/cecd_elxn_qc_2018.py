"""Enrichment authoré — cecd_elxn_qc_2018. Produit par subagent LLM (2026-07-07)."""

SURVEY = {
    "description": "Panel électoral provincial québécois 2018 (firme Ipsos). Sondage mené en deux vagues : septembre 2018 (pré-électorale, avant le 1er octobre) et octobre 2018 (post-électorale, après l'élection du 1er octobre). Environ 1250 répondants québécois, mode mixte (75% web, 25% CATI téléphonique).",
    "month": 10,
}

QUESTIONS = {
    "fsa_tabl": {
        "display_label": "Région de résidence",
        "concepts": ["géographie", "région"],
        "themes": ["démographie"],
    },
    "qa": {
        "display_label": "Éligibilité au vote aux élections provinciales",
        "concepts": ["éligibilité électorale"],
        "themes": ["démocratie"],
    },
    "s1": {
        "display_label": "Première langue apprise et comprise du répondant",
        "concepts": ["langue maternelle"],
        "themes": ["démographie", "identité"],
    },
    "rv1a": {
        "display_label": "Intention de vote provincial si élection demain",
        "concepts": ["intention de vote", "préférences électorales"],
        "themes": ["démocratie", "comportement électoral"],
    },
    "rv1b": {
        "display_label": "Intention de vote flexible (parti vers lequel tendance)",
        "concepts": ["intention de vote", "préférences électorales"],
        "themes": ["comportement électoral"],
    },
    "qc": {
        "display_label": "Certitude quant à son choix de parti",
        "concepts": ["certitude électorale", "indécision"],
        "themes": ["comportement électoral"],
        "is_ordinal": True,
    },
    "q1": {
        "display_label": "Chef jugé le plus apte à être premier ministre du Québec",
        "concepts": ["évaluation des chefs", "leadership"],
        "themes": ["leadership politique", "démocratie"],
    },
    "q1a": {
        "display_label": "Certitude de participation au vote (échelle 1-10)",
        "concepts": ["certitude de voter", "participation électorale"],
        "themes": ["comportement électoral", "engagement civique"],
        "is_ordinal": True,
    },
    "q2": {
        "display_label": "Garder le gouvernement en place ou changer",
        "concepts": ["évaluation gouvernementale", "enjeux électoraux"],
        "themes": ["leadership politique", "démocratie"],
    },
    "q2a": {
        "display_label": "Chef ayant fait la meilleure campagne électorale",
        "concepts": ["évaluation des chefs", "campagne électorale"],
        "themes": ["communication politique", "leadership politique"],
    },
    "q2b": {
        "display_label": "Parti le plus susceptible de remporter l'élection",
        "concepts": ["attentes électorales", "préférences électorales"],
        "themes": ["comportement électoral"],
    },
    "q5_1": {
        "display_label": "État d'esprit face au vote : enthousiasme",
        "concepts": ["enthousiasme", "émotion électorale"],
        "themes": ["engagement civique", "comportement électoral"],
        "is_ordinal": True,
    },
    "q5_2": {
        "display_label": "État d'esprit face au vote : excitation",
        "concepts": ["excitation", "émotion électorale"],
        "themes": ["engagement civique", "comportement électoral"],
        "is_ordinal": True,
    },
    "q6_01": {
        "display_label": "Accord avec énoncé : je vois des bénéfices clairs à aller voter",
        "concepts": ["bénéfices du vote", "efficacité du vote"],
        "themes": ["engagement civique", "participation électorale"],
        "is_ordinal": True,
    },
    "q6_02": {
        "display_label": "Accord avec énoncé : j'ai l'habitude de voter",
        "concepts": ["habitude de voter", "participation électorale"],
        "themes": ["comportement électoral", "engagement civique"],
        "is_ordinal": True,
    },
    "q6_03": {
        "display_label": "Accord avec énoncé : j'ai un devoir de voter",
        "concepts": ["devoir civique", "norme électorale"],
        "themes": ["démocratie", "engagement civique"],
        "is_ordinal": True,
    },
    "q6_04": {
        "display_label": "Accord avec énoncé : voter est une partie importante de qui je suis",
        "concepts": ["identité civique", "participation électorale"],
        "themes": ["identité", "engagement civique"],
        "is_ordinal": True,
    },
    "q6_05": {
        "display_label": "Accord avec énoncé : j'ai beaucoup réfléchi à mon vote récemment",
        "concepts": ["délibération électorale", "réflexion"],
        "themes": ["comportement électoral", "engagement civique"],
        "is_ordinal": True,
    },
    "q6_06": {
        "display_label": "Accord avec énoncé : j'ai les informations et ressources pour voter",
        "concepts": ["information électorale", "capacité à voter"],
        "themes": ["participation électorale", "engagement civique"],
        "is_ordinal": True,
    },
    "q6_07": {
        "display_label": "Accord avec énoncé : je sais pour qui je vote et pourquoi",
        "concepts": ["certitude électorale", "justification du vote"],
        "themes": ["comportement électoral", "engagement civique"],
        "is_ordinal": True,
    },
    "q6_08": {
        "display_label": "Accord avec énoncé : les gens doivent voter pour que la démocratie fonctionne",
        "concepts": ["importance du vote", "démocratie", "participation électorale"],
        "themes": ["démocratie", "engagement civique"],
        "is_ordinal": True,
    },
    "q6_09": {
        "display_label": "Accord avec énoncé : mon vote est important et fait une différence",
        "concepts": ["efficacité du vote", "pouvoir électoral"],
        "themes": ["engagement civique", "participation électorale"],
        "is_ordinal": True,
    },
    "q6_10": {
        "display_label": "Accord avec énoncé : je sais quand, où et comment voter",
        "concepts": ["connaissance du processus", "littératie électorale"],
        "themes": ["participation électorale", "engagement civique"],
        "is_ordinal": True,
    },
    "q6_11": {
        "display_label": "Accord avec énoncé : choses dans la société me rappellent importance du vote",
        "concepts": ["rappel social du vote", "saillance électorale"],
        "themes": ["engagement civique", "participation électorale"],
        "is_ordinal": True,
    },
    "q6_12": {
        "display_label": "Accord avec énoncé : amis et famille croient en l'importance du vote",
        "concepts": ["norme sociale", "environnement social"],
        "themes": ["engagement civique", "participation électorale"],
        "is_ordinal": True,
    },
    "q6_13": {
        "display_label": "Accord avec énoncé : les gens comme moi ont tendance à voter",
        "concepts": ["norme de groupe", "conformité sociale"],
        "themes": ["comportement électoral", "engagement civique"],
        "is_ordinal": True,
    },
    "q6_14": {
        "display_label": "Accord avec énoncé : je sais que j'aurai des regrets si je ne vote pas",
        "concepts": ["motivation négative", "regret"],
        "themes": ["engagement civique", "participation électorale"],
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
        "concepts": ["éducation", "scolarité"],
        "themes": ["démographie"],
    },
    "d4": {
        "display_label": "Situation d'emploi actuelle",
        "concepts": ["emploi", "occupation"],
        "themes": ["démographie"],
    },
    "d5": {
        "display_label": "Revenu total annuel du foyer",
        "concepts": ["revenu", "statut économique"],
        "themes": ["démographie"],
        "is_ordinal": True,
    },
    "d6": {
        "display_label": "Présence d'enfants mineurs au foyer",
        "concepts": ["composition familiale", "enfants"],
        "themes": ["démographie"],
    },
    "sexfix": {
        "display_label": "Sexe du répondant",
        "concepts": ["sexe", "genre"],
        "themes": ["démographie"],
    },
    "rts_q1": {
        "display_label": "Raison de non-participation ou participation électorale",
        "concepts": ["participation électorale", "abstention"],
        "themes": ["comportement électoral", "démocratie"],
    },
    "rts_q2": {
        "display_label": "Parti pour lequel le répondant a voté",
        "concepts": ["vote", "comportement électoral"],
        "themes": ["démocratie"],
    },
    "rts_q2a": {
        "display_label": "Moment de la campagne où choix final a été fait",
        "concepts": ["timing de décision", "campagne électorale"],
        "themes": ["comportement électoral"],
    },
    "rts_q3a": {
        "display_label": "Principale raison pour laquelle a voté pour ce parti",
        "concepts": ["motivations électorales", "raison du vote"],
        "themes": ["comportement électoral"],
    },
    "q3a2": {
        "display_label": "Deuxième raison pour laquelle a voté pour ce parti",
        "concepts": ["motivations électorales", "raison du vote"],
        "themes": ["comportement électoral"],
    },
    "rts_q3b": {
        "display_label": "Raison pour laquelle a annulé/gâté son bulletin de vote",
        "concepts": ["annulation de vote", "raison du non-vote"],
        "themes": ["comportement électoral"],
    },
    "rts_q4": {
        "display_label": "Principale raison pour laquelle n'a pas voté",
        "concepts": ["abstention", "raisons de non-participation"],
        "themes": ["comportement électoral"],
    },
    "rts_q5": {
        "display_label": "Exposition à la couverture médiatique des sondages durant campagne",
        "concepts": ["exposition médiatique", "sondages"],
        "themes": ["opinion publique", "communication politique"],
    },
    "rts_q6": {
        "display_label": "Opinion : le Québec devrait-il réduire/garder/augmenter l'immigration",
        "concepts": ["immigration", "politique migratoire"],
        "themes": ["enjeux électoraux"],
    },
    "rts_q7": {
        "display_label": "Opinion sur l'indépendance du Québec",
        "concepts": ["souveraineté", "indépendance", "nationalisme"],
        "themes": ["question nationale", "identité"],
        "is_ordinal": True,
    },
    "rts_q8": {
        "display_label": "Positionnement sur l'axe gauche-droite des opinions politiques",
        "concepts": ["idéologie", "gauche-droite"],
        "themes": ["idéologie"],
        "is_ordinal": True,
    },
}
