"""Enrichment authoré — govcan_06822_wave1_2024. Produit par subagent LLM (2026-07-07)."""

SURVEY = {
    "description": "Continuous Survey of Canadians (Wave 1) conducted by the Government of Canada, covering public opinion on COVID-19, climate change, immigration, trust in institutions, and misinformation. Fieldwork conducted in November and December 2022.",
    "month": 12,
}

QUESTIONS = {
    "VACCINE_COVID": {
        "display_label": "COVID-19 vaccination status",
        "concepts": ["covid-19", "vaccination"],
        "themes": ["santé"],
    },
    "MIS_F_COV_1": {
        "display_label": "Belief: COVID-19 test swabs have been shown to cause cancer",
        "concepts": ["covid-19", "désinformation", "santé"],
        "themes": ["santé", "société"],
    },
    "MIS_F_COV_3": {
        "display_label": "Belief: There is little to no evidence that masks help reduce the spread of COVID-19",
        "concepts": ["covid-19", "désinformation", "masques"],
        "themes": ["santé", "société"],
    },
    "MIS_T_COV_4": {
        "display_label": "Belief: Both vaccinated and unvaccinated individuals can transmit COVID-19 to others",
        "concepts": ["covid-19", "vaccination", "transmission"],
        "themes": ["santé"],
    },
    "WORRIED_COVID_ECON": {
        "display_label": "Concern about COVID-19 impact on Canada's economic growth",
        "concepts": ["covid-19", "économie"],
        "themes": ["santé", "économie"],
    },
    "POLICY_COVIDA": {
        "display_label": "Support for mandatory face masks in public indoor settings",
        "concepts": ["covid-19", "masques", "politique-publique"],
        "themes": ["santé", "démocratie"],
    },
    "TRUST_GOC_COVID": {
        "display_label": "Trust in the Government of Canada to make decisions about COVID-19",
        "concepts": ["confiance", "gouvernement-fédéral", "covid-19"],
        "themes": ["santé", "démocratie"],
    },
    "MIS_F_CLI_1": {
        "display_label": "Belief: Climate change is a conspiracy created by governments around the world",
        "concepts": ["climat", "désinformation", "conspirationnisme"],
        "themes": ["environnement", "société"],
    },
    "MIS_F_CLI_5": {
        "display_label": "Belief: Canada's national carbon price has tripled the cost of gasoline at the pump since 2019",
        "concepts": ["climat", "prix-carbone", "désinformation", "économie"],
        "themes": ["environnement", "économie"],
    },
    "MIS_T_CLI_4": {
        "display_label": "Belief: The Arctic is warming at a rate almost twice the global average",
        "concepts": ["climat", "arctique"],
        "themes": ["environnement"],
    },
    "POLICY_CLIM_CARBONPRICE": {
        "display_label": "Support for setting a national price on carbon",
        "concepts": ["climat", "prix-carbone", "politique-publique"],
        "themes": ["environnement", "économie"],
    },
    "TRUST_GOC_CLIM": {
        "display_label": "Trust in the Government of Canada to make decisions about climate change",
        "concepts": ["confiance", "gouvernement-fédéral", "climat"],
        "themes": ["environnement", "démocratie"],
    },
    "MIS_F_IMM_1": {
        "display_label": "Belief: Most of Canada's immigrants come from the Middle East and North Africa",
        "concepts": ["immigration", "désinformation"],
        "themes": ["immigration", "société"],
    },
    "MIS_F_IMM_4": {
        "display_label": "Belief: Refugees in Canada receive more money from the government than the average pensioner",
        "concepts": ["immigration", "réfugiés", "désinformation", "économie"],
        "themes": ["immigration", "économie"],
    },
    "MIS_F_IMM_5": {
        "display_label": "Belief: Across Canadian cities, more immigration is associated with higher crime rates",
        "concepts": ["immigration", "criminalité", "désinformation"],
        "themes": ["immigration", "société"],
    },
    "MIS_T_IMM_1": {
        "display_label": "Belief: Immigration makes up almost all of Canada's population growth",
        "concepts": ["immigration", "démographie"],
        "themes": ["immigration", "société"],
    },
    "ATT_IMM_BETTERPLACE": {
        "display_label": "Perceived impact of immigration on Canada as a place to live",
        "concepts": ["immigration", "identité"],
        "themes": ["immigration", "société"],
    },
    "POLICY_IMM_NEWIMM": {
        "display_label": "Support for admitting 465,000 new immigrants to Canada each year",
        "concepts": ["immigration", "politique-publique", "seuils-immigration"],
        "themes": ["immigration", "démocratie"],
    },
    "TRUST_GOC_IMM": {
        "display_label": "Trust in the Government of Canada to make decisions about immigration",
        "concepts": ["confiance", "gouvernement-fédéral", "immigration"],
        "themes": ["immigration", "démocratie"],
    },
    "TRUST_GOV_CAN": {
        "display_label": "Overall trust in the Government of Canada",
        "concepts": ["confiance", "gouvernement-fédéral"],
        "themes": ["démocratie"],
    },
    "TRUST_FACET_GC_COMPETENT": {
        "display_label": "Perceived competence of the federal government",
        "concepts": ["confiance", "gouvernement-fédéral", "compétence"],
        "themes": ["démocratie"],
    },
    "TRUST_FACET_GC_CARE": {
        "display_label": "Perception that the federal government listens to ordinary people",
        "concepts": ["confiance", "gouvernement-fédéral", "écoute"],
        "themes": ["démocratie"],
    },
    "TRUST_FACET_GC_INTEGRITY": {
        "display_label": "Perception of industry influence on the federal government",
        "concepts": ["confiance", "gouvernement-fédéral", "intégrité", "lobbying"],
        "themes": ["démocratie"],
    },
    "SOC_TRUST_GEN": {
        "display_label": "General trust in other people in Canada",
        "concepts": ["confiance", "cohésion-sociale"],
        "themes": ["société"],
    },
    "INFO_USE_SOCMED": {
        "display_label": "Frequency of using social media platforms for information",
        "concepts": ["médias-sociaux", "information"],
        "themes": ["technologie", "médias"],
    },
    "POLICY_SOCMED_REGULATE": {
        "display_label": "Support for increased government regulation of social media platforms",
        "concepts": ["médias-sociaux", "régulation", "politique-publique"],
        "themes": ["technologie", "démocratie"],
    },
    "DEMCAN_INFLUENCE": {
        "display_label": "Perceived influence on the Canadian political system",
        "concepts": ["démocratie", "influence-politique", "aliénation"],
        "themes": ["démocratie"],
    },
    "DEMCAN_ACCEPTELEC": {
        "display_label": "Acceptance of election outcomes regardless of the winner",
        "concepts": ["démocratie", "élections", "légitimité"],
        "themes": ["démocratie"],
    },
    "DEMCAN_JUSTSYS": {
        "display_label": "Perception of equality in the Canadian justice system",
        "concepts": ["justice", "égalité"],
        "themes": ["démocratie", "société"],
    },
    "GOV_SURP": {
        "display_label": "Preference for government budget surplus use: tax reduction vs spending increase",
        "concepts": ["politique-budgétaire", "impôts", "services-publics"],
        "themes": ["économie", "démocratie"],
    },
    "LIFE_SATISFACTION": {
        "display_label": "General life satisfaction",
        "concepts": ["bien-être"],
        "themes": ["société"],
    },
    "FAKE_NEWS": {
        "display_label": "Concern about the spread of misinformation and disinformation online",
        "concepts": ["désinformation", "internet"],
        "themes": ["médias", "technologie", "société"],
    },
    "CON_MENT_A": {
        "display_label": "Belief that secret plots control much of our lives",
        "concepts": ["conspirationnisme", "désinformation"],
        "themes": ["société"],
    },
    "AOTE_B": {
        "display_label": "Importance of feelings vs evidence in determining truth",
        "concepts": ["vérité", "intuition", "science"],
        "themes": ["société", "science"],
    },
    "PSY_DIST_C": {
        "display_label": "Reliability of scientific knowledge for solving important issues",
        "concepts": ["science", "confiance"],
        "themes": ["science", "société"],
    },
    "MIS_T_CLI_3": {
        "display_label": "Belief: Over half of Canada's electricity comes from renewable sources",
        "concepts": ["climat", "énergie-renouvelable"],
        "themes": ["environnement", "économie"],
    },
    "MIS_T_IMM_5": {
        "display_label": "Belief: Refugees must pass security and criminal checks before receiving status",
        "concepts": ["immigration", "réfugiés", "sécurité"],
        "themes": ["immigration", "société"],
    },
    "WORRIED_IMM_ECON": {
        "display_label": "Concern about immigration impact on Canada's economic growth",
        "concepts": ["immigration", "économie"],
        "themes": ["immigration", "économie"],
    },
    "TRUST_GOV_PROVTERR": {
        "display_label": "Trust in provincial or territorial government",
        "concepts": ["confiance", "gouvernement-provincial"],
        "themes": ["démocratie"],
    },
    "SOCCOH_TRUST": {
        "display_label": "Trust in other Canadians to act in the country's best interests",
        "concepts": ["confiance", "cohésion-sociale", "patriotisme"],
        "themes": ["société"],
    },
}
