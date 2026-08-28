"""Enrichment authoré — eeq_2008. Produit par subagent LLM (2026-08-28)."""

SURVEY = {
    "description": (
        "Étude électorale québécoise (EEQ) 2008 : sondage post-électoral mené "
        "auprès de la population québécoise après l'élection générale provinciale "
        "du 8 décembre 2008 (Jean Charest / PLQ réélu majoritaire, Pauline Marois / "
        "PQ opposition officielle, Mario Dumont / ADQ, Françoise David / QS, "
        "Guy Rainville / PVQ)."
    ),
    "month": 12,  # post-électoral : élection générale le 8 décembre 2008, terrain en décembre
}

QUESTIONS = {
    "q0age": {
        "display_label": "Tranche d'âge du répondant",
        "concepts": ["âge"],
        "themes": ["sociodémographie"],
    },
    "q1": {
        "display_label": "Enjeu personnel le plus important lors de l'élection provinciale de 2008",
        "concepts": ["enjeux électoraux", "priorités politiques"],
        "themes": ["élections"],
    },
    "q11": {
        "display_label": "Participation au vote lors de l'élection provinciale de 2008",
        "concepts": ["vote", "participation électorale"],
        "themes": ["élections"],
    },
    "q12a": {
        "display_label": "Parti pour lequel le répondant a voté à l'élection provinciale de 2008",
        "concepts": ["vote", "choix du parti"],
        "themes": ["élections"],
    },
    "q12b": {
        "display_label": "Parti que les abstentionnistes auraient été tentés d'appuyer à l'élection de 2008",
        "concepts": ["vote", "choix du parti", "sympathie partisane"],
        "themes": ["élections"],
    },
    "q13": {
        "display_label": "Parti pour lequel le répondant a voté lors de l'élection provinciale de 2007",
        "concepts": ["vote", "choix du parti", "antécédents électoraux"],
        "themes": ["élections"],
    },
    "q14": {
        "display_label": "Niveau d'intérêt pour l'élection provinciale de 2008 (échelle 0-10)",
        "concepts": ["intérêt politique"],
        "themes": ["élections"],
    },
    "q18a": {
        "display_label": "Identification comme Québécois ou Canadien (ordre de réponse : Québécois d'abord)",
        "concepts": ["identité nationale", "identité québécoise", "identité canadienne"],
        "themes": ["identité"],
    },
    "q18b": {
        "display_label": "Identification comme Canadien ou Québécois (ordre de réponse : Canadien d'abord)",
        "concepts": ["identité nationale", "identité québécoise", "identité canadienne"],
        "themes": ["identité"],
    },
    "q19": {
        "display_label": "Vote à un référendum hypothétique sur la souveraineté-partenariat (question de 1995)",
        "concepts": ["souveraineté", "référendum", "intentions référendaires"],
        "themes": ["identité", "élections"],
    },
    "q20": {
        "display_label": "Tentation de vote à un référendum sur la souveraineté (répondants indécis)",
        "concepts": ["souveraineté", "référendum", "intentions référendaires"],
        "themes": ["identité", "élections"],
    },
    "q21": {
        "display_label": "Accord : les gouvernements ne se soucient pas beaucoup de ce que pensent les gens ordinaires",
        "concepts": ["confiance envers le gouvernement", "efficacité politique interne"],
        "themes": ["démocratie"],
    },
    "q22": {
        "display_label": "Accord : les élus au Parlement perdent vite contact avec les gens",
        "concepts": ["confiance envers le gouvernement", "représentation politique"],
        "themes": ["démocratie"],
    },
    "q23": {
        "display_label": "Niveau de confiance envers les gouvernements pour faire ce qui doit être fait",
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
        "display_label": "Perception : gouvernement dirigé pour quelques intérêts particuliers ou pour le bénéfice de tous",
        "concepts": ["confiance envers le gouvernement", "intérêts particuliers"],
        "themes": ["démocratie"],
    },
    "q27": {
        "display_label": "Satisfaction envers le fonctionnement de la démocratie au Québec",
        "concepts": ["satisfaction démocratique"],
        "themes": ["démocratie"],
    },
    "q33": {
        "display_label": "Évaluation de l'opportunité de tenir une élection provinciale à l'automne 2008",
        "concepts": ["élections", "déclenchement électoral"],
        "themes": ["élections", "démocratie"],
    },
    "q39": {
        "display_label": "Appréciation (thermomètre 0-100) envers Jean Charest",
        "concepts": ["thermomètre partisan", "jean charest", "chef de parti"],
        "themes": ["élections", "leadership politique"],
    },
    "q40": {
        "display_label": "Appréciation (thermomètre 0-100) envers Pauline Marois",
        "concepts": ["thermomètre partisan", "pauline marois", "chef de parti"],
        "themes": ["élections", "leadership politique"],
    },
    "q41": {
        "display_label": "Appréciation (thermomètre 0-100) envers Mario Dumont",
        "concepts": ["thermomètre partisan", "mario dumont", "chef de parti"],
        "themes": ["élections", "leadership politique"],
    },
    "q42": {
        "display_label": "Appréciation (thermomètre 0-100) envers Françoise David",
        "concepts": ["thermomètre partisan", "françoise david", "chef de parti"],
        "themes": ["élections", "leadership politique"],
    },
    "q43": {
        "display_label": "Appréciation (thermomètre 0-100) envers Guy Rainville",
        "concepts": ["thermomètre partisan", "guy rainville", "chef de parti"],
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
        "display_label": "Évaluation de la situation de l'économie québécoise depuis un an",
        "concepts": ["économie", "évaluation économique"],
        "themes": ["économie"],
    },
    "q48": {
        "display_label": "Positionnement politique entre fédéraliste et souverainiste",
        "concepts": ["fédéralisme", "souveraineté", "identité politique"],
        "themes": ["identité"],
    },
    "q49": {
        "display_label": "Préférence quant à la répartition des pouvoirs entre Québec et le fédéral",
        "concepts": ["fédéralisme", "partage des pouvoirs", "relations fédérales-provinciales"],
        "themes": ["identité", "démocratie"],
    },
    "q50": {
        "display_label": "Accord avec la privatisation d'Hydro-Québec",
        "concepts": ["privatisation", "hydro-québec"],
        "themes": ["économie"],
    },
    "q51": {
        "display_label": "Accord avec le recours au secteur privé pour améliorer le système de santé",
        "concepts": ["privatisation", "santé", "secteur privé"],
        "themes": ["santé", "économie"],
    },
    "q52": {
        "display_label": "Accord : sans l'action du gouvernement, il y aurait beaucoup plus de pauvreté",
        "concepts": ["rôle de l'état", "pauvreté"],
        "themes": ["économie", "démocratie"],
    },
    "q53": {
        "display_label": "Accord : sans l'action du gouvernement, l'environnement serait moins bien protégé",
        "concepts": ["rôle de l'état", "environnement"],
        "themes": ["environnement", "démocratie"],
    },
    "q55": {
        "display_label": "Parti politique perçu comme le meilleur pour améliorer les soins de santé",
        "concepts": ["compétence perçue des partis", "santé"],
        "themes": ["élections", "santé"],
    },
    "q57": {
        "display_label": "Parti politique perçu comme le meilleur pour s'occuper de la crise économique",
        "concepts": ["compétence perçue des partis", "économie", "crise économique"],
        "themes": ["élections", "économie"],
    },
    "q61b": {
        "display_label": "Parti politique perçu comme le meilleur pour défendre l'identité et la culture québécoise",
        "concepts": ["compétence perçue des partis", "identité québécoise", "culture"],
        "themes": ["élections", "identité"],
    },
    "q61d": {
        "display_label": "Parti politique perçu comme le meilleur pour gérer la Caisse de dépôt et de placement",
        "concepts": ["compétence perçue des partis", "caisse de dépôt", "économie"],
        "themes": ["élections", "économie"],
    },
    "q64": {
        "display_label": "Appréciation générale des syndicats (échelle 0-100)",
        "concepts": ["thermomètre", "syndicats"],
        "themes": ["économie"],
    },
    "q65": {
        "display_label": "Appréciation générale des entreprises (échelle 0-100)",
        "concepts": ["thermomètre", "entreprises"],
        "themes": ["économie"],
    },
    "q66": {
        "display_label": "Position pour ou contre le mariage entre personnes de même sexe",
        "concepts": ["mariage gai", "droits lgbt", "valeurs sociales"],
        "themes": ["société", "identité"],
    },
    "q67": {
        "display_label": "Accord : la société se porterait mieux si les gens pratiquaient leur religion plus régulièrement",
        "concepts": ["religion", "valeurs sociales"],
        "themes": ["société", "religion"],
    },
    "q68": {
        "display_label": "Accord : il y aurait moins de problèmes au Québec si on accordait plus d'importance aux valeurs familiales",
        "concepts": ["valeurs familiales", "valeurs sociales"],
        "themes": ["société", "famille"],
    },
    "q69": {
        "display_label": "Accord : il est préférable d'avoir des gouvernements majoritaires plutôt que minoritaires",
        "concepts": ["gouvernement majoritaire", "mode de gouvernement", "démocratie"],
        "themes": ["démocratie"],
    },
    "q70": {
        "display_label": "Identification partisane habituelle en politique provinciale",
        "concepts": ["identification partisane"],
        "themes": ["élections", "partis politiques"],
    },
    "q71": {
        "display_label": "Degré de proximité avec le parti d'identification habituelle",
        "concepts": ["identification partisane", "proximité partisane"],
        "themes": ["élections", "partis politiques"],
    },
    "q72": {
        "display_label": "Sentiment d'être un peu plus proche de l'un des partis provinciaux",
        "concepts": ["identification partisane", "proximité partisane"],
        "themes": ["élections", "partis politiques"],
    },
    "q73": {
        "display_label": "Parti provincial dont le répondant se sent un peu plus proche",
        "concepts": ["identification partisane", "proximité partisane"],
        "themes": ["élections", "partis politiques"],
    },
    "q74": {
        "display_label": "Vote à l'élection fédérale d'octobre 2008",
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
        "display_label": "Revenu total du ménage avant impôts en 2007",
        "concepts": ["revenu du ménage"],
        "themes": ["sociodémographie"],
    },
    "q79": {
        "display_label": "Statut d'emploi actuel du répondant",
        "concepts": ["statut d'emploi"],
        "themes": ["sociodémographie"],
    },
    "q81": {
        "display_label": "Fréquence d'assistance aux services religieux (messes)",
        "concepts": ["pratique religieuse", "religion"],
        "themes": ["sociodémographie", "religion"],
    },
    "q80": {
        "display_label": "Langue parlée le plus souvent à la maison",
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
    "reg": {
        "display_label": "Région de résidence du répondant (5 grandes régions)",
        "concepts": ["région"],
        "themes": ["sociodémographie"],
    },
}
