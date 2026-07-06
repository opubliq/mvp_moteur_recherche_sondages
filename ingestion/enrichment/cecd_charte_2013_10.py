"""Enrichment authoré — cecd_charte_2013_10. Produit par subagent LLM (2026-01-06)."""

SURVEY = {
    "description": "Sondage CROP (17-21 octobre 2013, 1000 répondants) sur les perceptions de la population québécoise concernant le projet de Charte des valeurs québécoises du gouvernement Pauline Marois et les intentions de vote provinciales.",
    "month": 10,
}

QUESTIONS = {
    "reg": {
        "display_label": "Région de résidence",
        "concepts": ["région", "géographie"],
        "themes": ["profil"],
    },
    "qage": {
        "display_label": "Groupe d'âge du répondant",
        "concepts": ["âge"],
        "themes": ["profil"],
    },
    "qlanf": {
        "display_label": "Langue d'usage principal à la maison",
        "concepts": ["langue", "usage linguistique"],
        "themes": ["profil"],
    },
    "qlanm": {
        "display_label": "Langue maternelle",
        "concepts": ["langue maternelle"],
        "themes": ["profil"],
    },
    "sexe": {
        "display_label": "Sexe du répondant",
        "concepts": ["sexe"],
        "themes": ["profil"],
    },
    "qtrav": {
        "display_label": "Situation actuelle d'emploi ou d'activité",
        "concepts": ["emploi", "activité professionnelle"],
        "themes": ["profil", "économie"],
    },
    "qmatr": {
        "display_label": "État matrimonial",
        "concepts": ["état civil", "vie conjugale"],
        "themes": ["profil"],
    },
    "qetud": {
        "display_label": "Niveau de scolarité le plus élevé complété",
        "concepts": ["éducation", "scolarité"],
        "themes": ["profil"],
    },
    "qreve": {
        "display_label": "Revenu annuel total du ménage",
        "concepts": ["revenu", "situation économique"],
        "themes": ["profil", "économie"],
    },
    "qenfa": {
        "display_label": "Nombre de personnes de moins de 18 ans au foyer",
        "concepts": ["enfants", "famille", "ménage"],
        "themes": ["profil"],
    },
    "prov1": {
        "display_label": "Intention de vote provincial — question initiale",
        "concepts": ["intention de vote", "élection provinciale"],
        "themes": ["politique", "élection"],
    },
    "prov2": {
        "display_label": "Intention de vote provincial — relance pour indécis",
        "concepts": ["intention de vote", "élection provinciale"],
        "themes": ["politique", "élection"],
    },
    "pc1": {
        "display_label": "Opinion sur le projet de Charte des valeurs québécoises",
        "concepts": ["charte des valeurs", "politique gouvernementale", "opinion"],
        "themes": ["politique", "identité"],
    },
}
