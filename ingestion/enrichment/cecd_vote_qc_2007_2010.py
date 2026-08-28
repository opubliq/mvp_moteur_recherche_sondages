"""Enrichment authoré — cecd_vote_qc_2007_2010. Produit par subagent LLM (2026-08-28)."""

SURVEY = {
    "description": "Sondages mensuels CROP-CECD réalisés par téléphone entre juin 2007 et janvier 2010 auprès de 24 027 Québécois, portant sur l'intention de vote aux élections provinciales, l'intention de vote référendaire et le profil sociodémographique.",
    "month": None,
}

QUESTIONS = {
    "QP4": {
        "display_label": "Parti politique pour lequel le répondant a voté aux dernières élections provinciales",
        "concepts": ["vote passé", "comportement électoral", "parti politique"],
        "themes": ["politique", "élections", "démocratie"],
    },
    "intvoteprova": {
        "display_label": "Intention de vote aux élections provinciales du Québec (première mention)",
        "concepts": ["intention de vote", "élections provinciales", "parti politique"],
        "themes": ["politique", "élections", "démocratie"],
    },
    "intvoteprovb": {
        "display_label": "Intention de vote aux élections provinciales du Québec (relance auprès des indécis)",
        "concepts": ["intention de vote", "relance vote", "élections provinciales", "parti politique"],
        "themes": ["politique", "élections", "démocratie"],
    },
    "intvoterefa": {
        "display_label": "Intention de vote à un référendum sur la souveraineté du Québec (première mention)",
        "concepts": ["souveraineté", "référendum", "indépendance", "intention de vote"],
        "themes": ["politique", "question nationale", "souveraineté"],
    },
    "intvoterefb": {
        "display_label": "Intention de vote à un référendum sur la souveraineté du Québec (relance auprès des indécis)",
        "concepts": ["souveraineté", "référendum", "indépendance", "relance vote", "intention de vote"],
        "themes": ["politique", "question nationale", "souveraineté"],
    },
    "REG": {
        "display_label": "Région de résidence du répondant au Québec",
        "concepts": ["région", "géographie"],
        "themes": ["démographie"],
    },
    "SEXE": {
        "display_label": "Sexe du répondant",
        "concepts": ["sexe"],
        "themes": ["démographie"],
    },
    "Occup": {
        "display_label": "Statut d'emploi ou occupation principale du répondant",
        "concepts": ["emploi", "occupation", "travail"],
        "themes": ["démographie", "économie"],
    },
    "scol": {
        "display_label": "Niveau de scolarité le plus élevé complété",
        "concepts": ["éducation", "scolarité"],
        "themes": ["démographie", "éducation"],
    },
    "revenu": {
        "display_label": "Tranche de revenu du ménage",
        "concepts": ["revenu", "statut économique"],
        "themes": ["démographie", "économie"],
    },
    "QAGE": {
        "display_label": "Groupe d'âge du répondant",
        "concepts": ["âge"],
        "themes": ["démographie"],
    },
    "lmat": {
        "display_label": "Langue maternelle du répondant",
        "concepts": ["langue maternelle"],
        "themes": ["démographie", "identité"],
    },
    "lusag": {
        "display_label": "Langue parlée le plus souvent dans le foyer",
        "concepts": ["langue d'usage"],
        "themes": ["démographie", "identité"],
    },
}
