"""Enrichment authoré — cecd_elxn_can_2011. Produit par subagent LLM (2026-07-07)."""

SURVEY = {
    "description": "Panel électoral fédéral canadien 2011 (firme CROP, échantillon québécois). Sondage mené en deux vagues : pré-électorale du 13 au 20 avril 2011 et post-électorale du 12 au 14 mai 2011 (élection fédérale le 2 mai 2011 — vague orange du NPD avec Jack Layton comme opposition officielle, majorité conservatrice de Stephen Harper). Échantillon fusionné de 715 Québécois ayant répondu aux deux vagues, administré en ligne. Couvre intentions de vote provinciales et référendaire sur la souveraineté.",
    "month": 5,
}

QUESTIONS = {
    "reg": {
        "display_label": "Région de résidence du répondant au Québec",
        "concepts": ["géographie", "région"],
        "themes": ["démographie"],
    },
    "qage": {
        "display_label": "Groupe d'âge du répondant",
        "concepts": ["âge"],
        "themes": ["démographie"],
    },
    "qlanf": {
        "display_label": "Langue parlée le plus souvent au foyer",
        "concepts": ["langue parlée", "usage linguistique"],
        "themes": ["démographie", "identité"],
    },
    "qlanm": {
        "display_label": "Langue maternelle du répondant",
        "concepts": ["langue maternelle"],
        "themes": ["démographie", "identité"],
    },
    "sexe": {
        "display_label": "Sexe du répondant",
        "concepts": ["sexe", "genre"],
        "themes": ["démographie"],
    },
    "occup": {
        "display_label": "Situation d'emploi actuelle du répondant",
        "concepts": ["emploi", "occupation"],
        "themes": ["démographie"],
    },
    "p9": {
        "display_label": "Occupation professionnelle principale du répondant",
        "concepts": ["profession", "emploi détaillé"],
        "themes": ["démographie"],
    },
    "qtras": {
        "display_label": "Statut d'emploi : travailleur salarié ou autonome",
        "concepts": ["statut d'emploi", "travail"],
        "themes": ["démographie"],
    },
    "qetud": {
        "display_label": "Plus haut niveau de scolarité atteint",
        "concepts": ["éducation", "scolarité"],
        "themes": ["démographie"],
    },
    "qreve": {
        "display_label": "Revenu annuel total du ménage",
        "concepts": ["revenu", "statut économique"],
        "themes": ["démographie"],
    },
    "qenfa": {
        "display_label": "Nombre de personnes mineures résidant au foyer",
        "concepts": ["composition familiale", "enfants"],
        "themes": ["démographie"],
    },
    "you1": {
        "display_label": "Identité nationale : Québécois avant tout ou Canadien avant tout",
        "concepts": ["identité nationale", "nationalisme"],
        "themes": ["identité", "question nationale"],
    },
    "you2": {
        "display_label": "Position sur le maintien du Québec au Canada vs séparation",
        "concepts": ["souveraineté", "fédéralisme"],
        "themes": ["question nationale", "identité"],
    },
    "you3": {
        "display_label": "Intensité du fédéralisme : fortement ou modérément favorable au Québec dans Canada",
        "concepts": ["fédéralisme", "intensité"],
        "themes": ["question nationale"],
    },
    "you4": {
        "display_label": "Intensité de la souveraineté : fortement ou modérément favorable à un Québec souverain",
        "concepts": ["souveraineté", "intensité"],
        "themes": ["question nationale"],
    },
    "sastp": {
        "display_label": "Satisfaction envers le gouvernement provincial du Québec",
        "concepts": ["satisfaction gouvernementale", "évaluation provinciale"],
        "themes": ["leadership politique", "démocratie"],
    },
    "prov1": {
        "display_label": "Intention de vote provincial québécois (question principale)",
        "concepts": ["intention de vote", "préférences électorales provinciales"],
        "themes": ["comportement électoral", "démocratie"],
    },
    "prov2": {
        "display_label": "Intention de vote provincial québécois (question de relance)",
        "concepts": ["intention de vote", "vote hésitant"],
        "themes": ["comportement électoral"],
    },
    "q9": {
        "display_label": "Chef jugé le plus apte à être premier ministre du Québec",
        "concepts": ["évaluation des chefs", "leadership provincial"],
        "themes": ["leadership politique", "démocratie"],
    },
    "q10a": {
        "display_label": "Parti pour lequel répondant a voté aux élections provinciales du 8 décembre 2008",
        "concepts": ["vote précédent", "comportement électoral passé"],
        "themes": ["comportement électoral"],
    },
    "souv1": {
        "display_label": "Référendum souveraineté : vote sur l'indépendance du Québec (question principale)",
        "concepts": ["référendum", "souveraineté"],
        "themes": ["question nationale", "démocratie"],
    },
    "souv2": {
        "display_label": "Référendum souveraineté : vote sur l'indépendance du Québec (question de relance)",
        "concepts": ["référendum", "vote hésitant"],
        "themes": ["question nationale"],
    },
    "sastf": {
        "display_label": "Satisfaction envers le gouvernement fédéral du Canada",
        "concepts": ["satisfaction gouvernementale", "évaluation fédérale"],
        "themes": ["leadership politique", "démocratie"],
    },
    "fede1": {
        "display_label": "Intention de vote fédéral canadien (question principale)",
        "concepts": ["intention de vote", "préférences électorales fédérales"],
        "themes": ["comportement électoral", "démocratie"],
    },
    "fede2": {
        "display_label": "Intention de vote fédéral canadien (question de relance)",
        "concepts": ["intention de vote", "vote hésitant"],
        "themes": ["comportement électoral"],
    },
    "q11aa": {
        "display_label": "Chef jugé le plus apte à être premier ministre du Canada",
        "concepts": ["évaluation des chefs", "leadership fédéral"],
        "themes": ["leadership politique", "démocratie"],
    },
    "pol1": {
        "display_label": "Certitude de participation au vote fédéral (pré-électoral)",
        "concepts": ["certitude de voter", "participation électorale"],
        "themes": ["comportement électoral", "engagement civique"],
    },
    "pol2a": {
        "display_label": "Évaluation de la performance électorale du chef du Parti Libéral (Michael Ignatieff)",
        "concepts": ["évaluation du chef", "campagne électorale"],
        "themes": ["communication politique", "leadership politique"],
    },
    "pol2b": {
        "display_label": "Évaluation de la performance électorale du chef du Parti Conservateur (Stephen Harper)",
        "concepts": ["évaluation du chef", "campagne électorale"],
        "themes": ["communication politique", "leadership politique"],
    },
    "pol2c": {
        "display_label": "Évaluation de la performance électorale du chef du Nouveau Parti Démocratique (Jack Layton)",
        "concepts": ["évaluation du chef", "campagne électorale"],
        "themes": ["communication politique", "leadership politique"],
    },
    "pol2d": {
        "display_label": "Évaluation de la performance électorale du chef du Parti Vert (Elizabeth May)",
        "concepts": ["évaluation du chef", "campagne électorale"],
        "themes": ["communication politique", "leadership politique"],
    },
    "pol2e": {
        "display_label": "Évaluation de la performance électorale du chef du Bloc Québécois (Gilles Duceppe)",
        "concepts": ["évaluation du chef", "campagne électorale"],
        "themes": ["communication politique", "leadership politique"],
    },
    "pol3": {
        "display_label": "Certitude du choix de vote fédéral avant l'élection du 2 mai 2011",
        "concepts": ["certitude électorale", "indécision"],
        "themes": ["comportement électoral"],
    },
    "z1": {
        "display_label": "Intérêt pour la campagne électorale fédérale 2011 (post-électoral)",
        "concepts": ["intérêt politique", "campagne électorale"],
        "themes": ["engagement civique", "comportement électoral"],
    },
    "z2": {
        "display_label": "Participation au vote fédéral du 2 mai 2011",
        "concepts": ["participation électorale", "abstention"],
        "themes": ["comportement électoral", "démocratie"],
    },
    "z3": {
        "display_label": "Certitude du choix de vote la semaine avant le scrutin fédéral",
        "concepts": ["certitude électorale", "indécision"],
        "themes": ["comportement électoral"],
    },
    "z4": {
        "display_label": "Parti pour lequel répondant a voté à l'élection fédérale du 2 mai 2011",
        "concepts": ["vote", "comportement électoral"],
        "themes": ["démocratie", "comportement électoral"],
    },
    "O_Q5A": {
        "display_label": "Raison du vote ou du non-vote aux élections fédérales du 2 mai 2011 (réponse ouverte)",
        "concepts": ["motivations électorales", "raison du vote"],
        "themes": ["comportement électoral"],
    },
    "luentend": {
        "display_label": "Exposition à la couverture médiatique des sondages fédéraux durant campagne 2011",
        "concepts": ["exposition médiatique", "sondages"],
        "themes": ["opinion publique", "communication politique"],
    },
    "z7": {
        "display_label": "Influence perçue des résultats de sondages sur la décision de vote (fédéral)",
        "concepts": ["influence des sondages", "prédiction électorale"],
        "themes": ["opinion publique", "comportement électoral"],
    },
    "z8": {
        "display_label": "Opinion sur la valeur des sondages électoraux (bonne ou mauvaise chose)",
        "concepts": ["perception des sondages", "opinion sur sondages"],
        "themes": ["opinion publique"],
    },
    "z9": {
        "display_label": "Méthode de sondage préférée (poste, internet, téléphone, visite)",
        "concepts": ["préférence méthodologique", "méthodes de sondage"],
        "themes": ["opinion publique"],
    },
    "z10": {
        "display_label": "Parti pour lequel répondant a voté aux élections fédérales du 14 octobre 2008",
        "concepts": ["vote précédent", "comportement électoral passé"],
        "themes": ["comportement électoral"],
    },
    "code1_num": {
        "display_label": "Code 1 (raison principale du vote ou changement de vote)",
        "concepts": ["raison du vote", "codification"],
        "themes": ["comportement électoral"],
    },
    "code2_num": {
        "display_label": "Code 2 (raison secondaire du vote ou changement de vote)",
        "concepts": ["raison du vote", "codification"],
        "themes": ["comportement électoral"],
    },
    "code3_num": {
        "display_label": "Code 3 (raison additionnelle du vote ou changement de vote)",
        "concepts": ["raison du vote", "codification"],
        "themes": ["comportement électoral"],
    },
    "code4_num": {
        "display_label": "Code 4 (raison du tangage émotionnel du vote)",
        "concepts": ["raison du vote", "codification"],
        "themes": ["comportement électoral"],
    },
    "code5_num": {
        "display_label": "Code 5 (raison de la stabilité électorale)",
        "concepts": ["raison du vote", "codification"],
        "themes": ["comportement électoral"],
    },
    "Texte": {
        "display_label": "Raison du changement de vote ou de l'abstention (réponse ouverte)",
        "concepts": ["motivations électorales", "changement de vote"],
        "themes": ["comportement électoral"],
    },
}
