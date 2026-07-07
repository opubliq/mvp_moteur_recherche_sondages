"""Enrichment authoré — cecd_elxn_qc_2012. Produit par subagent LLM (2026-07-07)."""

SURVEY = {
    "description": "Panel électoral post-électoral québécois 2012 (firme CROP). Sondage mené auprès de 844 répondants entre le 10 et le 18 septembre 2012, une semaine après l'élection provinciale du 4 septembre 2012.",
    "month": 9,
}

QUESTIONS = {
    "reg": {
        "display_label": "Région de résidence",
        "concepts": ["géographie"],
        "themes": ["démographie"],
    },
    "age": {
        "display_label": "Groupe d'âge du répondant",
        "concepts": ["âge"],
        "themes": ["démographie"],
    },
    "sexe": {
        "display_label": "Sexe du répondant",
        "concepts": ["sexe"],
        "themes": ["démographie"],
    },
    "lmat": {
        "display_label": "Langue maternelle du répondant",
        "concepts": ["langue maternelle"],
        "themes": ["démographie", "identité"],
    },
    "intvoteprov1": {
        "display_label": "Intention de vote provincial (première mention)",
        "concepts": ["intention de vote", "préférences électorales"],
        "themes": ["démocratie", "comportement électoral"],
    },
    "intvoteprov2": {
        "display_label": "Intention de vote provincial (flexible, si pas définitif)",
        "concepts": ["intention de vote", "préférences électorales"],
        "themes": ["démocratie", "comportement électoral"],
    },
    "definitif": {
        "display_label": "Fermeté de la décision de vote avant l'élection",
        "concepts": ["certitude électorale", "indécision"],
        "themes": ["comportement électoral", "volatilité"],
    },
    "vudebat_m1": {
        "display_label": "Débats électoraux regardés (première mention)",
        "concepts": ["débats électoraux", "exposition médiatique"],
        "themes": ["communication politique", "campagne électorale"],
    },
    "vudebat_m2": {
        "display_label": "Débats électoraux regardés (deuxième mention)",
        "concepts": ["débats électoraux", "exposition médiatique"],
        "themes": ["communication politique", "campagne électorale"],
    },
    "vudebat_m3": {
        "display_label": "Débats électoraux regardés (troisième mention)",
        "concepts": ["débats électoraux", "exposition médiatique"],
        "themes": ["communication politique", "campagne électorale"],
    },
    "vudebat_m4": {
        "display_label": "Débats électoraux regardés (quatrième mention)",
        "concepts": ["débats électoraux", "exposition médiatique"],
        "themes": ["communication politique", "campagne électorale"],
    },
    "vudebatSRC": {
        "display_label": "Visionnement du débat des quatre chefs (Radio-Canada, 19 août 2012)",
        "concepts": ["débat des quatre chefs", "exposition aux débats"],
        "themes": ["communication politique", "leadership politique"],
    },
    "vudebat_CH_MA": {
        "display_label": "Visionnement du face-à-face Charest-Marois (TVA, 20 août 2012)",
        "concepts": ["face-à-face de chefs", "exposition aux débats"],
        "themes": ["leadership politique", "communication politique"],
    },
    "vudebat_CH_LE": {
        "display_label": "Visionnement du face-à-face Charest-Legault (TVA, 21 août 2012)",
        "concepts": ["face-à-face de chefs", "exposition aux débats"],
        "themes": ["leadership politique", "communication politique"],
    },
    "vudebat_MA_LE": {
        "display_label": "Visionnement du face-à-face Legault-Marois (TVA, 22 août 2012)",
        "concepts": ["face-à-face de chefs", "exposition aux débats"],
        "themes": ["leadership politique", "communication politique"],
    },
    "intvoteref": {
        "display_label": "Intention de vote référendaire (souveraineté du Québec)",
        "concepts": ["souveraineté", "référendum", "nationalisme"],
        "themes": ["identité", "souveraineté"],
    },
    "meilleurPM": {
        "display_label": "Chef jugé le plus apte à être premier ministre",
        "concepts": ["évaluation des chefs", "leadership", "préférences électorales"],
        "themes": ["leadership politique", "démocratie"],
    },
    "bonequipe": {
        "display_label": "Évaluation du chef : capable d'une bonne équipe",
        "concepts": ["compétence de gestion", "évaluation des chefs"],
        "themes": ["leadership politique"],
    },
    "boneconomie": {
        "display_label": "Évaluation du chef : compétence en questions économiques",
        "concepts": ["compétence économique", "évaluation des chefs"],
        "themes": ["leadership politique", "économie"],
    },
    "honnete": {
        "display_label": "Évaluation du chef : honnêteté et intégrité",
        "concepts": ["intégrité", "confiance", "évaluation des chefs"],
        "themes": ["leadership politique"],
    },
    "comprendgens": {
        "display_label": "Évaluation du chef : compréhension des préoccupations des citoyens",
        "concepts": ["compréhension citoyenne", "évaluation des chefs"],
        "themes": ["leadership politique"],
    },
    "livremarch": {
        "display_label": "Évaluation du chef : capacité à livrer les marchandises",
        "concepts": ["crédibilité", "efficacité", "évaluation des chefs"],
        "themes": ["leadership politique"],
    },
    "apportechang": {
        "display_label": "Évaluation du chef : apport du changement",
        "concepts": ["changement", "réforme", "évaluation des chefs"],
        "themes": ["leadership politique"],
    },
    "prochgouv": {
        "display_label": "Principale qualité prioritaire du prochain gouvernement",
        "concepts": ["priorités gouvernementales", "enjeux électoraux"],
        "themes": ["démocratie", "économie"],
    },
    "luentend": {
        "display_label": "Exposition aux résultats de sondages électoraux",
        "concepts": ["exposition médiatique", "sondages"],
        "themes": ["communication politique", "opinion publique"],
    },
    "sefie": {
        "display_label": "Confiance dans les sondages pour prédire le résultat électoral",
        "concepts": ["confiance", "crédibilité des sondages"],
        "themes": ["opinion publique"],
    },
    "sondbons": {
        "display_label": "Opinion sur l'utilité des sondages durant les campagnes électorales",
        "concepts": ["opinion sur les sondages", "sondages"],
        "themes": ["opinion publique", "communication politique"],
    },
    "participation": {
        "display_label": "Participation électorale (a voté lors de l'élection du 4 septembre 2012)",
        "concepts": ["participation électorale", "taux de vote"],
        "themes": ["démocratie", "comportement électoral"],
    },
    "voteprov": {
        "display_label": "Vote déclaré aux élections provinciales du 4 septembre 2012",
        "concepts": ["vote", "comportement électoral"],
        "themes": ["démocratie"],
    },
    "indecis2": {
        "display_label": "Indécision électorale dans la semaine précédant l'élection",
        "concepts": ["indécision", "volatilité électorale"],
        "themes": ["comportement électoral"],
    },
    "influperso": {
        "display_label": "Influence des sondages électoraux sur sa décision de vote",
        "concepts": ["influence des sondages", "comportement électoral"],
        "themes": ["opinion publique", "communication politique"],
    },
}
