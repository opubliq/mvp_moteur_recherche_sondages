"""Enrichment authoré — ces_2025. Produit par subagent LLM (2026-08-28)."""

SURVEY = {
    "description": "2025 Canadian Election Study (Stephenson, Harell, Rubenson et al.) — two-wave study (CPS: pre-election campaign period, PES: post-election) conducted around the April 28, 2025 Canadian federal election.",
    "month": 4,  # April 2025 federal election
}

QUESTIONS = {
    "cps25_citizenship": {
        "display_label": "Question: Are you a...",
        "concepts": ["canadian politics", "election study"],
        "themes": ["elections"],
    },
    "cps25_citizen_other": {
        "display_label": "Question: Are you a citizen of any other country?",
        "concepts": ["canadian politics", "election study"],
        "themes": ["elections"],
    },
    "cps25_citizen_other2": {
        "display_label": "Question: What other country are you a citizen of?",
        "concepts": ["canadian politics", "election study"],
        "themes": ["elections"],
    },
    "cps25_citizen_other3": {
        "display_label": "Question: Please list all countries of citizenship in the text box below.",
        "concepts": ["canadian politics", "election study"],
        "themes": ["elections"],
    },
    "cps25_age_in_years": {
        "display_label": "Age in years",
        "concepts": ["age"],
        "themes": ["demographics"],
    },
    "cps25_genderid": {
        "display_label": "Gender identity",
        "concepts": ["gender", "identity"],
        "themes": ["demographics"],
    },
    "cps25_genderid_4_TEXT": {
        "display_label": "Question: Are you...? - Another gender, please specify: - Text",
        "concepts": ["canadian politics", "election study"],
        "themes": ["elections"],
    },
    "cps25_trans": {
        "display_label": "Question: Are you transgender?",
        "concepts": ["canadian politics", "election study"],
        "themes": ["elections"],
    },
    "cps25_province": {
        "display_label": "Province or territory of residence (CPS)",
        "concepts": ["province", "geography"],
        "themes": ["demographics", "geography"],
    },
    "cps25_education": {
        "display_label": "Highest level of education completed",
        "concepts": ["education", "attainment"],
        "themes": ["demographics"],
    },
    "cps25_demsat": {
        "display_label": "Question: On the whole, how satisfied are you with the way democracy works in Canada?",
        "concepts": ["canadian politics", "election study"],
        "themes": ["elections"],
    },
    "cps25_imp_iss": {
        "display_label": "Question: What is the most important issue to you personally in this federal election? If",
        "concepts": ["canadian politics", "election study"],
        "themes": ["elections"],
    },
    "cps25_imp_iss_party": {
        "display_label": "Question: Which party is best at addressing this issue? - Selected Choice",
        "concepts": ["canadian politics", "election study"],
        "themes": ["elections"],
    },
    "cps25_imp_iss_party_6_TEXT": {
        "display_label": "Question: Which party is best at addressing this issue? - Another party (please specify)",
        "concepts": ["canadian politics", "election study"],
        "themes": ["elections"],
    },
    "cps25_interest_gen_1": {
        "display_label": "Question: How interested are you in politics generally? Set the slider to a number from 0",
        "concepts": ["canadian politics", "election study"],
        "themes": ["elections"],
    },
    "cps25_v_likely": {
        "display_label": "Question: On election day, are you...",
        "concepts": ["canadian politics", "election study"],
        "themes": ["elections"],
    },
    "cps25_v_likely_pr": {
        "display_label": "Question: If you become a Canadian citizen, how likely are you to vote in the first electi",
        "concepts": ["canadian politics", "election study"],
        "themes": ["elections"],
    },
    "cps25_howvote1": {
        "display_label": "Question: How are you most likely to vote?",
        "concepts": ["canadian politics", "election study"],
        "themes": ["elections"],
    },
    "cps25_howvote2": {
        "display_label": "Question: How did you vote?",
        "concepts": ["canadian politics", "election study"],
        "themes": ["elections"],
    },
    "cps25_howvote3": {
        "display_label": "Question: If you choose to vote in the current election, what voting method do you think y",
        "concepts": ["canadian politics", "election study"],
        "themes": ["elections"],
    },
    "cps25_votechoice": {
        "display_label": "Question: Which party do you think you will vote for? - Selected Choice",
        "concepts": ["canadian politics", "election study"],
        "themes": ["elections"],
    },
    "cps25_votechoice_6_TEXT": {
        "display_label": "Question: Which party do you think you will vote for? - Another party (please specify) - T",
        "concepts": ["canadian politics", "election study"],
        "themes": ["elections"],
    },
    "cps25_votechoice_pr": {
        "display_label": "Question: If you could vote in this election, which party do you think you would vote for?",
        "concepts": ["canadian politics", "election study"],
        "themes": ["elections"],
    },
    "cps25_votechoice_pr_6_TEXT": {
        "display_label": "Question: If you could vote in this election, which party do you think you would vote for?",
        "concepts": ["canadian politics", "election study"],
        "themes": ["elections"],
    },
    "cps25_vote_unlikely": {
        "display_label": "Question: If you decide to vote, which party do you think you will vote for? - Selected Ch",
        "concepts": ["canadian politics", "election study"],
        "themes": ["elections"],
    },
    "cps25_vote_unlikely_6_TEXT": {
        "display_label": "Question: If you decide to vote, which party do you think you will vote for? - Another par",
        "concepts": ["canadian politics", "election study"],
        "themes": ["elections"],
    },
    "cps25_vote_unlike_pr": {
        "display_label": "Question: If you could vote in this election, and decided to vote, which party do you thin",
        "concepts": ["canadian politics", "election study"],
        "themes": ["elections"],
    },
    "cps25_vote_unlike_pr_6_TEXT": {
        "display_label": "Question: If you could vote in this election, and decided to vote, which party do you thin",
        "concepts": ["canadian politics", "election study"],
        "themes": ["elections"],
    },
    "cps25_v_advance": {
        "display_label": "Question: For which party did you vote? - Selected Choice",
        "concepts": ["canadian politics", "election study"],
        "themes": ["elections"],
    },
    "cps25_v_advance_6_TEXT": {
        "display_label": "Question: For which party did you vote? - Another party (please specify) - Text",
        "concepts": ["canadian politics", "election study"],
        "themes": ["elections"],
    },
    "cps25_not_vote_for_1": {
        "display_label": "Question: Are there any parties that you would absolutely not vote for? (Select all that a",
        "concepts": ["canadian politics", "election study"],
        "themes": ["elections"],
    },
    "cps25_not_vote_for_2": {
        "display_label": "Question: Are there any parties that you would absolutely not vote for? (Select all that a",
        "concepts": ["canadian politics", "election study"],
        "themes": ["elections"],
    },
    "cps25_not_vote_for_3": {
        "display_label": "Question: Are there any parties that you would absolutely not vote for? (Select all that a",
        "concepts": ["canadian politics", "election study"],
        "themes": ["elections"],
    },
    "cps25_not_vote_for_4": {
        "display_label": "Question: Are there any parties that you would absolutely not vote for? (Select all that a",
        "concepts": ["canadian politics", "election study"],
        "themes": ["elections"],
    },
    "cps25_not_vote_for_5": {
        "display_label": "Question: Are there any parties that you would absolutely not vote for? (Select all that a",
        "concepts": ["canadian politics", "election study"],
        "themes": ["elections"],
    },
    "cps25_not_vote_for_9": {
        "display_label": "Question: Are there any parties that you would absolutely not vote for? (Select all that a",
        "concepts": ["canadian politics", "election study"],
        "themes": ["elections"],
    },
    "cps25_not_vote_for_6": {
        "display_label": "Question: Are there any parties that you would absolutely not vote for? (Select all that a",
        "concepts": ["canadian politics", "election study"],
        "themes": ["elections"],
    },
    "cps25_not_vote_for_7": {
        "display_label": "Question: Are there any parties that you would absolutely not vote for? (Select all that a",
        "concepts": ["canadian politics", "election study"],
        "themes": ["elections"],
    },
    "cps25_not_vote_for_8": {
        "display_label": "Question: Are there any parties that you would absolutely not vote for? (Select all that a",
        "concepts": ["canadian politics", "election study"],
        "themes": ["elections"],
    },
    "cps25_not_vote_for_6_TEXT": {
        "display_label": "Question: Are there any parties that you would absolutely not vote for? (Select all that a",
        "concepts": ["canadian politics", "election study"],
        "themes": ["elections"],
    },
    "cps25_not_vote_for_w_1": {
        "display_label": "Question: Why would you not vote for this party/these parties? (Select all that apply) - S",
        "concepts": ["canadian politics", "election study"],
        "themes": ["elections"],
    },
    "cps25_not_vote_for_w_2": {
        "display_label": "Question: Why would you not vote for this party/these parties? (Select all that apply) - S",
        "concepts": ["canadian politics", "election study"],
        "themes": ["elections"],
    },
    "cps25_not_vote_for_w_3": {
        "display_label": "Question: Why would you not vote for this party/these parties? (Select all that apply) - S",
        "concepts": ["canadian politics", "election study"],
        "themes": ["elections"],
    },
    "cps25_not_vote_for_w_4": {
        "display_label": "Question: Why would you not vote for this party/these parties? (Select all that apply) - S",
        "concepts": ["canadian politics", "election study"],
        "themes": ["elections"],
    },
    "cps25_not_vote_for_w_5": {
        "display_label": "Question: Why would you not vote for this party/these parties? (Select all that apply) - S",
        "concepts": ["canadian politics", "election study"],
        "themes": ["elections"],
    },
    "cps25_not_vote_for_w_4_TEXT": {
        "display_label": "Reasons for not voting for specific political parties",
        "concepts": ["negative voting", "party rejection"],
        "themes": ["elections", "parties"],
    },
    "cps25_not_vote_forw2": {
        "display_label": "Reasons for not voting for specific political parties",
        "concepts": ["negative voting", "party rejection"],
        "themes": ["elections", "parties"],
    },
    "cps25_fed_gov_sat": {
        "display_label": "Question: How satisfied are you with the performance of the federal government under Justi",
        "concepts": ["canadian politics", "election study"],
        "themes": ["elections"],
    },
    "cps25_fed_gov_sat_2": {
        "display_label": "Question: How satisfied are you with the performance of the federal government?",
        "concepts": ["canadian politics", "election study"],
        "themes": ["elections"],
    },
    "cps25_party_rating_23": {
        "display_label": "Feeling toward Liberal Party",
        "concepts": ["party affect", "feeling thermometer", "liberal party"],
        "themes": ["parties"],
    },
    "cps25_party_rating_24": {
        "display_label": "Feeling toward Conservative Party",
        "concepts": ["party affect", "feeling thermometer", "conservative party"],
        "themes": ["parties"],
    },
    "cps25_party_rating_25": {
        "display_label": "Feeling toward NDP",
        "concepts": ["party affect", "feeling thermometer", "ndp"],
        "themes": ["parties"],
    },
    "cps25_party_rating_26": {
        "display_label": "Feeling toward Bloc Québécois",
        "concepts": ["party affect", "feeling thermometer", "bloc québécois"],
        "themes": ["parties"],
    },
    "cps25_party_rating_27": {
        "display_label": "Feeling toward Green Party",
        "concepts": ["party affect", "feeling thermometer", "green party"],
        "themes": ["parties"],
    },
    "cps25_party_rating_29": {
        "display_label": "Feeling toward People's Party (PPC)",
        "concepts": ["party affect", "feeling thermometer", "people's party (ppc)"],
        "themes": ["parties"],
    },
    "cps25_lead_rating_23": {
        "display_label": "Feeling toward Justin Trudeau",
        "concepts": ["leader affect", "feeling thermometer", "justin trudeau"],
        "themes": ["leadership", "parties"],
    },
    "cps25_lead_rating_24": {
        "display_label": "Feeling toward Pierre Poilievre",
        "concepts": ["leader affect", "feeling thermometer", "pierre poilievre"],
        "themes": ["leadership", "parties"],
    },
    "cps25_lead_rating_25": {
        "display_label": "Feeling toward Jagmeet Singh",
        "concepts": ["leader affect", "feeling thermometer", "jagmeet singh"],
        "themes": ["leadership", "parties"],
    },
    "cps25_lead_rating_26": {
        "display_label": "Feeling toward Yves-François Blanchet",
        "concepts": ["leader affect", "feeling thermometer", "yves-françois blanchet"],
        "themes": ["leadership", "parties"],
    },
    "cps25_lead_rating_27": {
        "display_label": "Feeling toward Elizabeth May",
        "concepts": ["leader affect", "feeling thermometer", "elizabeth may"],
        "themes": ["leadership", "parties"],
    },
    "cps25_lead_rating_29": {
        "display_label": "Feeling toward Maxime Bernier",
        "concepts": ["leader affect", "feeling thermometer", "maxime bernier"],
        "themes": ["leadership", "parties"],
    },
    "cps25_trudeau_rating_23": {
        "display_label": "Feeling toward Justin Trudeau (additional scale)",
        "concepts": ["leader affect", "feeling thermometer", "justin trudeau"],
        "themes": ["leadership"],
    },
    "cps25_cand_rating_23": {
        "display_label": "Feeling toward local Liberal Party candidate",
        "concepts": ["candidate affect", "feeling thermometer", "local candidate"],
        "themes": ["candidates", "elections"],
    },
    "cps25_cand_rating_24": {
        "display_label": "Feeling toward local Conservative Party candidate",
        "concepts": ["candidate affect", "feeling thermometer", "local candidate"],
        "themes": ["candidates", "elections"],
    },
    "cps25_cand_rating_25": {
        "display_label": "Feeling toward local NDP candidate",
        "concepts": ["candidate affect", "feeling thermometer", "local candidate"],
        "themes": ["candidates", "elections"],
    },
    "cps25_cand_rating_26": {
        "display_label": "Feeling toward local Bloc Québécois candidate",
        "concepts": ["candidate affect", "feeling thermometer", "local candidate"],
        "themes": ["candidates", "elections"],
    },
    "cps25_cand_rating_27": {
        "display_label": "Feeling toward local Green Party candidate",
        "concepts": ["candidate affect", "feeling thermometer", "local candidate"],
        "themes": ["candidates", "elections"],
    },
    "cps25_cand_rating_29": {
        "display_label": "Feeling toward local People's Party (PPC) candidate",
        "concepts": ["candidate affect", "feeling thermometer", "local candidate"],
        "themes": ["candidates", "elections"],
    },
    "cps25_lr_scale_bef_1": {
        "display_label": "Self-placement on left-right political scale",
        "concepts": ["ideology", "left-right scale"],
        "themes": ["ideology"],
    },
    "cps25_lr_parties_1": {
        "display_label": "Perceived left-right placement of Liberal Party",
        "concepts": ["party ideology", "left-right placement", "liberal party"],
        "themes": ["ideology", "parties"],
    },
    "cps25_lr_parties_2": {
        "display_label": "Perceived left-right placement of Conservative Party",
        "concepts": ["party ideology", "left-right placement", "conservative party"],
        "themes": ["ideology", "parties"],
    },
    "cps25_lr_parties_3": {
        "display_label": "Perceived left-right placement of NDP",
        "concepts": ["party ideology", "left-right placement", "ndp"],
        "themes": ["ideology", "parties"],
    },
    "cps25_lr_parties_4": {
        "display_label": "Perceived left-right placement of Bloc Québécois",
        "concepts": ["party ideology", "left-right placement", "bloc québécois"],
        "themes": ["ideology", "parties"],
    },
    "cps25_lr_parties_5": {
        "display_label": "Perceived left-right placement of Green Party",
        "concepts": ["party ideology", "left-right placement", "green party"],
        "themes": ["ideology", "parties"],
    },
    "cps25_lr_parties_7": {
        "display_label": "Perceived left-right placement of People's Party (PPC)",
        "concepts": ["party ideology", "left-right placement", "people's party (ppc)"],
        "themes": ["ideology", "parties"],
    },
    "cps25_lr_canadians_1": {
        "display_label": "Perceived left-right placement of typical Canadian",
        "concepts": ["perceived ideology", "public opinion"],
        "themes": ["ideology"],
    },
    "cps25_lr_prov_loc_ec_1": {
        "display_label": "Perceived left-right placement of typical local resident",
        "concepts": ["local ideology", "regional politics"],
        "themes": ["ideology", "geography"],
    },
    "cps25_lead_int_1": {
        "display_label": "Intelligence rating - Justin Trudeau",
        "concepts": ["leader intelligence", "leader trait", "justin trudeau"],
        "themes": ["leadership"],
    },
    "cps25_lead_int_2": {
        "display_label": "Intelligence rating - Pierre Poilievre",
        "concepts": ["leader intelligence", "leader trait", "pierre poilievre"],
        "themes": ["leadership"],
    },
    "cps25_lead_int_3": {
        "display_label": "Intelligence rating - Jagmeet Singh",
        "concepts": ["leader intelligence", "leader trait", "jagmeet singh"],
        "themes": ["leadership"],
    },
    "cps25_lead_int_4": {
        "display_label": "Intelligence rating - Yves-François Blanchet",
        "concepts": ["leader intelligence", "leader trait", "yves-françois blanchet"],
        "themes": ["leadership"],
    },
    "cps25_lead_strong_1": {
        "display_label": "Strong leadership rating - Justin Trudeau",
        "concepts": ["leader strength", "leader trait", "justin trudeau"],
        "themes": ["leadership"],
    },
    "cps25_lead_strong_2": {
        "display_label": "Strong leadership rating - Pierre Poilievre",
        "concepts": ["leader strength", "leader trait", "pierre poilievre"],
        "themes": ["leadership"],
    },
    "cps25_lead_strong_3": {
        "display_label": "Strong leadership rating - Jagmeet Singh",
        "concepts": ["leader strength", "leader trait", "jagmeet singh"],
        "themes": ["leadership"],
    },
    "cps25_lead_strong_4": {
        "display_label": "Strong leadership rating - Yves-François Blanchet",
        "concepts": ["leader strength", "leader trait", "yves-françois blanchet"],
        "themes": ["leadership"],
    },
    "cps25_lead_trust_1": {
        "display_label": "Trustworthiness rating - Justin Trudeau",
        "concepts": ["leader trust", "leader trait", "justin trudeau"],
        "themes": ["leadership", "trust"],
    },
    "cps25_lead_trust_2": {
        "display_label": "Trustworthiness rating - Pierre Poilievre",
        "concepts": ["leader trust", "leader trait", "pierre poilievre"],
        "themes": ["leadership", "trust"],
    },
    "cps25_lead_trust_3": {
        "display_label": "Trustworthiness rating - Jagmeet Singh",
        "concepts": ["leader trust", "leader trait", "jagmeet singh"],
        "themes": ["leadership", "trust"],
    },
    "cps25_lead_trust_4": {
        "display_label": "Trustworthiness rating - Yves-François Blanchet",
        "concepts": ["leader trust", "leader trait", "yves-françois blanchet"],
        "themes": ["leadership", "trust"],
    },
    "cps25_lead_cares_1": {
        "display_label": "Empathy rating ('cares about people like me') - Justin Trudeau",
        "concepts": ["leader empathy", "leader trait", "justin trudeau"],
        "themes": ["leadership"],
    },
    "cps25_lead_cares_2": {
        "display_label": "Empathy rating ('cares about people like me') - Pierre Poilievre",
        "concepts": ["leader empathy", "leader trait", "pierre poilievre"],
        "themes": ["leadership"],
    },
    "cps25_lead_cares_3": {
        "display_label": "Empathy rating ('cares about people like me') - Jagmeet Singh",
        "concepts": ["leader empathy", "leader trait", "jagmeet singh"],
        "themes": ["leadership"],
    },
    "cps25_lead_cares_4": {
        "display_label": "Empathy rating ('cares about people like me') - Yves-François Blanchet",
        "concepts": ["leader empathy", "leader trait", "yves-françois blanchet"],
        "themes": ["leadership"],
    },
    "cps25_spend_educ": {
        "display_label": "Federal spending on education",
        "concepts": ["education spending", "budget priorities"],
        "themes": ["spending", "education"],
    },
    "cps25_spend_env": {
        "display_label": "Federal spending on the environment",
        "concepts": ["environmental spending", "climate budget"],
        "themes": ["spending", "environment"],
    },
    "cps25_spend_just_law": {
        "display_label": "Federal spending on justice and law enforcement",
        "concepts": ["justice spending", "law enforcement budget"],
        "themes": ["spending", "justice"],
    },
    "cps25_spend_defence": {
        "display_label": "Federal spending on national defence",
        "concepts": ["defence spending", "military budget"],
        "themes": ["spending", "defence"],
    },
    "cps25_spend_imm_min": {
        "display_label": "Federal spending on immigrants and minorities",
        "concepts": ["immigrant spending", "minority programs"],
        "themes": ["spending", "immigration", "social"],
    },
    "cps25_spend_rec_indi": {
        "display_label": "Federal spending on reconciliation with Indigenous peoples",
        "concepts": ["indigenous reconciliation spending"],
        "themes": ["spending", "indigenous issues"],
    },
    "cps25_spend_afford_h": {
        "display_label": "Federal spending on affordable housing",
        "concepts": ["housing spending", "affordable housing budget"],
        "themes": ["spending", "housing"],
    },
    "cps25_spend_nation_c": {
        "display_label": "Federal spending on national childcare system",
        "concepts": ["childcare spending", "national childcare budget"],
        "themes": ["spending", "family", "social"],
    },
    "cps25_big_issue": {
        "display_label": "Biggest issue facing Canadian society over next few years",
        "concepts": ["issue salience", "public priorities"],
        "themes": ["issues", "public policy"],
    },
    "cps25_big_issue_5_TEXT": {
        "display_label": "Biggest issue facing Canadian society over next few years",
        "concepts": ["issue salience", "public priorities"],
        "themes": ["issues", "public policy"],
    },
    "cps25_big_issue_gov": {
        "display_label": "Level of government best able to address biggest issue",
        "concepts": ["jurisdictional responsibility", "federalism"],
        "themes": ["issues", "federalism"],
    },
    "cps25_pos_mailtrust": {
        "display_label": "Trustworthiness of voting by mail",
        "concepts": ["mail-in voting", "election trust"],
        "themes": ["elections", "voting"],
    },
    "cps25_pos_life": {
        "display_label": "Medical assistance in dying for terminally ill individuals",
        "concepts": ["medical assistance in dying", "bioethics"],
        "themes": ["social policy", "health"],
    },
    "cps25_pos_carbon": {
        "display_label": "Federal carbon pricing to reduce greenhouse gas emissions",
        "concepts": ["carbon tax", "climate change policy"],
        "themes": ["environment", "climate"],
    },
    "cps25_pos_energy": {
        "display_label": "Federal government action to help build oil pipelines",
        "concepts": ["oil pipelines", "energy policy"],
        "themes": ["energy", "environment"],
    },
    "cps25_pos_jobs": {
        "display_label": "Protecting environment vs creating jobs conflict priority",
        "concepts": ["environment economy trade-off"],
        "themes": ["environment", "economy"],
    },
    "cps25_pos_trade": {
        "display_label": "Support for more free trade with other countries",
        "concepts": ["free trade", "international trade"],
        "themes": ["economy", "trade"],
    },
    "cps25_student_protes": {
        "display_label": "Views on university campus student protests",
        "concepts": ["student protests", "free speech"],
        "themes": ["society", "education"],
    },
    "cps25_safe_injection": {
        "display_label": "Impact of safe injection sites on neighbourhood safety",
        "concepts": ["safe injection sites", "harm reduction"],
        "themes": ["health", "crime"],
    },
    "cps25_econ_retro": {
        "display_label": "Evaluation of Canadian economy over past year",
        "concepts": ["economic evaluation", "retrospective economy"],
        "themes": ["economy"],
    },
    "cps25_econ_fed_bette": {
        "display_label": "Impact of federal government policies on Canadian economy",
        "concepts": ["economic attribution", "government performance"],
        "themes": ["economy", "government"],
    },
    "cps25_issue_handle_1": {
        "display_label": "Party best at handling Healthcare",
        "concepts": ["issue ownership", "party competence", "healthcare"],
        "themes": ["parties", "issues"],
    },
    "cps25_issue_handle_2": {
        "display_label": "Party best at handling Education",
        "concepts": ["issue ownership", "party competence", "education"],
        "themes": ["parties", "issues"],
    },
    "cps25_issue_handle_3": {
        "display_label": "Party best at handling Environment",
        "concepts": ["issue ownership", "party competence", "environment"],
        "themes": ["parties", "issues"],
    },
    "cps25_issue_handle_4": {
        "display_label": "Party best at handling Crime and justice",
        "concepts": ["issue ownership", "party competence", "crime and justice"],
        "themes": ["parties", "issues"],
    },
    "cps25_issue_handle_5": {
        "display_label": "Party best at handling National defence",
        "concepts": ["issue ownership", "party competence", "national defence"],
        "themes": ["parties", "issues"],
    },
    "cps25_issue_handle_6": {
        "display_label": "Party best at handling Indigenous issues",
        "concepts": ["issue ownership", "party competence", "indigenous issues"],
        "themes": ["parties", "issues"],
    },
    "cps25_issue_handle_7": {
        "display_label": "Party best at handling Immigration",
        "concepts": ["issue ownership", "party competence", "immigration"],
        "themes": ["parties", "issues"],
    },
    "cps25_issue_handle_9": {
        "display_label": "Party best at handling Reconciliation with Indigenous peoples",
        "concepts": ["issue ownership", "party competence", "reconciliation with indigenous peoples"],
        "themes": ["parties", "issues"],
    },
    "cps25_issue_handle_8": {
        "display_label": "Party best at handling Economy",
        "concepts": ["issue ownership", "party competence", "economy"],
        "themes": ["parties", "issues"],
    },
    "cps25_issue_handle_10": {
        "display_label": "Party best at handling Affordable housing",
        "concepts": ["issue ownership", "party competence", "affordable housing"],
        "themes": ["parties", "issues"],
    },
    "cps25_issue_handle_ADO_1": {
        "display_label": "Party best at handling Climate change",
        "concepts": ["issue ownership", "party competence", "climate change"],
        "themes": ["parties", "issues"],
    },
    "cps25_issue_handle_ADO_2": {
        "display_label": "Party best at handling Government spending",
        "concepts": ["issue ownership", "party competence", "government spending"],
        "themes": ["parties", "issues"],
    },
    "cps25_issue_handle_ADO_3": {
        "display_label": "Party best at handling Inflation and cost of living",
        "concepts": ["issue ownership", "party competence", "inflation and cost of living"],
        "themes": ["parties", "issues"],
    },
    "cps25_issue_handle_ADO_4": {
        "display_label": "Party best at handling Foreign relations",
        "concepts": ["issue ownership", "party competence", "foreign relations"],
        "themes": ["parties", "issues"],
    },
    "cps25_issue_handle_ADO_5": {
        "display_label": "Party best at handling Childcare",
        "concepts": ["issue ownership", "party competence", "childcare"],
        "themes": ["parties", "issues"],
    },
    "cps25_issue_handle_ADO_6": {
        "display_label": "Party best at handling Taxes",
        "concepts": ["issue ownership", "party competence", "taxes"],
        "themes": ["parties", "issues"],
    },
    "cps25_most_seats_1": {
        "display_label": "Likelihood of Liberal Party winning most seats nationally",
        "concepts": ["election prediction", "party seat prediction", "liberal party"],
        "themes": ["elections"],
    },
    "cps25_most_seats_2": {
        "display_label": "Likelihood of Conservative Party winning most seats nationally",
        "concepts": ["election prediction", "party seat prediction", "conservative party"],
        "themes": ["elections"],
    },
    "cps25_most_seats_3": {
        "display_label": "Likelihood of NDP winning most seats nationally",
        "concepts": ["election prediction", "party seat prediction", "ndp"],
        "themes": ["elections"],
    },
    "cps25_most_seats_4": {
        "display_label": "Likelihood of Bloc Québécois winning most seats nationally",
        "concepts": ["election prediction", "party seat prediction", "bloc québécois"],
        "themes": ["elections"],
    },
    "cps25_most_seats_5": {
        "display_label": "Likelihood of Green Party winning most seats nationally",
        "concepts": ["election prediction", "party seat prediction", "green party"],
        "themes": ["elections"],
    },
    "cps25_most_seats_7": {
        "display_label": "Likelihood of People's Party (PPC) winning most seats nationally",
        "concepts": ["election prediction", "party seat prediction", "people's party (ppc)"],
        "themes": ["elections"],
    },
    "cps25_most_seats_add_1": {
        "display_label": "Likelihood of Liberal Party winning most seats nationally",
        "concepts": ["election prediction", "party seat prediction", "liberal party"],
        "themes": ["elections"],
    },
    "cps25_most_seats_add_2": {
        "display_label": "Likelihood of Conservative Party winning most seats nationally",
        "concepts": ["election prediction", "party seat prediction", "conservative party"],
        "themes": ["elections"],
    },
    "cps25_most_seats_add_3": {
        "display_label": "Likelihood of NDP winning most seats nationally",
        "concepts": ["election prediction", "party seat prediction", "ndp"],
        "themes": ["elections"],
    },
    "cps25_most_seats_add_4": {
        "display_label": "Likelihood of Bloc Québécois winning most seats nationally",
        "concepts": ["election prediction", "party seat prediction", "bloc québécois"],
        "themes": ["elections"],
    },
    "cps25_most_seats_add_5": {
        "display_label": "Likelihood of Green Party winning most seats nationally",
        "concepts": ["election prediction", "party seat prediction", "green party"],
        "themes": ["elections"],
    },
    "cps25_most_seats_add_7": {
        "display_label": "Likelihood of People's Party (PPC) winning most seats nationally",
        "concepts": ["election prediction", "party seat prediction", "people's party (ppc)"],
        "themes": ["elections"],
    },
    "cps25_win_local_1": {
        "display_label": "Likelihood of local Liberal Party candidate winning local seat",
        "concepts": ["local election prediction", "riding election prediction", "liberal party"],
        "themes": ["elections", "candidates"],
    },
    "cps25_win_local_2": {
        "display_label": "Likelihood of local Conservative Party candidate winning local seat",
        "concepts": ["local election prediction", "riding election prediction", "conservative party"],
        "themes": ["elections", "candidates"],
    },
    "cps25_win_local_3": {
        "display_label": "Likelihood of local NDP candidate winning local seat",
        "concepts": ["local election prediction", "riding election prediction", "ndp"],
        "themes": ["elections", "candidates"],
    },
    "cps25_win_local_4": {
        "display_label": "Likelihood of local Bloc Québécois candidate winning local seat",
        "concepts": ["local election prediction", "riding election prediction", "bloc québécois"],
        "themes": ["elections", "candidates"],
    },
    "cps25_win_local_5": {
        "display_label": "Likelihood of local Green Party candidate winning local seat",
        "concepts": ["local election prediction", "riding election prediction", "green party"],
        "themes": ["elections", "candidates"],
    },
    "cps25_win_local_7": {
        "display_label": "Likelihood of local People's Party (PPC) candidate winning local seat",
        "concepts": ["local election prediction", "riding election prediction", "people's party (ppc)"],
        "themes": ["elections", "candidates"],
    },
    "cps25_win_local_add_1": {
        "display_label": "Likelihood of local Liberal Party candidate winning local seat",
        "concepts": ["local election prediction", "riding election prediction", "liberal party"],
        "themes": ["elections", "candidates"],
    },
    "cps25_win_local_add_2": {
        "display_label": "Likelihood of local Conservative Party candidate winning local seat",
        "concepts": ["local election prediction", "riding election prediction", "conservative party"],
        "themes": ["elections", "candidates"],
    },
    "cps25_win_local_add_3": {
        "display_label": "Likelihood of local NDP candidate winning local seat",
        "concepts": ["local election prediction", "riding election prediction", "ndp"],
        "themes": ["elections", "candidates"],
    },
    "cps25_win_local_add_4": {
        "display_label": "Likelihood of local Bloc Québécois candidate winning local seat",
        "concepts": ["local election prediction", "riding election prediction", "bloc québécois"],
        "themes": ["elections", "candidates"],
    },
    "cps25_win_local_add_5": {
        "display_label": "Likelihood of local Green Party candidate winning local seat",
        "concepts": ["local election prediction", "riding election prediction", "green party"],
        "themes": ["elections", "candidates"],
    },
    "cps25_win_local_add_7": {
        "display_label": "Likelihood of local People's Party (PPC) candidate winning local seat",
        "concepts": ["local election prediction", "riding election prediction", "people's party (ppc)"],
        "themes": ["elections", "candidates"],
    },
    "cps25_outcome_most": {
        "display_label": "Most preferred federal election government outcome",
        "concepts": ["government preferences", "coalition preference"],
        "themes": ["elections", "government"],
    },
    "cps25_outcome_most_7_TEXT": {
        "display_label": "Most preferred federal election government outcome",
        "concepts": ["government preferences", "coalition preference"],
        "themes": ["elections", "government"],
    },
    "cps25_outcome_least": {
        "display_label": "Least preferred federal election government outcome",
        "concepts": ["government preferences", "coalition preference"],
        "themes": ["elections", "government"],
    },
    "cps25_outcome_least_7_TEXT": {
        "display_label": "Least preferred federal election government outcome",
        "concepts": ["government preferences", "coalition preference"],
        "themes": ["elections", "government"],
    },
    "cps25_minority_gov": {
        "display_label": "Views on minority governments (effective vs ineffective)",
        "concepts": ["minority government", "parliamentary governance"],
        "themes": ["government", "democracy"],
    },
    "cps25_imm": {
        "display_label": "Preferred admission level for immigrants to Canada",
        "concepts": ["immigration levels"],
        "themes": ["immigration"],
    },
    "cps25_refugees": {
        "display_label": "Preferred admission level for refugees to Canada",
        "concepts": ["refugee policy", "refugee admission"],
        "themes": ["immigration"],
    },
    "cps25_temp_foreign": {
        "display_label": "Preferred admission level for temporary foreign workers",
        "concepts": ["temporary foreign workers"],
        "themes": ["immigration", "labor"],
    },
    "cps25_inter_students": {
        "display_label": "Preferred admission level for international students",
        "concepts": ["international students"],
        "themes": ["immigration", "education"],
    },
    "cps25_attcheck": {
        "display_label": "Survey attention check item",
        "concepts": ["attention check"],
        "themes": ["survey metadata"],
    },
    "cps25_lib_promises": {
        "display_label": "Belief that Justin Trudeau kept 2021 election promises",
        "concepts": ["election promises", "accountability"],
        "themes": ["government", "trust"],
    },
    "cps25_govt_confusing": {
        "display_label": "Politics and government seem too complicated to understand",
        "concepts": ["internal political efficacy"],
        "themes": ["democracy", "efficacy"],
    },
    "cps25_govt_say": {
        "display_label": "People like me have no say about what government does",
        "concepts": ["external political efficacy", "powerlessness"],
        "themes": ["democracy", "efficacy"],
    },
    "cps25_news_cons": {
        "display_label": "Daily time spent consuming political news",
        "concepts": ["news consumption", "media exposure"],
        "themes": ["media"],
    },
    "cps25_premier_name": {
        "display_label": "Political knowledge: Name of provincial Premier",
        "concepts": ["political knowledge", "premier"],
        "themes": ["democracy", "knowledge"],
    },
    "cps25_finmin_name": {
        "display_label": "Political knowledge: Name of federal Minister of Finance",
        "concepts": ["political knowledge", "finance minister"],
        "themes": ["democracy", "knowledge"],
    },
    "cps25_govgen_name": {
        "display_label": "Political knowledge: Name of Governor-General of Canada",
        "concepts": ["political knowledge", "governor general"],
        "themes": ["democracy", "knowledge"],
    },
    "cps25_volunteer": {
        "display_label": "Volunteering frequency over past 12 months",
        "concepts": ["volunteering", "civic engagement"],
        "themes": ["civic participation"],
    },
    "cps25_duty_choice": {
        "display_label": "Voting viewed as a civic duty vs personal choice",
        "concepts": ["civic duty", "voting norms"],
        "themes": ["democracy", "voting"],
    },
    "cps25_duty_choice_r": {
        "display_label": "Voting viewed as a civic duty vs personal choice",
        "concepts": ["civic duty", "voting norms"],
        "themes": ["democracy", "voting"],
    },
    "cps25_duty_choice_2": {
        "display_label": "Voting viewed as a civic duty vs personal choice",
        "concepts": ["civic duty", "voting norms"],
        "themes": ["democracy", "voting"],
    },
    "cps25_quebec_sov": {
        "display_label": "Support for Quebec sovereignty / independence",
        "concepts": ["quebec sovereignty", "quebec independence"],
        "themes": ["quebec", "sovereignty"],
    },
    "cps25_own_fin_retro": {
        "display_label": "Personal financial situation over past year",
        "concepts": ["personal finances", "pocketbook economy"],
        "themes": ["economy"],
    },
    "cps25_ownfinanc_fed": {
        "display_label": "Impact of federal government policies on personal finances",
        "concepts": ["personal finance attribution"],
        "themes": ["economy", "government"],
    },
    "cps25_own_fin_future": {
        "display_label": "One-year outlook for personal financial situation",
        "concepts": ["financial outlook", "economic expectations"],
        "themes": ["economy"],
    },
    "cps25_groupdiscrim_1": {
        "display_label": "Perceived discrimination in Canada against Black people",
        "concepts": ["discrimination", "group prejudice", "black people"],
        "themes": ["society", "discrimination"],
    },
    "cps25_groupdiscrim_2": {
        "display_label": "Perceived discrimination in Canada against Indigenous peoples",
        "concepts": ["discrimination", "group prejudice", "indigenous peoples"],
        "themes": ["society", "discrimination"],
    },
    "cps25_groupdiscrim_3": {
        "display_label": "Perceived discrimination in Canada against Asian people",
        "concepts": ["discrimination", "group prejudice", "asian people"],
        "themes": ["society", "discrimination"],
    },
    "cps25_groupdiscrim_4": {
        "display_label": "Perceived discrimination in Canada against Muslims",
        "concepts": ["discrimination", "group prejudice", "muslims"],
        "themes": ["society", "discrimination"],
    },
    "cps25_groupdiscrim_5": {
        "display_label": "Perceived discrimination in Canada against Jews",
        "concepts": ["discrimination", "group prejudice", "jews"],
        "themes": ["society", "discrimination"],
    },
    "cps25_groupdiscrim_6": {
        "display_label": "Perceived discrimination in Canada against Women",
        "concepts": ["discrimination", "group prejudice", "women"],
        "themes": ["society", "discrimination"],
    },
    "cps25_groupdiscrim_7": {
        "display_label": "Perceived discrimination in Canada against LGBTQ+ people",
        "concepts": ["discrimination", "group prejudice", "lgbtq+ people"],
        "themes": ["society", "discrimination"],
    },
    "cps25_groupdiscrim_8": {
        "display_label": "Perceived discrimination in Canada against French Canadians",
        "concepts": ["discrimination", "group prejudice", "french canadians"],
        "themes": ["society", "discrimination"],
    },
    "cps25_groupdiscrim_9": {
        "display_label": "Perceived discrimination in Canada against Immigrants",
        "concepts": ["discrimination", "group prejudice", "immigrants"],
        "themes": ["society", "discrimination"],
    },
    "cps25_groupdiscrim_10": {
        "display_label": "Perceived discrimination in Canada against White people",
        "concepts": ["discrimination", "group prejudice", "white people"],
        "themes": ["society", "discrimination"],
    },
    "cps25_groupdiscrim_11": {
        "display_label": "Perceived discrimination in Canada against Elderly people",
        "concepts": ["discrimination", "group prejudice", "elderly people"],
        "themes": ["society", "discrimination"],
    },
    "cps25_prov_gov_sat": {
        "display_label": "Satisfaction with provincial government performance",
        "concepts": ["provincial government satisfaction"],
        "themes": ["government", "provinces"],
    },
    "cps25_fed_id": {
        "display_label": "Federal political party identification",
        "concepts": ["party identification", "federal party choice"],
        "themes": ["parties"],
    },
    "cps25_fed_id_6_TEXT": {
        "display_label": "Federal political party identification",
        "concepts": ["party identification", "federal party choice"],
        "themes": ["parties"],
    },
    "cps25_fed_id_str": {
        "display_label": "Strength of federal party identification",
        "concepts": ["party identification strength"],
        "themes": ["parties"],
    },
    "cps25_prov_id": {
        "display_label": "Provincial political party identification",
        "concepts": ["provincial party identification"],
        "themes": ["parties", "provinces"],
    },
    "cps25_prov_id_14_TEXT": {
        "display_label": "Provincial political party identification",
        "concepts": ["provincial party identification"],
        "themes": ["parties", "provinces"],
    },
    "cps25_prov_id_str": {
        "display_label": "Strength of provincial party identification",
        "concepts": ["party identification strength"],
        "themes": ["parties", "provinces"],
    },
    "cps25_foreign_pol_protect": {
        "display_label": "Foreign policy goal importance: protecting Canadian jobs",
        "concepts": ["foreign policy", "national priorities", "protecting Canadian jobs"],
        "themes": ["foreign policy"],
    },
    "cps25_foreign_pol_support": {
        "display_label": "Foreign policy goal importance: supporting democracy and human rights",
        "concepts": ["foreign policy", "national priorities", "supporting democracy and human rights"],
        "themes": ["foreign policy"],
    },
    "cps25_foreign_pol_provide": {
        "display_label": "Foreign policy goal importance: providing international development aid",
        "concepts": ["foreign policy", "national priorities", "providing international development aid"],
        "themes": ["foreign policy"],
    },
    "cps25_foreign_pol_increase": {
        "display_label": "Foreign policy goal importance: increasing defense spending",
        "concepts": ["foreign policy", "national priorities", "increasing defense spending"],
        "themes": ["foreign policy"],
    },
    "cps25_modern_racism_1": {
        "display_label": "Modern racism scale - racial minorities demanding too much",
        "concepts": ["modern racism", "racial attitudes"],
        "themes": ["society", "discrimination"],
    },
    "cps25_modern_racism_2": {
        "display_label": "Modern racism scale - extent of discrimination against minorities",
        "concepts": ["modern racism", "racial attitudes"],
        "themes": ["society", "discrimination"],
    },
    "cps25_modern_racism_3": {
        "display_label": "Modern racism scale - minorities receiving special favors",
        "concepts": ["modern racism", "racial attitudes"],
        "themes": ["society", "discrimination"],
    },
    "cps25_groups_therm_1": {
        "display_label": "Feeling toward Feminists",
        "concepts": ["group affect", "feeling thermometer", "feminists"],
        "themes": ["society"],
    },
    "cps25_groups_therm_2": {
        "display_label": "Feeling toward Environmentalists",
        "concepts": ["group affect", "feeling thermometer", "environmentalists"],
        "themes": ["society"],
    },
    "cps25_groups_therm_3": {
        "display_label": "Feeling toward Labor unions",
        "concepts": ["group affect", "feeling thermometer", "labor unions"],
        "themes": ["society"],
    },
    "cps25_groups_therm_4": {
        "display_label": "Feeling toward Business owners",
        "concepts": ["group affect", "feeling thermometer", "business owners"],
        "themes": ["society"],
    },
    "cps25_groups_therm_8": {
        "display_label": "Feeling toward Immigrants",
        "concepts": ["group affect", "feeling thermometer", "immigrants"],
        "themes": ["society"],
    },
    "cps25_groups_therm_9": {
        "display_label": "Feeling toward Indigenous peoples",
        "concepts": ["group affect", "feeling thermometer", "indigenous peoples"],
        "themes": ["society"],
    },
    "cps25_groups_therm_10": {
        "display_label": "Feeling toward Muslims",
        "concepts": ["group affect", "feeling thermometer", "muslims"],
        "themes": ["society"],
    },
    "cps25_groups_therm_11": {
        "display_label": "Feeling toward LGBTQ+ people",
        "concepts": ["group affect", "feeling thermometer", "lgbtq+ people"],
        "themes": ["society"],
    },
    "cps25_turnout_2021": {
        "display_label": "Voted in 2021 federal election",
        "concepts": ["past voting", "turnout history"],
        "themes": ["elections", "voting"],
    },
    "cps25_vote_2021": {
        "display_label": "Party voted for in 2021 federal election",
        "concepts": ["past vote choice", "voting history"],
        "themes": ["elections", "parties"],
    },
    "cps25_vote_2021_6_TEXT": {
        "display_label": "Party voted for in 2021 federal election",
        "concepts": ["past vote choice", "voting history"],
        "themes": ["elections", "parties"],
    },
    "cps25_debate_fr": {
        "display_label": "Watched or listened to French-language federal leaders' debate",
        "concepts": ["leaders debate", "french debate"],
        "themes": ["elections", "media"],
    },
    "cps25_debate_en": {
        "display_label": "Watched or listened to English-language federal leaders' debate",
        "concepts": ["leaders debate", "english debate"],
        "themes": ["elections", "media"],
    },
    "cps25_tarrifs_1": {
        "display_label": "Canada-US relations evaluation following US President tariffs",
        "concepts": ["canada us relations", "tariffs"],
        "themes": ["foreign policy", "economy"],
    },
    "cps25_tarrifs_2": {
        "display_label": "Responsibility for worsening Canada-US relations",
        "concepts": ["canada us relations", "diplomatic blame"],
        "themes": ["foreign policy"],
    },
    "cps25_tarrifs_3": {
        "display_label": "Support for retaliatory tariffs against the US",
        "concepts": ["retaliatory tariffs", "trade conflict"],
        "themes": ["foreign policy", "economy"],
    },
    "cps25_talkpolitics_1": {
        "display_label": "Discussed politics over past week with family",
        "concepts": ["political discussion", "social networks"],
        "themes": ["civic participation"],
    },
    "cps25_talkpolitics_2": {
        "display_label": "Discussed politics over past week with friends",
        "concepts": ["political discussion", "social networks"],
        "themes": ["civic participation"],
    },
    "cps25_talkpolitics_3": {
        "display_label": "Discussed politics over past week with coworkers",
        "concepts": ["political discussion", "social networks"],
        "themes": ["civic participation"],
    },
    "cps25_talkpolitics_4": {
        "display_label": "Discussed politics over past week with neighbors",
        "concepts": ["political discussion", "social networks"],
        "themes": ["civic participation"],
    },
    "cps25_talkpolitics_5": {
        "display_label": "Discussed politics over past week with acquaintances",
        "concepts": ["political discussion", "social networks"],
        "themes": ["civic participation"],
    },
    "cps25_talkpolitics_6": {
        "display_label": "Discussed politics over past week with people online / social media",
        "concepts": ["political discussion", "social networks"],
        "themes": ["civic participation"],
    },
    "cps25_talkpolitics_7": {
        "display_label": "Discussed politics over past week with other people",
        "concepts": ["political discussion", "social networks"],
        "themes": ["civic participation"],
    },
    "cps25_aff_pid_1": {
        "display_label": "Affective partisan identification - frequency of thinking about party identity",
        "concepts": ["affective polarization", "partisan identity"],
        "themes": ["parties"],
    },
    "cps25_aff_pid_2": {
        "display_label": "Affective partisan identification - emotional reaction to party criticism",
        "concepts": ["affective polarization", "partisan identity"],
        "themes": ["parties"],
    },
    "cps25_aff_pid_3": {
        "display_label": "Affective partisan identification - feeling connected to party",
        "concepts": ["affective polarization", "partisan identity"],
        "themes": ["parties"],
    },
    "cps25_aff_pid_4": {
        "display_label": "Affective partisan identification - pride in party identity",
        "concepts": ["affective polarization", "partisan identity"],
        "themes": ["parties"],
    },
    "cps25_resident_2e": {
        "display_label": "Including Indigenous history and culture in school curriculum",
        "concepts": ["indigenous history", "school curriculum"],
        "themes": ["indigenous issues", "education"],
    },
    "cps25_resident_2f": {
        "display_label": "Returning land and resource control to Indigenous peoples",
        "concepts": ["indigenous land rights", "resource control"],
        "themes": ["indigenous issues", "environment"],
    },
    "cps25_religion": {
        "display_label": "Religious affiliation",
        "concepts": ["religious affiliation", "religion"],
        "themes": ["demographics", "religion"],
    },
    "cps25_religion_22_TEXT": {
        "display_label": "Religious affiliation",
        "concepts": ["religious affiliation", "religion"],
        "themes": ["demographics", "religion"],
    },
    "cps25_denomination": {
        "display_label": "Specific religious denomination",
        "concepts": ["religious denomination", "religion"],
        "themes": ["demographics", "religion"],
    },
    "cps25_rel_imp": {
        "display_label": "Importance of religion in daily life",
        "concepts": ["religiosity", "religious importance"],
        "themes": ["religion", "identity"],
    },
    "cps25_bornin_canada": {
        "display_label": "Born in Canada status",
        "concepts": ["birthplace", "nativity"],
        "themes": ["demographics", "immigration"],
    },
    "cps25_bornin_other": {
        "display_label": "Country of birth for foreign-born respondents",
        "concepts": ["birthplace", "country of origin"],
        "themes": ["demographics", "immigration"],
    },
    "cps25_imm_year": {
        "display_label": "Year of arrival in Canada for immigrants",
        "concepts": ["immigration year", "time in canada"],
        "themes": ["demographics", "immigration"],
    },
    "cps25_origin_1": {
        "display_label": "Ethnic or cultural origins of ancestors (mention 1)",
        "concepts": ["ethnic origin", "ancestry"],
        "themes": ["demographics", "identity"],
    },
    "cps25_origin_2": {
        "display_label": "Ethnic or cultural origins of ancestors (mention 2)",
        "concepts": ["ethnic origin", "ancestry"],
        "themes": ["demographics", "identity"],
    },
    "cps25_origin_3": {
        "display_label": "Ethnic or cultural origins of ancestors (mention 3)",
        "concepts": ["ethnic origin", "ancestry"],
        "themes": ["demographics", "identity"],
    },
    "cps25_origin_4": {
        "display_label": "Ethnic or cultural origins of ancestors (mention 4)",
        "concepts": ["ethnic origin", "ancestry"],
        "themes": ["demographics", "identity"],
    },
    "cps25_origin_5": {
        "display_label": "Ethnic or cultural origins of ancestors (mention 5)",
        "concepts": ["ethnic origin", "ancestry"],
        "themes": ["demographics", "identity"],
    },
    "cps25_vismin_1": {
        "display_label": "Visible minority group identification (1)",
        "concepts": ["visible minority", "racial identity"],
        "themes": ["demographics", "identity"],
    },
    "cps25_vismin_2": {
        "display_label": "Visible minority group identification (2)",
        "concepts": ["visible minority", "racial identity"],
        "themes": ["demographics", "identity"],
    },
    "cps25_vismin_3": {
        "display_label": "Visible minority group identification (3)",
        "concepts": ["visible minority", "racial identity"],
        "themes": ["demographics", "identity"],
    },
    "cps25_vismin_4": {
        "display_label": "Visible minority group identification (4)",
        "concepts": ["visible minority", "racial identity"],
        "themes": ["demographics", "identity"],
    },
    "cps25_vismin_5": {
        "display_label": "Visible minority group identification (5)",
        "concepts": ["visible minority", "racial identity"],
        "themes": ["demographics", "identity"],
    },
    "cps25_vismin_6": {
        "display_label": "Visible minority group identification (6)",
        "concepts": ["visible minority", "racial identity"],
        "themes": ["demographics", "identity"],
    },
    "cps25_vismin_7": {
        "display_label": "Visible minority group identification (7)",
        "concepts": ["visible minority", "racial identity"],
        "themes": ["demographics", "identity"],
    },
    "cps25_vismin_8": {
        "display_label": "Visible minority group identification (8)",
        "concepts": ["visible minority", "racial identity"],
        "themes": ["demographics", "identity"],
    },
    "cps25_vismin_9": {
        "display_label": "Visible minority group identification (9)",
        "concepts": ["visible minority", "racial identity"],
        "themes": ["demographics", "identity"],
    },
    "cps25_vismin_10": {
        "display_label": "Visible minority group identification (10)",
        "concepts": ["visible minority", "racial identity"],
        "themes": ["demographics", "identity"],
    },
    "cps25_vismin_11": {
        "display_label": "Visible minority group identification (11)",
        "concepts": ["visible minority", "racial identity"],
        "themes": ["demographics", "identity"],
    },
    "cps25_vismin_12": {
        "display_label": "Visible minority group identification (12)",
        "concepts": ["visible minority", "racial identity"],
        "themes": ["demographics", "identity"],
    },
    "cps25_vismin_10_TEXT": {
        "display_label": "Visible minority group identification (TEXT)",
        "concepts": ["visible minority", "racial identity"],
        "themes": ["demographics", "identity"],
    },
    "cps25_two_spirit": {
        "display_label": "Two-Spirit identity",
        "concepts": ["indigenous identity", "gender identity"],
        "themes": ["demographics", "identity"],
    },
    "cps25_sexuality": {
        "display_label": "Sexual orientation",
        "concepts": ["sexual orientation", "LGBTQ+"],
        "themes": ["demographics", "identity"],
    },
    "cps25_sexuality_5_TEXT": {
        "display_label": "Sexual orientation",
        "concepts": ["sexual orientation", "LGBTQ+"],
        "themes": ["demographics", "identity"],
    },
    "cps25_language_1": {
        "display_label": "Childhood language learned and understood (1)",
        "concepts": ["mother tongue", "language background"],
        "themes": ["demographics", "language"],
    },
    "cps25_language_2": {
        "display_label": "Childhood language learned and understood (2)",
        "concepts": ["mother tongue", "language background"],
        "themes": ["demographics", "language"],
    },
    "cps25_language_3": {
        "display_label": "Childhood language learned and understood (3)",
        "concepts": ["mother tongue", "language background"],
        "themes": ["demographics", "language"],
    },
    "cps25_language_4": {
        "display_label": "Childhood language learned and understood (4)",
        "concepts": ["mother tongue", "language background"],
        "themes": ["demographics", "language"],
    },
    "cps25_language_5": {
        "display_label": "Childhood language learned and understood (5)",
        "concepts": ["mother tongue", "language background"],
        "themes": ["demographics", "language"],
    },
    "cps25_language_6": {
        "display_label": "Childhood language learned and understood (6)",
        "concepts": ["mother tongue", "language background"],
        "themes": ["demographics", "language"],
    },
    "cps25_language_7": {
        "display_label": "Childhood language learned and understood (7)",
        "concepts": ["mother tongue", "language background"],
        "themes": ["demographics", "language"],
    },
    "cps25_language_8": {
        "display_label": "Childhood language learned and understood (8)",
        "concepts": ["mother tongue", "language background"],
        "themes": ["demographics", "language"],
    },
    "cps25_language_9": {
        "display_label": "Childhood language learned and understood (9)",
        "concepts": ["mother tongue", "language background"],
        "themes": ["demographics", "language"],
    },
    "cps25_language_10": {
        "display_label": "Childhood language learned and understood (10)",
        "concepts": ["mother tongue", "language background"],
        "themes": ["demographics", "language"],
    },
    "cps25_language_11": {
        "display_label": "Childhood language learned and understood (11)",
        "concepts": ["mother tongue", "language background"],
        "themes": ["demographics", "language"],
    },
    "cps25_language_12": {
        "display_label": "Childhood language learned and understood (12)",
        "concepts": ["mother tongue", "language background"],
        "themes": ["demographics", "language"],
    },
    "cps25_language_13": {
        "display_label": "Childhood language learned and understood (13)",
        "concepts": ["mother tongue", "language background"],
        "themes": ["demographics", "language"],
    },
    "cps25_language_14": {
        "display_label": "Childhood language learned and understood (14)",
        "concepts": ["mother tongue", "language background"],
        "themes": ["demographics", "language"],
    },
    "cps25_language_15": {
        "display_label": "Childhood language learned and understood (15)",
        "concepts": ["mother tongue", "language background"],
        "themes": ["demographics", "language"],
    },
    "cps25_language_16": {
        "display_label": "Childhood language learned and understood (16)",
        "concepts": ["mother tongue", "language background"],
        "themes": ["demographics", "language"],
    },
    "cps25_language_17": {
        "display_label": "Childhood language learned and understood (17)",
        "concepts": ["mother tongue", "language background"],
        "themes": ["demographics", "language"],
    },
    "cps25_language_18": {
        "display_label": "Childhood language learned and understood (18)",
        "concepts": ["mother tongue", "language background"],
        "themes": ["demographics", "language"],
    },
    "cps25_language_3_TEXT": {
        "display_label": "Childhood language learned and understood (TEXT)",
        "concepts": ["mother tongue", "language background"],
        "themes": ["demographics", "language"],
    },
    "cps25_language_17_TEXT": {
        "display_label": "Childhood language learned and understood (TEXT)",
        "concepts": ["mother tongue", "language background"],
        "themes": ["demographics", "language"],
    },
    "cps25_employment": {
        "display_label": "Employment status",
        "concepts": ["employment", "occupation"],
        "themes": ["demographics", "work"],
    },
    "cps25_employment_12_TEXT": {
        "display_label": "Question: What is your employment status? Are you currently… - Other (please specify) - Te",
        "concepts": ["canadian politics", "election study"],
        "themes": ["elections"],
    },
    "cps25_sector": {
        "display_label": "Employment sector (public, private, or non-profit)",
        "concepts": ["employment sector", "public sector"],
        "themes": ["demographics", "work"],
    },
    "cps25_union": {
        "display_label": "Union membership status",
        "concepts": ["union membership", "labor union"],
        "themes": ["demographics", "work"],
    },
    "cps25_marital": {
        "display_label": "Marital status",
        "concepts": ["marital status", "family"],
        "themes": ["demographics"],
    },
    "cps25_children": {
        "display_label": "Number of children in household",
        "concepts": ["children", "family size"],
        "themes": ["demographics", "family"],
    },
    "cps25_children_atten_1": {
        "display_label": "Children attending daycare or preschool",
        "concepts": ["children education", "schooling"],
        "themes": ["demographics", "education"],
    },
    "cps25_children_atten_2": {
        "display_label": "Children attending elementary school",
        "concepts": ["children education", "schooling"],
        "themes": ["demographics", "education"],
    },
    "cps25_children_atten_3": {
        "display_label": "Children attending high school",
        "concepts": ["children education", "schooling"],
        "themes": ["demographics", "education"],
    },
    "cps25_children_atten_4": {
        "display_label": "Children attending CEGEP or college",
        "concepts": ["children education", "schooling"],
        "themes": ["demographics", "education"],
    },
    "cps25_children_atten_5": {
        "display_label": "Children attending university",
        "concepts": ["children education", "schooling"],
        "themes": ["demographics", "education"],
    },
    "cps25_children_atten_6": {
        "display_label": "Children attending none of the above",
        "concepts": ["children education", "schooling"],
        "themes": ["demographics", "education"],
    },
    "cps25_income": {
        "display_label": "Total household income before taxes for 2024",
        "concepts": ["income", "socioeconomic status"],
        "themes": ["demographics", "economy"],
    },
    "cps25_yob": {
        "display_label": "Year of birth",
        "concepts": ["birth year", "age"],
        "themes": ["demographics"],
    },
    "cps25_property_1": {
        "display_label": "Household property ownership - primary home",
        "concepts": ["homeownership", "property ownership"],
        "themes": ["demographics", "housing"],
    },
    "cps25_property_2": {
        "display_label": "Household property ownership - vacation property / cottage",
        "concepts": ["homeownership", "property ownership"],
        "themes": ["demographics", "housing"],
    },
    "cps25_property_3": {
        "display_label": "Household property ownership - rental property",
        "concepts": ["homeownership", "property ownership"],
        "themes": ["demographics", "housing"],
    },
    "cps25_property_4": {
        "display_label": "Household property ownership - commercial property",
        "concepts": ["homeownership", "property ownership"],
        "themes": ["demographics", "housing"],
    },
    "cps25_property_5": {
        "display_label": "Household property ownership - land",
        "concepts": ["homeownership", "property ownership"],
        "themes": ["demographics", "housing"],
    },
    "cps25_property_6": {
        "display_label": "Household property ownership - other property",
        "concepts": ["homeownership", "property ownership"],
        "themes": ["demographics", "housing"],
    },
    "cps25_rent": {
        "display_label": "Renting status for primary residence",
        "concepts": ["housing", "tenant status"],
        "themes": ["demographics", "housing"],
    },
    "cps25_rent_length": {
        "display_label": "Duration of residence in current rented home",
        "concepts": ["housing tenure", "residential stability"],
        "themes": ["demographics", "housing"],
    },
    "cps25_rent_security": {
        "display_label": "Worry about housing security in coming years",
        "concepts": ["housing security", "housing affordability"],
        "themes": ["housing", "economy"],
    },
    "cps25_household": {
        "display_label": "Total household size",
        "concepts": ["household size"],
        "themes": ["demographics"],
    },
    "cps25_final_response": {
        "display_label": "Additional open-ended comments at end of survey",
        "concepts": ["feedback", "comments"],
        "themes": ["survey metadata"],
    },
    "pes25_province": {
        "display_label": "Province or territory of residence (PES)",
        "concepts": ["province", "geography"],
        "themes": ["demographics", "geography"],
    },
    "pes25_mostimpissue": {
        "display_label": "Most important issue in 2025 federal election",
        "concepts": ["issue salience", "election priorities"],
        "themes": ["elections", "issues"],
    },
    "pes25_mostimpfactor": {
        "display_label": "Most important factor in vote decision in 2025 election",
        "concepts": ["vote determinant", "voter decision"],
        "themes": ["elections", "voting"],
    },
    "pes25_turnout2025": {
        "display_label": "Voted in April 28, 2025 federal election",
        "concepts": ["voter turnout", "actual vote"],
        "themes": ["elections", "voting"],
    },
    "pes25_notvotereason1": {
        "display_label": "Main reason for not voting in 2025 federal election",
        "concepts": ["voter abstention", "voting barriers"],
        "themes": ["elections", "voting"],
    },
    "pes25_howvote": {
        "display_label": "Voting method used in 2025 federal election",
        "concepts": ["voting method", "election administration"],
        "themes": ["elections", "voting"],
    },
    "pes25_howvote_7_TEXT": {
        "display_label": "Voting method used in 2025 federal election",
        "concepts": ["voting method", "election administration"],
        "themes": ["elections", "voting"],
    },
    "pes25_votechoice2025": {
        "display_label": "Party voted for in 2025 federal election",
        "concepts": ["actual vote choice", "party vote"],
        "themes": ["elections", "parties", "voting"],
    },
    "pes25_votechoice2025_7_TEXT": {
        "display_label": "Party voted for in 2025 federal election",
        "concepts": ["actual vote choice", "party vote"],
        "themes": ["elections", "parties", "voting"],
    },
    "pes25_resason_chose": {
        "display_label": "Primary reason for choosing voted party in 2025 election",
        "concepts": ["vote motivation", "party choice reason"],
        "themes": ["elections", "voting"],
    },
    "pes25_resason_chose_5_TEXT": {
        "display_label": "Primary reason for choosing voted party in 2025 election",
        "concepts": ["vote motivation", "party choice reason"],
        "themes": ["elections", "voting"],
    },
    "pes25_when_decide": {
        "display_label": "Timing of final vote choice decision during campaign",
        "concepts": ["decision timing", "campaign dynamics"],
        "themes": ["elections", "voting"],
    },
    "pes25_pr_votechoice": {
        "display_label": "Hypothetical vote choice if non-voter had voted in 2025 election",
        "concepts": ["hypothetical vote", "non-voter preferences"],
        "themes": ["elections", "parties"],
    },
    "pes25_pr_votechoice_7_TEXT": {
        "display_label": "Hypothetical vote choice if non-voter had voted in 2025 election",
        "concepts": ["hypothetical vote", "non-voter preferences"],
        "themes": ["elections", "parties"],
    },
    "pes25_dem_sat": {
        "display_label": "Satisfaction with performance of democracy in Canada",
        "concepts": ["democratic satisfaction", "trust in democracy"],
        "themes": ["democracy", "institutions"],
    },
    "pes25_where_info": {
        "display_label": "Primary source of campaign information in 2025 election",
        "concepts": ["campaign news source", "media diet"],
        "themes": ["media", "elections"],
    },
    "pes25_contact1": {
        "display_label": "Contacted by political party or candidate during campaign",
        "concepts": ["campaign contact", "voter mobilization"],
        "themes": ["elections", "parties"],
    },
    "pes25_contact2_1": {
        "display_label": "Campaign contact received from Liberal Party",
        "concepts": ["campaign contact", "liberal party"],
        "themes": ["elections", "parties"],
    },
    "pes25_contact2_2": {
        "display_label": "Campaign contact received from Conservative Party",
        "concepts": ["campaign contact", "conservative party"],
        "themes": ["elections", "parties"],
    },
    "pes25_contact2_3": {
        "display_label": "Campaign contact received from NDP",
        "concepts": ["campaign contact", "ndp"],
        "themes": ["elections", "parties"],
    },
    "pes25_contact2_4": {
        "display_label": "Campaign contact received from Bloc Québécois",
        "concepts": ["campaign contact", "bloc québécois"],
        "themes": ["elections", "parties"],
    },
    "pes25_contact2_5": {
        "display_label": "Campaign contact received from Green Party",
        "concepts": ["campaign contact", "green party"],
        "themes": ["elections", "parties"],
    },
    "pes25_contact2_6": {
        "display_label": "Campaign contact received from party/candidate 6",
        "concepts": ["campaign contact", "party/candidate 6"],
        "themes": ["elections", "parties"],
    },
    "pes25_contact2_7": {
        "display_label": "Campaign contact received from People's Party (PPC)",
        "concepts": ["campaign contact", "people's party (ppc)"],
        "themes": ["elections", "parties"],
    },
    "pes25_contact2_8": {
        "display_label": "Campaign contact received from party/candidate 8",
        "concepts": ["campaign contact", "party/candidate 8"],
        "themes": ["elections", "parties"],
    },
    "pes25_contact2_7_TEXT": {
        "display_label": "Campaign contact received from People's Party (PPC)",
        "concepts": ["campaign contact", "people's party (ppc)"],
        "themes": ["elections", "parties"],
    },
    "pes25_mandate": {
        "display_label": "Legitimacy of governing mandate won by election winner",
        "concepts": ["electoral mandate", "government legitimacy"],
        "themes": ["elections", "democracy"],
    },
    "pes25_formgovt": {
        "display_label": "Government formation priority: most seats vs most votes",
        "concepts": ["electoral system", "government formation"],
        "themes": ["elections", "democracy"],
    },
    "pes25_keepromises": {
        "display_label": "Belief that political parties keep their election promises",
        "concepts": ["election promises", "accountability"],
        "themes": ["trust", "parties"],
    },
    "pes25_paymed": {
        "display_label": "Support for paid private healthcare access for faster treatment",
        "concepts": ["healthcare privatization", "two-tier healthcare"],
        "themes": ["health", "public policy"],
    },
    "pes25_losetouch": {
        "display_label": "Elected MPs soon lose touch with ordinary people",
        "concepts": ["political alienation", "representational responsiveness"],
        "themes": ["democracy", "trust"],
    },
    "pes25_hatespeech": {
        "display_label": "Criminalizing public hate speech against minority groups",
        "concepts": ["hate speech laws", "civil liberties"],
        "themes": ["human rights", "law"],
    },
    "pes25_poorlyinformed": {
        "display_label": "Questioning universal voting rights when voters are poorly informed",
        "concepts": ["voter competence", "democratic principles"],
        "themes": ["democracy", "rights"],
    },
    "pes25_ignorecourt": {
        "display_label": "Government authority to ignore political court rulings",
        "concepts": ["judicial independence", "rule of law"],
        "themes": ["democracy", "institutions"],
    },
    "pes25_bendlaw": {
        "display_label": "Government authority to bend laws to solve social problems",
        "concepts": ["rule of law", "executive power"],
        "themes": ["democracy", "government"],
    },
    "pes25_womenhome": {
        "display_label": "Traditional view that fewer women should work outside home",
        "concepts": ["gender roles", "traditional values"],
        "themes": ["society", "gender"],
    },
    "pes25_famvalues": {
        "display_label": "Emphasis on traditional family values solving social problems",
        "concepts": ["family values", "social conservatism"],
        "themes": ["values", "society"],
    },
    "pes25_pollie": {
        "display_label": "Belief that politicians are willing to lie to get elected",
        "concepts": ["political cynicism", "politician integrity"],
        "themes": ["trust", "politics"],
    },
    "pes25_bilingualism": {
        "display_label": "View that Canada has gone too far in pushing official bilingualism",
        "concepts": ["official bilingualism", "language policy"],
        "themes": ["language", "identity"],
    },
    "pes25_equalrights": {
        "display_label": "View that Canada has gone too far in pushing equal rights",
        "concepts": ["equal rights", "minority rights"],
        "themes": ["human rights", "society"],
    },
    "pes25_fitin": {
        "display_label": "View that recent immigrants do not want to fit into Canadian society",
        "concepts": ["immigrant integration", "cultural assimilation"],
        "themes": ["immigration", "society"],
    },
    "pes25_immigjobs": {
        "display_label": "Belief that immigrants take jobs away from other Canadians",
        "concepts": ["immigrant job competition", "economic impact"],
        "themes": ["immigration", "economy"],
    },
    "pes25_immigincrease": {
        "display_label": "Perceived level and impact of local immigration increases",
        "concepts": ["local immigration levels"],
        "themes": ["immigration", "society"],
    },
    "pes25_nativism5": {
        "display_label": "Belief that immigrants increase crime rates in Canada",
        "concepts": ["immigrant crime perception", "nativism"],
        "themes": ["immigration", "crime"],
    },
    "pes25_indig_favors": {
        "display_label": "Indigenous minority comparison to historical immigrant groups overcoming prejudice",
        "concepts": ["indigenous prejudice comparison"],
        "themes": ["indigenous issues", "society"],
    },
    "pes25_indig_deserve": {
        "display_label": "Belief that Indigenous peoples have gotten less than they deserve",
        "concepts": ["indigenous rights", "equity"],
        "themes": ["indigenous issues", "human rights"],
    },
    "pes25_indig_col": {
        "display_label": "Belief that colonialism and discrimination created ongoing Indigenous disadvantage",
        "concepts": ["colonialism impact", "indigenous disadvantage"],
        "themes": ["indigenous issues", "history"],
    },
    "pes25_govteff": {
        "display_label": "Belief that governments used to be better at getting things done",
        "concepts": ["state capacity", "government effectiveness"],
        "themes": ["government"],
    },
    "pes25_govtprograms": {
        "display_label": "Belief that government can no longer afford past level of social programs",
        "concepts": ["welfare state affordability", "fiscal constraints"],
        "themes": ["government", "economy"],
    },
    "pes25_tieus": {
        "display_label": "Desired closeness of Canadian ties with US",
        "concepts": ["bilateral relations", "foreign ties", "us"],
        "themes": ["foreign policy"],
    },
    "pes25_tiechina": {
        "display_label": "Desired closeness of Canadian ties with CHINA",
        "concepts": ["bilateral relations", "foreign ties", "china"],
        "themes": ["foreign policy"],
    },
    "pes25_tieindia": {
        "display_label": "Desired closeness of Canadian ties with INDIA",
        "concepts": ["bilateral relations", "foreign ties", "india"],
        "themes": ["foreign policy"],
    },
    "pes25_tieisrael": {
        "display_label": "Desired closeness of Canadian ties with ISRAEL",
        "concepts": ["bilateral relations", "foreign ties", "israel"],
        "themes": ["foreign policy"],
    },
    "pes25_ethid_1": {
        "display_label": "Importance to personal identity: Being Canadian",
        "concepts": ["identity importance", "being canadian"],
        "themes": ["identity"],
    },
    "pes25_ethid_2": {
        "display_label": "Importance to personal identity: Ethnicity",
        "concepts": ["identity importance", "ethnicity"],
        "themes": ["identity"],
    },
    "pes25_ethid_3": {
        "display_label": "Importance to personal identity: Language",
        "concepts": ["identity importance", "language"],
        "themes": ["identity"],
    },
    "pes25_country_1": {
        "display_label": "Feeling toward United States",
        "concepts": ["country affect", "foreign attitudes", "united states"],
        "themes": ["foreign policy"],
    },
    "pes25_country_2": {
        "display_label": "Feeling toward China",
        "concepts": ["country affect", "foreign attitudes", "china"],
        "themes": ["foreign policy"],
    },
    "pes25_can_id_1": {
        "display_label": "Importance for being truly Canadian: being born in Canada",
        "concepts": ["canadian identity", "national identity criteria"],
        "themes": ["identity"],
    },
    "pes25_can_id_2": {
        "display_label": "Importance for being truly Canadian: speaking English or French",
        "concepts": ["canadian identity", "national identity criteria"],
        "themes": ["identity"],
    },
    "pes25_can_id_3": {
        "display_label": "Importance for being truly Canadian: sharing Canadian values",
        "concepts": ["canadian identity", "national identity criteria"],
        "themes": ["identity"],
    },
    "pes25_can_id_4": {
        "display_label": "Importance for being truly Canadian: respecting Canadian laws and institutions",
        "concepts": ["canadian identity", "national identity criteria"],
        "themes": ["identity"],
    },
    "pes25_can_id_5": {
        "display_label": "Importance for being truly Canadian: living in Canada for most of life",
        "concepts": ["canadian identity", "national identity criteria"],
        "themes": ["identity"],
    },
    "pes25_can_id_6": {
        "display_label": "Importance for being truly Canadian: having Canadian citizenship",
        "concepts": ["canadian identity", "national identity criteria"],
        "themes": ["identity"],
    },
    "pes25_conf_inst1_1": {
        "display_label": "Confidence in federal government",
        "concepts": ["institutional trust", "confidence in institutions", "federal government"],
        "themes": ["institutions", "trust"],
    },
    "pes25_conf_inst1_2": {
        "display_label": "Confidence in provincial government",
        "concepts": ["institutional trust", "confidence in institutions", "provincial government"],
        "themes": ["institutions", "trust"],
    },
    "pes25_conf_inst1_3": {
        "display_label": "Confidence in media",
        "concepts": ["institutional trust", "confidence in institutions", "media"],
        "themes": ["institutions", "trust"],
    },
    "pes25_conf_inst1_4": {
        "display_label": "Confidence in Elections Canada",
        "concepts": ["institutional trust", "confidence in institutions", "elections canada"],
        "themes": ["institutions", "trust"],
    },
    "pes25_conf_inst2_1": {
        "display_label": "Confidence in courts",
        "concepts": ["institutional trust", "confidence in institutions", "courts"],
        "themes": ["institutions", "trust"],
    },
    "pes25_conf_inst2_2": {
        "display_label": "Confidence in organized religion",
        "concepts": ["institutional trust", "confidence in institutions", "organized religion"],
        "themes": ["institutions", "trust"],
    },
    "pes25_conf_inst2_3": {
        "display_label": "Confidence in armed forces",
        "concepts": ["institutional trust", "confidence in institutions", "armed forces"],
        "themes": ["institutions", "trust"],
    },
    "pes25_conf_inst2_4": {
        "display_label": "Confidence in public schools",
        "concepts": ["institutional trust", "confidence in institutions", "public schools"],
        "themes": ["institutions", "trust"],
    },
    "pes25_conf_inst2_5": {
        "display_label": "Confidence in public service",
        "concepts": ["institutional trust", "confidence in institutions", "public service"],
        "themes": ["institutions", "trust"],
    },
    "pes25_conf_inst2_6": {
        "display_label": "Confidence in police",
        "concepts": ["institutional trust", "confidence in institutions", "police"],
        "themes": ["institutions", "trust"],
    },
    "pes25_emb_vote16": {
        "display_label": "Support for lowering federal voting age from 18 to 16",
        "concepts": ["voting age", "youth franchise"],
        "themes": ["elections", "democracy"],
    },
    "pes25_internetvote_1": {
        "display_label": "Option to vote over internet in federal elections",
        "concepts": ["internet voting", "electoral innovation"],
        "themes": ["elections", "technology"],
    },
    "pes25_internetvote_2": {
        "display_label": "Option to vote over internet in provincial elections",
        "concepts": ["internet voting", "electoral innovation"],
        "themes": ["elections", "technology"],
    },
    "pes25_internetvote_3": {
        "display_label": "Option to vote over internet in municipal elections",
        "concepts": ["internet voting", "electoral innovation"],
        "themes": ["elections", "technology"],
    },
    "pes25_internetvote2_1": {
        "display_label": "Likelihood of voting over internet in federal elections",
        "concepts": ["internet voting likelihood"],
        "themes": ["elections", "technology"],
    },
    "pes25_internetvote2_2": {
        "display_label": "Likelihood of voting over internet in provincial elections",
        "concepts": ["internet voting likelihood"],
        "themes": ["elections", "technology"],
    },
    "pes25_internetvote3": {
        "display_label": "Support for internet voting option in municipality",
        "concepts": ["municipal internet voting"],
        "themes": ["elections", "technology"],
    },
    "pes25_foreign_grid_1": {
        "display_label": "Confidence that federal election safe from foreign interference overall",
        "concepts": ["foreign interference", "election security"],
        "themes": ["elections", "security"],
    },
    "pes25_foreign_grid_2": {
        "display_label": "Confidence that local constituency election safe from foreign interference",
        "concepts": ["foreign interference", "election security"],
        "themes": ["elections", "security"],
    },
    "pes25_emb_satif": {
        "display_label": "Satisfaction with Elections Canada running federal elections",
        "concepts": ["elections canada satisfaction", "electoral administration"],
        "themes": ["elections", "institutions"],
    },
    "pes25_emb8": {
        "display_label": "Perception that Elections Canada ran the election fairly",
        "concepts": ["electoral fairness", "elections canada"],
        "themes": ["elections", "democracy"],
    },
    "pes25_internetrisk_1": {
        "display_label": "Views on internet voting risks vs accessibility benefits",
        "concepts": ["internet voting risks", "cybersecurity"],
        "themes": ["elections", "technology"],
    },
    "pes25_emb_register": {
        "display_label": "Received voter information card in mail",
        "concepts": ["voter information card", "voter registration"],
        "themes": ["elections", "voting"],
    },
    "pes25_emb_prefer_reg": {
        "display_label": "Preferred format for voter information card (mail vs electronic)",
        "concepts": ["voter information card format"],
        "themes": ["elections", "voting"],
    },
    "pes25_emb4_1": {
        "display_label": "Voting information source used: Elections Canada website",
        "concepts": ["voting information source", "elections canada website"],
        "themes": ["elections", "media"],
    },
    "pes25_emb4_2": {
        "display_label": "Voting information source used: Elections Canada mail leaflet",
        "concepts": ["voting information source", "elections canada mail leaflet"],
        "themes": ["elections", "media"],
    },
    "pes25_emb4_3": {
        "display_label": "Voting information source used: television",
        "concepts": ["voting information source", "television"],
        "themes": ["elections", "media"],
    },
    "pes25_emb4_4": {
        "display_label": "Voting information source used: radio",
        "concepts": ["voting information source", "radio"],
        "themes": ["elections", "media"],
    },
    "pes25_emb4_5": {
        "display_label": "Voting information source used: newspapers",
        "concepts": ["voting information source", "newspapers"],
        "themes": ["elections", "media"],
    },
    "pes25_emb4_6": {
        "display_label": "Voting information source used: social media",
        "concepts": ["voting information source", "social media"],
        "themes": ["elections", "media"],
    },
    "pes25_emb4_7": {
        "display_label": "Voting information source used: family and friends",
        "concepts": ["voting information source", "family and friends"],
        "themes": ["elections", "media"],
    },
    "pes25_emb4_8": {
        "display_label": "Voting information source used: political parties or candidates",
        "concepts": ["voting information source", "political parties or candidates"],
        "themes": ["elections", "media"],
    },
    "pes25_emb4_9": {
        "display_label": "Voting information source used: Elections Canada phone call center",
        "concepts": ["voting information source", "elections canada phone call center"],
        "themes": ["elections", "media"],
    },
    "pes25_emb4_10": {
        "display_label": "Voting information source used: community organizations",
        "concepts": ["voting information source", "community organizations"],
        "themes": ["elections", "media"],
    },
    "pes25_emb4_11": {
        "display_label": "Voting information source used: other website",
        "concepts": ["voting information source", "other website"],
        "themes": ["elections", "media"],
    },
    "pes25_emb4_12": {
        "display_label": "Voting information source used: news sites",
        "concepts": ["voting information source", "news sites"],
        "themes": ["elections", "media"],
    },
    "pes25_emb4_13": {
        "display_label": "Voting information source used: search engines",
        "concepts": ["voting information source", "search engines"],
        "themes": ["elections", "media"],
    },
    "pes25_emb4_14": {
        "display_label": "Voting information source used: other source",
        "concepts": ["voting information source", "other source"],
        "themes": ["elections", "media"],
    },
    "pes25_emb4_15": {
        "display_label": "Voting information source used: workplace",
        "concepts": ["voting information source", "workplace"],
        "themes": ["elections", "media"],
    },
    "pes25_emb4_16": {
        "display_label": "Voting information source used: did not get info",
        "concepts": ["voting information source", "did not get info"],
        "themes": ["elections", "media"],
    },
    "pes25_emb4_11_TEXT": {
        "display_label": "Voting information source used: other website",
        "concepts": ["voting information source", "other website"],
        "themes": ["elections", "media"],
    },
    "pes25_emb4_14_TEXT": {
        "display_label": "Voting information source used: other source",
        "concepts": ["voting information source", "other source"],
        "themes": ["elections", "media"],
    },
    "pes25_emb_preferred": {
        "display_label": "Preferred method to receive official voting location and date info",
        "concepts": ["preferred voter information method"],
        "themes": ["elections", "voting"],
    },
    "pes25_emb_accuracy": {
        "display_label": "Trust in accuracy of election voting results in local district",
        "concepts": ["trust in election results", "electoral accuracy"],
        "themes": ["elections", "trust"],
    },
    "pes25_emb_fraud": {
        "display_label": "Perceived frequency of voter fraud in Canadian elections",
        "concepts": ["voter fraud perception", "electoral integrity"],
        "themes": ["elections", "trust"],
    },
    "pes25_ai": {
        "display_label": "Confidence in election information amidst artificial intelligence rise",
        "concepts": ["ai misinformation", "election info confidence"],
        "themes": ["elections", "media", "technology"],
    },
    "pes25_provvote": {
        "display_label": "Provincial vote choice intention if election held today",
        "concepts": ["provincial vote intention"],
        "themes": ["elections", "provinces"],
    },
    "pes25_provvote_14_TEXT": {
        "display_label": "Provincial vote choice intention if election held today",
        "concepts": ["provincial vote intention"],
        "themes": ["elections", "provinces"],
    },
    "pes25_discfam": {
        "display_label": "Frequency of discussing politics with family and friends",
        "concepts": ["political discussion", "interpersonal communication"],
        "themes": ["civic participation"],
    },
    "pes25_partic1_1": {
        "display_label": "Political participation: attending political rally or meeting",
        "concepts": ["political participation", "attending political rally or meeting"],
        "themes": ["civic participation"],
    },
    "pes25_partic1_2": {
        "display_label": "Political participation: donating money to party or candidate",
        "concepts": ["political participation", "donating money to party or candidate"],
        "themes": ["civic participation"],
    },
    "pes25_partic1_3": {
        "display_label": "Political participation: wearing lawn sign, button or sticker",
        "concepts": ["political participation", "wearing lawn sign, button or sticker"],
        "themes": ["civic participation"],
    },
    "pes25_partic1_4": {
        "display_label": "Political participation: volunteering for party or campaign",
        "concepts": ["political participation", "volunteering for party or campaign"],
        "themes": ["civic participation"],
    },
    "pes25_partic2_1": {
        "display_label": "Political participation: boycotting products for political reasons",
        "concepts": ["political participation", "boycotting products for political reasons"],
        "themes": ["civic participation"],
    },
    "pes25_partic2_2": {
        "display_label": "Political participation: contacting politician or official",
        "concepts": ["political participation", "contacting politician or official"],
        "themes": ["civic participation"],
    },
    "pes25_partic2_3": {
        "display_label": "Political participation: signing paper or online petition",
        "concepts": ["political participation", "signing paper or online petition"],
        "themes": ["civic participation"],
    },
    "pes25_partic2_4": {
        "display_label": "Political participation: posting political content on social media",
        "concepts": ["political participation", "posting political content on social media"],
        "themes": ["civic participation"],
    },
    "pes25_partic3_1": {
        "display_label": "Political participation: participating in protest or demonstration",
        "concepts": ["political participation", "participating in protest or demonstration"],
        "themes": ["civic participation"],
    },
    "pes25_partic3_2": {
        "display_label": "Political participation: joining civic or community group",
        "concepts": ["political participation", "joining civic or community group"],
        "themes": ["civic participation"],
    },
    "pes25_partic3_3": {
        "display_label": "Political participation: persuading others how to vote",
        "concepts": ["political participation", "persuading others how to vote"],
        "themes": ["civic participation"],
    },
    "pes25_partic3_4": {
        "display_label": "Political participation: following news on political issues",
        "concepts": ["political participation", "following news on political issues"],
        "themes": ["civic participation"],
    },
    "pes25_subj_pid_ind_p": {
        "display_label": "Party perceived as most liked by Indigenous peoples",
        "concepts": ["perceived group party alignment", "group sympathy", "indigenous peoples"],
        "themes": ["parties", "society"],
    },
    "pes25_subj_pid_min_p": {
        "display_label": "Party perceived as most liked by Racial and ethnic minorities",
        "concepts": ["perceived group party alignment", "group sympathy", "racial and ethnic minorities"],
        "themes": ["parties", "society"],
    },
    "pes25_subj_pid_gay_p": {
        "display_label": "Party perceived as most liked by LGBTQ+ community",
        "concepts": ["perceived group party alignment", "group sympathy", "lgbtq+ community"],
        "themes": ["parties", "society"],
    },
    "pes25_subj_pid_wom_p": {
        "display_label": "Party perceived as most liked by Women",
        "concepts": ["perceived group party alignment", "group sympathy", "women"],
        "themes": ["parties", "society"],
    },
    "pes25_subj_pid_ch_p": {
        "display_label": "Party perceived as most liked by Christians",
        "concepts": ["perceived group party alignment", "group sympathy", "christians"],
        "themes": ["parties", "society"],
    },
    "pes25_subj_pid_imm_p": {
        "display_label": "Party perceived as most liked by Immigrants",
        "concepts": ["perceived group party alignment", "group sympathy", "immigrants"],
        "themes": ["parties", "society"],
    },
    "pes25_subj_pid_que_p": {
        "display_label": "Party perceived as most liked by Quebeckers",
        "concepts": ["perceived group party alignment", "group sympathy", "quebeckers"],
        "themes": ["parties", "society"],
    },
    "pes25_subj_pid_uni_p": {
        "display_label": "Party perceived as most liked by Unions",
        "concepts": ["perceived group party alignment", "group sympathy", "unions"],
        "themes": ["parties", "society"],
    },
    "pes25_subj_pid_mid_p": {
        "display_label": "Party perceived as most liked by Middle class Canadians",
        "concepts": ["perceived group party alignment", "group sympathy", "middle class canadians"],
        "themes": ["parties", "society"],
    },
    "pes25_subj_pid_wor_p": {
        "display_label": "Party perceived as most liked by Working class Canadians",
        "concepts": ["perceived group party alignment", "group sympathy", "working class canadians"],
        "themes": ["parties", "society"],
    },
    "pes25_subj_pid_big_p": {
        "display_label": "Party perceived as most liked by Corporations",
        "concepts": ["perceived group party alignment", "group sympathy", "corporations"],
        "themes": ["parties", "society"],
    },
    "pes25_subj_pid_wea_p": {
        "display_label": "Party perceived as most liked by Wealthy Canadians",
        "concepts": ["perceived group party alignment", "group sympathy", "wealthy canadians"],
        "themes": ["parties", "society"],
    },
    "pes25_subj_pid_cat_p": {
        "display_label": "Party perceived as most liked by Catholics",
        "concepts": ["perceived group party alignment", "group sympathy", "catholics"],
        "themes": ["parties", "society"],
    },
    "pes25_subj_pid_eva_p": {
        "display_label": "Party perceived as most liked by Evangelicals",
        "concepts": ["perceived group party alignment", "group sympathy", "evangelicals"],
        "themes": ["parties", "society"],
    },
    "pes25_subj_pid_mus_p": {
        "display_label": "Party perceived as most liked by Muslims",
        "concepts": ["perceived group party alignment", "group sympathy", "muslims"],
        "themes": ["parties", "society"],
    },
    "pes25_subj_pid_sik_p": {
        "display_label": "Party perceived as most liked by Sikhs",
        "concepts": ["perceived group party alignment", "group sympathy", "sikhs"],
        "themes": ["parties", "society"],
    },
    "pes25_subj_pid_po_p": {
        "display_label": "Party perceived as most liked by Poor people",
        "concepts": ["perceived group party alignment", "group sympathy", "poor people"],
        "themes": ["parties", "society"],
    },
    "pes25_subj_pid_ind_r": {
        "display_label": "Party perceived as best representing interests of Indigenous peoples",
        "concepts": ["perceived group interest representation", "party coalitions", "indigenous peoples"],
        "themes": ["parties", "representation"],
    },
    "pes25_subj_pid_min_r": {
        "display_label": "Party perceived as best representing interests of Racial and ethnic minorities",
        "concepts": ["perceived group interest representation", "party coalitions", "racial and ethnic minorities"],
        "themes": ["parties", "representation"],
    },
    "pes25_subj_pid_gay_r": {
        "display_label": "Party perceived as best representing interests of LGBTQ+ community",
        "concepts": ["perceived group interest representation", "party coalitions", "lgbtq+ community"],
        "themes": ["parties", "representation"],
    },
    "pes25_subj_pid_wom_r": {
        "display_label": "Party perceived as best representing interests of Women",
        "concepts": ["perceived group interest representation", "party coalitions", "women"],
        "themes": ["parties", "representation"],
    },
    "pes25_subj_pid_ch_r": {
        "display_label": "Party perceived as best representing interests of Christians",
        "concepts": ["perceived group interest representation", "party coalitions", "christians"],
        "themes": ["parties", "representation"],
    },
    "pes25_subj_pid_imm_r": {
        "display_label": "Party perceived as best representing interests of Immigrants",
        "concepts": ["perceived group interest representation", "party coalitions", "immigrants"],
        "themes": ["parties", "representation"],
    },
    "pes25_subj_pid_que_r": {
        "display_label": "Party perceived as best representing interests of Quebeckers",
        "concepts": ["perceived group interest representation", "party coalitions", "quebeckers"],
        "themes": ["parties", "representation"],
    },
    "pes25_subj_pid_uni_r": {
        "display_label": "Party perceived as best representing interests of Unions",
        "concepts": ["perceived group interest representation", "party coalitions", "unions"],
        "themes": ["parties", "representation"],
    },
    "pes25_subj_pid_mid_r": {
        "display_label": "Party perceived as best representing interests of Middle class Canadians",
        "concepts": ["perceived group interest representation", "party coalitions", "middle class canadians"],
        "themes": ["parties", "representation"],
    },
    "pes25_subj_pid_wor_r": {
        "display_label": "Party perceived as best representing interests of Working class Canadians",
        "concepts": ["perceived group interest representation", "party coalitions", "working class canadians"],
        "themes": ["parties", "representation"],
    },
    "pes25_subj_pid_big_r": {
        "display_label": "Party perceived as best representing interests of Corporations",
        "concepts": ["perceived group interest representation", "party coalitions", "corporations"],
        "themes": ["parties", "representation"],
    },
    "pes25_subj_pid_wea_r": {
        "display_label": "Party perceived as best representing interests of Wealthy Canadians",
        "concepts": ["perceived group interest representation", "party coalitions", "wealthy canadians"],
        "themes": ["parties", "representation"],
    },
    "pes25_subj_pid_cat_r": {
        "display_label": "Party perceived as best representing interests of Catholics",
        "concepts": ["perceived group interest representation", "party coalitions", "catholics"],
        "themes": ["parties", "representation"],
    },
    "pes25_subj_pid_eva_r": {
        "display_label": "Party perceived as best representing interests of Evangelicals",
        "concepts": ["perceived group interest representation", "party coalitions", "evangelicals"],
        "themes": ["parties", "representation"],
    },
    "pes25_subj_pid_mus_r": {
        "display_label": "Party perceived as best representing interests of Muslims",
        "concepts": ["perceived group interest representation", "party coalitions", "muslims"],
        "themes": ["parties", "representation"],
    },
    "pes25_subj_pid_sik_r": {
        "display_label": "Party perceived as best representing interests of Sikhs",
        "concepts": ["perceived group interest representation", "party coalitions", "sikhs"],
        "themes": ["parties", "representation"],
    },
    "pes25_subj_pid_po_r": {
        "display_label": "Party perceived as best representing interests of Poor people",
        "concepts": ["perceived group interest representation", "party coalitions", "poor people"],
        "themes": ["parties", "representation"],
    },
    "pes25_partymember": {
        "display_label": "Past or present membership in political party",
        "concepts": ["party membership", "political involvement"],
        "themes": ["parties", "civic participation"],
    },
    "pes25_womenparl": {
        "display_label": "Having more women in Parliament best protects women's interests",
        "concepts": ["women in parliament", "descriptive representation"],
        "themes": ["representation", "gender"],
    },
    "pes25_populism_1": {
        "display_label": "Populism scale - internal political efficacy",
        "concepts": ["populism", "anti-establishment sentiment", "internal political efficacy"],
        "themes": ["ideology", "democracy"],
    },
    "pes25_populism_2": {
        "display_label": "Populism scale - political compromise as selling out",
        "concepts": ["populism", "anti-establishment sentiment", "political compromise as selling out"],
        "themes": ["ideology", "democracy"],
    },
    "pes25_populism_3": {
        "display_label": "Populism scale - politicians do not care about ordinary people",
        "concepts": ["populism", "anti-establishment sentiment", "politicians do not care about ordinary people"],
        "themes": ["ideology", "democracy"],
    },
    "pes25_populism_4": {
        "display_label": "Populism scale - politicians are trustworthy",
        "concepts": ["populism", "anti-establishment sentiment", "politicians are trustworthy"],
        "themes": ["ideology", "democracy"],
    },
    "pes25_populism_5": {
        "display_label": "Populism scale - politicians are main problem in Canada",
        "concepts": ["populism", "anti-establishment sentiment", "politicians are main problem in canada"],
        "themes": ["ideology", "democracy"],
    },
    "pes25_populism_6": {
        "display_label": "Populism scale - strong leader bending rules",
        "concepts": ["populism", "anti-establishment sentiment", "strong leader bending rules"],
        "themes": ["ideology", "democracy"],
    },
    "pes25_populism_7": {
        "display_label": "Populism scale - people making policy decisions over politicians",
        "concepts": ["populism", "anti-establishment sentiment", "people making policy decisions over politicians"],
        "themes": ["ideology", "democracy"],
    },
    "pes25_populism_8": {
        "display_label": "Populism scale - politicians serving rich and powerful",
        "concepts": ["populism", "anti-establishment sentiment", "politicians serving rich and powerful"],
        "themes": ["ideology", "democracy"],
    },
    "pes25_sdo1": {
        "display_label": "Social dominance orientation - group placement keeping order",
        "concepts": ["social dominance orientation", "group equality"],
        "themes": ["values", "society"],
    },
    "pes25_sdo2": {
        "display_label": "Social dominance orientation - equalizing conditions for different groups",
        "concepts": ["social dominance orientation", "group equality"],
        "themes": ["values", "society"],
    },
    "pes25_sdo3": {
        "display_label": "Social dominance orientation - group equality as ideal",
        "concepts": ["social dominance orientation", "group equality"],
        "themes": ["values", "society"],
    },
    "pes25_sdo4": {
        "display_label": "Social dominance orientation - hierarchical group social structure",
        "concepts": ["social dominance orientation", "group equality"],
        "themes": ["values", "society"],
    },
    "pes25_donerm": {
        "display_label": "Support for government action for racial minorities",
        "concepts": ["group support", "equity policy", "racial minorities"],
        "themes": ["society", "human rights"],
    },
    "pes25_donew": {
        "display_label": "Support for government action for women",
        "concepts": ["group support", "equity policy", "women"],
        "themes": ["society", "human rights"],
    },
    "pes25_donegl": {
        "display_label": "Support for government action for lesbians and gay men",
        "concepts": ["group support", "equity policy", "lesbians and gay men"],
        "themes": ["society", "human rights"],
    },
    "pes25_doneqc": {
        "display_label": "Support for government action for Quebec",
        "concepts": ["group support", "equity policy", "quebec"],
        "themes": ["society", "human rights"],
    },
    "pes25_abort2": {
        "display_label": "Support for banning abortion",
        "concepts": ["abortion policy", "reproductive rights"],
        "themes": ["public policy", "values"],
    },
    "pes25_trade": {
        "display_label": "International trade job creation vs destruction",
        "concepts": ["free trade impact", "trade and jobs"],
        "themes": ["economy", "trade"],
    },
    "pes25_privjobs": {
        "display_label": "Leaving job creation entirely to private sector",
        "concepts": ["free market job creation", "state intervention"],
        "themes": ["economy", "public policy"],
    },
    "pes25_blame": {
        "display_label": "Attributing personal failure to individual blame vs system",
        "concepts": ["individual responsibility vs systemic causes"],
        "themes": ["values", "economy"],
    },
    "pes25_stdofliving": {
        "display_label": "Government responsibility for ensuring adequate standard of living",
        "concepts": ["welfare state", "guaranteed standard of living"],
        "themes": ["public policy", "economy"],
    },
    "pes25_decent_housing": {
        "display_label": "Government responsibility to provide decent housing for all",
        "concepts": ["housing right", "decent housing guarantee"],
        "themes": ["public policy", "housing"],
    },
    "pes25_govt_act_ineq": {
        "display_label": "Government measures to reduce income differences",
        "concepts": ["income redistribution", "reducing inequality"],
        "themes": ["public policy", "economy"],
    },
    "pes25_deserve1": {
        "display_label": "View that anyone who really wants to work can find job",
        "concepts": ["job availability", "work ethic"],
        "themes": ["values", "economy"],
    },
    "pes25_deserve2": {
        "display_label": "View that welfare state undermines personal self-reliance",
        "concepts": ["welfare dependency", "self-reliance"],
        "themes": ["values", "economy"],
    },
    "pes25_hostile1": {
        "display_label": "Hostile sexism scale - women appreciation of men",
        "concepts": ["hostile sexism", "gender attitudes"],
        "themes": ["society", "gender"],
    },
    "pes25_hostile2": {
        "display_label": "Hostile sexism scale - women seeking power over men",
        "concepts": ["hostile sexism", "gender attitudes"],
        "themes": ["society", "gender"],
    },
    "pes25_hostile4": {
        "display_label": "Hostile sexism scale - women exaggerating work problems",
        "concepts": ["hostile sexism", "gender attitudes"],
        "themes": ["society", "gender"],
    },
    "pes25_hostile3": {
        "display_label": "Hostile sexism scale - women interpreting innocent remarks as sexist",
        "concepts": ["hostile sexism", "gender attitudes"],
        "themes": ["society", "gender"],
    },
    "pes25_benevolent1": {
        "display_label": "Benevolent sexism scale - men cherishing and protecting women",
        "concepts": ["benevolent sexism", "gender attitudes"],
        "themes": ["society", "gender"],
    },
    "pes25_benevolent2": {
        "display_label": "Benevolent sexism scale - women moral purity quality",
        "concepts": ["benevolent sexism", "gender attitudes"],
        "themes": ["society", "gender"],
    },
    "pes25_benevolent3": {
        "display_label": "Benevolent sexism scale - man setting good woman on pedestal",
        "concepts": ["benevolent sexism", "gender attitudes"],
        "themes": ["society", "gender"],
    },
    "pes25_trust": {
        "display_label": "Generalized interpersonal trust ('most people can be trusted')",
        "concepts": ["interpersonal trust", "social trust"],
        "themes": ["society", "trust"],
    },
    "pes25_inequal": {
        "display_label": "Income inequality perceived as major problem in Canada",
        "concepts": ["income inequality problem"],
        "themes": ["economy", "society"],
    },
    "pes25_gap": {
        "display_label": "Action needed to reduce gap between rich and poor",
        "concepts": ["reducing rich-poor gap", "redistribution"],
        "themes": ["economy", "public policy"],
    },
    "pes25_prov_treatment": {
        "display_label": "Federal government treatment of respondent's province",
        "concepts": ["federal treatment of province", "regional grievance"],
        "themes": ["federalism", "provinces"],
    },
    "pes25_provfed": {
        "display_label": "Preference for strong federal government vs strong provincial government",
        "concepts": ["federalism balance", "provincial vs federal power"],
        "themes": ["federalism", "provinces"],
    },
    "pes25_cc1": {
        "display_label": "Belief that climate change is happening",
        "concepts": ["climate change belief", "global warming"],
        "themes": ["environment", "climate"],
    },
    "pes25_cc2": {
        "display_label": "Perceived primary cause of climate change (human activity vs natural causes)",
        "concepts": ["climate change cause", "human-caused climate change"],
        "themes": ["environment", "climate"],
    },
    "pes25_cc2_3_TEXT": {
        "display_label": "Perceived primary cause of climate change (human activity vs natural causes)",
        "concepts": ["climate change cause", "human-caused climate change"],
        "themes": ["environment", "climate"],
    },
    "pes25_pidtrad": {
        "display_label": "Traditional federal political party identification",
        "concepts": ["party identification", "federal party choice"],
        "themes": ["parties"],
    },
    "pes25_pidtrad_7_TEXT": {
        "display_label": "Traditional federal political party identification",
        "concepts": ["party identification", "federal party choice"],
        "themes": ["parties"],
    },
    "pes25_pidtradstrong": {
        "display_label": "Strength of traditional federal party identification",
        "concepts": ["party identification strength"],
        "themes": ["parties"],
    },
    "pes25_langQC": {
        "display_label": "Perceived threat to French language in Quebec",
        "concepts": ["french language threat", "quebec language"],
        "themes": ["quebec", "identity", "language"],
    },
    "pes25_cultureQC": {
        "display_label": "Perceived threat to French culture in Quebec",
        "concepts": ["french culture threat", "quebec culture"],
        "themes": ["quebec", "identity"],
    },
    "pes25_qclang": {
        "display_label": "Impact of Quebec independence on French language situation",
        "concepts": ["quebec sovereignty impact", "french language"],
        "themes": ["quebec", "sovereignty", "language"],
    },
    "pes25_qcsol": {
        "display_label": "Impact of Quebec independence on personal standard of living",
        "concepts": ["quebec sovereignty economic impact"],
        "themes": ["quebec", "sovereignty", "economy"],
    },
    "pes25_newerlife": {
        "display_label": "View that newer lifestyles contribute to breakdown of society",
        "concepts": ["cultural conservatism", "social change"],
        "themes": ["values", "society"],
    },
    "pes25_cognition": {
        "display_label": "Need for Cognition - enjoying tasks requiring complex thinking",
        "concepts": ["need for cognition", "personality trait"],
        "themes": ["psychology"],
    },
    "pes25_phealth": {
        "display_label": "Self-rated physical health compared to peers",
        "concepts": ["physical health self-assessment"],
        "themes": ["health", "demographics"],
    },
    "pes25_mhealth": {
        "display_label": "Self-rated mental health compared to peers",
        "concepts": ["mental health self-assessment"],
        "themes": ["health", "demographics"],
    },
    "pes25_place_live": {
        "display_label": "Residential area type (urban, suburban, rural)",
        "concepts": ["urban rural classification", "residential type"],
        "themes": ["geography", "demographics"],
    },
    "pes25_place_live_s1": {
        "display_label": "Place identity and rural/urban resentment - identity as area resident",
        "concepts": ["place identity", "rural urban resentment", "spatial identity"],
        "themes": ["geography", "identity", "society"],
    },
    "pes25_place_live_s2": {
        "display_label": "Place identity and rural/urban resentment - importance of local place identity",
        "concepts": ["place identity", "rural urban resentment", "spatial identity"],
        "themes": ["geography", "identity", "society"],
    },
    "pes25_place_live_s3": {
        "display_label": "Place identity and rural/urban resentment - feeling connected to people in same area type",
        "concepts": ["place identity", "rural urban resentment", "spatial identity"],
        "themes": ["geography", "identity", "society"],
    },
    "pes25_place_live_s4": {
        "display_label": "Place identity and rural/urban resentment - sharing values with local area residents",
        "concepts": ["place identity", "rural urban resentment", "spatial identity"],
        "themes": ["geography", "identity", "society"],
    },
    "pes25_place_live_s5": {
        "display_label": "Place identity and rural/urban resentment - having a lot in common with local area residents",
        "concepts": ["place identity", "rural urban resentment", "spatial identity"],
        "themes": ["geography", "identity", "society"],
    },
    "pes25_place_live_s6": {
        "display_label": "Place identity and rural/urban resentment - perception of disrespect toward local lifestyle",
        "concepts": ["place identity", "rural urban resentment", "spatial identity"],
        "themes": ["geography", "identity", "society"],
    },
    "pes25_place_live_s7": {
        "display_label": "Place identity and rural/urban resentment - perception that local area is last in line for government spending",
        "concepts": ["place identity", "rural urban resentment", "spatial identity"],
        "themes": ["geography", "identity", "society"],
    },
    "pes25_place_live_s8": {
        "display_label": "Place identity and rural/urban resentment - perception that local residents have no say in government",
        "concepts": ["place identity", "rural urban resentment", "spatial identity"],
        "themes": ["geography", "identity", "society"],
    },
    "cses_module6_Q02a": {
        "display_label": "CSES M6 - Media consumption: public television news watching",
        "concepts": ["cses", "media consumption", "public television news watching"],
        "themes": ["media"],
    },
    "cses_module6_Q02b": {
        "display_label": "CSES M6 - Media consumption: private television news watching",
        "concepts": ["cses", "media consumption", "private television news watching"],
        "themes": ["media"],
    },
    "cses_module6_Q02c": {
        "display_label": "CSES M6 - Media consumption: radio news listening",
        "concepts": ["cses", "media consumption", "radio news listening"],
        "themes": ["media"],
    },
    "cses_module6_Q02d": {
        "display_label": "CSES M6 - Media consumption: newspaper reading (print or online)",
        "concepts": ["cses", "media consumption", "newspaper reading (print or online)"],
        "themes": ["media"],
    },
    "cses_module6_Q02e": {
        "display_label": "CSES M6 - Media consumption: online news sites visiting",
        "concepts": ["cses", "media consumption", "online news sites visiting"],
        "themes": ["media"],
    },
    "cses_module6_Q02f": {
        "display_label": "CSES M6 - Media consumption: social media news following",
        "concepts": ["cses", "media consumption", "social media news following"],
        "themes": ["media"],
    },
    "cses_module6_Q02g": {
        "display_label": "CSES M6 - Media consumption: daily social media news use frequency",
        "concepts": ["cses", "media consumption", "daily social media news use frequency"],
        "themes": ["media"],
    },
    "cses_module6_Q03": {
        "display_label": "CSES M6 - Internal political efficacy ('feel you understand issues')",
        "concepts": ["cses", "internal political efficacy"],
        "themes": ["democracy"],
    },
    "cses_module6_Q04a": {
        "display_label": "CSES M6 - Preference for democracy over all other regime types",
        "concepts": ["cses", "support for democracy"],
        "themes": ["democracy"],
    },
    "cses_module6_Q04b": {
        "display_label": "CSES M6 - Power of courts to stop government acting beyond authority",
        "concepts": ["cses", "judicial review", "rule of law"],
        "themes": ["democracy", "institutions"],
    },
    "cses_module6_Q04d": {
        "display_label": "CSES M6 - Policies to increase women representation in politics",
        "concepts": ["cses", "women representation"],
        "themes": ["representation", "gender"],
    },
    "cses_module6_Q05_1": {
        "display_label": "CSES M6 - Populism item: political compromise as selling out",
        "concepts": ["cses", "populism"],
        "themes": ["ideology", "democracy"],
    },
    "cses_module6_Q05_2": {
        "display_label": "CSES M6 - Populism item: most politicians do not care about ordinary people",
        "concepts": ["cses", "populism"],
        "themes": ["ideology", "democracy"],
    },
    "cses_module6_Q05_3": {
        "display_label": "CSES M6 - Populism item: politicians are main problem",
        "concepts": ["cses", "populism"],
        "themes": ["ideology", "democracy"],
    },
    "cses_module6_Q06_1": {
        "display_label": "CSES M6 - Perceived level of democracy in Canada (0 to 10 scale)",
        "concepts": ["cses", "perceived democracy level"],
        "themes": ["democracy"],
    },
    "cses_module6_Q07_1": {
        "display_label": "CSES M6 - Trust in parliament",
        "concepts": ["cses", "institutional trust", "parliament"],
        "themes": ["trust", "institutions"],
    },
    "cses_module6_Q07_2": {
        "display_label": "CSES M6 - Trust in political parties",
        "concepts": ["cses", "institutional trust", "political parties"],
        "themes": ["trust", "institutions"],
    },
    "cses_module6_Q07_3": {
        "display_label": "CSES M6 - Trust in federal government",
        "concepts": ["cses", "institutional trust", "federal government"],
        "themes": ["trust", "institutions"],
    },
    "cses_module6_Q07_4": {
        "display_label": "CSES M6 - Trust in politicians",
        "concepts": ["cses", "institutional trust", "politicians"],
        "themes": ["trust", "institutions"],
    },
    "cses_module6_Q07_5": {
        "display_label": "CSES M6 - Trust in courts",
        "concepts": ["cses", "institutional trust", "courts"],
        "themes": ["trust", "institutions"],
    },
    "cses_module6_Q07_6": {
        "display_label": "CSES M6 - Trust in police",
        "concepts": ["cses", "institutional trust", "police"],
        "themes": ["trust", "institutions"],
    },
    "cses_module6_Q07_7": {
        "display_label": "CSES M6 - Trust in civil service",
        "concepts": ["cses", "institutional trust", "civil service"],
        "themes": ["trust", "institutions"],
    },
    "cses_module6_Q08a": {
        "display_label": "CSES M6 - Overall performance rating of federal government in Ottawa",
        "concepts": ["cses", "government performance"],
        "themes": ["government"],
    },
    "cses_module6_Q08b": {
        "display_label": "CSES M6 - Performance rating of federal government in managing economy",
        "concepts": ["cses", "economic management rating"],
        "themes": ["government", "economy"],
    },
    "cses_module6_Q09": {
        "display_label": "CSES M6 - State of national economy over past 12 months",
        "concepts": ["cses", "national economic evaluation"],
        "themes": ["economy"],
    },
    "cses_module6_Q11a": {
        "display_label": "CSES M6 - Satisfaction with democracy in Canada",
        "concepts": ["cses", "democratic satisfaction"],
        "themes": ["democracy"],
    },
    "cses_module6_Q11b": {
        "display_label": "CSES M6 - Satisfaction with democracy in respondent's province",
        "concepts": ["cses", "provincial democratic satisfaction"],
        "themes": ["democracy", "provinces"],
    },
    "cses_module6_Q11c": {
        "display_label": "CSES M6 - Satisfaction with democracy in respondent's municipality",
        "concepts": ["cses", "municipal democratic satisfaction"],
        "themes": ["democracy"],
    },
    "cses_module6_Q12": {
        "display_label": "CSES M6 - Overall satisfaction with how democratic system functions",
        "concepts": ["cses", "democratic system performance"],
        "themes": ["democracy"],
    },
    "cses_module6_Q13_1": {
        "display_label": "CSES M6 - Perception of national election fairness in Canada",
        "concepts": ["cses", "election fairness"],
        "themes": ["elections", "democracy"],
    },
    "cses_module6_Q15_1": {
        "display_label": "CSES M6 - Voter efficacy ('who people vote for makes a difference')",
        "concepts": ["cses", "voter efficacy"],
        "themes": ["elections", "voting"],
    },
    "cses_module6_Q23a": {
        "display_label": "CSES M6 - Media consumption: media 3a",
        "concepts": ["cses", "media consumption", "media 3a"],
        "themes": ["media"],
    },
    "cses_module6_Q23b": {
        "display_label": "CSES M6 - Media consumption: media 3b",
        "concepts": ["cses", "media consumption", "media 3b"],
        "themes": ["media"],
    },
    "cses_module6_Q23c": {
        "display_label": "CSES M6 - Media consumption: media 3c",
        "concepts": ["cses", "media consumption", "media 3c"],
        "themes": ["media"],
    },
    "cses_module6_Q23c_7_TEXT": {
        "display_label": "CSES M6 - Media consumption: media 3c_7_TEXT",
        "concepts": ["cses", "media consumption", "media 3c_7_text"],
        "themes": ["media"],
    },
    "cses_module6_Q23d": {
        "display_label": "CSES M6 - Media consumption: media 3d",
        "concepts": ["cses", "media consumption", "media 3d"],
        "themes": ["media"],
    },
    "cses_module6_Q24": {
        "display_label": "CSES M6 - Media consumption: media 4",
        "concepts": ["cses", "media consumption", "media 4"],
        "themes": ["media"],
    },
    "cses_module6_25a": {
        "display_label": "CSES M6 - Preferred leader suitability during a public health crisis",
        "concepts": ["cses", "public health crisis leadership"],
        "themes": ["leadership"],
    },
    "cses_module6_25b": {
        "display_label": "CSES M6 - Preferred leader suitability during an economic crisis",
        "concepts": ["cses", "economic crisis leadership"],
        "themes": ["leadership"],
    },
    "cses_module6_26a": {
        "display_label": "CSES M6 - Perceived fair treatment of all societal groups in Canada",
        "concepts": ["cses", "societal group fairness"],
        "themes": ["society"],
    },
    "cses_module6_Q26b": {
        "display_label": "CSES M6 - Media consumption: media 6b",
        "concepts": ["cses", "media consumption", "media 6b"],
        "themes": ["media"],
    },
    "cses_module6_27a": {
        "display_label": "CSES M6 - Impact of coronavirus pandemic on societal unity in Canada",
        "concepts": ["cses", "covid impact", "societal unity"],
        "themes": ["covid", "society"],
    },
    "cses_module6_27b": {
        "display_label": "CSES M6 - Impact of coronavirus pandemic on functioning of democracy in Canada",
        "concepts": ["cses", "covid impact", "democracy functioning"],
        "themes": ["covid", "democracy"],
    },
    "cses_module6_Q27c": {
        "display_label": "CSES M6 - Media consumption: media 7c",
        "concepts": ["cses", "media consumption", "media 7c"],
        "themes": ["media"],
    },
    "cses_module6_Q27d": {
        "display_label": "CSES M6 - Media consumption: media 7d",
        "concepts": ["cses", "media consumption", "media 7d"],
        "themes": ["media"],
    },
    "cses_module6_QD07a": {
        "display_label": "CSES M6 - Subjective social class / status self-identification",
        "concepts": ["cses", "subjective social class"],
        "themes": ["demographics", "society"],
    },
    "pes25_disability": {
        "display_label": "Disability status and type",
        "concepts": ["disability", "accessibility"],
        "themes": ["demographics", "health"],
    },
    "pes25_disabilitytype": {
        "display_label": "Disability status and type",
        "concepts": ["disability", "accessibility"],
        "themes": ["demographics", "health"],
    },
    "pes25_disabilitytype_6_TEXT": {
        "display_label": "Disability status and type",
        "concepts": ["disability", "accessibility"],
        "themes": ["demographics", "health"],
    },
    "pes25_service_freq": {
        "display_label": "Frequency of religious service attendance",
        "concepts": ["religious service attendance", "religiosity"],
        "themes": ["demographics", "religion"],
    },
    "pes25_parents_born": {
        "display_label": "Parents born outside Canada status",
        "concepts": ["immigrant background", "family origin"],
        "themes": ["demographics", "immigration"],
    },
    "pes25_lived": {
        "display_label": "Number of years lived in current city or community",
        "concepts": ["residence duration", "community tenure"],
        "themes": ["demographics", "geography"],
    },
    "pes25_lang": {
        "display_label": "Primary language spoken at home",
        "concepts": ["home language", "mother tongue"],
        "themes": ["demographics", "language"],
    },
    "pes25_lang_3_TEXT": {
        "display_label": "Home language text specification",
        "concepts": ["home language"],
        "themes": ["demographics", "language"],
    },
    "pes25_lang_17_TEXT": {
        "display_label": "Home language text specification",
        "concepts": ["home language"],
        "themes": ["demographics", "language"],
    },
    "pes25_occ_select": {
        "display_label": "Main occupation category (NOC)",
        "concepts": ["occupation", "profession"],
        "themes": ["demographics", "work"],
    },
    "pes25_occ_select_2": {
        "display_label": "Main occupation category (NOC)",
        "concepts": ["occupation", "profession"],
        "themes": ["demographics", "work"],
    },
    "pes25_libwords": {
        "display_label": "Word association for Liberal Party of Canada",
        "concepts": ["party image", "liberal party association"],
        "themes": ["parties"],
    },
    "pes25_conwords": {
        "display_label": "Word association for Conservative Party of Canada",
        "concepts": ["party image", "conservative party association"],
        "themes": ["parties"],
    },
    "pes25_ndpwords": {
        "display_label": "Word association for New Democratic Party (NDP)",
        "concepts": ["party image", "ndp association"],
        "themes": ["parties"],
    },
    "pes25_bqwords": {
        "display_label": "Word association for Bloc Québécois",
        "concepts": ["party image", "bloc quebecois association"],
        "themes": ["parties", "quebec"],
    },
}
