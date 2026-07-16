"""Enrichment authoré — cecd_elxn_qc_1998. Produit par subagent Claude Haiku (2026-07-06)."""

SURVEY = {
    "description": "Panel électoral provincial du Québec 1998 par CROP et Createc, combinant vagues pré-électorale (novembre) et post-électorale (décembre). Mesure intentions de vote, comportement électoral et satisfaction face au gouvernement autour de l'élection du 30 novembre 1998.",
    "month": 12,  # Vague post-électorale, terrain du 8-13 décembre 1998
}

QUESTIONS = {
    # Démographie
    "sexe_post": {
        "display_label": "Sexe du répondant",
        "concepts": ["sexe", "genre"],
        "themes": ["démographie"],
    },
    "age": {
        "display_label": "Groupe d'âge",
        "concepts": ["âge", "cohorte"],
        "themes": ["démographie"],
        "is_ordinal": True,
    },
    "scol": {
        "display_label": "Niveau de scolarité",
        "concepts": ["éducation", "scolarité"],
        "themes": ["démographie"],
        "is_ordinal": True,
    },
    "occup": {
        "display_label": "Occupation professionnelle",
        "concepts": ["emploi", "statut socio-économique"],
        "themes": ["démographie"],
    },

    # Comportement électoral
    "q1post": {
        "display_label": "Participation électorale déclarée",
        "concepts": ["vote", "participation"],
        "themes": ["élection"],
    },
    "q2post": {
        "display_label": "Certitude de choix électoral (pré-vote)",
        "concepts": ["indécision", "certitude électorale"],
        "themes": ["élection"],
    },
    "q3post": {
        "display_label": "Vote déclaré post-électoral",
        "concepts": ["vote", "parti politique", "choix électoral"],
        "themes": ["élection"],
    },
    "vpl": {
        "display_label": "Intention de vote pre-électoral",
        "concepts": ["intention de vote", "parti politique"],
        "themes": ["élection"],
    },
    "allervot": {
        "display_label": "Intention d'aller voter",
        "concepts": ["participation", "mobilisation électorale"],
        "themes": ["élection"],
        "is_ordinal": True,
    },

    # Raisons du vote
    "raison1": {
        "display_label": "Première raison du choix électoral",
        "concepts": ["motivation électorale", "raison du vote"],
        "themes": ["élection"],
    },
    "raison2": {
        "display_label": "Deuxième raison du choix électoral",
        "concepts": ["motivation électorale", "raison du vote"],
        "themes": ["élection"],
    },
    "q4m1": {
        "display_label": "Première raison invoquée du vote",
        "concepts": ["justification électorale", "raison du vote"],
        "themes": ["élection"],
    },
    "q4m2": {
        "display_label": "Deuxième raison invoquée du vote",
        "concepts": ["justification électorale", "raison du vote"],
        "themes": ["élection"],
    },

    # Attitudes et opinions politiques
    "satisf": {
        "display_label": "Satisfaction face au gouvernement sortant",
        "concepts": ["satisfaction gouvernementale", "approbation"],
        "themes": ["attitudes politiques"],
        "is_ordinal": True,
    },
    "meilpm": {
        "display_label": "Meilleur premier ministre pour diriger le Québec",
        "concepts": ["évaluation des chefs", "leadership politique"],
        "themes": ["attitudes politiques"],
    },
    "vote94": {
        "display_label": "Vote déclaré à l'élection provinciale de 1994",
        "concepts": ["vote antérieur", "historique électoral"],
        "themes": ["élection"],
    },

    # Questions de vote référendaire
    "voteref": {
        "display_label": "Intention de vote référendaire",
        "concepts": ["souveraineté", "référendum", "partenariat"],
        "themes": ["enjeux nationaux"],
    },
    "q16a_crop": {
        "display_label": "Intention de vote référendaire sur la souveraineté assortie de partenariat",
        "concepts": ["souveraineté", "référendum", "partenariat"],
        "themes": ["enjeux nationaux"],
    },
    "q16b_crop": {
        "display_label": "Tentative de vote référendaire (version alternative)",
        "concepts": ["souveraineté", "référendum", "indécision"],
        "themes": ["enjeux nationaux"],
    },

    # Questions CROP (intention de vote alternatives)
    "q7a_crop": {
        "display_label": "Intention de vote provinciale (question 7a CROP)",
        "concepts": ["intention de vote", "parti politique"],
        "themes": ["élection"],
    },
    "q7b_crop": {
        "display_label": "Tentative de vote provincial (question 7b CROP)",
        "concepts": ["intention de vote", "indécision électorale"],
        "themes": ["élection"],
    },
    "intvote": {
        "display_label": "Intention de vote détaillée",
        "concepts": ["intention de vote", "parti politique"],
        "themes": ["élection"],
    },
}
