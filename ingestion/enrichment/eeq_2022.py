"""Enrichment authoré — eeq_2022. Produit par subagent LLM (2026-08-28)."""

SURVEY = {
    "description": "2022 Quebec Election Study (Mahéo, Bélanger, Stephenson & Harell) — panel two-wave Qualtrics study (CPS: pre-electoral campaign period, PES: post-election) conducted around Quebec's October 3, 2022 general election.",
    "month": None,  # Mixed: CPS=9 (Sept 19-23), PES=10 (Oct 4-15); determined by variable prefix
}

QUESTIONS = {
    "cps_citizen": {
        "display_label": "Citizenship status",
        "concepts": ["citizenship", "residency"],
        "themes": ["demographics"],
    },
    "cps_province": {
        "display_label": "Current province or territory of residence",
        "concepts": ["province", "residence"],
        "themes": ["demographics", "geography"],
    },
    "cps_age_in_years": {
        "display_label": "Age",
        "concepts": ["age", "demographics"],
        "themes": ["demographics"],
    },
    "cps_genderid": {
        "display_label": "Gender identity",
        "concepts": ["gender", "identity"],
        "themes": ["demographics"],
    },
    "cps_trans": {
        "display_label": "Transgender status",
        "concepts": ["transgender", "gender identity"],
        "themes": ["demographics", "identity"],
    },
    "cps_edu": {
        "display_label": "Highest level of education completed",
        "concepts": ["education", "attainment"],
        "themes": ["demographics"],
    },
    "cps_satis_can": {
        "display_label": "Satisfaction with how democracy works in Canada",
        "concepts": ["democratic satisfaction", "trust in government"],
        "themes": ["democracy", "trust"],
    },
    "cps_satis_prov": {
        "display_label": "Satisfaction with how democracy works in Quebec",
        "concepts": ["democratic satisfaction", "provincial trust"],
        "themes": ["democracy", "trust", "quebec"],
    },
    "cps_impissue_matrix": {
        "display_label": "Most important issue personally in provincial election",
        "concepts": ["issue salience", "election priorities", "policy priorities"],
        "themes": ["issues", "elections"],
    },
    "cps_partybest": {
        "display_label": "Which party best addresses most important issue",
        "concepts": ["party competence", "issue ownership"],
        "themes": ["parties", "issues"],
    },
    "cps_interest_1": {
        "display_label": "Interest in politics generally",
        "concepts": ["political interest"],
        "themes": ["political engagement", "interest"],
    },
    "cps_intelection_1": {
        "display_label": "Interest in Quebec election",
        "concepts": ["election interest", "political engagement"],
        "themes": ["elections", "interest"],
    },
    "cps_turnout": {
        "display_label": "Likelihood to vote in Quebec election",
        "concepts": ["turnout", "voting intention"],
        "themes": ["elections", "voting"],
    },
    "cps_howvote1": {
        "display_label": "Expected voting method for Quebec election",
        "concepts": ["voting method", "voting intention"],
        "themes": ["elections", "voting"],
    },
    "cps_howvote2": {
        "display_label": "Actual voting method used in Quebec election",
        "concepts": ["voting method"],
        "themes": ["elections", "voting"],
    },
    "cps_howvote3": {
        "display_label": "Preferred voting method if choosing to vote",
        "concepts": ["voting method"],
        "themes": ["elections", "voting"],
    },
    "cps_votechoice1": {
        "display_label": "Party expected to vote for in Quebec election",
        "concepts": ["vote intention", "party preference"],
        "themes": ["elections", "parties", "voting"],
    },
    "cps_votechoice2": {
        "display_label": "Party would vote for if deciding to vote",
        "concepts": ["vote intention", "party preference"],
        "themes": ["elections", "parties", "voting"],
    },
    "cps_votechoice3": {
        "display_label": "Party actually voted for in Quebec election",
        "concepts": ["actual vote", "party vote"],
        "themes": ["elections", "parties", "voting"],
    },
    "cps_votelean": {
        "display_label": "Party leaning toward in Quebec election",
        "concepts": ["vote lean", "party preference"],
        "themes": ["elections", "parties", "voting"],
    },
    "cps_votesecond": {
        "display_label": "Second choice party in Quebec election",
        "concepts": ["vote preference", "party alternatives"],
        "themes": ["elections", "parties", "voting"],
    },
    "cps_negativevote_1": {
        "display_label": "Parti libéral du Québec - would not vote for",
        "concepts": ["negative vote", "party rejection"],
        "themes": ["elections", "parties"],
    },
    "cps_negativevote_2": {
        "display_label": "Parti québécois - would not vote for",
        "concepts": ["negative vote", "party rejection"],
        "themes": ["elections", "parties"],
    },
    "cps_negativevote_3": {
        "display_label": "Coalition avenir Québec - would not vote for",
        "concepts": ["negative vote", "party rejection"],
        "themes": ["elections", "parties"],
    },
    "cps_negativevote_4": {
        "display_label": "Québec solidaire - would not vote for",
        "concepts": ["negative vote", "party rejection"],
        "themes": ["elections", "parties"],
    },
    "cps_negativevote_7": {
        "display_label": "Parti conservateur du Québec - would not vote for",
        "concepts": ["negative vote", "party rejection"],
        "themes": ["elections", "parties"],
    },
    "cps_negativevote_5": {
        "display_label": "Another party - would not vote for",
        "concepts": ["negative vote", "party rejection"],
        "themes": ["elections", "parties"],
    },
    "cps_negativevote_6": {
        "display_label": "Could vote for any party",
        "concepts": ["vote flexibility"],
        "themes": ["elections", "parties"],
    },
    "cps_covid_votecomf1": {
        "display_label": "Comfort voting in person during COVID-19 pandemic",
        "concepts": ["covid", "voting comfort", "pandemic concerns"],
        "themes": ["elections", "health", "covid"],
    },
    "cps_covid_votecomf2": {
        "display_label": "Comfort with in-person voting if choosing to vote during pandemic",
        "concepts": ["covid", "voting comfort"],
        "themes": ["elections", "health", "covid"],
    },
    "cps_covid_votecomf3": {
        "display_label": "Actual comfort with in-person voting during pandemic",
        "concepts": ["covid", "voting comfort"],
        "themes": ["elections", "health", "covid"],
    },
    "cps_province_gov_sat": {
        "display_label": "Satisfaction with Quebec government performance under François Legault",
        "concepts": ["government approval", "incumbent satisfaction"],
        "themes": ["government", "trust"],
    },
    "cps_partytherm_23": {
        "display_label": "Feeling toward Parti libéral du Québec",
        "concepts": ["party affect", "party sympathy"],
        "themes": ["parties"],
    },
    "cps_partytherm_25": {
        "display_label": "Feeling toward Parti québécois",
        "concepts": ["party affect", "party sympathy"],
        "themes": ["parties"],
    },
    "cps_partytherm_27": {
        "display_label": "Feeling toward Coalition avenir Québec",
        "concepts": ["party affect", "party sympathy"],
        "themes": ["parties"],
    },
    "cps_partytherm_30": {
        "display_label": "Feeling toward Québec solidaire",
        "concepts": ["party affect", "party sympathy"],
        "themes": ["parties"],
    },
    "cps_partytherm_33": {
        "display_label": "Feeling toward Parti conservateur du Québec",
        "concepts": ["party affect", "party sympathy"],
        "themes": ["parties"],
    },
    "cps_leadertherm_1": {
        "display_label": "Feeling toward Dominique Anglade",
        "concepts": ["leader affect"],
        "themes": ["leadership", "parties"],
    },
    "cps_leadertherm_2": {
        "display_label": "Feeling toward François Legault",
        "concepts": ["leader affect", "incumbent leader"],
        "themes": ["leadership", "parties"],
    },
    "cps_leadertherm_3": {
        "display_label": "Feeling toward Paul St-Pierre Plamondon",
        "concepts": ["leader affect"],
        "themes": ["leadership", "parties"],
    },
    "cps_leadertherm_7": {
        "display_label": "Feeling toward Gabriel Nadeau-Dubois",
        "concepts": ["leader affect"],
        "themes": ["leadership", "parties"],
    },
    "cps_leadertherm_8": {
        "display_label": "Feeling toward Éric Duhaime",
        "concepts": ["leader affect"],
        "themes": ["leadership", "parties"],
    },
    "cps_candtherm_23": {
        "display_label": "Feeling toward Liberal candidate in local riding",
        "concepts": ["candidate affect"],
        "themes": ["elections", "candidates"],
    },
    "cps_candtherm_25": {
        "display_label": "Feeling toward Péquiste candidate in local riding",
        "concepts": ["candidate affect"],
        "themes": ["elections", "candidates"],
    },
    "cps_candtherm_27": {
        "display_label": "Feeling toward Caquiste candidate in local riding",
        "concepts": ["candidate affect"],
        "themes": ["elections", "candidates"],
    },
    "cps_candtherm_29": {
        "display_label": "Feeling toward Solidaire candidate in local riding",
        "concepts": ["candidate affect"],
        "themes": ["elections", "candidates"],
    },
    "cps_candtherm_30": {
        "display_label": "Feeling toward Conservative candidate in local riding",
        "concepts": ["candidate affect"],
        "themes": ["elections", "candidates"],
    },
    "cps_govperf_1": {
        "display_label": "Government performance on environment",
        "concepts": ["government competence", "environmental performance"],
        "themes": ["government", "environment"],
    },
    "cps_govperf_2": {
        "display_label": "Government performance on helping the poor",
        "concepts": ["government competence", "poverty"],
        "themes": ["government", "social", "economy"],
    },
    "cps_govperf_3": {
        "display_label": "Government performance on managing public finances",
        "concepts": ["government competence", "fiscal management"],
        "themes": ["government", "economy"],
    },
    "cps_govperf_4": {
        "display_label": "Government performance on protecting citizens' health",
        "concepts": ["government competence", "health"],
        "themes": ["government", "health"],
    },
    "cps_intelligent_1": {
        "display_label": "Dominique Anglade - intelligence",
        "concepts": ["leader intelligence"],
        "themes": ["leadership"],
    },
    "cps_intelligent_2": {
        "display_label": "François Legault - intelligence",
        "concepts": ["leader intelligence"],
        "themes": ["leadership"],
    },
    "cps_intelligent_3": {
        "display_label": "Paul St-Pierre Plamondon - intelligence",
        "concepts": ["leader intelligence"],
        "themes": ["leadership"],
    },
    "cps_intelligent_4": {
        "display_label": "Gabriel Nadeau-Dubois - intelligence",
        "concepts": ["leader intelligence"],
        "themes": ["leadership"],
    },
    "cps_intelligent_5": {
        "display_label": "Éric Duhaime - intelligence",
        "concepts": ["leader intelligence"],
        "themes": ["leadership"],
    },
    "cps_stronglead_1": {
        "display_label": "Dominique Anglade - strong leadership",
        "concepts": ["leader strength"],
        "themes": ["leadership"],
    },
    "cps_stronglead_2": {
        "display_label": "François Legault - strong leadership",
        "concepts": ["leader strength"],
        "themes": ["leadership"],
    },
    "cps_stronglead_3": {
        "display_label": "Paul St-Pierre Plamondon - strong leadership",
        "concepts": ["leader strength"],
        "themes": ["leadership"],
    },
    "cps_stronglead_4": {
        "display_label": "Gabriel Nadeau-Dubois - strong leadership",
        "concepts": ["leader strength"],
        "themes": ["leadership"],
    },
    "cps_stronglead_5": {
        "display_label": "Éric Duhaime - strong leadership",
        "concepts": ["leader strength"],
        "themes": ["leadership"],
    },
    "cps_trustworthy_74": {
        "display_label": "Dominique Anglade - trustworthiness",
        "concepts": ["leader trustworthiness"],
        "themes": ["leadership", "trust"],
    },
    "cps_trustworthy_75": {
        "display_label": "François Legault - trustworthiness",
        "concepts": ["leader trustworthiness"],
        "themes": ["leadership", "trust"],
    },
    "cps_trustworthy_76": {
        "display_label": "Paul St-Pierre Plamondon - trustworthiness",
        "concepts": ["leader trustworthiness"],
        "themes": ["leadership", "trust"],
    },
    "cps_trustworthy_77": {
        "display_label": "Gabriel Nadeau-Dubois - trustworthiness",
        "concepts": ["leader trustworthiness"],
        "themes": ["leadership", "trust"],
    },
    "cps_trustworthy_82": {
        "display_label": "Éric Duhaime - trustworthiness",
        "concepts": ["leader trustworthiness"],
        "themes": ["leadership", "trust"],
    },
    "cps_cares_1": {
        "display_label": "Dominique Anglade - cares about people like me",
        "concepts": ["leader empathy", "political sympathy"],
        "themes": ["leadership"],
    },
    "cps_cares_2": {
        "display_label": "François Legault - cares about people like me",
        "concepts": ["leader empathy"],
        "themes": ["leadership"],
    },
    "cps_cares_3": {
        "display_label": "Paul St-Pierre Plamondon - cares about people like me",
        "concepts": ["leader empathy"],
        "themes": ["leadership"],
    },
    "cps_cares_4": {
        "display_label": "Gabriel Nadeau-Dubois - cares about people like me",
        "concepts": ["leader empathy"],
        "themes": ["leadership"],
    },
    "cps_cares_5": {
        "display_label": "Éric Duhaime - cares about people like me",
        "concepts": ["leader empathy"],
        "themes": ["leadership"],
    },
    "cps_ideoself_1": {
        "display_label": "Self-placement on left-right political scale",
        "concepts": ["political ideology", "left-right"],
        "themes": ["ideology"],
    },
    "cps_ideoparty_1": {
        "display_label": "Parti libéral du Québec placement on left-right scale",
        "concepts": ["party ideology", "left-right"],
        "themes": ["ideology", "parties"],
    },
    "cps_ideoparty_3": {
        "display_label": "Parti québécois placement on left-right scale",
        "concepts": ["party ideology", "left-right"],
        "themes": ["ideology", "parties"],
    },
    "cps_ideoparty_5": {
        "display_label": "Coalition avenir Québec placement on left-right scale",
        "concepts": ["party ideology", "left-right"],
        "themes": ["ideology", "parties"],
    },
    "cps_ideoparty_7": {
        "display_label": "Québec solidaire placement on left-right scale",
        "concepts": ["party ideology", "left-right"],
        "themes": ["ideology", "parties"],
    },
    "cps_ideoparty_8": {
        "display_label": "Parti conservateur du Québec placement on left-right scale",
        "concepts": ["party ideology", "left-right"],
        "themes": ["ideology", "parties"],
    },
    "cps_partybest_issues_1": {
        "display_label": "Which party best handles healthcare",
        "concepts": ["issue ownership", "party competence"],
        "themes": ["parties", "issues", "health"],
    },
    "cps_partybest_issues_2": {
        "display_label": "Which party best handles education",
        "concepts": ["issue ownership", "party competence"],
        "themes": ["parties", "issues"],
    },
    "cps_partybest_issues_3": {
        "display_label": "Which party best handles environment",
        "concepts": ["issue ownership", "party competence"],
        "themes": ["parties", "issues", "environment"],
    },
    "cps_partybest_issues_4": {
        "display_label": "Which party best handles crime and justice",
        "concepts": ["issue ownership", "party competence"],
        "themes": ["parties", "issues"],
    },
    "cps_partybest_issues_5": {
        "display_label": "Which party best handles immigration",
        "concepts": ["issue ownership", "party competence"],
        "themes": ["parties", "issues", "immigration"],
    },
    "cps_partybest_issues_6": {
        "display_label": "Which party best handles economy",
        "concepts": ["issue ownership", "party competence"],
        "themes": ["parties", "issues", "economy"],
    },
    "cps_partybest_issues_7": {
        "display_label": "Which party best handles affordable housing",
        "concepts": ["issue ownership", "party competence"],
        "themes": ["parties", "issues", "housing"],
    },
    "cps_partybest_issues_8": {
        "display_label": "Which party best handles immigration integration in Quebec",
        "concepts": ["issue ownership", "party competence"],
        "themes": ["parties", "issues", "immigration"],
    },
    "cps_partybest_issues_9": {
        "display_label": "Which party best handles defense of Quebec interests",
        "concepts": ["issue ownership", "party competence", "quebec interests"],
        "themes": ["parties", "issues", "quebec"],
    },
    "cps_partybest_issues_10": {
        "display_label": "Which party best handles defense of Quebec identity and culture",
        "concepts": ["issue ownership", "party competence", "quebec identity"],
        "themes": ["parties", "issues", "quebec", "identity"],
    },
    "cps_spendedu": {
        "display_label": "Government spending on education",
        "concepts": ["spending preferences", "education priorities"],
        "themes": ["spending", "education"],
    },
    "cps_spendenv": {
        "display_label": "Government spending on environment",
        "concepts": ["spending preferences", "environment priorities"],
        "themes": ["spending", "environment"],
    },
    "cps_spendcrime": {
        "display_label": "Government spending on fighting crime",
        "concepts": ["spending preferences", "law and order"],
        "themes": ["spending", "justice"],
    },
    "cps_spendhealth": {
        "display_label": "Government spending on health care",
        "concepts": ["spending preferences", "health priorities"],
        "themes": ["spending", "health"],
    },
    "cps_spendsocial": {
        "display_label": "Government spending on social programs",
        "concepts": ["spending preferences", "social welfare"],
        "themes": ["spending", "social"],
    },
    "cps_qc_carbon": {
        "display_label": "Support for Quebec carbon tax",
        "concepts": ["carbon tax", "climate policy"],
        "themes": ["environment", "climate"],
    },
    "cps_qc_energy": {
        "display_label": "Support for Quebec energy sector development",
        "concepts": ["energy policy", "oil and gas"],
        "themes": ["environment", "energy"],
    },
    "cps_qc_env": {
        "display_label": "Environmental regulation should be stricter even if it raises prices",
        "concepts": ["environmental regulation", "cost-benefit"],
        "themes": ["environment"],
    },
    "cps_jobsfirst": {
        "display_label": "Jobs should come first in environment vs employment conflict",
        "concepts": ["environment-economy trade-off", "job priorities"],
        "themes": ["environment", "economy"],
    },
    "cps_qc_attach": {
        "display_label": "Attachment to Quebec",
        "concepts": ["quebec attachment", "provincial identity"],
        "themes": ["identity", "quebec"],
    },
    "cps_can_attach": {
        "display_label": "Attachment to Canada",
        "concepts": ["canadian attachment", "national identity"],
        "themes": ["identity", "canada"],
    },
    "cps_provecon": {
        "display_label": "Provincial economy over past year",
        "concepts": ["economic evaluation", "economic conditions"],
        "themes": ["economy"],
    },
    "cps_proveconblame": {
        "display_label": "Quebec government responsibility for economic conditions",
        "concepts": ["government blame", "economic attribution"],
        "themes": ["economy", "government"],
    },
    "cps_ownfin": {
        "display_label": "Personal financial situation over past year",
        "concepts": ["personal economy", "financial well-being"],
        "themes": ["economy"],
    },
    "cps_ownfinblame": {
        "display_label": "Quebec government responsibility for personal financial situation",
        "concepts": ["government blame", "economic attribution"],
        "themes": ["economy", "government"],
    },
    "cps_immig": {
        "display_label": "Canada immigration levels",
        "concepts": ["immigration policy"],
        "themes": ["immigration"],
    },
    "cps_refugee": {
        "display_label": "Canada refugee intake levels",
        "concepts": ["refugee policy"],
        "themes": ["immigration"],
    },
    "cps_attractimm": {
        "display_label": "Quebec attraction of immigrants",
        "concepts": ["immigration policy", "quebec", "provincial attraction"],
        "themes": ["immigration", "quebec"],
    },
    "cps_respect": {
        "display_label": "Quebec treated with respect in Canada",
        "concepts": ["provincial respect", "federal-provincial"],
        "themes": ["quebec", "federalism"],
    },
    "cps_share": {
        "display_label": "Quebec fair share of federal spending",
        "concepts": ["federal transfers", "fiscal federalism"],
        "themes": ["quebec", "federalism", "economy"],
    },
    "cps_treat": {
        "display_label": "Federal government treatment of Quebec",
        "concepts": ["federal-provincial relations", "grievance"],
        "themes": ["quebec", "federalism"],
    },
    "cps_provinequality": {
        "display_label": "Income inequality as problem in Quebec",
        "concepts": ["inequality", "social issues"],
        "themes": ["economy", "social"],
    },
    "cps_qc_choose": {
        "display_label": "Quebec sovereignty options preference",
        "concepts": ["sovereignty", "quebec independence"],
        "themes": ["quebec", "sovereignty"],
    },
    "cps_langQC": {
        "display_label": "French language threatened in Quebec",
        "concepts": ["language threat", "cultural preservation"],
        "themes": ["quebec", "identity"],
    },
    "cps_valuesQC": {
        "display_label": "Quebec values and culture threatened",
        "concepts": ["cultural threat", "identity threat"],
        "themes": ["quebec", "identity"],
    },
    "cps_groups2_6": {
        "display_label": "Feeling toward immigrants",
        "concepts": ["immigrant attitudes", "intergroup attitudes"],
        "themes": ["immigration"],
    },
    "cps_groups2_7": {
        "display_label": "Feeling toward Indigenous peoples",
        "concepts": ["indigenous attitudes"],
        "themes": ["identity"],
    },
    "cps_groups2_11": {
        "display_label": "Feeling toward Francophones in Quebec",
        "concepts": ["francophone attitudes"],
        "themes": ["identity", "language"],
    },
    "cps_groups2_12": {
        "display_label": "Feeling toward feminists",
        "concepts": ["feminist attitudes"],
        "themes": ["identity", "gender"],
    },
    "cps_groups2_13": {
        "display_label": "Feeling toward LGBTQ+ people",
        "concepts": ["LGBTQ attitudes"],
        "themes": ["identity", "gender"],
    },
    "cps_groups2_8": {
        "display_label": "Feeling toward politicians",
        "concepts": ["politician attitudes", "political trust"],
        "themes": ["politics", "trust"],
    },
    "cps_groups2_16": {
        "display_label": "Feeling toward Muslims in Canada",
        "concepts": ["muslim attitudes", "religious tolerance"],
        "themes": ["identity", "religion"],
    },
    "cps_groups2_17": {
        "display_label": "Feeling toward Allophones in Quebec",
        "concepts": ["allophone attitudes"],
        "themes": ["identity", "language"],
    },
    "cps_groups2_18": {
        "display_label": "Feeling toward Anglophones in Quebec",
        "concepts": ["anglophone attitudes"],
        "themes": ["identity", "language"],
    },
    "cps_covid_handle_1": {
        "display_label": "Satisfaction with federal government COVID-19 pandemic handling",
        "concepts": ["pandemic response", "government performance"],
        "themes": ["covid", "government"],
    },
    "cps_covid_handle_2": {
        "display_label": "Satisfaction with Quebec government COVID-19 pandemic handling",
        "concepts": ["pandemic response", "government performance"],
        "themes": ["covid", "government"],
    },
    "cps_covid_handle_3": {
        "display_label": "Satisfaction with municipal government COVID-19 pandemic handling",
        "concepts": ["pandemic response", "government performance"],
        "themes": ["covid", "government"],
    },
    "cps_covid_compare": {
        "display_label": "Quebec COVID-19 handling compared to other provinces",
        "concepts": ["pandemic response", "interprovincial comparison"],
        "themes": ["covid", "government"],
    },
    "cps_covid_risk": {
        "display_label": "Heightened health risks from COVID-19 pandemic",
        "concepts": ["pandemic risk", "health concerns"],
        "themes": ["covid", "health"],
    },
    "cps_vaccine1": {
        "display_label": "Received at least one COVID-19 vaccine dose",
        "concepts": ["vaccine uptake", "pandemic response"],
        "themes": ["covid", "health"],
    },
    "cps_qc_pol_independ": {
        "display_label": "Importance of Quebec political independence",
        "concepts": ["quebec independence", "sovereignty"],
        "themes": ["quebec", "sovereignty"],
    },
    "cps_qc_referendum": {
        "display_label": "Support for Quebec independence referendum",
        "concepts": ["quebec independence", "referendum"],
        "themes": ["quebec", "sovereignty"],
    },
    "cps_qc_independent": {
        "display_label": "Belief Quebec will become independent",
        "concepts": ["quebec independence", "political prediction"],
        "themes": ["quebec", "sovereignty"],
    },
    "cps_govresp_1": {
        "display_label": "Employment insurance responsibility - federal or provincial",
        "concepts": ["federalism", "jurisdictional responsibility"],
        "themes": ["federalism", "economy"],
    },
    "cps_govresp_2": {
        "display_label": "Health care responsibility - federal or provincial",
        "concepts": ["federalism", "jurisdictional responsibility"],
        "themes": ["federalism", "health"],
    },
    "cps_govresp_3": {
        "display_label": "Primary and secondary education responsibility - federal or provincial",
        "concepts": ["federalism", "jurisdictional responsibility"],
        "themes": ["federalism", "education"],
    },
    "cps_govresp_4": {
        "display_label": "Defense policy responsibility - federal or provincial",
        "concepts": ["federalism", "jurisdictional responsibility"],
        "themes": ["federalism", "defense"],
    },
    "cps_govresp_5": {
        "display_label": "Public transit responsibility - federal or provincial",
        "concepts": ["federalism", "jurisdictional responsibility"],
        "themes": ["federalism", "urban"],
    },
    "cps_govresp_6": {
        "display_label": "Sewage and water responsibility - federal or provincial",
        "concepts": ["federalism", "jurisdictional responsibility"],
        "themes": ["federalism", "environment"],
    },
    "cps_complicated": {
        "display_label": "Politics and government seem too complicated to understand",
        "concepts": ["political efficacy", "political complexity"],
        "themes": ["efficacy", "trust"],
    },
    "cps_nosay": {
        "display_label": "People like me have no say in what government does",
        "concepts": ["political efficacy", "powerlessness"],
        "themes": ["efficacy", "democracy"],
    },
    "cps_newstime": {
        "display_label": "Time spent consuming news daily",
        "concepts": ["news consumption", "media diet"],
        "themes": ["media"],
    },
    "cps_socialmediatime": {
        "display_label": "Frequency of social media use",
        "concepts": ["social media use", "online behavior"],
        "themes": ["media", "digital"],
    },
    "cps_socialmedia_1": {
        "display_label": "Use Facebook regularly",
        "concepts": ["social media platform", "digital platforms"],
        "themes": ["media", "digital"],
    },
    "cps_socialmedia_2": {
        "display_label": "Use Twitter regularly",
        "concepts": ["social media platform", "digital platforms"],
        "themes": ["media", "digital"],
    },
    "cps_socialmedia_3": {
        "display_label": "Use YouTube regularly",
        "concepts": ["social media platform", "digital platforms"],
        "themes": ["media", "digital"],
    },
    "cps_socialmedia_4": {
        "display_label": "Use Snapchat regularly",
        "concepts": ["social media platform", "digital platforms"],
        "themes": ["media", "digital"],
    },
    "cps_socialmedia_5": {
        "display_label": "Use Reddit regularly",
        "concepts": ["social media platform", "digital platforms"],
        "themes": ["media", "digital"],
    },
    "cps_socialmedia_6": {
        "display_label": "Use TikTok regularly",
        "concepts": ["social media platform", "digital platforms"],
        "themes": ["media", "digital"],
    },
    "cps_socialmedia_7": {
        "display_label": "Use Instagram regularly",
        "concepts": ["social media platform", "digital platforms"],
        "themes": ["media", "digital"],
    },
    "cps_socialmedia_8": {
        "display_label": "Use Pinterest regularly",
        "concepts": ["social media platform", "digital platforms"],
        "themes": ["media", "digital"],
    },
    "cps_socialmedia_9": {
        "display_label": "Use other social media platform regularly",
        "concepts": ["social media platform", "digital platforms"],
        "themes": ["media", "digital"],
    },
    "cps_socialmedia_10": {
        "display_label": "Do not use social media",
        "concepts": ["social media non-use"],
        "themes": ["media", "digital"],
    },
    "pes_identity_qc_ca": {
        "display_label": "Identity as Quebec or Canadian",
        "concepts": ["national identity", "provincial identity"],
        "themes": ["identity", "quebec"],
    },
    "cps_fedpid": {
        "display_label": "Federal political party identification",
        "concepts": ["party identification", "federal politics"],
        "themes": ["parties", "federal"],
    },
    "cps_fedpidstr": {
        "display_label": "Strength of federal party identification",
        "concepts": ["party identification strength"],
        "themes": ["parties"],
    },
    "cps_provpid": {
        "display_label": "Provincial political party identification",
        "concepts": ["party identification", "provincial politics"],
        "themes": ["parties", "quebec"],
    },
    "cps_provpidstr": {
        "display_label": "Strength of provincial party identification",
        "concepts": ["party identification strength"],
        "themes": ["parties"],
    },
    "cps_donateparty": {
        "display_label": "Donated to provincial political party or candidate",
        "concepts": ["political participation", "party support"],
        "themes": ["participation", "parties"],
    },
    "cps_volunteer": {
        "display_label": "Volunteering frequency in past 12 months",
        "concepts": ["civic participation", "volunteering"],
        "themes": ["participation"],
    },
    "cps_pastvote": {
        "display_label": "Voted in 2021 federal election",
        "concepts": ["past voting", "voting history"],
        "themes": ["elections", "federal"],
    },
    "cps_pastpartyvote": {
        "display_label": "Party voted for in 2021 federal election",
        "concepts": ["past vote", "voting history"],
        "themes": ["elections", "federal", "parties"],
    },
    "cps_qc_turnout_2018": {
        "display_label": "Voted in 2018 Quebec election",
        "concepts": ["past voting", "voting history"],
        "themes": ["elections", "quebec"],
    },
    "cps_qc_vote_2018": {
        "display_label": "Party voted for in 2018 Quebec election",
        "concepts": ["past vote", "voting history"],
        "themes": ["elections", "quebec", "parties"],
    },
    "cps_duty": {
        "display_label": "Voting is a duty or a choice",
        "concepts": ["civic duty", "voting norms"],
        "themes": ["democracy", "participation"],
    },
    "cps_income": {
        "display_label": "Household income before taxes for 2021",
        "concepts": ["income"],
        "themes": ["demographics", "economy"],
    },
    "cps_income2": {
        "display_label": "Household income category",
        "concepts": ["income category", "socioeconomic status"],
        "themes": ["demographics", "economy"],
    },
    "cps_religion": {
        "display_label": "Religious affiliation",
        "concepts": ["religion", "religious identity"],
        "themes": ["demographics", "religion"],
    },
    "cps_religimp": {
        "display_label": "Importance of religion in life",
        "concepts": ["religiosity", "religious importance"],
        "themes": ["religion", "identity"],
    },
    "cps_borncda": {
        "display_label": "Born in Canada",
        "concepts": ["birthplace"],
        "themes": ["demographics"],
    },
    "cps_borncountry": {
        "display_label": "Country of birth",
        "concepts": ["birthplace", "immigration background"],
        "themes": ["demographics", "immigration"],
    },
    "cps_comecda": {
        "display_label": "Year came to live in Canada",
        "concepts": ["immigration timing"],
        "themes": ["demographics", "immigration"],
    },
    "cps_lang_1": {
        "display_label": "English language learned and understood as child",
        "concepts": ["language background", "bilingualism"],
        "themes": ["demographics", "language"],
    },
    "cps_lang_2": {
        "display_label": "French language learned and understood as child",
        "concepts": ["language background", "bilingualism"],
        "themes": ["demographics", "language"],
    },
    "cps_yob": {
        "display_label": "Year of birth",
        "concepts": ["age", "birth year"],
        "themes": ["demographics"],
    },
    "pes_provsatis": {
        "display_label": "Post-election satisfaction with how democracy works in Quebec",
        "concepts": ["democratic satisfaction"],
        "themes": ["democracy", "trust"],
    },
    "pes_mostimpissue": {
        "display_label": "Main issue in recent Quebec election campaign",
        "concepts": ["issue salience"],
        "themes": ["issues", "elections"],
    },
    "pes_turnout": {
        "display_label": "Voted in 2022 Quebec election",
        "concepts": ["voting", "turnout"],
        "themes": ["elections", "voting"],
    },
    "pes_votechoice": {
        "display_label": "Party voted for in 2022 Quebec election",
        "concepts": ["actual vote", "party vote"],
        "themes": ["elections", "parties", "voting"],
    },
    "pes_q7": {
        "display_label": "Party was first choice in 2022 election",
        "concepts": ["vote preference", "first choice"],
        "themes": ["elections", "voting"],
    },
    "pes_q8": {
        "display_label": "First choice party if not voted for top choice",
        "concepts": ["vote preference", "party alternatives"],
        "themes": ["elections", "voting"],
    },
    "pes_howvote": {
        "display_label": "Actual voting method used in 2022 election",
        "concepts": ["voting method"],
        "themes": ["elections", "voting"],
    },
    "pes_whymail": {
        "display_label": "Reasons for choosing mail-in voting",
        "concepts": ["voting method", "voting accessibility"],
        "themes": ["elections", "voting"],
    },
    "pes_maileasy": {
        "display_label": "Ease of mail-in voting process",
        "concepts": ["voting accessibility", "voting satisfaction"],
        "themes": ["elections", "voting"],
    },
    "pes_votingsafe": {
        "display_label": "Safety felt when voting in person",
        "concepts": ["voting experience", "voting comfort"],
        "themes": ["elections", "voting"],
    },
    "pes_reasonnotvote": {
        "display_label": "Main reason for not voting",
        "concepts": ["voter abstention", "barriers to voting"],
        "themes": ["elections", "voting"],
    },
    "pes_attention_1": {
        "display_label": "Attention paid to 2022 Quebec election campaign",
        "concepts": ["campaign attention", "political engagement"],
        "themes": ["elections", "interest"],
    },
    "pes_contact": {
        "display_label": "Contact by party or candidate during election campaign",
        "concepts": ["campaign contact", "party mobilization"],
        "themes": ["elections", "parties", "participation"],
    },
    "pes_contactparty_1": {
        "display_label": "Parti libéral du Québec contacted during campaign",
        "concepts": ["campaign contact"],
        "themes": ["elections", "parties"],
    },
    "pes_contactparty_2": {
        "display_label": "Parti québécois contacted during campaign",
        "concepts": ["campaign contact"],
        "themes": ["elections", "parties"],
    },
    "pes_contactparty_3": {
        "display_label": "Coalition avenir Québec contacted during campaign",
        "concepts": ["campaign contact"],
        "themes": ["elections", "parties"],
    },
    "pes_contactparty_4": {
        "display_label": "Québec solidaire contacted during campaign",
        "concepts": ["campaign contact"],
        "themes": ["elections", "parties"],
    },
    "pes_contactparty_5": {
        "display_label": "Parti conservateur du Québec contacted during campaign",
        "concepts": ["campaign contact"],
        "themes": ["elections", "parties"],
    },
    "pes_medical": {
        "display_label": "People willing to pay should get faster medical treatment",
        "concepts": ["healthcare policy", "inequality"],
        "themes": ["health", "social"],
    },
    "pes_womenhome": {
        "display_label": "Better if fewer women worked outside home",
        "concepts": ["gender roles", "women's workforce participation"],
        "themes": ["gender", "social"],
    },
    "pes_pollie": {
        "display_label": "Politicians willing to lie to get elected",
        "concepts": ["political trust", "politician integrity"],
        "themes": ["trust", "politics"],
    },
    "pes_newlifestyles": {
        "display_label": "Newer lifestyles contributing to breakdown of society",
        "concepts": ["social change", "cultural conservatism"],
        "themes": ["social", "values"],
    },
    "pes_familyvalues": {
        "display_label": "Emphasis on traditional family values would solve problems",
        "concepts": ["family values", "social conservatism"],
        "themes": ["values", "social"],
    },
    "pes_equalrights": {
        "display_label": "Gone too far in pushing equal rights in Canada",
        "concepts": ["equal rights", "social progress"],
        "themes": ["rights", "social"],
    },
    "pes_immfitin": {
        "display_label": "Too many recent immigrants don't want to fit into Canadian society",
        "concepts": ["immigrant integration", "immigration attitudes"],
        "themes": ["immigration"],
    },
    "pes_immjobs": {
        "display_label": "Immigrants take jobs away from other Canadians",
        "concepts": ["immigration attitudes", "economic impact"],
        "themes": ["immigration", "economy"],
    },
    "pes_familyvalues_qc": {
        "display_label": "Quebec better with emphasis on traditional family values",
        "concepts": ["family values", "social conservatism"],
        "themes": ["values", "social", "quebec"],
    },
    "pes_equalrights_qc": {
        "display_label": "Gone too far in pushing equal rights in Quebec",
        "concepts": ["equal rights", "social progress"],
        "themes": ["rights", "social", "quebec"],
    },
    "cps_lang_3": {
        "display_label": "Other language learned and understood as child",
        "concepts": ["language background", "multilingualism"],
        "themes": ["demographics", "language"],
    },
    "cps_qc_decisions_1": {
        "display_label": "Immigration policy decision jurisdiction - Quebec or Canada",
        "concepts": ["jurisdictional autonomy", "federalism", "immigration policy"],
        "themes": ["quebec", "federalism"],
    },
    "cps_qc_decisions_2": {
        "display_label": "Environmental protection decision jurisdiction - Quebec or Canada",
        "concepts": ["jurisdictional autonomy", "federalism", "environmental policy"],
        "themes": ["quebec", "federalism", "environment"],
    },
    "cps_qc_decisions_3": {
        "display_label": "Cultural and linguistic policies decision jurisdiction - Quebec or Canada",
        "concepts": ["jurisdictional autonomy", "federalism", "cultural policy"],
        "themes": ["quebec", "federalism", "language", "identity"],
    },
    "cps_qc_decisions_4": {
        "display_label": "Health policy decision jurisdiction - Quebec or Canada",
        "concepts": ["jurisdictional autonomy", "federalism", "health policy"],
        "themes": ["quebec", "federalism", "health"],
    },
    "pes_confidence_1": {
        "display_label": "Confidence in federal government",
        "concepts": ["institutional trust", "government trust"],
        "themes": ["trust", "government", "federal"],
    },
    "pes_confidence_2": {
        "display_label": "Confidence in Quebec government",
        "concepts": ["institutional trust", "government trust"],
        "themes": ["trust", "government", "quebec"],
    },
    "pes_confidence_3": {
        "display_label": "Confidence in media",
        "concepts": ["institutional trust", "media trust"],
        "themes": ["trust", "media"],
    },
    "pes_confidence_4": {
        "display_label": "Confidence in Elections Quebec",
        "concepts": ["institutional trust", "election integrity"],
        "themes": ["trust", "elections"],
    },
    "pes_ENBhands": {
        "display_label": "Asked to sanitize hands before voting",
        "concepts": ["voting procedures", "covid precautions"],
        "themes": ["elections", "voting", "covid"],
    },
    "pes_ENBmask": {
        "display_label": "Wore mask or face covering when voting",
        "concepts": ["covid precautions", "voting procedures"],
        "themes": ["elections", "voting", "covid"],
    },
    "pes_mailtrust": {
        "display_label": "Mail-in voting is as reliable as in-person voting",
        "concepts": ["voting method", "voting accessibility", "mail-in voting"],
        "themes": ["elections", "voting"],
    },
    "pes_mailrequest": {
        "display_label": "All registered voters should receive mail-in ballot",
        "concepts": ["voting method", "voting accessibility", "mail-in voting"],
        "themes": ["elections", "voting"],
    },
    "pes_votemail": {
        "display_label": "Ever voted by mail in previous election",
        "concepts": ["voting method", "voting history"],
        "themes": ["elections", "voting"],
    },
    "pes_emb_card": {
        "display_label": "Received voter registration card in mail",
        "concepts": ["voting procedures", "voter information"],
        "themes": ["elections", "voting"],
    },
    "pes_emb_cardcorrect": {
        "display_label": "Voter registration card information was correct",
        "concepts": ["voting procedures", "voter information"],
        "themes": ["elections", "voting"],
    },
    "pes_emb_register": {
        "display_label": "Registered to vote during 2022 election",
        "concepts": ["voter registration"],
        "themes": ["elections", "voting"],
    },
    "pes_emb_registerhow": {
        "display_label": "Method used to register for voting",
        "concepts": ["voter registration", "voting accessibility"],
        "themes": ["elections", "voting"],
    },
    "pes_emb_votehard": {
        "display_label": "Ease or difficulty of registering to vote",
        "concepts": ["voter registration", "voting accessibility"],
        "themes": ["elections", "voting"],
    },
    "pes_emb_satis": {
        "display_label": "Satisfaction with Elections Quebec conduct",
        "concepts": ["election integrity", "election satisfaction"],
        "themes": ["elections", "trust"],
    },
    "pes_emb_fair": {
        "display_label": "Elections Quebec ran election fairly",
        "concepts": ["election integrity", "electoral justice"],
        "themes": ["elections", "democracy"],
    },
    "pes_emb_safe": {
        "display_label": "Elections Quebec took appropriate safety precautions",
        "concepts": ["election integrity", "voter safety"],
        "themes": ["elections", "trust"],
    },
    "pes_embsatisfy": {
        "display_label": "Overall satisfaction with voting experience",
        "concepts": ["voting experience", "voting satisfaction"],
        "themes": ["elections", "voting"],
    },
    "pes_emb_infohard": {
        "display_label": "Ease or difficulty of finding voting information",
        "concepts": ["voter information", "voting accessibility"],
        "themes": ["elections", "voting"],
    },
    "pes_maildifficult_1": {
        "display_label": "Did not know mail-in ballot kit request needed",
        "concepts": ["voting accessibility", "voter information"],
        "themes": ["elections", "voting"],
    },
    "pes_maildifficult_2": {
        "display_label": "Did not know where or how to request mail-in ballot kit",
        "concepts": ["voting accessibility", "voter information"],
        "themes": ["elections", "voting"],
    },
    "pes_maildifficult_3": {
        "display_label": "Difficulty with phone process for mail-in ballot request",
        "concepts": ["voting accessibility", "voter information"],
        "themes": ["elections", "voting"],
    },
    "pes_maildifficult_4": {
        "display_label": "Difficulty with online process for mail-in ballot request",
        "concepts": ["voting accessibility", "voter information"],
        "themes": ["elections", "voting"],
    },
    "pes_maildifficult_5": {
        "display_label": "Took long time to receive mail-in ballot kit",
        "concepts": ["voting accessibility", "voting method"],
        "themes": ["elections", "voting"],
    },
    "pes_maildifficult_6": {
        "display_label": "Mail-in ballot kit never arrived",
        "concepts": ["voting accessibility", "voting method"],
        "themes": ["elections", "voting"],
    },
    "pes_maildifficult_7": {
        "display_label": "Instructions in mail-in ballot kit unclear",
        "concepts": ["voting accessibility", "voter information"],
        "themes": ["elections", "voting"],
    },
    "pes_maildifficult_8": {
        "display_label": "Ballot did not list candidate or party names",
        "concepts": ["voting accessibility", "voter information"],
        "themes": ["elections", "voting"],
    },
    "pes_maildifficult_9": {
        "display_label": "Uncertainty about returning mail-in ballot costs",
        "concepts": ["voting accessibility", "voting method"],
        "themes": ["elections", "voting"],
    },
    "pes_maildifficult_10": {
        "display_label": "Not sure mail-in ballot would arrive in time",
        "concepts": ["voting accessibility", "voting method"],
        "themes": ["elections", "voting"],
    },
    "pes_maildifficult_11": {
        "display_label": "Other difficulty with mail-in voting process",
        "concepts": ["voting accessibility", "voting method"],
        "themes": ["elections", "voting"],
    },
    "pes_maildifficult_12": {
        "display_label": "Not certain about mail-in voting difficulty",
        "concepts": ["voting accessibility"],
        "themes": ["elections", "voting"],
    },
    "pes_emb_voteinfo_1": {
        "display_label": "Voter information from Guide to Voting mailed by Elections Quebec",
        "concepts": ["voting information", "voter education"],
        "themes": ["elections", "voting"],
    },
    "pes_emb_voteinfo_2": {
        "display_label": "Voter information from voter registration card mailed by Elections Quebec",
        "concepts": ["voting information", "voter education"],
        "themes": ["elections", "voting"],
    },
    "pes_emb_voteinfo_3": {
        "display_label": "Voter information from television",
        "concepts": ["voting information", "media", "voter education"],
        "themes": ["elections", "voting", "media"],
    },
    "pes_emb_voteinfo_4": {
        "display_label": "Voter information from radio",
        "concepts": ["voting information", "media", "voter education"],
        "themes": ["elections", "voting", "media"],
    },
    "pes_emb_voteinfo_5": {
        "display_label": "Voter information from newspaper",
        "concepts": ["voting information", "media", "voter education"],
        "themes": ["elections", "voting", "media"],
    },
    "pes_emb_voteinfo_6": {
        "display_label": "Voter information from social media",
        "concepts": ["voting information", "digital media", "voter education"],
        "themes": ["elections", "voting", "media", "digital"],
    },
    "pes_emb_voteinfo_7": {
        "display_label": "Voter information from transit advertising",
        "concepts": ["voting information", "voter education"],
        "themes": ["elections", "voting"],
    },
    "pes_emb_voteinfo_8": {
        "display_label": "Voter information from family and friends",
        "concepts": ["voting information", "social networks", "voter education"],
        "themes": ["elections", "voting"],
    },
    "pes_emb_voteinfo_9": {
        "display_label": "Voter information from Elections Quebec call centre",
        "concepts": ["voting information", "voter education"],
        "themes": ["elections", "voting"],
    },
    "pes_emb_voteinfo_10": {
        "display_label": "Voter information from Elections Quebec website",
        "concepts": ["voting information", "digital media", "voter education"],
        "themes": ["elections", "voting", "digital"],
    },
    "pes_emb_voteinfo_11": {
        "display_label": "Voter information from other website",
        "concepts": ["voting information", "digital media", "voter education"],
        "themes": ["elections", "voting", "digital"],
    },
    "pes_emb_voteinfo_12": {
        "display_label": "Voter information from political parties or candidates",
        "concepts": ["voting information", "party information", "voter education"],
        "themes": ["elections", "voting", "parties"],
    },
    "pes_emb_voteinfo_13": {
        "display_label": "Voter information from Elections Quebec local office",
        "concepts": ["voting information", "voter education"],
        "themes": ["elections", "voting"],
    },
    "pes_emb_voteinfo_14": {
        "display_label": "Voter information from other source",
        "concepts": ["voting information", "voter education"],
        "themes": ["elections", "voting"],
    },
    "pes_emb_age": {
        "display_label": "Support for lowering voting age from 18 to 16",
        "concepts": ["voting eligibility", "democratic participation"],
        "themes": ["elections", "voting", "democracy"],
    },
    "pes_emb_info_2": {
        "display_label": "Knowledge of documents needed to vote",
        "concepts": ["voting information", "voter knowledge"],
        "themes": ["elections", "voting"],
    },
    "pes_emb_info_3": {
        "display_label": "Knowledge of where to vote on election day",
        "concepts": ["voting information", "voter knowledge"],
        "themes": ["elections", "voting"],
    },
    "pes_emb_info_5": {
        "display_label": "Knowledge of how to vote in advance",
        "concepts": ["voting information", "voter knowledge"],
        "themes": ["elections", "voting"],
    },
    "pes_emb_info_6": {
        "display_label": "Knowledge of how to apply for mail-in voting",
        "concepts": ["voting information", "voter knowledge"],
        "themes": ["elections", "voting"],
    },
    "pes_emb_info_7": {
        "display_label": "Knowledge of how to return mail-in ballot",
        "concepts": ["voting information", "voter knowledge"],
        "themes": ["elections", "voting"],
    },
    "pes_voteoptions_1": {
        "display_label": "Advance voting was available voting option",
        "concepts": ["voting accessibility", "voting options"],
        "themes": ["elections", "voting"],
    },
    "pes_voteoptions_2": {
        "display_label": "Assigned polling station was available voting option",
        "concepts": ["voting accessibility", "voting options"],
        "themes": ["elections", "voting"],
    },
    "pes_voteoptions_3": {
        "display_label": "Polling station in home riding was available voting option",
        "concepts": ["voting accessibility", "voting options"],
        "themes": ["elections", "voting"],
    },
    "pes_voteoptions_4": {
        "display_label": "Any polling station in riding was available voting option",
        "concepts": ["voting accessibility", "voting options"],
        "themes": ["elections", "voting"],
    },
    "pes_voteoptions_5": {
        "display_label": "Any polling station outside riding was available voting option",
        "concepts": ["voting accessibility", "voting options"],
        "themes": ["elections", "voting"],
    },
    "pes_voteoptions_6": {
        "display_label": "Mail-in voting was available voting option",
        "concepts": ["voting accessibility", "voting options", "mail-in voting"],
        "themes": ["elections", "voting"],
    },
    "pes_voteoptions_7": {
        "display_label": "Phone voting was available voting option",
        "concepts": ["voting accessibility", "voting options"],
        "themes": ["elections", "voting"],
    },
    "pes_voteoptions_8": {
        "display_label": "Online voting was available voting option",
        "concepts": ["voting accessibility", "voting options"],
        "themes": ["elections", "voting", "digital"],
    },
    "pes_contactparty_8": {
        "display_label": "Another party contacted during campaign",
        "concepts": ["campaign contact", "party mobilization"],
        "themes": ["elections", "parties"],
    },
    "pes_contactparty_9": {
        "display_label": "Do not remember if contacted during campaign",
        "concepts": ["campaign contact"],
        "themes": ["elections"],
    },
    "pes_biling": {
        "display_label": "Gone too far in pushing bilingualism in Canada",
        "concepts": ["language policy", "bilingualism"],
        "themes": ["language", "federal"],
    },
    "pes_bendrules": {
        "display_label": "Strong leader is good for Quebec even if bends rules",
        "concepts": ["authoritarianism", "leadership"],
        "themes": ["politics", "governance"],
    },
    "pes_cultureharm": {
        "display_label": "Quebec culture is harmed by immigrants",
        "concepts": ["immigration attitudes", "cultural threat"],
        "themes": ["immigration", "culture"],
    },
    "pes_immfitin_qc": {
        "display_label": "Too many recent immigrants do not want to fit into Quebec society",
        "concepts": ["immigrant integration", "immigration attitudes"],
        "themes": ["immigration"],
    },
    "pes_immjobs_qc": {
        "display_label": "Immigrants take jobs away from Quebecers",
        "concepts": ["immigration attitudes", "economic impact"],
        "themes": ["immigration", "economy"],
    },
    "pes_immigrantcrime": {
        "display_label": "Immigrants are responsible for increased crime",
        "concepts": ["immigration attitudes", "prejudice"],
        "themes": ["immigration", "crime"],
    },
    "pes_immparents": {
        "display_label": "At least one parent born outside Canada",
        "concepts": ["immigration background", "family history"],
        "themes": ["demographics", "immigration"],
    },
    "pes_immecon": {
        "display_label": "Immigrants benefit Quebec economically",
        "concepts": ["immigration attitudes", "economic impact"],
        "themes": ["immigration", "economy"],
    },
    "pes_minoritiesadapt": {
        "display_label": "Minority groups should adapt to Quebec culture",
        "concepts": ["cultural assimilation", "integration attitudes"],
        "themes": ["identity", "multiculturalism"],
    },
    "pes_doindigenous": {
        "display_label": "How much should be done for Indigenous peoples in Quebec",
        "concepts": ["indigenous rights", "group attitudes"],
        "themes": ["identity", "indigenous"],
    },
    "pes_dowomen": {
        "display_label": "How much should be done for women in Quebec",
        "concepts": ["gender equality", "group attitudes"],
        "themes": ["gender", "social"],
    },
    "pes_dogays": {
        "display_label": "How much should be done for lesbian and gay people in Quebec",
        "concepts": ["LGBTQ rights", "group attitudes"],
        "themes": ["gender", "rights"],
    },
    "pes_dolangmin": {
        "display_label": "How much should be done for Anglophones in Quebec",
        "concepts": ["linguistic minorities", "group attitudes"],
        "themes": ["language", "identity"],
    },
    "pes_dominorities": {
        "display_label": "How much should be done for racial minorities in Quebec",
        "concepts": ["racial equality", "group attitudes"],
        "themes": ["race", "social"],
    },
    "pes_groupdiscrim_1": {
        "display_label": "Indigenous peoples face discrimination in Quebec",
        "concepts": ["discrimination", "indigenous"],
        "themes": ["identity", "indigenous"],
    },
    "pes_groupdiscrim_2": {
        "display_label": "Black and racialized people face discrimination in Quebec",
        "concepts": ["discrimination", "racism"],
        "themes": ["race", "social"],
    },
    "pes_groupdiscrim_3": {
        "display_label": "Immigrants face discrimination in Quebec",
        "concepts": ["discrimination", "immigration"],
        "themes": ["immigration", "social"],
    },
    "pes_groupdiscrim_4": {
        "display_label": "Women face discrimination in Quebec",
        "concepts": ["discrimination", "gender"],
        "themes": ["gender", "social"],
    },
    "pes_groupdiscrim_5": {
        "display_label": "Men face discrimination in Quebec",
        "concepts": ["discrimination", "gender"],
        "themes": ["gender", "social"],
    },
    "pes_groupdiscrim_6": {
        "display_label": "Lesbian and gay people face discrimination in Quebec",
        "concepts": ["discrimination", "LGBTQ"],
        "themes": ["gender", "rights"],
    },
    "pes_groupdiscrim_7": {
        "display_label": "Transgender people face discrimination in Quebec",
        "concepts": ["discrimination", "transgender"],
        "themes": ["gender", "identity"],
    },
    "pes_nativism_1": {
        "display_label": "Being born in Quebec is important for Quebec identity",
        "concepts": ["national identity", "nativism"],
        "themes": ["identity", "quebec"],
    },
    "pes_nativism_2": {
        "display_label": "Having grandparents born in Quebec is important for Quebec identity",
        "concepts": ["national identity", "nativism"],
        "themes": ["identity", "quebec"],
    },
    "pes_nativism_3": {
        "display_label": "Speaking French is important for Quebec identity",
        "concepts": ["national identity", "language"],
        "themes": ["identity", "language"],
    },
    "pes_nativism_4": {
        "display_label": "Speaking English is important for Quebec identity",
        "concepts": ["national identity", "language"],
        "themes": ["identity", "language"],
    },
    "pes_nativism_5": {
        "display_label": "Respecting Quebec customs and traditions is important for Quebec identity",
        "concepts": ["national identity", "cultural values"],
        "themes": ["identity", "quebec"],
    },
    "pes_nativism_6": {
        "display_label": "Living most of life in Quebec is important for Quebec identity",
        "concepts": ["national identity"],
        "themes": ["identity", "quebec"],
    },
    "pes_nativism_7": {
        "display_label": "Feeling Québécois is important for Quebec identity",
        "concepts": ["national identity", "quebec identity"],
        "themes": ["identity", "quebec"],
    },
    "pes_nativism_8": {
        "display_label": "Sharing Quebec values is important for Quebec identity",
        "concepts": ["national identity", "cultural values"],
        "themes": ["identity", "quebec"],
    },
    "pes_nativism_9": {
        "display_label": "Respecting Quebec political institutions and laws is important for Quebec identity",
        "concepts": ["national identity", "civic participation"],
        "themes": ["identity", "quebec"],
    },
    "pes_resent1": {
        "display_label": "Indigenous territorial rights demands are unreasonable",
        "concepts": ["resentment", "indigenous attitudes"],
        "themes": ["identity", "indigenous"],
    },
    "pes_resent2": {
        "display_label": "Indigenous peoples receive unfair tax breaks",
        "concepts": ["resentment", "indigenous attitudes"],
        "themes": ["identity", "indigenous"],
    },
    "pes_resent3": {
        "display_label": "Immigrant minorities have overcome barriers like Irish, Jewish, Chinese",
        "concepts": ["immigration narratives", "integration attitudes"],
        "themes": ["immigration", "social"],
    },
    "pes_resent4": {
        "display_label": "More should be done to protect Indigenous languages",
        "concepts": ["cultural preservation", "indigenous"],
        "themes": ["language", "identity"],
    },
    "pes_provcommon": {
        "display_label": "Common identity with other Quebecers",
        "concepts": ["provincial identity", "group identification"],
        "themes": ["identity", "quebec"],
    },
    "pes_provid_fact": {
        "display_label": "Often thinks about being Québécois",
        "concepts": ["provincial identity", "identity salience"],
        "themes": ["identity", "quebec"],
    },
    "pes_provid_glad": {
        "display_label": "Glad to be Québécois",
        "concepts": ["provincial identity", "group affect"],
        "themes": ["identity", "quebec"],
    },
    "pes_racism_qc": {
        "display_label": "Racism exists in Quebec",
        "concepts": ["racism perception", "racial discrimination"],
        "themes": ["race", "social"],
    },
    "pes_employed": {
        "display_label": "Employment status",
        "concepts": ["employment", "socioeconomic status"],
        "themes": ["demographics", "economy"],
    },
    "pes_work": {
        "display_label": "Sector of employment - private, public or non-profit",
        "concepts": ["employment", "employment sector"],
        "themes": ["economy"],
    },
    "pes_union": {
        "display_label": "Belongs to labor union",
        "concepts": ["union membership", "employment"],
        "themes": ["economy"],
    },
    "pes_covid_employ": {
        "display_label": "Employment situation changed since pandemic start",
        "concepts": ["covid impact", "employment"],
        "themes": ["economy", "covid"],
    },
    "pes_covid_employ2_1": {
        "display_label": "Permanently lost job due to pandemic",
        "concepts": ["covid impact", "employment"],
        "themes": ["economy", "covid"],
    },
    "pes_covid_employ2_2": {
        "display_label": "Temporarily lost job due to pandemic",
        "concepts": ["covid impact", "employment"],
        "themes": ["economy", "covid"],
    },
    "pes_covid_employ2_3": {
        "display_label": "Still employed but hours/wages reduced due to pandemic",
        "concepts": ["covid impact", "employment"],
        "themes": ["economy", "covid"],
    },
    "pes_covid_employ2_4": {
        "display_label": "Changed job or employer due to pandemic",
        "concepts": ["covid impact", "employment"],
        "themes": ["economy", "covid"],
    },
    "pes_covid_employ2_5": {
        "display_label": "Other employment change due to pandemic",
        "concepts": ["covid impact", "employment"],
        "themes": ["economy", "covid"],
    },
    "pes_covidwork": {
        "display_label": "Role during pandemic - work, home, caregiving",
        "concepts": ["covid impact", "caregiving"],
        "themes": ["economy", "covid", "social"],
    },
    "pes_covidincome": {
        "display_label": "Impact of pandemic on household income",
        "concepts": ["covid impact", "income"],
        "themes": ["economy", "covid"],
    },
    "pes_own_1": {
        "display_label": "Own or family member owns residence",
        "concepts": ["asset ownership", "wealth"],
        "themes": ["economy", "demographics"],
    },
    "pes_own_2": {
        "display_label": "Own or family member owns business, property or farm",
        "concepts": ["asset ownership", "wealth"],
        "themes": ["economy", "demographics"],
    },
    "pes_own_3": {
        "display_label": "Own or family member owns stocks or bonds",
        "concepts": ["asset ownership", "wealth"],
        "themes": ["economy", "demographics"],
    },
    "pes_own_4": {
        "display_label": "Own or family member has savings",
        "concepts": ["asset ownership", "wealth"],
        "themes": ["economy", "demographics"],
    },
    "pes_own_5": {
        "display_label": "Own nothing - no assets",
        "concepts": ["asset ownership", "economic vulnerability"],
        "themes": ["economy", "demographics"],
    },
    "pes_privjobs": {
        "display_label": "Government should create more private sector jobs",
        "concepts": ["economic policy", "job creation"],
        "themes": ["economy", "government"],
    },
    "pes_fallingbehind": {
        "display_label": "Some people are falling behind economically in Quebec",
        "concepts": ["economic inequality", "social stratification"],
        "themes": ["economy", "social"],
    },
    "pes_reducegap": {
        "display_label": "Government should reduce income gap",
        "concepts": ["economic inequality", "redistribution"],
        "themes": ["economy", "social"],
    },
    "pes_othersahead": {
        "display_label": "Others are getting ahead unfairly",
        "concepts": ["relative deprivation", "fairness"],
        "themes": ["economy", "social"],
    },
    "pes_stdofliving": {
        "display_label": "Standard of living has improved",
        "concepts": ["economic evaluation", "personal economy"],
        "themes": ["economy"],
    },
    "pes_zerosum": {
        "display_label": "One person's gain is another's loss",
        "concepts": ["zero-sum beliefs", "economic attitudes"],
        "themes": ["economy", "social"],
    },
    "pes_married": {
        "display_label": "Marital status",
        "concepts": ["marital status", "household"],
        "themes": ["demographics"],
    },
    "pes_kids": {
        "display_label": "Has children",
        "concepts": ["parental status", "household"],
        "themes": ["demographics"],
    },
    "pes_schoolkids": {
        "display_label": "Children are school age",
        "concepts": ["parental status", "children"],
        "themes": ["demographics"],
    },
    "pes_household": {
        "display_label": "Number of people in household",
        "concepts": ["household size", "demographics"],
        "themes": ["demographics"],
    },
    "pes_orientation": {
        "display_label": "Sexual orientation identity",
        "concepts": ["sexual orientation", "identity"],
        "themes": ["demographics", "identity"],
    },
    "pes_identify_1": {
        "display_label": "Identification with town or city",
        "concepts": ["local identity", "civic identity"],
        "themes": ["demographics", "identity"],
    },
    "pes_identify_2": {
        "display_label": "Identification with Quebec",
        "concepts": ["quebec identity", "civic identity"],
        "themes": ["demographics", "identity", "quebec"],
    },
    "pes_identify_3": {
        "display_label": "Identification with Canada",
        "concepts": ["canadian identity", "civic identity"],
        "themes": ["demographics", "identity"],
    },
    "pes_feminine_1": {
        "display_label": "Self-identification on femininity scale",
        "concepts": ["gender identity", "gender expression"],
        "themes": ["demographics", "gender"],
    },
    "pes_masculine_1": {
        "display_label": "Self-identification on masculinity scale",
        "concepts": ["gender identity", "gender expression"],
        "themes": ["demographics", "gender"],
    },
    "pes_langhome_1": {
        "display_label": "English spoken at home",
        "concepts": ["home language", "bilingualism"],
        "themes": ["demographics", "language"],
    },
    "pes_langhome_2": {
        "display_label": "French spoken at home",
        "concepts": ["home language", "bilingualism"],
        "themes": ["demographics", "language"],
    },
    "pes_langhome_3": {
        "display_label": "Indigenous language spoken at home",
        "concepts": ["home language", "indigenous"],
        "themes": ["demographics", "language"],
    },
    "pes_langhome_4": {
        "display_label": "Arabic spoken at home",
        "concepts": ["home language", "immigrant language"],
        "themes": ["demographics", "language"],
    },
    "pes_langhome_5": {
        "display_label": "Chinese/Cantonese/Mandarin spoken at home",
        "concepts": ["home language", "immigrant language"],
        "themes": ["demographics", "language"],
    },
    "pes_langhome_6": {
        "display_label": "Filipino/Tagalog spoken at home",
        "concepts": ["home language", "immigrant language"],
        "themes": ["demographics", "language"],
    },
    "pes_langhome_7": {
        "display_label": "German spoken at home",
        "concepts": ["home language", "immigrant language"],
        "themes": ["demographics", "language"],
    },
    "pes_langhome_8": {
        "display_label": "Hindi/Gujarati/Indian languages spoken at home",
        "concepts": ["home language", "immigrant language"],
        "themes": ["demographics", "language"],
    },
    "pes_langhome_9": {
        "display_label": "Italian spoken at home",
        "concepts": ["home language", "immigrant language"],
        "themes": ["demographics", "language"],
    },
    "pes_langhome_10": {
        "display_label": "Korean spoken at home",
        "concepts": ["home language", "immigrant language"],
        "themes": ["demographics", "language"],
    },
    "pes_langhome_11": {
        "display_label": "Punjabi/Urdu/Pakistani languages spoken at home",
        "concepts": ["home language", "immigrant language"],
        "themes": ["demographics", "language"],
    },
    "pes_langhome_12": {
        "display_label": "Farsi/Persian spoken at home",
        "concepts": ["home language", "immigrant language"],
        "themes": ["demographics", "language"],
    },
    "pes_langhome_13": {
        "display_label": "Russian spoken at home",
        "concepts": ["home language", "immigrant language"],
        "themes": ["demographics", "language"],
    },
    "pes_langhome_14": {
        "display_label": "Spanish spoken at home",
        "concepts": ["home language", "immigrant language"],
        "themes": ["demographics", "language"],
    },
    "pes_langhome_15": {
        "display_label": "Tamil spoken at home",
        "concepts": ["home language", "immigrant language"],
        "themes": ["demographics", "language"],
    },
    "pes_langhome_16": {
        "display_label": "Vietnamese spoken at home",
        "concepts": ["home language", "immigrant language"],
        "themes": ["demographics", "language"],
    },
    "pes_langhome_17": {
        "display_label": "Other language spoken at home",
        "concepts": ["home language", "immigrant language"],
        "themes": ["demographics", "language"],
    },
    "pes_race_1": {
        "display_label": "Identifies as White",
        "concepts": ["racial identity"],
        "themes": ["demographics", "identity"],
    },
    "pes_race_2": {
        "display_label": "Identifies as Indigenous",
        "concepts": ["racial identity", "indigenous"],
        "themes": ["demographics", "identity"],
    },
    "pes_race_3": {
        "display_label": "Identifies as South Asian",
        "concepts": ["racial identity"],
        "themes": ["demographics", "identity"],
    },
    "pes_race_4": {
        "display_label": "Identifies as Chinese",
        "concepts": ["racial identity"],
        "themes": ["demographics", "identity"],
    },
    "pes_race_5": {
        "display_label": "Identifies as Black",
        "concepts": ["racial identity"],
        "themes": ["demographics", "identity"],
    },
    "pes_race_6": {
        "display_label": "Identifies as Filipino",
        "concepts": ["racial identity"],
        "themes": ["demographics", "identity"],
    },
    "pes_race_7": {
        "display_label": "Identifies as Latin American",
        "concepts": ["racial identity"],
        "themes": ["demographics", "identity"],
    },
    "pes_race_8": {
        "display_label": "Identifies as Arab",
        "concepts": ["racial identity"],
        "themes": ["demographics", "identity"],
    },
    "pes_race_9": {
        "display_label": "Identifies as Southeast Asian",
        "concepts": ["racial identity"],
        "themes": ["demographics", "identity"],
    },
    "pes_race_10": {
        "display_label": "Identifies as West Asian",
        "concepts": ["racial identity"],
        "themes": ["demographics", "identity"],
    },
    "pes_race_11": {
        "display_label": "Identifies as Korean",
        "concepts": ["racial identity"],
        "themes": ["demographics", "identity"],
    },
    "pes_race_12": {
        "display_label": "Identifies as Japanese",
        "concepts": ["racial identity"],
        "themes": ["demographics", "identity"],
    },
    "pes_race_13": {
        "display_label": "Identifies as other racial or ethnic group",
        "concepts": ["racial identity"],
        "themes": ["demographics", "identity"],
    },
    "pes_otherprov_1": {
        "display_label": "Ever lived in Prince Edward Island",
        "concepts": ["residential history"],
        "themes": ["demographics", "geography"],
    },
    "pes_otherprov_2": {
        "display_label": "Ever lived in Newfoundland and Labrador",
        "concepts": ["residential history"],
        "themes": ["demographics", "geography"],
    },
    "pes_otherprov_3": {
        "display_label": "Ever lived in New Brunswick",
        "concepts": ["residential history"],
        "themes": ["demographics", "geography"],
    },
    "pes_otherprov_4": {
        "display_label": "Ever lived in Ontario",
        "concepts": ["residential history"],
        "themes": ["demographics", "geography"],
    },
    "pes_otherprov_5": {
        "display_label": "Ever lived in Nova Scotia",
        "concepts": ["residential history"],
        "themes": ["demographics", "geography"],
    },
    "pes_otherprov_6": {
        "display_label": "Ever lived in Manitoba",
        "concepts": ["residential history"],
        "themes": ["demographics", "geography"],
    },
    "pes_otherprov_7": {
        "display_label": "Ever lived in Saskatchewan",
        "concepts": ["residential history"],
        "themes": ["demographics", "geography"],
    },
    "pes_otherprov_8": {
        "display_label": "Ever lived in Alberta",
        "concepts": ["residential history"],
        "themes": ["demographics", "geography"],
    },
    "pes_otherprov_9": {
        "display_label": "Ever lived in British Columbia",
        "concepts": ["residential history"],
        "themes": ["demographics", "geography"],
    },
    "pes_otherprov_10": {
        "display_label": "Ever lived in Yukon",
        "concepts": ["residential history"],
        "themes": ["demographics", "geography"],
    },
    "pes_otherprov_11": {
        "display_label": "Ever lived in Northwest Territories",
        "concepts": ["residential history"],
        "themes": ["demographics", "geography"],
    },
    "pes_otherprov_12": {
        "display_label": "Ever lived in Nunavut",
        "concepts": ["residential history"],
        "themes": ["demographics", "geography"],
    },
    "pes_otherprov_13": {
        "display_label": "Ever lived outside Canada",
        "concepts": ["residential history"],
        "themes": ["demographics", "geography"],
    },
    "pes_rural": {
        "display_label": "Type of area of residence",
        "concepts": ["residence type", "urbanity"],
        "themes": ["demographics", "geography"],
    },
    "pes_livedincomm": {
        "display_label": "Years living in current city or community",
        "concepts": ["residential stability"],
        "themes": ["demographics", "geography"],
    },
    "pes_yearsprov": {
        "display_label": "Years living in Quebec",
        "concepts": ["residential history"],
        "themes": ["demographics", "geography"],
    },
    "pes_participation1_1": {
        "display_label": "Participated in political meeting or speech",
        "concepts": ["political participation", "civic engagement"],
        "themes": ["participation", "politics"],
    },
    "pes_participation1_2": {
        "display_label": "Participated in march, rally or protest",
        "concepts": ["political participation", "collective action"],
        "themes": ["participation", "politics"],
    },
    "pes_participation1_3": {
        "display_label": "Bought products for political or ethical reasons",
        "concepts": ["consumer activism", "political behavior"],
        "themes": ["participation"],
    },
    "pes_participation2_1": {
        "display_label": "Followed politician or candidate on social media",
        "concepts": ["political engagement", "digital participation"],
        "themes": ["participation", "digital", "politics"],
    },
    "pes_participation2_2": {
        "display_label": "Volunteered for political party or candidate",
        "concepts": ["political participation", "party volunteering"],
        "themes": ["participation", "parties"],
    },
    "pes_participation2_3": {
        "display_label": "Contacted political representative",
        "concepts": ["political participation", "political efficacy"],
        "themes": ["participation", "politics"],
    },
    "pes_participation2_4": {
        "display_label": "Donated to political party or candidate",
        "concepts": ["political participation", "party support"],
        "themes": ["participation", "parties"],
    },
    "pes_participation3_1": {
        "display_label": "Active in group or organization",
        "concepts": ["civic participation", "organizational membership"],
        "themes": ["participation", "social"],
    },
    "pes_participation3_2": {
        "display_label": "Donated to charity",
        "concepts": ["civic participation", "charitable giving"],
        "themes": ["participation", "social"],
    },
    "pes_participation3_3": {
        "display_label": "Shared or commented on information on social media",
        "concepts": ["digital participation", "civic engagement"],
        "themes": ["participation", "digital", "media"],
    },
    "pes_participation3_4": {
        "display_label": "Used social media to discuss politics",
        "concepts": ["digital participation", "political engagement"],
        "themes": ["participation", "digital", "politics"],
    },
    "pes_participation3_5": {
        "display_label": "Signed petition online or in person",
        "concepts": ["civic participation", "collective action"],
        "themes": ["participation"],
    },
    "pes_participation3_6": {
        "display_label": "Volunteered for organization or school",
        "concepts": ["civic participation", "volunteering"],
        "themes": ["participation", "social"],
    },
    "pes_partymember": {
        "display_label": "Ever been member of political party",
        "concepts": ["party membership", "political participation"],
        "themes": ["parties", "participation"],
    },
    "pes_network": {
        "display_label": "Member of social or professional network",
        "concepts": ["social capital", "networking"],
        "themes": ["social"],
    },
    "pes_gettogether": {
        "display_label": "Gets together with friends",
        "concepts": ["social interaction", "friendship"],
        "themes": ["social"],
    },
    "pes_friendsethnic": {
        "display_label": "Close friends from same ethnic background",
        "concepts": ["social networks", "ethnic homogeneity"],
        "themes": ["social", "identity"],
    },
    "pes_discussfriends": {
        "display_label": "Frequency of discussing politics with family and friends",
        "concepts": ["political discussion", "social networks"],
        "themes": ["politics", "social"],
    },
    "pes_disagreefriends": {
        "display_label": "How many close friends disagree about politics",
        "concepts": ["political disagreement", "social networks"],
        "themes": ["politics", "social"],
    },
    "pes_govtcare": {
        "display_label": "Government does not care what people like me think",
        "concepts": ["political alienation", "government responsiveness"],
        "themes": ["efficacy", "trust"],
    },
    "pes_provlosetouch": {
        "display_label": "Elected legislators lose touch with people",
        "concepts": ["political alienation", "representative responsiveness"],
        "themes": ["efficacy", "democracy"],
    },
    "pes_trust": {
        "display_label": "Generalized social trust (most people can be trusted)",
        "concepts": ["social trust", "interpersonal trust"],
        "themes": ["trust", "social"],
    },
    "pes_peopledecide": {
        "display_label": "People should decide major decisions not government",
        "concepts": ["direct democracy", "political philosophy"],
        "themes": ["democracy", "efficacy"],
    },
    "pes_richinterests": {
        "display_label": "Government favors interests of rich",
        "concepts": ["economic inequality", "government bias"],
        "themes": ["economy", "social", "trust"],
    },
    "pes_politprob": {
        "display_label": "Political system has serious problems",
        "concepts": ["political dissatisfaction", "regime criticism"],
        "themes": ["politics", "trust"],
    },
    "pes_fedpower": {
        "display_label": "Federal government has too much power",
        "concepts": ["federalism", "power distribution"],
        "themes": ["federalism", "government"],
    },
    "pes_provspend": {
        "display_label": "Opinion on Quebec government spending",
        "concepts": ["fiscal policy", "government spending"],
        "themes": ["government", "economy"],
    },
    "pes_qc_priorities2": {
        "display_label": "Most important priority for Quebec",
        "concepts": ["policy priorities", "issue salience"],
        "themes": ["quebec", "issues"],
    },
    "pes_provlegis_women": {
        "display_label": "Approval of women in provincial legislature",
        "concepts": ["gender representation", "political attitudes"],
        "themes": ["gender", "politics"],
    },
    "pes_q23": {
        "display_label": "Voted in 1995 Quebec sovereignty referendum",
        "concepts": ["quebec sovereignty", "1995 referendum"],
        "themes": ["quebec", "sovereignty", "elections"],
    },
    "pes_q24": {
        "display_label": "Vote choice in 1995 Quebec sovereignty referendum (yes/no)",
        "concepts": ["quebec sovereignty", "1995 referendum"],
        "themes": ["quebec", "sovereignty", "elections"],
    },
    "pes_willmajority": {
        "display_label": "Prediction about election outcome",
        "concepts": ["political prediction"],
        "themes": ["elections"],
    },
}
