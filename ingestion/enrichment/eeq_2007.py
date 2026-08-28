"""Enrichment authoré — eeq_2007. Produit par subagent LLM (2026-08-28)."""

SURVEY = {
    "description": (
        "Étude électorale québécoise (EEQ) 2007 : sondage post-électoral mené "
        "auprès de la population québécoise après l'élection provinciale du "
        "26 mars 2007 (percée historique de l'ADQ de Mario Dumont, opposition "
        "officielle; gouvernement libéral minoritaire de Jean Charest réélu; "
        "PQ d'André Boisclair relégué au 3e rang)."
    ),
    "month": 4,  # post-électoral : élection le 26 mars 2007, terrain après le vote (mois exact non précisé au codebook)
}

QUESTIONS = {
    "nomx": {
        "display_label": "Région administrative du Québec du répondant",
        "concepts": ["région"],
        "themes": ["sociodémographie"],
    },
    "q1": {
        "display_label": "Enjeu personnel le plus important de l'élection provinciale de 2007",
        "concepts": ["enjeux électoraux", "priorités politiques"],
        "themes": ["élections"],
    },
    "q2": {
        "display_label": "Importance de la santé comme enjeu dans l'élection de 2007",
        "concepts": ["enjeux électoraux", "santé"],
        "themes": ["élections", "santé"],
    },
    "q3": {
        "display_label": "Importance de l'éducation comme enjeu dans l'élection de 2007",
        "concepts": ["enjeux électoraux", "éducation"],
        "themes": ["élections", "éducation"],
    },
    "q4": {
        "display_label": "Importance du chômage comme enjeu dans l'élection de 2007",
        "concepts": ["enjeux électoraux", "chômage", "économie"],
        "themes": ["élections", "économie"],
    },
    "q5": {
        "display_label": "Importance de l'environnement comme enjeu dans l'élection de 2007",
        "concepts": ["enjeux électoraux", "environnement"],
        "themes": ["élections", "environnement"],
    },
    "q6": {
        "display_label": "Importance du déséquilibre fiscal comme enjeu dans l'élection de 2007",
        "concepts": ["enjeux électoraux", "déséquilibre fiscal", "finances publiques"],
        "themes": ["élections", "économie"],
    },
    "q7": {
        "display_label": "Importance des baisses d'impôts comme enjeu dans l'élection de 2007",
        "concepts": ["enjeux électoraux", "baisses d'impôts", "fiscalité"],
        "themes": ["élections", "économie"],
    },
    "q8": {
        "display_label": "Importance du statut politique du Québec comme enjeu dans l'élection de 2007",
        "concepts": ["enjeux électoraux", "souveraineté", "statut politique du québec"],
        "themes": ["élections", "identité"],
    },
    "q9": {
        "display_label": "Importance de la pauvreté comme enjeu dans l'élection de 2007",
        "concepts": ["enjeux électoraux", "pauvreté"],
        "themes": ["élections", "économie"],
    },
    "q10": {
        "display_label": "Importance de l'aide aux familles comme enjeu dans l'élection de 2007",
        "concepts": ["enjeux électoraux", "aide aux familles"],
        "themes": ["élections", "famille"],
    },
    "q10b": {
        "display_label": "Importance des accommodements raisonnables comme enjeu dans l'élection de 2007",
        "concepts": ["enjeux électoraux", "accommodements raisonnables", "immigration"],
        "themes": ["élections", "identité"],
    },
    "q11": {
        "display_label": "A voté à l'élection provinciale de 2007",
        "concepts": ["vote", "participation électorale"],
        "themes": ["élections"],
    },
    "q12": {
        "display_label": "Parti pour lequel le répondant a voté à l'élection provinciale de 2007",
        "concepts": ["vote", "choix du parti"],
        "themes": ["élections"],
    },
    "q13": {
        "display_label": "Deuxième choix de parti à l'élection provinciale de 2007",
        "concepts": ["vote", "choix du parti"],
        "themes": ["élections"],
    },
    "q14": {
        "display_label": "Intérêt pour l'élection provinciale de 2007",
        "concepts": ["intérêt politique"],
        "themes": ["élections"],
    },
    "q15": {
        "display_label": "Intérêt pour la politique en général",
        "concepts": ["intérêt politique"],
        "themes": ["démocratie"],
    },
    "q16": {
        "display_label": "Principale source d'information sur la politique",
        "concepts": ["source d'information", "médias"],
        "themes": ["médias"],
    },
    "q17": {
        "display_label": "Deuxième source d'information sur la politique",
        "concepts": ["source d'information", "médias"],
        "themes": ["médias"],
    },
    "q18a": {
        "display_label": "Identification comme Québécois ou Canadien (ordre Québécois d'abord)",
        "concepts": ["identité nationale", "identité québécoise", "identité canadienne"],
        "themes": ["identité"],
    },
    "q18b": {
        "display_label": "Identification comme Canadien ou Québécois (ordre Canadien d'abord)",
        "concepts": ["identité nationale", "identité québécoise", "identité canadienne"],
        "themes": ["identité"],
    },
    "q19": {
        "display_label": "Vote hypothétique à un référendum reprenant la question de 1995 sur la souveraineté-partenariat",
        "concepts": ["souveraineté", "référendum", "intentions référendaires"],
        "themes": ["identité", "élections"],
    },
    "q20": {
        "display_label": "Tentation de vote à un référendum sur la souveraineté même sans choix arrêté",
        "concepts": ["souveraineté", "référendum", "intentions référendaires"],
        "themes": ["identité", "élections"],
    },
    "q21": {
        "display_label": "Accord : les gouvernements ne se soucient pas de ce que pensent les gens comme moi",
        "concepts": ["confiance envers le gouvernement", "efficacité politique interne"],
        "themes": ["démocratie"],
    },
    "q22": {
        "display_label": "Accord : les élus perdent vite contact avec les gens",
        "concepts": ["confiance envers le gouvernement", "représentation politique"],
        "themes": ["démocratie"],
    },
    "q23": {
        "display_label": "Confiance envers les gouvernements pour faire ce qui doit être fait",
        "concepts": ["confiance envers le gouvernement"],
        "themes": ["démocratie"],
    },
    "q24": {
        "display_label": "Perception du gaspillage des taxes par le gouvernement",
        "concepts": ["confiance envers le gouvernement", "gaspillage", "taxes"],
        "themes": ["démocratie", "économie"],
    },
    "q25": {
        "display_label": "Perception de la malhonnêteté des dirigeants gouvernementaux",
        "concepts": ["confiance envers le gouvernement", "corruption", "malhonnêteté"],
        "themes": ["démocratie"],
    },
    "q26": {
        "display_label": "Perception : gouvernements dirigés pour quelques intérêts ou pour le bénéfice de tous",
        "concepts": ["confiance envers le gouvernement", "intérêts particuliers"],
        "themes": ["démocratie"],
    },
    "q27": {
        "display_label": "Satisfaction envers le fonctionnement de la démocratie au Québec",
        "concepts": ["satisfaction démocratique"],
        "themes": ["démocratie"],
    },
    "q28": {
        "display_label": "Sentiment thermomètre (0-100) envers le Parti libéral du Québec",
        "concepts": ["thermomètre partisan", "parti libéral du québec"],
        "themes": ["élections", "partis politiques"],
    },
    "q29": {
        "display_label": "Sentiment thermomètre (0-100) envers le Parti québécois",
        "concepts": ["thermomètre partisan", "parti québécois"],
        "themes": ["élections", "partis politiques"],
    },
    "q30": {
        "display_label": "Sentiment thermomètre (0-100) envers l'Action démocratique du Québec (ADQ)",
        "concepts": ["thermomètre partisan", "action démocratique du québec"],
        "themes": ["élections", "partis politiques"],
    },
    "q31": {
        "display_label": "Sentiment thermomètre (0-100) envers Québec solidaire",
        "concepts": ["thermomètre partisan", "québec solidaire"],
        "themes": ["élections", "partis politiques"],
    },
    "q32": {
        "display_label": "Sentiment thermomètre (0-100) envers le Parti vert",
        "concepts": ["thermomètre partisan", "parti vert"],
        "themes": ["élections", "partis politiques"],
    },
    "q33": {
        "display_label": "Appui à des élections provinciales à dates fixes",
        "concepts": ["élections à date fixe", "réforme électorale"],
        "themes": ["démocratie"],
    },
    "q34": {
        "display_label": "Acceptabilité qu'un parti gagne une majorité de sièges sans majorité de votes",
        "concepts": ["réforme électorale", "mode de scrutin"],
        "themes": ["démocratie"],
    },
    "q35": {
        "display_label": "Appui à une réforme du mode de scrutin vers la représentation proportionnelle",
        "concepts": ["réforme électorale", "représentation proportionnelle", "mode de scrutin"],
        "themes": ["démocratie"],
    },
    "q35a": {
        "display_label": "Appui à l'engagement du PQ de tenir un référendum rapidement après son élection",
        "concepts": ["souveraineté", "référendum", "parti québécois"],
        "themes": ["identité", "élections"],
    },
    "q36": {
        "display_label": "Moyen le plus efficace pour changer les choses : parti politique ou groupe d'intérêts",
        "concepts": ["participation politique", "groupes d'intérêts", "partis politiques"],
        "themes": ["démocratie"],
    },
    "q37": {
        "display_label": "Accord : sans partis politiques, il ne peut y avoir de vraie démocratie",
        "concepts": ["partis politiques", "démocratie"],
        "themes": ["démocratie"],
    },
    "q38": {
        "display_label": "Accord : tous les partis politiques provinciaux sont essentiellement pareils",
        "concepts": ["partis politiques", "cynisme politique"],
        "themes": ["démocratie"],
    },
    "q39": {
        "display_label": "Sentiment thermomètre (0-100) envers Jean Charest",
        "concepts": ["thermomètre partisan", "jean charest", "chef de parti"],
        "themes": ["élections", "leadership politique"],
    },
    "q40": {
        "display_label": "Sentiment thermomètre (0-100) envers André Boisclair",
        "concepts": ["thermomètre partisan", "andré boisclair", "chef de parti"],
        "themes": ["élections", "leadership politique"],
    },
    "q41": {
        "display_label": "Sentiment thermomètre (0-100) envers Mario Dumont",
        "concepts": ["thermomètre partisan", "mario dumont", "chef de parti"],
        "themes": ["élections", "leadership politique"],
    },
    "q42": {
        "display_label": "Sentiment thermomètre (0-100) envers Françoise David",
        "concepts": ["thermomètre partisan", "françoise david", "chef de parti"],
        "themes": ["élections", "leadership politique"],
    },
    "q43": {
        "display_label": "Sentiment thermomètre (0-100) envers Scott McKay",
        "concepts": ["thermomètre partisan", "scott mckay", "chef de parti"],
        "themes": ["élections", "leadership politique"],
    },
    "q44": {
        "display_label": "Chef de parti perçu comme le plus compétent",
        "concepts": ["leadership politique", "compétence perçue", "chef de parti"],
        "themes": ["élections", "leadership politique"],
    },
    "q45": {
        "display_label": "Chef de parti perçu comme le plus honnête",
        "concepts": ["leadership politique", "honnêteté perçue", "chef de parti"],
        "themes": ["élections", "leadership politique"],
    },
    "q46": {
        "display_label": "Chef de parti perçu comme le plus proche des gens",
        "concepts": ["leadership politique", "proximité perçue", "chef de parti"],
        "themes": ["élections", "leadership politique"],
    },
    "q47": {
        "display_label": "Perception de l'évolution de l'économie québécoise depuis un an",
        "concepts": ["économie", "évaluation économique"],
        "themes": ["économie"],
    },
    "q48": {
        "display_label": "Identification comme fédéraliste ou souverainiste",
        "concepts": ["fédéralisme", "souveraineté", "identité politique"],
        "themes": ["identité"],
    },
    "q49": {
        "display_label": "Préférence sur le partage des pouvoirs entre gouvernements provincial et fédéral",
        "concepts": ["fédéralisme", "partage des pouvoirs", "relations fédérales-provinciales"],
        "themes": ["identité", "démocratie"],
    },
    "q50": {
        "display_label": "Accord avec la privatisation d'Hydro-Québec",
        "concepts": ["privatisation", "hydro-québec"],
        "themes": ["économie"],
    },
    "q51": {
        "display_label": "Accord : recourir davantage au secteur privé pour améliorer la santé",
        "concepts": ["privatisation", "santé", "secteur privé"],
        "themes": ["santé", "économie"],
    },
    "q52": {
        "display_label": "Accord : sans l'action du gouvernement, il y aurait plus de pauvreté",
        "concepts": ["rôle de l'état", "pauvreté"],
        "themes": ["économie", "démocratie"],
    },
    "q53": {
        "display_label": "Accord : sans l'action du gouvernement, l'environnement serait moins protégé",
        "concepts": ["rôle de l'état", "environnement"],
        "themes": ["environnement", "démocratie"],
    },
    "q54": {
        "display_label": "Accord : les profits des entreprises profitent à tout le monde, y compris les pauvres",
        "concepts": ["entreprises", "profits", "pauvreté"],
        "themes": ["économie"],
    },
    "q55": {
        "display_label": "Parti perçu comme le meilleur pour améliorer les soins de santé",
        "concepts": ["compétence perçue des partis", "santé"],
        "themes": ["élections", "santé"],
    },
    "q56": {
        "display_label": "Parti perçu comme le meilleur pour améliorer l'éducation",
        "concepts": ["compétence perçue des partis", "éducation"],
        "themes": ["élections", "éducation"],
    },
    "q57": {
        "display_label": "Parti perçu comme le meilleur pour faire baisser le chômage",
        "concepts": ["compétence perçue des partis", "chômage"],
        "themes": ["élections", "économie"],
    },
    "q58": {
        "display_label": "Parti perçu comme le meilleur pour protéger l'environnement",
        "concepts": ["compétence perçue des partis", "environnement"],
        "themes": ["élections", "environnement"],
    },
    "q59": {
        "display_label": "Parti perçu comme le meilleur pour lutter contre la pauvreté",
        "concepts": ["compétence perçue des partis", "pauvreté"],
        "themes": ["élections", "économie"],
    },
    "q60": {
        "display_label": "Parti perçu comme le meilleur pour aider les familles",
        "concepts": ["compétence perçue des partis", "aide aux familles"],
        "themes": ["élections", "famille"],
    },
    "q61a": {
        "display_label": "Parti perçu comme le meilleur pour défendre les intérêts du Québec",
        "concepts": ["compétence perçue des partis", "intérêts du québec"],
        "themes": ["élections", "identité"],
    },
    "q61b": {
        "display_label": "Parti perçu comme le meilleur pour défendre l'identité et la culture québécoise",
        "concepts": ["compétence perçue des partis", "identité québécoise", "culture"],
        "themes": ["élections", "identité"],
    },
    "q61c": {
        "display_label": "Parti perçu comme le meilleur pour défendre les intérêts de sa région",
        "concepts": ["compétence perçue des partis", "intérêts régionaux"],
        "themes": ["élections"],
    },
    "q61d": {
        "display_label": "Parti perçu comme le meilleur pour réduire la dette du Québec",
        "concepts": ["compétence perçue des partis", "dette publique"],
        "themes": ["élections", "économie"],
    },
    "q62": {
        "display_label": "Parti perçu comme le meilleur pour défendre les intérêts des citoyens ordinaires",
        "concepts": ["compétence perçue des partis", "citoyens ordinaires"],
        "themes": ["élections"],
    },
    "q64": {
        "display_label": "Sentiment thermomètre (0-100) envers les syndicats",
        "concepts": ["thermomètre", "syndicats"],
        "themes": ["économie"],
    },
    "q65": {
        "display_label": "Sentiment thermomètre (0-100) envers les entreprises",
        "concepts": ["thermomètre", "entreprises"],
        "themes": ["économie"],
    },
    "q66": {
        "display_label": "Position pour ou contre le mariage entre personnes de même sexe",
        "concepts": ["mariage gai", "droits lgbt", "valeurs sociales"],
        "themes": ["société", "identité"],
    },
    "q67": {
        "display_label": "Accord : la société se porterait mieux avec une pratique religieuse plus régulière",
        "concepts": ["religion", "valeurs sociales"],
        "themes": ["société", "religion"],
    },
    "q68": {
        "display_label": "Accord : moins de problèmes au Québec avec plus de valeurs familiales",
        "concepts": ["valeurs familiales", "valeurs sociales"],
        "themes": ["société", "famille"],
    },
    "q69": {
        "display_label": "Accord : le Québec est allé trop loin pour accommoder les minorités culturelles",
        "concepts": ["accommodements raisonnables", "minorités culturelles", "immigration"],
        "themes": ["société", "identité"],
    },
    "q70": {
        "display_label": "Identification partisane habituelle en politique provinciale",
        "concepts": ["identification partisane"],
        "themes": ["élections", "partis politiques"],
    },
    "q71": {
        "display_label": "Degré de proximité avec le parti d'identification",
        "concepts": ["identification partisane", "proximité partisane"],
        "themes": ["élections", "partis politiques"],
    },
    "q72": {
        "display_label": "Se sent un peu plus proche de l'un des partis provinciaux (sans identification forte)",
        "concepts": ["identification partisane", "proximité partisane"],
        "themes": ["élections", "partis politiques"],
    },
    "q73": {
        "display_label": "Parti provincial dont le répondant se sent un peu plus proche",
        "concepts": ["identification partisane", "proximité partisane"],
        "themes": ["élections", "partis politiques"],
    },
    "q74": {
        "display_label": "Vote à l'élection fédérale de janvier 2006",
        "concepts": ["vote", "élection fédérale"],
        "themes": ["élections"],
    },
    "q75": {
        "display_label": "Année de naissance du répondant",
        "concepts": ["âge"],
        "themes": ["sociodémographie"],
    },
    "q76": {
        "display_label": "Sexe du répondant",
        "concepts": ["sexe"],
        "themes": ["sociodémographie"],
    },
    "q77": {
        "display_label": "Niveau de scolarité du répondant",
        "concepts": ["scolarité"],
        "themes": ["sociodémographie"],
    },
    "q78": {
        "display_label": "Revenu total du ménage avant impôts en 2006",
        "concepts": ["revenu du ménage"],
        "themes": ["sociodémographie"],
    },
    "q79": {
        "display_label": "Statut d'emploi actuel du répondant",
        "concepts": ["statut d'emploi"],
        "themes": ["sociodémographie"],
    },
    "q81": {
        "display_label": "Fréquence de pratique religieuse (assistance aux offices)",
        "concepts": ["pratique religieuse", "religion"],
        "themes": ["sociodémographie", "religion"],
    },
    "q80": {
        "display_label": "Langue la plus souvent parlée à la maison",
        "concepts": ["langue parlée à la maison"],
        "themes": ["sociodémographie", "langue"],
    },
    "ethn1": {
        "display_label": "Origine ethnique du répondant",
        "concepts": ["origine ethnique"],
        "themes": ["sociodémographie"],
    },
    "langu": {
        "display_label": "Langue maternelle du répondant",
        "concepts": ["langue maternelle"],
        "themes": ["sociodémographie", "langue"],
    },
}
