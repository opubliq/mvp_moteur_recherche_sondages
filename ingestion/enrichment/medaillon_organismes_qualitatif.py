"""Enrichment authoré — medaillon_organismes_qualitatif (2026-07-23).

Champs « mous » figés et versionnés (cf. `docs/INGESTION_RUNBOOK.md`). L'enrichment
ne touche AUCUN champ verbatim (`question_text` reste le titre SurveyJS brut).

Les `display_label` restituent le contexte de la question parente pour les
sous-questions dont le titre brut est terse (« 1.1 Pourquoi ? »). La spécificité
ajoutée provient exclusivement du wording des questions parentes du questionnaire
(q1, q2, q5, q11, q17, q18_intro…) — jamais inventée. Les six colonnes `qX-Comment`
portent la précision libre « autre / précisez » d'une question à choix : le label
le signale explicitement.
"""

SURVEY = {
    "description": (
        "Questionnaire qualitatif rempli par 130 organismes communautaires de l'Est "
        "de l'Île de Montréal (terrain mai–juin 2026, mené par Médaillon pour le Comité "
        "des usagers du CIUSSS de l'Est-de-l'Île-de-Montréal). En réponses ouvertes, il "
        "documente la connaissance et la défense des droits des usagers du réseau de la "
        "santé et des services sociaux, les situations problématiques et obstacles "
        "rencontrés, l'orientation des plaintes, ainsi que la collaboration des "
        "organismes avec les Comités des usagers."
    ),
    "month": 5,
}

