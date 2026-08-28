"""Enrichment authoré — provincial_qc_2012. Produit par subagent LLM (2026-08-28)."""

SURVEY = {
    "description": "Étude électorale québécoise de 2012 réalisée par le Consortium de l'Étude électorale québécoise (McGill / Harris-Decima). Volets pré-électoral et post-électoral portant sur l'élection provinciale du 4 septembre 2012 au Québec.",
    "month": 9,
}

QUESTIONS = {
    "GEND": {
        "display_label": "Sexe du répondant",
        "concepts": ["sexe", "genre"],
        "themes": ["démographie"],
    },
    "YOB": {
        "display_label": "Année de naissance du répondant",
        "concepts": ["année de naissance", "âge"],
        "themes": ["démographie"],
    },
    "SD1A": {
        "display_label": "Âge au jour de l'élection (4 septembre 2012)",
        "concepts": ["âge"],
        "themes": ["démographie"],
    },
    "SD2A": {
        "display_label": "Résidence au Québec",
        "concepts": ["résidence", "géographie"],
        "themes": ["démographie"],
    },
    "SD2B": {
        "display_label": "Citoyenneté canadienne",
        "concepts": ["citoyenneté"],
        "themes": ["démographie"],
    },
    "SD6F": {
        "display_label": "Première langue apprise et encore comprise",
        "concepts": ["langue maternelle", "langue"],
        "themes": ["démographie", "identité"],
    },
    "MLANG": {
        "display_label": "Langue maternelle du répondant",
        "concepts": ["langue maternelle", "langue"],
        "themes": ["démographie", "identité"],
    },
    "SD4": {
        "display_label": "Niveau de scolarité complété",
        "concepts": ["éducation", "scolarité"],
        "themes": ["démographie"],
    },
    "Q2": {
        "display_label": "Enjeu le plus important dans l'élection provinciale",
        "concepts": ["enjeu électoral", "priorités politiques"],
        "themes": ["politique provinciale", "élections"],
    },
    "Q3": {
        "display_label": "Existence d'un parti plus apte sur l'enjeu principal",
        "concepts": ["compétence des partis", "évaluation des partis"],
        "themes": ["politique provinciale", "élections"],
    },
    "Q3B": {
        "display_label": "Parti le plus apte à s'occuper de l'enjeu le plus important",
        "concepts": ["compétence des partis", "évaluation des partis"],
        "themes": ["politique provinciale", "élections"],
    },
    "Q4A": {
        "display_label": "Intérêt pour l'élection provinciale en cours",
        "concepts": ["intérêt pour la politique", "engagement politique"],
        "themes": ["politique provinciale", "élections"],
    },
    "Q5": {
        "display_label": "Intérêt pour la politique en général",
        "concepts": ["intérêt pour la politique", "engagement politique"],
        "themes": ["politique", "démocratie"],
    },
    "Q6": {
        "display_label": "Vote par anticipation ou déjà effectué aux élections provinciales",
        "concepts": ["vote par anticipation", "participation électorale"],
        "themes": ["politique provinciale", "élections"],
    },
    "Q6A": {
        "display_label": "Parti choisi lors du vote déjà effectué",
        "concepts": ["vote déjà effectué", "choix électoral"],
        "themes": ["politique provinciale", "élections"],
    },
    "Q7": {
        "display_label": "Certitude ou probabilité d'aller voter",
        "concepts": ["intention de voter", "participation électorale"],
        "themes": ["politique provinciale", "élections"],
    },
    "Q8A": {
        "display_label": "Intention de vote aux élections provinciales",
        "concepts": ["intention de vote", "préférences électorales"],
        "themes": ["politique provinciale", "élections"],
    },
    "Q8B": {
        "display_label": "Parti le plus probable en cas d'hésitation de vote",
        "concepts": ["intention de vote", "deuxième choix"],
        "themes": ["politique provinciale", "élections"],
    },
    "Q9": {
        "display_label": "Intention de vote aux élections fédérales",
        "concepts": ["intention de vote fédérale", "préférences électorales"],
        "themes": ["politique fédérale", "élections"],
    },
    "Q10A": {
        "display_label": "Identification du chef : Parti libéral du Québec (Jean Charest)",
        "concepts": ["notoriété des chefs", "reconnaissance visuelle"],
        "themes": ["politique provinciale", "chefs politiques"],
    },
    "Q10B": {
        "display_label": "Identification du chef : Parti québécois (Pauline Marois)",
        "concepts": ["notoriété des chefs", "reconnaissance visuelle"],
        "themes": ["politique provinciale", "chefs politiques"],
    },
    "Q10C": {
        "display_label": "Identification du chef : Québec solidaire",
        "concepts": ["notoriété des chefs", "reconnaissance visuelle"],
        "themes": ["politique provinciale", "chefs politiques"],
    },
    "Q10D": {
        "display_label": "Identification du chef : Coalition avenir Québec (François Legault)",
        "concepts": ["notoriété des chefs", "reconnaissance visuelle"],
        "themes": ["politique provinciale", "chefs politiques"],
    },
    "Q10E": {
        "display_label": "Identification du chef : Option nationale (Jean-Martin Aussant)",
        "concepts": ["notoriété des chefs", "reconnaissance visuelle"],
        "themes": ["politique provinciale", "chefs politiques"],
    },
    "Q11": {
        "display_label": "Perception de différence entre les partis au pouvoir",
        "concepts": ["différenciation des partis", "efficience électorale"],
        "themes": ["politique", "démocratie"],
    },
    "Q12": {
        "display_label": "Perception de l'impact du vote sur le cours des événements",
        "concepts": ["efficacité politique", "impact du vote"],
        "themes": ["politique", "démocratie"],
    },
    "Q13": {
        "display_label": "Satisfaction envers le gouvernement du Québec (12 derniers mois)",
        "concepts": ["satisfaction gouvernementale", "évaluation du gouvernement"],
        "themes": ["politique provinciale", "gouvernement"],
    },
    "Q14": {
        "display_label": "Satisfaction envers le gouvernement fédéral (12 derniers mois)",
        "concepts": ["satisfaction gouvernementale", "évaluation du gouvernement"],
        "themes": ["politique fédérale", "gouvernement"],
    },
    "Q15": {
        "display_label": "Perception de l'évolution de l'économie québécoise (12 derniers mois)",
        "concepts": ["état de l'économie", "économie québécoise"],
        "themes": ["économie", "politique provinciale"],
    },
    "Q15A": {
        "display_label": "Impact des politiques du gouvernement provincial sur l'économie québécoise",
        "concepts": ["impact économique", "évaluation des politiques"],
        "themes": ["économie", "politique provinciale"],
    },
    "Q16": {
        "display_label": "Perception de l'évolution de l'économie canadienne (12 derniers mois)",
        "concepts": ["état de l'économie", "économie canadienne"],
        "themes": ["économie", "politique fédérale"],
    },
    "Q16A": {
        "display_label": "Impact des politiques du gouvernement fédéral sur l'économie canadienne",
        "concepts": ["impact économique", "évaluation des politiques"],
        "themes": ["économie", "politique fédérale"],
    },
    "Q17A": {
        "display_label": "Appréciation du Parti libéral du Québec (échelle 0-10)",
        "concepts": ["évaluation des partis", "sympathie partisane"],
        "themes": ["politique provinciale", "partis politiques"],
    },
    "Q17B": {
        "display_label": "Appréciation du Parti québécois (échelle 0-10)",
        "concepts": ["évaluation des partis", "sympathie partisane"],
        "themes": ["politique provinciale", "partis politiques"],
    },
    "Q17C": {
        "display_label": "Appréciation de Québec solidaire (échelle 0-10)",
        "concepts": ["évaluation des partis", "sympathie partisane"],
        "themes": ["politique provinciale", "partis politiques"],
    },
    "Q17D": {
        "display_label": "Appréciation de la Coalition avenir Québec (échelle 0-10)",
        "concepts": ["évaluation des partis", "sympathie partisane"],
        "themes": ["politique provinciale", "partis politiques"],
    },
    "Q17E": {
        "display_label": "Appréciation d'Option nationale (échelle 0-10)",
        "concepts": ["évaluation des partis", "sympathie partisane"],
        "themes": ["politique provinciale", "partis politiques"],
    },
    "Q17F": {
        "display_label": "Appréciation du Parti vert du Québec (échelle 0-10)",
        "concepts": ["évaluation des partis", "sympathie partisane"],
        "themes": ["politique provinciale", "partis politiques"],
    },
    "Q18": {
        "display_label": "Parti politique provincial préféré globalement",
        "concepts": ["préférence partisane", "parti préféré"],
        "themes": ["politique provinciale", "partis politiques"],
    },
    "Q19A": {
        "display_label": "Appréciation de Jean Charest (échelle 0-10)",
        "concepts": ["évaluation des chefs", "sympathie pour un chef"],
        "themes": ["politique provinciale", "chefs politiques"],
    },
    "Q19B": {
        "display_label": "Appréciation de Pauline Marois (échelle 0-10)",
        "concepts": ["évaluation des chefs", "sympathie pour un chef"],
        "themes": ["politique provinciale", "chefs politiques"],
    },
    "Q19C": {
        "display_label": "Appréciation d'Amir Khadir (échelle 0-10)",
        "concepts": ["évaluation des chefs", "sympathie pour un chef"],
        "themes": ["politique provinciale", "chefs politiques"],
    },
    "Q19D": {
        "display_label": "Appréciation de Françoise David (échelle 0-10)",
        "concepts": ["évaluation des chefs", "sympathie pour un chef"],
        "themes": ["politique provinciale", "chefs politiques"],
    },
    "Q19E": {
        "display_label": "Appréciation de François Legault (échelle 0-10)",
        "concepts": ["évaluation des chefs", "sympathie pour un chef"],
        "themes": ["politique provinciale", "chefs politiques"],
    },
    "Q19F": {
        "display_label": "Appréciation de Jean-Martin Aussant (échelle 0-10)",
        "concepts": ["évaluation des chefs", "sympathie pour un chef"],
        "themes": ["politique provinciale", "chefs politiques"],
    },
    "Q19G": {
        "display_label": "Appréciation de Claude Sabourin (échelle 0-10)",
        "concepts": ["évaluation des chefs", "sympathie pour un chef"],
        "themes": ["politique provinciale", "chefs politiques"],
    },
    "Q19AA": {
        "display_label": "Préférence pour le poste de premier ministre du Québec",
        "concepts": ["premier ministre préféré", "leadership politique"],
        "themes": ["politique provinciale", "chefs politiques"],
    },
    "Q20": {
        "display_label": "Importance accordée au parti qui formera le gouvernement",
        "concepts": ["importance du gouvernement", "enjeu du pouvoir"],
        "themes": ["politique provinciale", "élections"],
    },
    "Q22": {
        "display_label": "Préférence entre gouvernement majoritaire ou minoritaire",
        "concepts": ["gouvernement majoritaire", "gouvernement minoritaire", "système parlementaire"],
        "themes": ["politique provinciale", "institutions"],
    },
    "Q24A": {
        "display_label": "Probabilité perçue que le PLQ obtienne au moins un siège",
        "concepts": ["anticipations électorales", "chances de victoire"],
        "themes": ["politique provinciale", "élections"],
    },
    "Q24B": {
        "display_label": "Probabilité perçue que le PQ obtienne au moins un siège",
        "concepts": ["anticipations électorales", "chances de victoire"],
        "themes": ["politique provinciale", "élections"],
    },
    "Q24C": {
        "display_label": "Probabilité perçue que la CAQ obtienne au moins un siège",
        "concepts": ["anticipations électorales", "chances de victoire"],
        "themes": ["politique provinciale", "élections"],
    },
    "Q25": {
        "display_label": "Parti anticipé pour obtenir le plus de sièges à l'Assemblée nationale",
        "concepts": ["anticipation du gagnant", "prédiction électorale"],
        "themes": ["politique provinciale", "élections"],
    },
    "Q26": {
        "display_label": "Importance du choix du candidat local dans la circonscription",
        "concepts": ["vote local", "candidat local"],
        "themes": ["politique provinciale", "élections"],
    },
    "Q27": {
        "display_label": "Présence d'un candidat local particulièrement apprécié",
        "concepts": ["candidat local", "sympathie locale"],
        "themes": ["politique provinciale", "élections"],
    },
    "Q27A": {
        "display_label": "Parti du candidat local apprécié",
        "concepts": ["candidat local", "parti local"],
        "themes": ["politique provinciale", "élections"],
    },
    "Q28A": {
        "display_label": "Chances de victoire du candidat du PLQ dans la circonscription",
        "concepts": ["anticipations locales", "chances de victoire"],
        "themes": ["politique provinciale", "élections"],
    },
    "Q28B": {
        "display_label": "Chances de victoire du candidat du PQ dans la circonscription",
        "concepts": ["anticipations locales", "chances de victoire"],
        "themes": ["politique provinciale", "élections"],
    },
    "Q28C": {
        "display_label": "Chances de victoire du candidat de QS dans la circonscription",
        "concepts": ["anticipations locales", "chances de victoire"],
        "themes": ["politique provinciale", "élections"],
    },
    "Q28D": {
        "display_label": "Chances de victoire du candidat de la CAQ dans la circonscription",
        "concepts": ["anticipations locales", "chances de victoire"],
        "themes": ["politique provinciale", "élections"],
    },
    "Q28E": {
        "display_label": "Chances de victoire du candidat d'ON dans la circonscription",
        "concepts": ["anticipations locales", "chances de victoire"],
        "themes": ["politique provinciale", "élections"],
    },
    "Q28F": {
        "display_label": "Chances de victoire du candidat du PVQ dans la circonscription",
        "concepts": ["anticipations locales", "chances de victoire"],
        "themes": ["politique provinciale", "élections"],
    },
    "Q29": {
        "display_label": "Perception du niveau de compétition électorale dans la circonscription",
        "concepts": ["compétition électorale", "lutte serrée"],
        "themes": ["politique provinciale", "élections"],
    },
    "Q29A": {
        "display_label": "Intention de vote en cas de référendum sur la souveraineté du Québec",
        "concepts": ["souveraineté", "référendum", "indépendance du québec"],
        "themes": ["politique provinciale", "souveraineté"],
    },
    "Q30A": {
        "display_label": "Auto-positionnement sur l'axe gauche-droite (0-10)",
        "concepts": ["gauche-droite", "idéologie politique"],
        "themes": ["politique", "idéologie"],
    },
    "Q30AA": {
        "display_label": "Positionnement perçu du Parti libéral du Québec sur l'axe gauche-droite",
        "concepts": ["gauche-droite", "positionnement des partis"],
        "themes": ["politique provinciale", "idéologie"],
    },
    "Q30AB": {
        "display_label": "Positionnement perçu du Parti québécois sur l'axe gauche-droite",
        "concepts": ["gauche-droite", "positionnement des partis"],
        "themes": ["politique provinciale", "idéologie"],
    },
    "Q30AC": {
        "display_label": "Positionnement perçu de Québec solidaire sur l'axe gauche-droite",
        "concepts": ["gauche-droite", "positionnement des partis"],
        "themes": ["politique provinciale", "idéologie"],
    },
    "Q30AD": {
        "display_label": "Positionnement perçu de la Coalition avenir Québec sur l'axe gauche-droite",
        "concepts": ["gauche-droite", "positionnement des partis"],
        "themes": ["politique provinciale", "idéologie"],
    },
    "Q30AE": {
        "display_label": "Positionnement perçu d'Option nationale sur l'axe gauche-droite",
        "concepts": ["gauche-droite", "positionnement des partis"],
        "themes": ["politique provinciale", "idéologie"],
    },
    "Q30AF": {
        "display_label": "Positionnement perçu du Parti vert du Québec sur l'axe gauche-droite",
        "concepts": ["gauche-droite", "positionnement des partis"],
        "themes": ["politique provinciale", "idéologie"],
    },
    "Q30B": {
        "display_label": "Positionnement entre réductions d'impôts et services publics",
        "concepts": ["impôts", "services publics", "rôle de l'état"],
        "themes": ["économie", "politique publique"],
    },
    "Q30C": {
        "display_label": "Attitude envers la redistribution de la richesse",
        "concepts": ["redistribution", "inégalités sociales"],
        "themes": ["économie", "politique sociale"],
    },
    "Q30D": {
        "display_label": "Positionnement entre réhabilitation et sentences lourdes en justice",
        "concepts": ["justice", "réhabilitation", "sentences judiciaires"],
        "themes": ["justice", "société"],
    },
    "Q30E": {
        "display_label": "Attitude envers les niveaux d'immigration au Québec",
        "concepts": ["immigration", "seuil d'immigration"],
        "themes": ["immigration", "société"],
    },
    "Q30F": {
        "display_label": "Avis sur le niveau des droits de scolarité universitaires",
        "concepts": ["droits de scolarité", "frais de scolarité", "université"],
        "themes": ["éducation", "politique publique"],
    },
    "Q31": {
        "display_label": "Sentiment de culpabilité en cas d'abstention électorale",
        "concepts": ["devoir de voter", "norme électorale", "abstention"],
        "themes": ["démocratie", "comportement électoral"],
    },
    "Q32A": {
        "display_label": "Perception de la réceptivité du gouvernement du Québec envers les citoyens",
        "concepts": ["réceptivité gouvernementale", "écoute des citoyens"],
        "themes": ["politique provinciale", "démocratie"],
    },
    "Q32B": {
        "display_label": "Perception de la réceptivité du gouvernement du Canada envers les citoyens",
        "concepts": ["réceptivité gouvernementale", "écoute des citoyens"],
        "themes": ["politique fédérale", "démocratie"],
    },
    "Q34A": {
        "display_label": "Importance accordée à l'élection provinciale québécoise de 2012",
        "concepts": ["importance de l'élection"],
        "themes": ["politique provinciale", "élections"],
    },
    "Q34B": {
        "display_label": "Importance accordée à l'élection fédérale de 2011",
        "concepts": ["importance de l'élection"],
        "themes": ["politique fédérale", "élections"],
    },
    "Q34C": {
        "display_label": "Importance accordée aux élections municipales",
        "concepts": ["importance de l'élection"],
        "themes": ["politique municipale", "élections"],
    },
    "Q35A1": {
        "display_label": "Opinion sur la restriction du droit de vote selon les connaissances politiques",
        "concepts": ["droit de vote", "compétence politique"],
        "themes": ["démocratie", "droits"],
    },
    "Q35A": {
        "display_label": "Sentiment de complexité de la politique et du gouvernement",
        "concepts": ["efficacité politique", "complexité politique"],
        "themes": ["démocratie", "attitude politique"],
    },
    "Q35B": {
        "display_label": "Perception de la considération des politiciens pour l'opinion des gens",
        "concepts": ["réceptivité des politiciens", "cynisme politique"],
        "themes": ["démocratie", "attitude politique"],
    },
    "Q35C": {
        "display_label": "Sentiment d'impuissance citoyenne face aux actions du gouvernement",
        "concepts": ["efficacité politique", "pouvoir citoyen"],
        "themes": ["démocratie", "attitude politique"],
    },
    "Q35D": {
        "display_label": "Sentiment d'absence d'influence sur les décisions du gouvernement",
        "concepts": ["efficacité politique", "pouvoir citoyen"],
        "themes": ["démocratie", "attitude politique"],
    },
    "Q36": {
        "display_label": "Évolution de la situation financière personnelle depuis un an",
        "concepts": ["situation financière", "niveau de vie"],
        "themes": ["économie", "finances personnelles"],
    },
    "Q37": {
        "display_label": "Impact des politiques du gouvernement du Québec sur la situation financière personnelle",
        "concepts": ["impact économique personnel", "évaluation des politiques"],
        "themes": ["économie", "politique provinciale"],
    },
    "Q38": {
        "display_label": "Impact des politiques du gouvernement fédéral sur la situation financière personnelle",
        "concepts": ["impact économique personnel", "évaluation des politiques"],
        "themes": ["économie", "politique fédérale"],
    },
    "Q40": {
        "display_label": "Connaissance du système électoral : majorité absolue vs majorité relative",
        "concepts": ["connaissance électorale", "mode de scrutin"],
        "themes": ["démocratie", "institutions"],
    },
    "Q41": {
        "display_label": "Acceptabilité d'un gouvernement majoritaire en sièges sans majorité des voix",
        "concepts": ["mode de scrutin", "légitimité électorale", "représentation"],
        "themes": ["démocratie", "institutions"],
    },
    "Q42A": {
        "display_label": "Influence perçue du gouvernement du Québec sur le bien-être personnel",
        "concepts": ["impact du gouvernement", "bien-être"],
        "themes": ["politique provinciale", "gouvernement"],
    },
    "Q42B": {
        "display_label": "Influence perçue du gouvernement du Canada sur le bien-être personnel",
        "concepts": ["impact du gouvernement", "bien-être"],
        "themes": ["politique fédérale", "gouvernement"],
    },
    "Q42C": {
        "display_label": "Influence perçue du gouvernement municipal sur le bien-être personnel",
        "concepts": ["impact du gouvernement", "bien-être"],
        "themes": ["politique municipale", "gouvernement"],
    },
    "Q43A": {
        "display_label": "Sentiment d'attachement envers le Canada",
        "concepts": ["attachement national", "identité canadienne"],
        "themes": ["identité", "fédéralisme"],
    },
    "Q43B": {
        "display_label": "Sentiment d'attachement envers le Québec",
        "concepts": ["attachement national", "identité québécoise"],
        "themes": ["identité", "souveraineté"],
    },
    "Q43C": {
        "display_label": "Sentiment d'attachement envers sa municipalité",
        "concepts": ["attachement local", "identité locale"],
        "themes": ["identité", "communauté"],
    },
    "Q44A": {
        "display_label": "Conception du vote aux élections provinciales : devoir ou choix",
        "concepts": ["devoir civique", "droit de vote"],
        "themes": ["démocratie", "comportement électoral"],
    },
    "Q44B": {
        "display_label": "Conception du vote aux élections fédérales : devoir ou choix",
        "concepts": ["devoir civique", "droit de vote"],
        "themes": ["démocratie", "comportement électoral"],
    },
    "Q44C": {
        "display_label": "Conception du vote aux élections municipales : devoir ou choix",
        "concepts": ["devoir civique", "droit de vote"],
        "themes": ["démocratie", "comportement électoral"],
    },
    "Q45A": {
        "display_label": "Intensité du sentiment de devoir civique en politique provinciale",
        "concepts": ["devoir civique"],
        "themes": ["démocratie", "comportement électoral"],
    },
    "Q45B": {
        "display_label": "Intensité du sentiment de devoir civique en politique fédérale",
        "concepts": ["devoir civique"],
        "themes": ["démocratie", "comportement électoral"],
    },
    "Q45C": {
        "display_label": "Intensité du sentiment de devoir civique en politique municipale",
        "concepts": ["devoir civique"],
        "themes": ["démocratie", "comportement électoral"],
    },
    "Q45AA": {
        "display_label": "Sentiment d'appartenance identitaire (Canadien vs Québécois)",
        "concepts": ["identité nationale", "appartenance québécoise", "appartenance canadienne"],
        "themes": ["identité", "souveraineté"],
    },
    "Q46": {
        "display_label": "Sentiment de proximité envers un parti politique provincial",
        "concepts": ["identification partisane", "proximité partisane"],
        "themes": ["politique provinciale", "partis politiques"],
    },
    "Q46A": {
        "display_label": "Parti provincial dont le répondant se sent le plus proche",
        "concepts": ["identification partisane", "parti proche"],
        "themes": ["politique provinciale", "partis politiques"],
    },
    "Q46B": {
        "display_label": "Intensité de la proximité avec le parti provincial préféré",
        "concepts": ["identification partisane", "force de l'attachement partisan"],
        "themes": ["politique provinciale", "partis politiques"],
    },
    "Q47": {
        "display_label": "Sentiment de proximité envers un parti politique fédéral",
        "concepts": ["identification partisane fédérale", "proximité partisane"],
        "themes": ["politique fédérale", "partis politiques"],
    },
    "Q47A": {
        "display_label": "Parti fédéral dont le répondant se sent le plus proche",
        "concepts": ["identification partisane fédérale", "parti proche"],
        "themes": ["politique fédérale", "partis politiques"],
    },
    "Q47B": {
        "display_label": "Intensité de la proximité avec le parti fédéral préféré",
        "concepts": ["identification partisane fédérale", "force de l'attachement partisan"],
        "themes": ["politique fédérale", "partis politiques"],
    },
    "Q48": {
        "display_label": "Facilité ou difficulté perçue de l'acte de voter",
        "concepts": ["accès au vote", "facilité de voter"],
        "themes": ["démocratie", "participation électorale"],
    },
    "Q49": {
        "display_label": "Impression que ses opinions sont reflétées à l'Assemblée nationale",
        "concepts": ["représentation politique", "intégration des opinions"],
        "themes": ["démocratie", "institutions"],
    },
    "Q50A": {
        "display_label": "Perception du niveau de corruption au gouvernement du Québec",
        "concepts": ["corruption", "éthique publique"],
        "themes": ["politique provinciale", "gouvernement"],
    },
    "Q50B": {
        "display_label": "Perception du niveau de corruption au gouvernement du Canada",
        "concepts": ["corruption", "éthique publique"],
        "themes": ["politique fédérale", "gouvernement"],
    },
    "Q50C": {
        "display_label": "Perception du niveau de corruption au niveau municipal",
        "concepts": ["corruption", "éthique publique"],
        "themes": ["politique municipale", "gouvernement"],
    },
    "SD10": {
        "display_label": "Statut d'étudiant au collège ou à l'université",
        "concepts": ["études", "statut étudiant"],
        "themes": ["démographie", "éducation"],
    },
    "SD3": {
        "display_label": "Religion du répondant",
        "concepts": ["religion", "croyance"],
        "themes": ["démographie", "culture"],
    },
    "SD3B": {
        "display_label": "Fréquence d'assistance aux services religieux",
        "concepts": ["pratique religieuse", "fréquentation religieuse"],
        "themes": ["démographie", "culture"],
    },
    "SD5": {
        "display_label": "Revenu annuel brut du ménage",
        "concepts": ["revenu du ménage", "statut socio-économique"],
        "themes": ["démographie", "économie"],
    },
    "SD6": {
        "display_label": "Naissance au Canada",
        "concepts": ["lieu de naissance", "statut d'immigrant"],
        "themes": ["démographie", "immigration"],
    },
    "SD6A": {
        "display_label": "Pays de naissance du répondant",
        "concepts": ["pays de naissance", "origine"],
        "themes": ["démographie", "immigration"],
    },
    "SD6B": {
        "display_label": "Mère née au Canada",
        "concepts": ["origine des parents", "génération d'immigration"],
        "themes": ["démographie", "immigration"],
    },
    "SD6C": {
        "display_label": "Pays de naissance de la mère",
        "concepts": ["origine des parents", "pays de naissance"],
        "themes": ["démographie", "immigration"],
    },
    "SD6D": {
        "display_label": "Nombre d'années de résidence au Canada",
        "concepts": ["durée de résidence", "intégration"],
        "themes": ["démographie", "immigration"],
    },
    "SD6E": {
        "display_label": "Nombre d'années de résidence au Québec",
        "concepts": ["durée de résidence", "ancrage local"],
        "themes": ["démographie", "immigration"],
    },
    "SD7": {
        "display_label": "Type de milieu de résidence (ville, banlieue, village)",
        "concepts": ["milieu de vie", "urbanité"],
        "themes": ["démographie", "géographie"],
    },
    "SD8": {
        "display_label": "Vote déclaré lors de l'élection provinciale de décembre 2008",
        "concepts": ["vote passé provincial", "antécédents électoraux"],
        "themes": ["politique provinciale", "comportement électoral"],
    },
    "SD9": {
        "display_label": "Vote déclaré lors de l'élection fédérale de mai 2011",
        "concepts": ["vote passé fédéral", "antécédents électoraux"],
        "themes": ["politique fédérale", "comportement électoral"],
    },
    "PQ2A": {
        "display_label": "Sujets de campagne principalement abordés par le Parti libéral du Québec",
        "concepts": ["thèmes de campagne", "agenda des partis"],
        "themes": ["politique provinciale", "campagne électorale"],
    },
    "PQ2B": {
        "display_label": "Sujets de campagne principalement abordés par le Parti québécois",
        "concepts": ["thèmes de campagne", "agenda des partis"],
        "themes": ["politique provinciale", "campagne électorale"],
    },
    "PQ2C": {
        "display_label": "Sujets de campagne principalement abordés par Québec solidaire",
        "concepts": ["thèmes de campagne", "agenda des partis"],
        "themes": ["politique provinciale", "campagne électorale"],
    },
    "PQ2D": {
        "display_label": "Sujets de campagne principalement abordés par la Coalition avenir Québec",
        "concepts": ["thèmes de campagne", "agenda des partis"],
        "themes": ["politique provinciale", "campagne électorale"],
    },
    "PQ2E": {
        "display_label": "Sujets de campagne principalement abordés par Option nationale",
        "concepts": ["thèmes de campagne", "agenda des partis"],
        "themes": ["politique provinciale", "campagne électorale"],
    },
    "PQ2F": {
        "display_label": "Sujets de campagne principalement abordés par le Parti vert du Québec",
        "concepts": ["thèmes de campagne", "agenda des partis"],
        "themes": ["politique provinciale", "campagne électorale"],
    },
    "PQ3A": {
        "display_label": "Paternité de la promesse électorale : déduction fiscale de 30%",
        "concepts": ["promesses électorales", "connaissance des programmes"],
        "themes": ["politique provinciale", "campagne électorale"],
    },
    "PQ3B": {
        "display_label": "Paternité de la promesse électorale : rabais sur la taxe scolaire pour parents",
        "concepts": ["promesses électorales", "connaissance des programmes"],
        "themes": ["politique provinciale", "campagne électorale"],
    },
    "PQ3C": {
        "display_label": "Paternité de la promesse électorale : 100$ aux parents d'enfants d'âge scolaire",
        "concepts": ["promesses électorales", "connaissance des programmes"],
        "themes": ["politique provinciale", "campagne électorale"],
    },
    "PQ5_1": {
        "display_label": "Raison ou situation en lien avec l'absence de vote (post-électoral)",
        "concepts": ["abstention", "raisons du non-vote"],
        "themes": ["politique provinciale", "comportement électoral"],
    },
    "PQ5_2": {
        "display_label": "Capacité d'aller voter lors de l'élection provinciale",
        "concepts": ["participation électorale", "accès au vote"],
        "themes": ["politique provinciale", "comportement électoral"],
    },
    "PQ5A": {
        "display_label": "Moment de la décision de ne pas voter",
        "concepts": ["décision d'abstention", "moment de la décision"],
        "themes": ["politique provinciale", "comportement électoral"],
    },
    "PQ5B": {
        "display_label": "Évaluation rétrospective de la décision de ne pas voter",
        "concepts": ["évaluation de l'abstention", "satisfaction du choix"],
        "themes": ["politique provinciale", "comportement électoral"],
    },
    "PQ5C": {
        "display_label": "Modalité du vote effectué (jour de l'élection, anticipation, mesure spéciale)",
        "concepts": ["modalité de vote", "vote par anticipation"],
        "themes": ["politique provinciale", "comportement électoral"],
    },
    "PQ5D": {
        "display_label": "Moment de la décision d'aller voter",
        "concepts": ["décision de voter", "moment de la décision"],
        "themes": ["politique provinciale", "comportement électoral"],
    },
    "PQ5E": {
        "display_label": "Évaluation rétrospective de la décision d'aller voter",
        "concepts": ["évaluation de la participation", "satisfaction du choix"],
        "themes": ["politique provinciale", "comportement électoral"],
    },
    "PQ5F": {
        "display_label": "Envisagement préalable de l'abstention électorale",
        "concepts": ["hésitation électorale", "abstention potentielle"],
        "themes": ["politique provinciale", "comportement électoral"],
    },
    "PQ6": {
        "display_label": "Parti pour lequel le répondant a voté à l'élection du 4 septembre 2012",
        "concepts": ["vote effectué", "choix électoral"],
        "themes": ["politique provinciale", "élections"],
    },
    "PQ6A": {
        "display_label": "Envisagement de voter pour un autre parti",
        "concepts": ["hésitation électorale", "second choix"],
        "themes": ["politique provinciale", "comportement électoral"],
    },
    "PQ6B": {
        "display_label": "Autre parti envisagé lors du vote",
        "concepts": ["alternative électorale", "second choix"],
        "themes": ["politique provinciale", "comportement électoral"],
    },
    "PQ6C": {
        "display_label": "Moment de la décision finale du choix de parti",
        "concepts": ["volatilité électorale", "moment de la décision"],
        "themes": ["politique provinciale", "comportement électoral"],
    },
    "PQ6D": {
        "display_label": "Évaluation rétrospective du choix de parti au vote",
        "concepts": ["satisfaction du vote", "choix électoral"],
        "themes": ["politique provinciale", "comportement électoral"],
    },
    "PQ8": {
        "display_label": "Perception de la victoire ou défaite du parti soutenu",
        "concepts": ["perception de victoire", "résultat électoral"],
        "themes": ["politique provinciale", "élections"],
    },
    "PQ9A": {
        "display_label": "Attention portée aux nouvelles de la campagne électorale à la télévision",
        "concepts": ["exposition médiatique", "suivi de la campagne", "télévision"],
        "themes": ["médias", "campagne électorale"],
    },
    "PQ9B": {
        "display_label": "Attention portée aux nouvelles de la campagne électorale dans les journaux",
        "concepts": ["exposition médiatique", "suivi de la campagne", "presse écrite"],
        "themes": ["médias", "campagne électorale"],
    },
    "PQ9C": {
        "display_label": "Attention portée aux nouvelles de la campagne électorale à la radio",
        "concepts": ["exposition médiatique", "suivi de la campagne", "radio"],
        "themes": ["médias", "campagne électorale"],
    },
    "PQ9D": {
        "display_label": "Attention portée aux nouvelles de la campagne électorale sur internet",
        "concepts": ["exposition médiatique", "suivi de la campagne", "internet"],
        "themes": ["médias", "campagne électorale"],
    },
    "PQ9F": {
        "display_label": "Attention portée aux débats des chefs à la télévision",
        "concepts": ["débats des chefs", "exposition médiatique"],
        "themes": ["médias", "campagne électorale"],
    },
    "PQ10A": {
        "display_label": "Utilisation du site web d'un candidat ou parti pour s'informer",
        "concepts": ["information politique en ligne", "médias numériques"],
        "themes": ["médias", "campagne électorale"],
    },
    "PQ10B": {
        "display_label": "Utilisation des réseaux sociaux (Facebook, Twitter) pendant la campagne",
        "concepts": ["réseaux sociaux", "médias numériques"],
        "themes": ["médias", "campagne électorale"],
    },
    "PQ10C": {
        "display_label": "Consultation des sites d'actualités et journaux en ligne pendant la campagne",
        "concepts": ["presse en ligne", "médias numériques"],
        "themes": ["médias", "campagne électorale"],
    },
    "PQ10D": {
        "display_label": "Lecture de blogues politiques pendant la campagne électorale",
        "concepts": ["blogues politiques", "médias numériques"],
        "themes": ["médias", "campagne électorale"],
    },
    "PQ10E": {
        "display_label": "Visionnement de vidéos en ligne (YouTube) pendant la campagne",
        "concepts": ["vidéos en ligne", "médias numériques"],
        "themes": ["médias", "campagne électorale"],
    },
    "PQ10F": {
        "display_label": "Utilisation d'applications mobiles ou jeux en ligne liés à l'élection",
        "concepts": ["applications mobiles", "médias numériques"],
        "themes": ["médias", "campagne électorale"],
    },
    "PQ11": {
        "display_label": "Utilisation de la Boussole électorale québécoise 2012",
        "concepts": ["boussole électorale", "aide au vote"],
        "themes": ["médias", "campagne électorale"],
    },
    "PQ12": {
        "display_label": "Visionnement de l'un ou l'autre des débats des chefs",
        "concepts": ["débats des chefs", "exposition aux débats"],
        "themes": ["médias", "campagne électorale"],
    },
    "PQ13A": {
        "display_label": "Familiarité avec le slogan : À nous de choisir",
        "concepts": ["slogans électoraux", "notoriété des slogans"],
        "themes": ["communication politique", "campagne électorale"],
    },
    "PQ13B": {
        "display_label": "Familiarité avec le slogan : C'est à vous de choisir",
        "concepts": ["slogans électoraux", "notoriété des slogans"],
        "themes": ["communication politique", "campagne électorale"],
    },
    "PQ13C": {
        "display_label": "Familiarité avec le slogan : La force de l'action",
        "concepts": ["slogans électoraux", "notoriété des slogans"],
        "themes": ["communication politique", "campagne électorale"],
    },
    "PQ13D": {
        "display_label": "Familiarité avec le slogan : Le Québec a besoin d'un changement",
        "concepts": ["slogans électoraux", "notoriété des slogans"],
        "themes": ["communication politique", "campagne électorale"],
    },
    "PQ13E": {
        "display_label": "Familiarité avec le slogan : On a le droit de choisir",
        "concepts": ["slogans électoraux", "notoriété des slogans"],
        "themes": ["communication politique", "campagne électorale"],
    },
    "PQ13F": {
        "display_label": "Familiarité avec le slogan : Travailler pour le Québec",
        "concepts": ["slogans électoraux", "notoriété des slogans"],
        "themes": ["communication politique", "campagne électorale"],
    },
    "PQ14A": {
        "display_label": "Association du parti au slogan : À nous de choisir",
        "concepts": ["association marque-parti", "slogans électoraux"],
        "themes": ["communication politique", "campagne électorale"],
    },
    "PQ14B": {
        "display_label": "Association du parti au slogan : C'est à vous de choisir",
        "concepts": ["association marque-parti", "slogans électoraux"],
        "themes": ["communication politique", "campagne électorale"],
    },
    "PQ14C": {
        "display_label": "Association du parti au slogan : La force de l'action",
        "concepts": ["association marque-parti", "slogans électoraux"],
        "themes": ["communication politique", "campagne électorale"],
    },
    "PQ14D": {
        "display_label": "Association du parti au slogan : Le Québec a besoin d'un changement",
        "concepts": ["association marque-parti", "slogans électoraux"],
        "themes": ["communication politique", "campagne électorale"],
    },
    "PQ14E": {
        "display_label": "Association du parti au slogan : On a le droit de choisir",
        "concepts": ["association marque-parti", "slogans électoraux"],
        "themes": ["communication politique", "campagne électorale"],
    },
    "PQ14F": {
        "display_label": "Association du parti au slogan : Travailler pour le Québec",
        "concepts": ["association marque-parti", "slogans électoraux"],
        "themes": ["communication politique", "campagne électorale"],
    },
    "PQ15A": {
        "display_label": "Soutien actif à un parti : affichage d'une pancarte",
        "concepts": ["militantisme", "affichage électoral"],
        "themes": ["participation politique", "campagne électorale"],
    },
    "PQ15B": {
        "display_label": "Soutien financier à un parti ou candidat",
        "concepts": ["militantisme", "don politique"],
        "themes": ["participation politique", "campagne électorale"],
    },
    "PQ15C": {
        "display_label": "Bénévolat pour une campagne électorale",
        "concepts": ["militantisme", "bénévolat politique"],
        "themes": ["participation politique", "campagne électorale"],
    },
    "PQ15D": {
        "display_label": "Participation à un ralliement ou une assemblée politique",
        "concepts": ["militantisme", "ralliement électoral"],
        "themes": ["participation politique", "campagne électorale"],
    },
    "PQ16A": {
        "display_label": "Incitation au vote par un ami",
        "concepts": ["influence sociale", "discussions politiques"],
        "themes": ["participation politique", "comportement électoral"],
    },
    "PQ16B": {
        "display_label": "Incitation au vote par un membre de la famille",
        "concepts": ["influence sociale", "discussions politiques"],
        "themes": ["participation politique", "comportement électoral"],
    },
    "PQ16C": {
        "display_label": "Incitation au vote par un collègue de travail",
        "concepts": ["influence sociale", "discussions politiques"],
        "themes": ["participation politique", "comportement électoral"],
    },
    "PQ16D": {
        "display_label": "Incitation au vote par un voisin",
        "concepts": ["influence sociale", "discussions politiques"],
        "themes": ["participation politique", "comportement électoral"],
    },
    "PQ17A": {
        "display_label": "Contact de campagne par un parti : porte-à-porte",
        "concepts": ["démarchage électoral", "contact direct"],
        "themes": ["campagne électorale", "stratégie électorale"],
    },
    "PQ17B": {
        "display_label": "Contact de campagne par un parti : appel téléphonique humain",
        "concepts": ["démarchage électoral", "contact téléphonique"],
        "themes": ["campagne électorale", "stratégie électorale"],
    },
    "PQ17C": {
        "display_label": "Contact de campagne par un parti : message enregistré (robocall)",
        "concepts": ["démarchage électoral", "robocall"],
        "themes": ["campagne électorale", "stratégie électorale"],
    },
    "PQ17D": {
        "display_label": "Contact de campagne par un parti : courrier ou dépliant",
        "concepts": ["démarchage électoral", "dépliant électoral"],
        "themes": ["campagne électorale", "stratégie électorale"],
    },
    "PQ17E": {
        "display_label": "Contact de campagne par un parti : courriel",
        "concepts": ["démarchage électoral", "courriel politique"],
        "themes": ["campagne électorale", "stratégie électorale"],
    },
    "PQ17AAM1": {
        "display_label": "Contacté durant la campagne par le Parti libéral du Québec",
        "concepts": ["démarchage électoral", "parti libéral du québec"],
        "themes": ["campagne électorale", "stratégie électorale"],
    },
    "PQ17AAM2": {
        "display_label": "Contacté durant la campagne par le Parti québécois",
        "concepts": ["démarchage électoral", "parti québécois"],
        "themes": ["campagne électorale", "stratégie électorale"],
    },
    "PQ17AAM3": {
        "display_label": "Contacté durant la campagne par Québec solidaire",
        "concepts": ["démarchage électoral", "québec solidaire"],
        "themes": ["campagne électorale", "stratégie électorale"],
    },
    "PQ17AAM4": {
        "display_label": "Contacté durant la campagne par la Coalition avenir Québec",
        "concepts": ["démarchage électoral", "coalition avenir québec"],
        "themes": ["campagne électorale", "stratégie électorale"],
    },
    "PQ17AAM5": {
        "display_label": "Contacté durant la campagne par Option nationale",
        "concepts": ["démarchage électoral", "option nationale"],
        "themes": ["campagne électorale", "stratégie électorale"],
    },
    "PQ17AAM6": {
        "display_label": "Contacté durant la campagne par le Parti vert du Québec",
        "concepts": ["démarchage électoral", "parti vert du québec"],
        "themes": ["campagne électorale", "stratégie électorale"],
    },
    "PQ17AAM7": {
        "display_label": "Contacté durant la campagne par un autre parti ou candidat",
        "concepts": ["démarchage électoral", "autres partis"],
        "themes": ["campagne électorale", "stratégie électorale"],
    },
    "PQ17BA": {
        "display_label": "Incitations au vote stratégique émanant du Parti libéral du Québec",
        "concepts": ["vote stratégique", "démarchage ciblé"],
        "themes": ["campagne électorale", "stratégie électorale"],
    },
    "PQ17BB": {
        "display_label": "Incitations au vote stratégique émanant du Parti québécois",
        "concepts": ["vote stratégique", "démarchage ciblé"],
        "themes": ["campagne électorale", "stratégie électorale"],
    },
    "PQ17BC": {
        "display_label": "Incitations au vote stratégique émanant de Québec solidaire",
        "concepts": ["vote stratégique", "démarchage ciblé"],
        "themes": ["campagne électorale", "stratégie électorale"],
    },
    "PQ17BD": {
        "display_label": "Incitations au vote stratégique émanant de la Coalition avenir Québec",
        "concepts": ["vote stratégique", "démarchage ciblé"],
        "themes": ["campagne électorale", "stratégie électorale"],
    },
    "PQ17BE": {
        "display_label": "Incitations au vote stratégique émanant d'Option nationale",
        "concepts": ["vote stratégique", "démarchage ciblé"],
        "themes": ["campagne électorale", "stratégie électorale"],
    },
    "PQ17BF": {
        "display_label": "Incitations au vote stratégique émanant du Parti vert du Québec",
        "concepts": ["vote stratégique", "démarchage ciblé"],
        "themes": ["campagne électorale", "stratégie électorale"],
    },
    "PQ17BG": {
        "display_label": "Incitations au vote stratégique émanant d'un autre parti",
        "concepts": ["vote stratégique", "démarchage ciblé"],
        "themes": ["campagne électorale", "stratégie électorale"],
    },
    "PQ18A": {
        "display_label": "Action politique hors élection : contact avec un élu ou fonctionnaire",
        "concepts": ["action politique", "contact avec des élus"],
        "themes": ["participation politique", "engagement citoyen"],
    },
    "PQ18B": {
        "display_label": "Action politique hors élection : boycottage ou achat éthique",
        "concepts": ["consommation engagée", "boycottage"],
        "themes": ["participation politique", "engagement citoyen"],
    },
    "PQ18C": {
        "display_label": "Action politique hors élection : participation à une manifestation",
        "concepts": ["manifestation", "protestation politique"],
        "themes": ["participation politique", "engagement citoyen"],
    },
    "PQ18D": {
        "display_label": "Action politique hors élection : signature d'une pétition",
        "concepts": ["pétition", "engagement citoyen"],
        "themes": ["participation politique", "engagement citoyen"],
    },
    "PQ19": {
        "display_label": "Évaluation de la justice et équité du déroulement de l'élection 2012",
        "concepts": ["équité électorale", "intégrité du scrutin"],
        "themes": ["démocratie", "élections"],
    },
    "PQ20": {
        "display_label": "Perception de la représentativité du résultat électoral envers les électeurs",
        "concepts": ["représentativité électorale", "légitimité du résultat"],
        "themes": ["démocratie", "élections"],
    },
    "PQ24": {
        "display_label": "Perception du thème central de l'élection : enjeux vs personnes",
        "concepts": ["thématiques d'élection", "choix des personnes"],
        "themes": ["campagne électorale", "démocratie"],
    },
    "PQ25": {
        "display_label": "Enjeu perçu comme ayant été le plus important dans cette élection",
        "concepts": ["enjeu électoral principal", "priorités de la campagne"],
        "themes": ["politique provinciale", "élections"],
    },
    "PQ26B": {
        "display_label": "Opinion sur le gel des droits de scolarité universitaires",
        "concepts": ["droits de scolarité", "frais de scolarité", "hausse des frais"],
        "themes": ["éducation", "politique publique"],
    },
    "PQ26C": {
        "display_label": "Opinion sur le caractère inévitable de la corruption en politique",
        "concepts": ["corruption", "cynisme politique"],
        "themes": ["démocratie", "attitude politique"],
    },
    "PQ26D": {
        "display_label": "Opinion sur l'augmentation des dépenses en santé",
        "concepts": ["dépenses de santé", "financement des soins"],
        "themes": ["santé", "politique publique"],
    },
    "PSD1": {
        "display_label": "Appartenance syndicale dans le ménage",
        "concepts": ["syndicalisation", "syndicat"],
        "themes": ["démographie", "travail"],
    },
    "PSD2": {
        "display_label": "Nombre d'enfants de moins de 18 ans dans le ménage",
        "concepts": ["enfants au foyer", "taille de la famille"],
        "themes": ["démographie", "famille"],
    },
    "PSD3": {
        "display_label": "Catégorie socioprofessionnelle / type d'emploi",
        "concepts": ["occupation", "profession"],
        "themes": ["démographie", "travail"],
    },
    "Q1A": {
        "display_label": "Satisfaction quant au fonctionnement de la démocratie au Québec",
        "concepts": ["satisfaction démocratique", "démocratie québécoise"],
        "themes": ["démocratie", "institutions"],
    },
    "Q1B": {
        "display_label": "Satisfaction quant au fonctionnement de la démocratie au Canada",
        "concepts": ["satisfaction démocratique", "démocratie canadienne"],
        "themes": ["démocratie", "institutions"],
    },
    "PQ1A": {
        "display_label": "Satisfaction quant au fonctionnement de la démocratie au Québec (post-électoral)",
        "concepts": ["satisfaction démocratique", "démocratie québécoise"],
        "themes": ["démocratie", "institutions"],
    },
    "PQ1B": {
        "display_label": "Satisfaction quant au fonctionnement de la démocratie au Canada (post-électoral)",
        "concepts": ["satisfaction démocratique", "démocratie canadienne"],
        "themes": ["démocratie", "institutions"],
    },
}
