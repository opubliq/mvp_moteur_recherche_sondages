"""Enrichment authoré — govcan_habit_2024. Produit par subagent LLM (2026-07-07)."""

SURVEY = {
    "description": "The Health and Adaptive Behavioural Insight Survey (HABIT) Phase II, conducted by Health Canada and the Public Health Agency of Canada (PHAC), examines Canadians' health behaviours, mental health, vaccination attitudes, antibiotic use, and perceptions of climate change impacts.",
    "month": 3,
}

QUESTIONS = {
    "HEALTH_STATUS": {
        "display_label": "Self-rated physical health status",
        "concepts": ["physical_health", "self_assessment"],
        "themes": ["health"],
    },
    "HEALTH_MENTAL_STATUS": {
        "display_label": "Self-rated mental health status",
        "concepts": ["mental_health", "self_assessment"],
        "themes": ["mental_health"],
    },
    "DIET2": {
        "display_label": "Overall healthiness of diet",
        "concepts": ["nutrition", "lifestyle"],
        "themes": ["lifestyle"],
    },
    "PA_DAYS": {
        "display_label": "Frequency of moderate-to-vigorous physical activity (days per week)",
        "concepts": ["exercise", "physical_activity"],
        "themes": ["lifestyle"],
    },
    "PA_MINUTES": {
        "display_label": "Average duration of physical activity per session",
        "concepts": ["exercise", "physical_activity"],
        "themes": ["lifestyle"],
    },
    "SLEEP_HOURS": {
        "display_label": "Average hours of sleep per night",
        "concepts": ["sleep"],
        "themes": ["lifestyle"],
    },
    "SLEEP_QUALITY": {
        "display_label": "Overall quality of sleep",
        "concepts": ["sleep"],
        "themes": ["lifestyle"],
    },
    "SCREEN_TIME": {
        "display_label": "Daily average screen time",
        "concepts": ["lifestyle", "sedentary_behavior"],
        "themes": ["lifestyle"],
    },
    "LIFE_SATISFACTION": {
        "display_label": "Overall life satisfaction",
        "concepts": ["wellbeing", "happiness"],
        "themes": ["mental_health"],
    },
    "VAX_BELIEF_RISKS": {
        "display_label": "Belief: Risks of vaccination outweigh benefits",
        "concepts": ["vaccination", "risk_perception", "beliefs"],
        "themes": ["health"],
    },
    "VAX_BELIEF_LIFESTYLE": {
        "display_label": "Belief: Healthy lifestyle can replace vaccination",
        "concepts": ["vaccination", "alternative_medicine", "beliefs"],
        "themes": ["health"],
    },
    "VAX_BELIEF_MANDATORY": {
        "display_label": "Belief: Vaccination should not be mandatory",
        "concepts": ["vaccination", "public_policy", "freedom"],
        "themes": ["society"],
    },
    "VAX_BELIEF_IMMUN": {
        "display_label": "Belief: Natural immunity is better for adults",
        "concepts": ["vaccination", "immunity", "beliefs"],
        "themes": ["health"],
    },
    "ANTIBIOTIC_TF_FLU": {
        "display_label": "Knowledge: Effectiveness of antibiotics against colds and flu",
        "concepts": ["antibiotics", "medical_knowledge"],
        "themes": ["health"],
    },
    "ANTIBIOTIC_TF_VIRUS": {
        "display_label": "Knowledge: Effectiveness of antibiotics against viruses",
        "concepts": ["antibiotics", "medical_knowledge"],
        "themes": ["health"],
    },
    "ANTIBIOTIC_OVERUSE": {
        "display_label": "Perception of antibiotic overuse in Canada",
        "concepts": ["antibiotics", "public_health"],
        "themes": ["health"],
    },
    "ANTIBIOTIC__WORRY": {
        "display_label": "Concern about antibiotic resistance",
        "concepts": ["antibiotics", "risk_perception"],
        "themes": ["health"],
    },
    "MH_STRUGGLE_SELFC3": {
        "display_label": "Mental health struggle in the past 12 months",
        "concepts": ["mental_health", "self_assessment"],
        "themes": ["mental_health"],
    },
    "HELPSEEK_STIGMA_SHAME": {
        "display_label": "Stigma: Burden of shame associated with mental illness",
        "concepts": ["mental_health", "stigma"],
        "themes": ["mental_health"],
    },
    "SERVICE_MH_BARRIERS": {
        "display_label": "Presence of barriers to accessing mental health services",
        "concepts": ["mental_health", "healthcare_access"],
        "themes": ["mental_health", "health"],
    },
    "POLICY_CRISIS": {
        "display_label": "Belief: The Canadian health care system is in crisis",
        "concepts": ["healthcare_system", "public_opinion"],
        "themes": ["society"],
    },
    "AFFORDABILITY_HEALTH": {
        "display_label": "Impact of health care costs on finances",
        "concepts": ["affordability", "healthcare_costs"],
        "themes": ["economy", "health"],
    },
    "FOOD_SECURITYC3": {
        "display_label": "Household ran out of food due to lack of money",
        "concepts": ["food_security", "poverty"],
        "themes": ["economy", "society"],
    },
    "BELIEF_REAL": {
        "display_label": "Belief: Climate change is real",
        "concepts": ["climate_change", "beliefs"],
        "themes": ["environment"],
    },
    "CLIMATE_HEALTH_ANXIETY": {
        "display_label": "Anxiety about climate change impacts on health",
        "concepts": ["climate_change", "mental_health", "eco_anxiety"],
        "themes": ["environment", "mental_health"],
    },
    "HEAT_SELF_EFFICACY": {
        "display_label": "Self-efficacy in preparing for extreme heat events",
        "concepts": ["climate_change", "adaptation", "self_efficacy"],
        "themes": ["environment", "health"],
    },
    "TRUST_GOOD_PHAC": {
        "display_label": "Trust in the Public Health Agency of Canada",
        "concepts": ["trust", "government_agencies", "public_health"],
        "themes": ["society"],
    },
    "TRUST_GOOD_GOC": {
        "display_label": "Trust in the Government of Canada",
        "concepts": ["trust", "government"],
        "themes": ["society"],
    },
    "AGE": {
        "display_label": "Year of birth",
        "concepts": ["age", "sociodemographics"],
        "themes": ["demographics"],
    },
    "GENDER": {
        "display_label": "Gender identity",
        "concepts": ["gender", "sociodemographics"],
        "themes": ["demographics"],
    },
    "REGION": {
        "display_label": "Province or territory of residence",
        "concepts": ["region", "geography"],
        "themes": ["demographics"],
    },
    "EMPLOYMENT": {
        "display_label": "Employment status",
        "concepts": ["employment", "sociodemographics"],
        "themes": ["demographics"],
    },
    "EDUCATION": {
        "display_label": "Highest level of education completed",
        "concepts": ["education", "sociodemographics"],
        "themes": ["demographics"],
    },
    "HOUSEHOLD_INCOME": {
        "display_label": "Total household income",
        "concepts": ["income", "socioeconomic_status"],
        "themes": ["demographics"],
    },
    "PRIMARY_CARE": {
        "display_label": "Access to a primary care provider",
        "concepts": ["healthcare_access", "primary_care"],
        "themes": ["health"],
    },
    "PHAC_AWARE": {
        "display_label": "Familiarity with the role of PHAC",
        "concepts": ["public_health", "government_agencies", "awareness"],
        "themes": ["society"],
    },
    "HC_AWARE": {
        "display_label": "Familiarity with the role of Health Canada",
        "concepts": ["public_health", "government_agencies", "awareness"],
        "themes": ["society"],
    },
    "ANTIBIOTIC_PRESCRIBE_USE": {
        "display_label": "Frequency of prescribed oral antibiotic use (past 12 months)",
        "concepts": ["antibiotics", "medical_treatment"],
        "themes": ["health"],
    },
    "MH_HELPFUL_ACTIVITYC5": {
        "display_label": "Effect of sleep on mental health maintenance",
        "concepts": ["mental_health", "sleep", "self_care"],
        "themes": ["mental_health"],
    },
    "MH_HELPFUL_ACTIVITYC1": {
        "display_label": "Effect of physical exercise on mental health maintenance",
        "concepts": ["mental_health", "exercise", "self_care"],
        "themes": ["mental_health"],
    },
    "EXWEATHERC5": {
        "display_label": "Experience with wildfires or wildfire smoke (past 12 months)",
        "concepts": ["climate_change", "wildfires", "environment"],
        "themes": ["environment"],
    },
    "EXWEATHERC2": {
        "display_label": "Experience with periods of excessive heat (past 12 months)",
        "concepts": ["climate_change", "extreme_heat", "environment"],
        "themes": ["environment"],
    },
    "MH_SUSPECTED_SELFC3": {
        "display_label": "Thought of having a mental health issue (past 12 months)",
        "concepts": ["mental_health", "self_assessment"],
        "themes": ["mental_health"],
    },
    "MH_FORMAL_DIAGNOSISC3": {
        "display_label": "Formal mental health diagnosis (past 12 months)",
        "concepts": ["mental_health", "diagnosis"],
        "themes": ["mental_health"],
    },
    "MENTAL_SELF_CONDITION_TREATMENTC3": {
        "display_label": "Treatment for mental health condition (past 12 months)",
        "concepts": ["mental_health", "medical_treatment"],
        "themes": ["mental_health"],
    },
    "POLICY_RANKC1": {
        "display_label": "Priority: Increasing access to mental health services",
        "concepts": ["mental_health", "public_policy", "healthcare_priorities"],
        "themes": ["society", "mental_health"],
    },
    "POLICY_RANKC2": {
        "display_label": "Priority: Reducing surgical and/or specialist wait times",
        "concepts": ["healthcare_access", "public_policy", "healthcare_priorities"],
        "themes": ["society", "health"],
    },
    "POLICY_RANKC4": {
        "display_label": "Priority: Increasing access to primary care providers",
        "concepts": ["healthcare_access", "primary_care", "public_policy"],
        "themes": ["society", "health"],
    },
    "HEALTH_MEASURES_RECENT_1": {
        "display_label": "Frequency of wearing a mask when sick (since September 2023)",
        "concepts": ["health_measures", "preventive_behavior", "respiratory_illness"],
        "themes": ["health"],
    },
    "HEALTH_MEASURES_RECENT_3": {
        "display_label": "Frequency of staying home when sick (since September 2023)",
        "concepts": ["health_measures", "preventive_behavior", "respiratory_illness"],
        "themes": ["health"],
    },
}