QUESTIONS = {
    "q1_1": {
        "display_label": "Raison de la demande de consultation des usagers à l'organisme",
        "concepts": ["demande de consultation", "besoins des usagers"],
        "themes": ["mission de l'organisme"],
    },
    "q2_1": {
        "display_label": "Raisons de référer des usagers à des services du CIUSSS (motifs 1)",
        "concepts": ["référence vers le CIUSSS", "parcours de services"],
        "themes": ["collaboration avec le CIUSSS"],
    },
    "q2_2": {
        "display_label": "Raisons de référer des usagers à des services du CIUSSS (motifs 2)",
        "concepts": ["référence vers le CIUSSS", "parcours de services"],
        "themes": ["collaboration avec le CIUSSS"],
    },
    "q4": {
        "display_label": "Suggestions pour améliorer la connaissance des droits des usagers",
        "concepts": ["connaissance des droits", "sensibilisation"],
        "themes": ["droits des usagers"],
    },
    "q5_1": {
        "display_label": "Raisons pour lesquelles les droits des usagers sont respectés",
        "concepts": ["respect des droits", "réseau de la santé"],
        "themes": ["droits des usagers"],
    },
    "q5_2": {
        "display_label": "Raisons pour lesquelles les droits des usagers ne sont pas respectés",
        "concepts": ["non-respect des droits", "réseau de la santé"],
        "themes": ["droits des usagers"],
    },
    "q5_3": {
        "display_label": "Suggestions pour mieux inclure la voix des usagers dans la défense de leurs droits",
        "concepts": ["participation des usagers", "défense des droits"],
        "themes": ["droits des usagers"],
    },
    "q6": {
        "display_label": "Situations problématiques les plus fréquentes rencontrées par l'organisme",
        "concepts": ["situations problématiques", "expérience terrain"],
        "themes": ["mission de l'organisme"],
    },
    "q7": {
        "display_label": "Groupes d'usagers les plus vulnérables selon l'organisme",
        "concepts": ["vulnérabilité", "groupes d'usagers"],
        "themes": ["droits des usagers"],
    },
    "q8": {
        "display_label": "Principaux obstacles à l'exercice des droits des usagers",
        "concepts": ["obstacles", "exercice des droits"],
        "themes": ["droits des usagers"],
    },
    "q9": {
        "display_label": "Droits des usagers les plus souvent compromis",
        "concepts": ["droits compromis", "accès aux services"],
        "themes": ["droits des usagers"],
    },
    "q10-Comment": {
        "display_label": "Contribution de l'organisme à la défense des droits des usagers (autre, précisez)",
        "concepts": ["défense des droits", "action de l'organisme"],
        "themes": ["mission de l'organisme"],
    },
    "q11_1": {
        "display_label": "Raisons de la facilité ou difficulté à manifester une insatisfaction ou porter plainte (motifs 1)",
        "concepts": ["plainte", "insatisfaction"],
        "themes": ["traitement des plaintes"],
    },
    "q11_2": {
        "display_label": "Raisons de la facilité ou difficulté à manifester une insatisfaction ou porter plainte (motifs 2)",
        "concepts": ["plainte", "insatisfaction"],
        "themes": ["traitement des plaintes"],
    },
    "q12-Comment": {
        "display_label": "Instance du réseau vers qui référer une plainte (autre, précisez)",
        "concepts": ["orientation des plaintes", "instances du réseau"],
        "themes": ["traitement des plaintes"],
    },
    "q13": {
        "display_label": "Commentaires sur la facilité de trouver la bonne instance pour une plainte",
        "concepts": ["orientation des plaintes", "accessibilité"],
        "themes": ["traitement des plaintes"],
    },
    "q16-Comment": {
        "display_label": "Connaissance préalable de l'existence des Comités des usagers (précision)",
        "concepts": ["notoriété", "Comité des usagers"],
        "themes": ["Comité des usagers"],
    },
    "q17_1": {
        "display_label": "Appréciation de l'expérience de recours à un Comité des usagers",
        "concepts": ["expérience", "recours"],
        "themes": ["Comité des usagers"],
    },
    "q18_1": {
        "display_label": "Suggestions — renseigner les usagers sur leurs droits et obligations",
        "concepts": ["information des usagers", "mandat légal"],
        "themes": ["Comité des usagers"],
    },
    "q18_2": {
        "display_label": "Suggestions — promouvoir l'amélioration de leurs conditions de vie",
        "concepts": ["conditions de vie", "mandat légal"],
        "themes": ["Comité des usagers"],
    },
    "q18_3": {
        "display_label": "Suggestions — évaluer leur degré de satisfaction envers les services",
        "concepts": ["satisfaction", "mandat légal"],
        "themes": ["Comité des usagers"],
    },
    "q18_4": {
        "display_label": "Suggestions — défendre leurs droits et intérêts collectifs",
        "concepts": ["défense collective", "mandat légal"],
        "themes": ["Comité des usagers"],
    },
    "q18_5": {
        "display_label": "Suggestions — défendre les droits et intérêts d'une personne à sa demande",
        "concepts": ["défense individuelle", "mandat légal"],
        "themes": ["Comité des usagers"],
    },
    "q18_6": {
        "display_label": "Suggestions — accompagner un usager dans ses démarches, y compris une plainte",
        "concepts": ["accompagnement", "mandat légal"],
        "themes": ["Comité des usagers"],
    },
    "q19": {
        "display_label": "Suggestions pour que l'organisme collabore davantage avec le Comité des usagers",
        "concepts": ["collaboration", "Comité des usagers"],
        "themes": ["Comité des usagers"],
    },
    "q20": {
        "display_label": "Commentaire ou recommandation additionnels",
        "concepts": ["commentaire libre", "recommandation"],
        "themes": ["mission de l'organisme"],
    },
    "q21-Comment": {
        "display_label": "Secteur d'activité de l'organisme dans l'Est de Montréal (autre, précisez)",
        "concepts": ["secteur d'activité", "profil de l'organisme"],
        "themes": ["profil de l'organisme"],
    },
    "q23-Comment": {
        "display_label": "Clientèle principalement desservie par l'organisme (autre, précisez)",
        "concepts": ["clientèle", "profil de l'organisme"],
        "themes": ["profil de l'organisme"],
    },
    "q24-Comment": {
        "display_label": "Thématique de la mission de l'organisme (autre, précisez)",
        "concepts": ["thématique", "profil de l'organisme"],
        "themes": ["profil de l'organisme"],
    },
}
