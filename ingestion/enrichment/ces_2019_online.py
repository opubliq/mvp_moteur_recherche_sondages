"""Enrichment authoré — ces_2019_online. Produit par subagent LLM (2026-08-28)."""

SURVEY = {
    "description": "2019 Canadian Election Study (Online Survey) — two-wave study (CPS: campaign period, PES: post-election) conducted during and immediately after the October 21, 2019 Canadian federal election.",
    "month": 10,
}

QUESTIONS = {
    "cps19_citizenship": {
        "display_label": "Canadian citizenship status",
        "concepts": ["citizenship"],
        "themes": ["demographics"],
    },
    "cps19_yob": {
        "display_label": "Year of birth",
        "concepts": ["age", "year of birth"],
        "themes": ["demographics"],
    },
    "cps19_yob_2001_age": {
        "display_label": "Age in years",
        "concepts": ["age"],
        "themes": ["demographics"],
    },
    "cps19_gender": {
        "display_label": "Gender identity",
        "concepts": ["gender"],
        "themes": ["demographics"],
    },
    "cps19_province": {
        "display_label": "Province or territory of residence (CPS)",
        "concepts": ["province", "geography"],
        "themes": ["demographics", "geography"],
    },
    "cps19_education": {
        "display_label": "Highest level of education completed",
        "concepts": ["education", "attainment"],
        "themes": ["demographics"],
    },
    "cps19_demsat": {
        "display_label": "Satisfaction with Canadian democracy",
        "concepts": ["democratic satisfaction", "trust in democracy"],
        "themes": ["democracy", "elections"],
    },
    "cps19_imp_iss": {
        "display_label": "Most important issue personally in federal election",
        "concepts": ["issue salience", "election priorities", "most important issue"],
        "themes": ["issues", "elections"],
    },
    "cps19_imp_iss_party": {
        "display_label": "Party best at addressing most important issue",
        "concepts": ["issue ownership", "party competence"],
        "themes": ["parties", "issues", "elections"],
    },
    "cps19_imp_iss_party_7_TEXT": {
        "display_label": "Party best at addressing most important issue (other party text)",
        "concepts": ["issue ownership", "party competence"],
        "themes": ["parties", "issues"],
    },
    "cps19_imp_loc_iss": {
        "display_label": "Most important local riding issue",
        "concepts": ["local issue salience", "riding priorities"],
        "themes": ["issues", "elections"],
    },
    "cps19_imp_loc_iss_p": {
        "display_label": "Party best at addressing most important local issue",
        "concepts": ["issue ownership", "local priorities"],
        "themes": ["parties", "issues"],
    },
    "cps19_imp_loc_iss_p_7_TEXT": {
        "display_label": "Party best at addressing local issue (other party text)",
        "concepts": ["issue ownership"],
        "themes": ["parties", "issues"],
    },
    "cps19_interest_gen_1": {
        "display_label": "General interest in politics (0-10 scale)",
        "concepts": ["political interest", "civic engagement"],
        "themes": ["elections", "democracy"],
    },
    "cps19_interest_elxn_1": {
        "display_label": "Interest in 2019 federal election (0-10 scale)",
        "concepts": ["election interest", "civic engagement"],
        "themes": ["elections"],
    },
    "cps19_v_likely": {
        "display_label": "Likelihood of voting on election day",
        "concepts": ["turnout intention", "voting likelihood"],
        "themes": ["elections", "voting"],
    },
    "cps19_v_likely_pr": {
        "display_label": "Likelihood of voting if becoming Canadian citizen",
        "concepts": ["turnout intention", "new citizens voting"],
        "themes": ["elections", "voting"],
    },
    "cps19_votechoice": {
        "display_label": "Federal party vote choice intention",
        "concepts": ["vote choice", "party preference"],
        "themes": ["elections", "parties"],
    },
    "cps19_votechoice_7_TEXT": {
        "display_label": "Federal party vote choice intention (other party text)",
        "concepts": ["vote choice", "minor parties"],
        "themes": ["elections", "parties"],
    },
    "cps19_votechoice_pr": {
        "display_label": "Vote choice if eligible to vote",
        "concepts": ["vote choice", "hypothetical vote"],
        "themes": ["elections", "parties"],
    },
    "cps19_votechoice_pr_7_TEXT": {
        "display_label": "Vote choice if eligible to vote (other party text)",
        "concepts": ["vote choice", "hypothetical vote"],
        "themes": ["elections", "parties"],
    },
    "cps19_vote_unlikely": {
        "display_label": "Vote choice if deciding to vote (unlikely voters)",
        "concepts": ["vote choice", "unlikely voters"],
        "themes": ["elections", "parties"],
    },
    "cps19_vote_unlikely_7_TEXT": {
        "display_label": "Vote choice if deciding to vote (other party text)",
        "concepts": ["vote choice", "unlikely voters"],
        "themes": ["elections", "parties"],
    },
    "cps19_vote_unlike_pr": {
        "display_label": "Vote choice if eligible and deciding to vote",
        "concepts": ["vote choice", "hypothetical vote"],
        "themes": ["elections", "parties"],
    },
    "cps19_vote_unlike_pr_7_TEXT": {
        "display_label": "Vote choice if eligible and deciding to vote (other party text)",
        "concepts": ["vote choice", "hypothetical vote"],
        "themes": ["elections", "parties"],
    },
    "cps19_v_advance": {
        "display_label": "Party voted for in advance poll",
        "concepts": ["advance voting", "early voting", "vote choice"],
        "themes": ["elections", "parties"],
    },
    "cps19_v_advance_7_TEXT": {
        "display_label": "Party voted for in advance poll (other party text)",
        "concepts": ["advance voting", "early voting"],
        "themes": ["elections", "parties"],
    },
    "cps19_vote_lean": {
        "display_label": "Party respondent is leaning towards",
        "concepts": ["party leaning", "vote choice"],
        "themes": ["elections", "parties"],
    },
    "cps19_vote_lean_7_TEXT": {
        "display_label": "Party leaning (other party text)",
        "concepts": ["party leaning"],
        "themes": ["elections", "parties"],
    },
    "cps19_vote_lean_pr": {
        "display_label": "Party leaning if eligible to vote",
        "concepts": ["party leaning", "hypothetical vote"],
        "themes": ["elections", "parties"],
    },
    "cps19_vote_lean_pr_7_TEXT": {
        "display_label": "Party leaning if eligible to vote (other party text)",
        "concepts": ["party leaning"],
        "themes": ["elections", "parties"],
    },
    "cps19_2nd_choice": {
        "display_label": "Second choice party preference",
        "concepts": ["second choice party", "party preference"],
        "themes": ["elections", "parties"],
    },
    "cps19_2nd_choice_7_TEXT": {
        "display_label": "Second choice party preference (other party text)",
        "concepts": ["second choice party"],
        "themes": ["elections", "parties"],
    },
    "cps19_2nd_choice_pr": {
        "display_label": "Second choice party preference if eligible to vote",
        "concepts": ["second choice party"],
        "themes": ["elections", "parties"],
    },
    "cps19_2nd_choice_pr_7_TEXT": {
        "display_label": "Second choice party preference if eligible to vote (other party text)",
        "concepts": ["second choice party"],
        "themes": ["elections", "parties"],
    },
    "cps19_not_vote_for_1": {
        "display_label": "Parties respondent would absolutely not vote for (Liberal Party)",
        "concepts": ["negative voting", "party rejection"],
        "themes": ["elections", "parties"],
    },
    "cps19_not_vote_for_2": {
        "display_label": "Parties respondent would absolutely not vote for (Conservative Party)",
        "concepts": ["negative voting", "party rejection"],
        "themes": ["elections", "parties"],
    },
    "cps19_not_vote_for_3": {
        "display_label": "Parties respondent would absolutely not vote for (NDP)",
        "concepts": ["negative voting", "party rejection"],
        "themes": ["elections", "parties"],
    },
    "cps19_not_vote_for_4": {
        "display_label": "Parties respondent would absolutely not vote for (Bloc Québécois)",
        "concepts": ["negative voting", "party rejection"],
        "themes": ["elections", "parties"],
    },
    "cps19_not_vote_for_5": {
        "display_label": "Parties respondent would absolutely not vote for (Green Party)",
        "concepts": ["negative voting", "party rejection"],
        "themes": ["elections", "parties"],
    },
    "cps19_not_vote_for_6": {
        "display_label": "Parties respondent would absolutely not vote for (People's Party)",
        "concepts": ["negative voting", "party rejection"],
        "themes": ["elections", "parties"],
    },
    "cps19_not_vote_for_7": {
        "display_label": "Parties respondent would absolutely not vote for (Other party)",
        "concepts": ["negative voting", "party rejection"],
        "themes": ["elections", "parties"],
    },
    "cps19_not_vote_for_8": {
        "display_label": "Parties respondent would absolutely not vote for (Don't know)",
        "concepts": ["negative voting", "party rejection"],
        "themes": ["elections", "parties"],
    },
    "cps19_not_vote_for_9": {
        "display_label": "Parties respondent would absolutely not vote for (None)",
        "concepts": ["negative voting", "party rejection"],
        "themes": ["elections", "parties"],
    },
    "cps19_not_vote_for_7_TEXT": {
        "display_label": "Parties respondent would absolutely not vote for (other party text)",
        "concepts": ["negative voting"],
        "themes": ["elections", "parties"],
    },
    "cps19_fed_gov_sat": {
        "display_label": "Satisfaction with performance of federal government under Justin Trudeau",
        "concepts": ["government satisfaction", "trudeau government"],
        "themes": ["elections", "government"],
    },
    "cps19_party_rating_23": {
        "display_label": "Feeling toward Liberal Party",
        "concepts": ["party affect", "feeling thermometer", "liberal party"],
        "themes": ["parties"],
    },
    "cps19_party_rating_24": {
        "display_label": "Feeling toward Conservative Party",
        "concepts": ["party affect", "feeling thermometer", "conservative party"],
        "themes": ["parties"],
    },
    "cps19_party_rating_25": {
        "display_label": "Feeling toward NDP",
        "concepts": ["party affect", "feeling thermometer", "ndp"],
        "themes": ["parties"],
    },
    "cps19_party_rating_26": {
        "display_label": "Feeling toward Bloc Québécois",
        "concepts": ["party affect", "feeling thermometer", "bloc québécois"],
        "themes": ["parties"],
    },
    "cps19_party_rating_27": {
        "display_label": "Feeling toward Green Party",
        "concepts": ["party affect", "feeling thermometer", "green party"],
        "themes": ["parties"],
    },
    "cps19_party_rating_28": {
        "display_label": "Feeling toward People's Party (PPC)",
        "concepts": ["party affect", "feeling thermometer", "people's party (ppc)"],
        "themes": ["parties"],
    },
    "cps19_lead_rating_23": {
        "display_label": "Feeling toward Justin Trudeau",
        "concepts": ["leader affect", "feeling thermometer", "justin trudeau"],
        "themes": ["leadership", "parties"],
    },
    "cps19_lead_rating_24": {
        "display_label": "Feeling toward Andrew Scheer",
        "concepts": ["leader affect", "feeling thermometer", "andrew scheer"],
        "themes": ["leadership", "parties"],
    },
    "cps19_lead_rating_25": {
        "display_label": "Feeling toward Jagmeet Singh",
        "concepts": ["leader affect", "feeling thermometer", "jagmeet singh"],
        "themes": ["leadership", "parties"],
    },
    "cps19_lead_rating_26": {
        "display_label": "Feeling toward Yves-François Blanchet",
        "concepts": ["leader affect", "feeling thermometer", "yves-françois blanchet"],
        "themes": ["leadership", "parties"],
    },
    "cps19_lead_rating_27": {
        "display_label": "Feeling toward Elizabeth May",
        "concepts": ["leader affect", "feeling thermometer", "elizabeth may"],
        "themes": ["leadership", "parties"],
    },
    "cps19_lead_rating_28": {
        "display_label": "Feeling toward Maxime Bernier",
        "concepts": ["leader affect", "feeling thermometer", "maxime bernier"],
        "themes": ["leadership", "parties"],
    },
    "cps19_cand_rating_23": {
        "display_label": "Feeling toward local Liberal Party candidate",
        "concepts": ["candidate affect", "feeling thermometer", "local candidate"],
        "themes": ["candidates", "elections"],
    },
    "cps19_cand_rating_24": {
        "display_label": "Feeling toward local Conservative Party candidate",
        "concepts": ["candidate affect", "feeling thermometer", "local candidate"],
        "themes": ["candidates", "elections"],
    },
    "cps19_cand_rating_25": {
        "display_label": "Feeling toward local NDP candidate",
        "concepts": ["candidate affect", "feeling thermometer", "local candidate"],
        "themes": ["candidates", "elections"],
    },
    "cps19_cand_rating_26": {
        "display_label": "Feeling toward local Bloc Québécois candidate",
        "concepts": ["candidate affect", "feeling thermometer", "local candidate"],
        "themes": ["candidates", "elections"],
    },
    "cps19_cand_rating_27": {
        "display_label": "Feeling toward local Green Party candidate",
        "concepts": ["candidate affect", "feeling thermometer", "local candidate"],
        "themes": ["candidates", "elections"],
    },
    "cps19_cand_rating_28": {
        "display_label": "Feeling toward local People's Party (PPC) candidate",
        "concepts": ["candidate affect", "feeling thermometer", "local candidate"],
        "themes": ["candidates", "elections"],
    },
    "cps19_lr_scale_bef_1": {
        "display_label": "Self-placement on left-right political scale",
        "concepts": ["ideology", "left-right scale"],
        "themes": ["ideology"],
    },
    "cps19_lr_parties_1": {
        "display_label": "Perceived left-right placement of Liberal Party",
        "concepts": ["party ideology", "left-right placement", "liberal party"],
        "themes": ["ideology", "parties"],
    },
    "cps19_lr_parties_2": {
        "display_label": "Perceived left-right placement of Conservative Party",
        "concepts": ["party ideology", "left-right placement", "conservative party"],
        "themes": ["ideology", "parties"],
    },
    "cps19_lr_parties_3": {
        "display_label": "Perceived left-right placement of NDP",
        "concepts": ["party ideology", "left-right placement", "ndp"],
        "themes": ["ideology", "parties"],
    },
    "cps19_lr_parties_4": {
        "display_label": "Perceived left-right placement of Bloc Québécois",
        "concepts": ["party ideology", "left-right placement", "bloc québécois"],
        "themes": ["ideology", "parties"],
    },
    "cps19_lr_parties_5": {
        "display_label": "Perceived left-right placement of Green Party",
        "concepts": ["party ideology", "left-right placement", "green party"],
        "themes": ["ideology", "parties"],
    },
    "cps19_lr_parties_6": {
        "display_label": "Perceived left-right placement of People's Party (PPC)",
        "concepts": ["party ideology", "left-right placement", "people's party (ppc)"],
        "themes": ["ideology", "parties"],
    },
    "cps19_lr_scale_aft_1": {
        "display_label": "Self-placement on left-right political scale (post-battery)",
        "concepts": ["ideology", "left-right scale"],
        "themes": ["ideology"],
    },
    "cps19_lead_int_113": {
        "display_label": "Intelligence rating - Justin Trudeau",
        "concepts": ["leader intelligence", "leader trait"],
        "themes": ["leadership"],
    },
    "cps19_lead_int_114": {
        "display_label": "Intelligence rating - Andrew Scheer",
        "concepts": ["leader intelligence", "leader trait"],
        "themes": ["leadership"],
    },
    "cps19_lead_int_115": {
        "display_label": "Intelligence rating - Jagmeet Singh",
        "concepts": ["leader intelligence", "leader trait"],
        "themes": ["leadership"],
    },
    "cps19_lead_int_116": {
        "display_label": "Intelligence rating - Yves-François Blanchet",
        "concepts": ["leader intelligence", "leader trait"],
        "themes": ["leadership"],
    },
    "cps19_lead_int_117": {
        "display_label": "Intelligence rating - Elizabeth May",
        "concepts": ["leader intelligence", "leader trait"],
        "themes": ["leadership"],
    },
    "cps19_lead_int_118": {
        "display_label": "Intelligence rating - Maxime Bernier",
        "concepts": ["leader intelligence", "leader trait"],
        "themes": ["leadership"],
    },
    "cps19_lead_int_119": {
        "display_label": "Intelligence rating - None",
        "concepts": ["leader intelligence", "leader trait"],
        "themes": ["leadership"],
    },
    "cps19_lead_int_120": {
        "display_label": "Intelligence rating - Don't know",
        "concepts": ["leader intelligence", "leader trait"],
        "themes": ["leadership"],
    },
    "cps19_lead_strong_113": {
        "display_label": "Strong leadership rating - Justin Trudeau",
        "concepts": ["leader strength", "leader trait"],
        "themes": ["leadership"],
    },
    "cps19_lead_strong_114": {
        "display_label": "Strong leadership rating - Andrew Scheer",
        "concepts": ["leader strength", "leader trait"],
        "themes": ["leadership"],
    },
    "cps19_lead_strong_115": {
        "display_label": "Strong leadership rating - Jagmeet Singh",
        "concepts": ["leader strength", "leader trait"],
        "themes": ["leadership"],
    },
    "cps19_lead_strong_116": {
        "display_label": "Strong leadership rating - Yves-François Blanchet",
        "concepts": ["leader strength", "leader trait"],
        "themes": ["leadership"],
    },
    "cps19_lead_strong_117": {
        "display_label": "Strong leadership rating - Elizabeth May",
        "concepts": ["leader strength", "leader trait"],
        "themes": ["leadership"],
    },
    "cps19_lead_strong_118": {
        "display_label": "Strong leadership rating - Maxime Bernier",
        "concepts": ["leader strength", "leader trait"],
        "themes": ["leadership"],
    },
    "cps19_lead_strong_119": {
        "display_label": "Strong leadership rating - None",
        "concepts": ["leader strength", "leader trait"],
        "themes": ["leadership"],
    },
    "cps19_lead_strong_120": {
        "display_label": "Strong leadership rating - Don't know",
        "concepts": ["leader strength", "leader trait"],
        "themes": ["leadership"],
    },
    "cps19_lead_trust_113": {
        "display_label": "Trustworthiness rating - Justin Trudeau",
        "concepts": ["leader trust", "leader trait"],
        "themes": ["leadership", "trust"],
    },
    "cps19_lead_trust_114": {
        "display_label": "Trustworthiness rating - Andrew Scheer",
        "concepts": ["leader trust", "leader trait"],
        "themes": ["leadership", "trust"],
    },
    "cps19_lead_trust_115": {
        "display_label": "Trustworthiness rating - Jagmeet Singh",
        "concepts": ["leader trust", "leader trait"],
        "themes": ["leadership", "trust"],
    },
    "cps19_lead_trust_116": {
        "display_label": "Trustworthiness rating - Yves-François Blanchet",
        "concepts": ["leader trust", "leader trait"],
        "themes": ["leadership", "trust"],
    },
    "cps19_lead_trust_117": {
        "display_label": "Trustworthiness rating - Elizabeth May",
        "concepts": ["leader trust", "leader trait"],
        "themes": ["leadership", "trust"],
    },
    "cps19_lead_trust_118": {
        "display_label": "Trustworthiness rating - Maxime Bernier",
        "concepts": ["leader trust", "leader trait"],
        "themes": ["leadership", "trust"],
    },
    "cps19_lead_trust_119": {
        "display_label": "Trustworthiness rating - None",
        "concepts": ["leader trust", "leader trait"],
        "themes": ["leadership", "trust"],
    },
    "cps19_lead_trust_120": {
        "display_label": "Trustworthiness rating - Don't know",
        "concepts": ["leader trust", "leader trait"],
        "themes": ["leadership", "trust"],
    },
    "cps19_lead_cares_113": {
        "display_label": "Empathy rating ('cares about people like me') - Justin Trudeau",
        "concepts": ["leader empathy", "leader trait"],
        "themes": ["leadership"],
    },
    "cps19_lead_cares_114": {
        "display_label": "Empathy rating ('cares about people like me') - Andrew Scheer",
        "concepts": ["leader empathy", "leader trait"],
        "themes": ["leadership"],
    },
    "cps19_lead_cares_115": {
        "display_label": "Empathy rating ('cares about people like me') - Jagmeet Singh",
        "concepts": ["leader empathy", "leader trait"],
        "themes": ["leadership"],
    },
    "cps19_lead_cares_116": {
        "display_label": "Empathy rating ('cares about people like me') - Yves-François Blanchet",
        "concepts": ["leader empathy", "leader trait"],
        "themes": ["leadership"],
    },
    "cps19_lead_cares_117": {
        "display_label": "Empathy rating ('cares about people like me') - Elizabeth May",
        "concepts": ["leader empathy", "leader trait"],
        "themes": ["leadership"],
    },
    "cps19_lead_cares_118": {
        "display_label": "Empathy rating ('cares about people like me') - Maxime Bernier",
        "concepts": ["leader empathy", "leader trait"],
        "themes": ["leadership"],
    },
    "cps19_lead_cares_119": {
        "display_label": "Empathy rating ('cares about people like me') - None",
        "concepts": ["leader empathy", "leader trait"],
        "themes": ["leadership"],
    },
    "cps19_lead_cares_120": {
        "display_label": "Empathy rating ('cares about people like me') - Don't know",
        "concepts": ["leader empathy", "leader trait"],
        "themes": ["leadership"],
    },
    "cps19_spend_educ": {
        "display_label": "Federal spending on education",
        "concepts": ["education spending", "budget priorities"],
        "themes": ["spending", "education"],
    },
    "cps19_spend_env": {
        "display_label": "Federal spending on the environment",
        "concepts": ["environmental spending", "climate budget"],
        "themes": ["spending", "environment"],
    },
    "cps19_spend_just_law": {
        "display_label": "Federal spending on justice and law enforcement",
        "concepts": ["justice spending", "law enforcement budget"],
        "themes": ["spending", "justice"],
    },
    "cps19_spend_defence": {
        "display_label": "Federal spending on national defence",
        "concepts": ["defence spending", "military budget"],
        "themes": ["spending", "defence"],
    },
    "cps19_spend_imm_min": {
        "display_label": "Federal spending on immigrants and minorities",
        "concepts": ["immigrant spending", "minority programs"],
        "themes": ["spending", "immigration", "social"],
    },
    "cps19_pos_fptp": {
        "display_label": "Views on replacing First Past the Post electoral system",
        "concepts": ["electoral reform", "voting system"],
        "themes": ["democracy", "elections"],
    },
    "cps19_pos_life": {
        "display_label": "Medical assistance in dying for terminally ill individuals",
        "concepts": ["medical assistance in dying", "bioethics"],
        "themes": ["social policy", "health"],
    },
    "cps19_pos_cannabis": {
        "display_label": "Making cannabis possession a criminal offence",
        "concepts": ["cannabis legalization", "drug policy"],
        "themes": ["social policy", "justice"],
    },
    "cps19_pos_carbon": {
        "display_label": "Federal carbon pricing to reduce greenhouse gas emissions",
        "concepts": ["carbon tax", "climate change policy"],
        "themes": ["environment", "climate"],
    },
    "cps19_pos_energy": {
        "display_label": "Federal support for Canada's energy sector and oil pipelines",
        "concepts": ["oil pipelines", "energy policy"],
        "themes": ["energy", "environment"],
    },
    "cps19_pos_envreg": {
        "display_label": "Stricter environmental regulations vs consumer costs",
        "concepts": ["environmental regulation"],
        "themes": ["environment"],
    },
    "cps19_pos_jobs": {
        "display_label": "Protecting environment vs creating jobs conflict priority",
        "concepts": ["environment economy trade-off"],
        "themes": ["environment", "economy"],
    },
    "cps19_pos_subsid": {
        "display_label": "Ending corporate and economic development subsidies",
        "concepts": ["corporate subsidies"],
        "themes": ["economy"],
    },
    "cps19_pos_trade": {
        "display_label": "Support for more free trade with other countries",
        "concepts": ["free trade", "international trade"],
        "themes": ["economy", "trade"],
    },
    "cps19_econ_retro": {
        "display_label": "Evaluation of Canadian economy over past year",
        "concepts": ["economic evaluation", "retrospective economy"],
        "themes": ["economy"],
    },
    "cps19_econ_fed": {
        "display_label": "Impact of federal government policies on Canadian economy",
        "concepts": ["economic attribution", "government performance"],
        "themes": ["economy", "government"],
    },
    "cps19_ownfinanc_fed": {
        "display_label": "Impact of federal government policies on personal finances",
        "concepts": ["personal finance attribution"],
        "themes": ["economy", "government"],
    },
    "cps19_issue_handle_1": {
        "display_label": "Party best at handling Healthcare",
        "concepts": ["issue ownership", "party competence", "healthcare"],
        "themes": ["parties", "issues"],
    },
    "cps19_issue_handle_2": {
        "display_label": "Party best at handling Education",
        "concepts": ["issue ownership", "party competence", "education"],
        "themes": ["parties", "issues"],
    },
    "cps19_issue_handle_3": {
        "display_label": "Party best at handling Environment",
        "concepts": ["issue ownership", "party competence", "environment"],
        "themes": ["parties", "issues"],
    },
    "cps19_issue_handle_4": {
        "display_label": "Party best at handling Crime and justice",
        "concepts": ["issue ownership", "party competence", "crime and justice"],
        "themes": ["parties", "issues"],
    },
    "cps19_issue_handle_5": {
        "display_label": "Party best at handling Defence",
        "concepts": ["issue ownership", "party competence", "defence"],
        "themes": ["parties", "issues"],
    },
    "cps19_issue_handle_6": {
        "display_label": "Party best at handling Indigenous issues",
        "concepts": ["issue ownership", "party competence", "indigenous issues"],
        "themes": ["parties", "issues"],
    },
    "cps19_issue_handle_7": {
        "display_label": "Party best at handling Immigration",
        "concepts": ["issue ownership", "party competence", "immigration"],
        "themes": ["parties", "issues"],
    },
    "cps19_issue_handle_8": {
        "display_label": "Party best at handling Economy",
        "concepts": ["issue ownership", "party competence", "economy"],
        "themes": ["parties", "issues"],
    },
    "cps19_most_seats_1": {
        "display_label": "Likelihood of Liberal Party winning most seats nationally",
        "concepts": ["election prediction", "party seat prediction", "liberal party"],
        "themes": ["elections"],
    },
    "cps19_most_seats_2": {
        "display_label": "Likelihood of Conservative Party winning most seats nationally",
        "concepts": ["election prediction", "party seat prediction", "conservative party"],
        "themes": ["elections"],
    },
    "cps19_most_seats_3": {
        "display_label": "Likelihood of NDP winning most seats nationally",
        "concepts": ["election prediction", "party seat prediction", "ndp"],
        "themes": ["elections"],
    },
    "cps19_most_seats_4": {
        "display_label": "Likelihood of Bloc Québécois winning most seats nationally",
        "concepts": ["election prediction", "party seat prediction", "bloc québécois"],
        "themes": ["elections"],
    },
    "cps19_most_seats_5": {
        "display_label": "Likelihood of Green Party winning most seats nationally",
        "concepts": ["election prediction", "party seat prediction", "green party"],
        "themes": ["elections"],
    },
    "cps19_most_seats_6": {
        "display_label": "Likelihood of People's Party (PPC) winning most seats nationally",
        "concepts": ["election prediction", "party seat prediction", "people's party (ppc)"],
        "themes": ["elections"],
    },
    "cps19_win_local_1": {
        "display_label": "Likelihood of local Liberal Party candidate winning local seat",
        "concepts": ["local election prediction", "riding election prediction", "liberal party"],
        "themes": ["elections", "candidates"],
    },
    "cps19_win_local_2": {
        "display_label": "Likelihood of local Conservative Party candidate winning local seat",
        "concepts": ["local election prediction", "riding election prediction", "conservative party"],
        "themes": ["elections", "candidates"],
    },
    "cps19_win_local_3": {
        "display_label": "Likelihood of local NDP candidate winning local seat",
        "concepts": ["local election prediction", "riding election prediction", "ndp"],
        "themes": ["elections", "candidates"],
    },
    "cps19_win_local_4": {
        "display_label": "Likelihood of local Bloc Québécois candidate winning local seat",
        "concepts": ["local election prediction", "riding election prediction", "bloc québécois"],
        "themes": ["elections", "candidates"],
    },
    "cps19_win_local_5": {
        "display_label": "Likelihood of local Green Party candidate winning local seat",
        "concepts": ["local election prediction", "riding election prediction", "green party"],
        "themes": ["elections", "candidates"],
    },
    "cps19_win_local_6": {
        "display_label": "Likelihood of local People's Party (PPC) candidate winning local seat",
        "concepts": ["local election prediction", "riding election prediction", "people's party (ppc)"],
        "themes": ["elections", "candidates"],
    },
    "cps19_outcome_most": {
        "display_label": "Most preferred federal election government outcome",
        "concepts": ["government preferences", "coalition preference"],
        "themes": ["elections", "government"],
    },
    "cps19_outcome_most_14_TEXT": {
        "display_label": "Most preferred federal election government outcome (other text)",
        "concepts": ["government preferences"],
        "themes": ["elections", "government"],
    },
    "cps19_outcome_least": {
        "display_label": "Least preferred federal election government outcome",
        "concepts": ["government preferences", "coalition preference"],
        "themes": ["elections", "government"],
    },
    "cps19_outcome_least_14_TEXT": {
        "display_label": "Least preferred federal election government outcome (other text)",
        "concepts": ["government preferences"],
        "themes": ["elections", "government"],
    },
    "cps19_imm": {
        "display_label": "Preferred admission level for immigrants to Canada",
        "concepts": ["immigration levels"],
        "themes": ["immigration"],
    },
    "cps19_refugees": {
        "display_label": "Preferred admission level for refugees to Canada",
        "concepts": ["refugee policy", "refugee admission"],
        "themes": ["immigration"],
    },
    "cps19_govt_confusing": {
        "display_label": "Politics and government seem too complicated to understand",
        "concepts": ["internal political efficacy"],
        "themes": ["democracy", "efficacy"],
    },
    "cps19_govt_say": {
        "display_label": "People like me have no say about what government does",
        "concepts": ["external political efficacy", "powerlessness"],
        "themes": ["democracy", "efficacy"],
    },
    "cps19_pol_eth": {
        "display_label": "Importance of politicians behaving ethically in office",
        "concepts": ["political ethics", "integrity"],
        "themes": ["democracy", "ethics"],
    },
    "cps19_lib_promises": {
        "display_label": "Belief that Justin Trudeau kept 2015 election promises",
        "concepts": ["election promises", "accountability"],
        "themes": ["government", "trust"],
    },
    "cps19_snclav": {
        "display_label": "Evaluation of government handling of SNC-Lavalin affair",
        "concepts": ["snc lavalin", "political scandal"],
        "themes": ["government", "ethics"],
    },
    "cps19_news_cons": {
        "display_label": "Daily time spent consuming political news",
        "concepts": ["news consumption", "media exposure"],
        "themes": ["media"],
    },
    "cps19_volunteer": {
        "display_label": "Volunteering frequency over past 12 months",
        "concepts": ["volunteering", "civic engagement"],
        "themes": ["civic participation"],
    },
    "cps19_duty_choice": {
        "display_label": "Voting viewed as a civic duty vs personal choice",
        "concepts": ["civic duty", "voting norms"],
        "themes": ["democracy", "voting"],
    },
    "cps19_quebec_sov": {
        "display_label": "Support for Quebec sovereignty / independence",
        "concepts": ["quebec sovereignty", "quebec independence"],
        "themes": ["quebec", "sovereignty"],
    },
    "cps19_own_fin_retro": {
        "display_label": "Personal financial situation over past year",
        "concepts": ["personal finances", "pocketbook economy"],
        "themes": ["economy"],
    },
    "cps19_premier_name": {
        "display_label": "Political knowledge: Name of provincial Premier",
        "concepts": ["political knowledge", "premier"],
        "themes": ["democracy", "knowledge"],
    },
    "cps19_finmin_name": {
        "display_label": "Political knowledge: Name of federal Minister of Finance",
        "concepts": ["political knowledge", "finance minister"],
        "themes": ["democracy", "knowledge"],
    },
    "cps19_govgen_name": {
        "display_label": "Political knowledge: Name of Governor-General of Canada",
        "concepts": ["political knowledge", "governor general"],
        "themes": ["democracy", "knowledge"],
    },
    "cps19_presrus_name": {
        "display_label": "Political knowledge: Name of President of Russia",
        "concepts": ["political knowledge", "foreign leaders"],
        "themes": ["democracy", "knowledge"],
    },
    "cps19_prov_gov_sat": {
        "display_label": "Satisfaction with provincial government performance",
        "concepts": ["provincial government satisfaction"],
        "themes": ["government", "provinces"],
    },
    "cps19_fed_id": {
        "display_label": "Federal political party identification",
        "concepts": ["party identification", "federal party choice"],
        "themes": ["parties"],
    },
    "cps19_fed_id_7_TEXT": {
        "display_label": "Federal political party identification (other party text)",
        "concepts": ["party identification"],
        "themes": ["parties"],
    },
    "cps19_fed_id_str": {
        "display_label": "Strength of federal party identification",
        "concepts": ["party identification strength"],
        "themes": ["parties"],
    },
    "cps19_prov_id": {
        "display_label": "Provincial political party identification",
        "concepts": ["provincial party identification"],
        "themes": ["parties", "provinces"],
    },
    "cps19_prov_id_295_TEXT": {
        "display_label": "Provincial political party identification (other party text)",
        "concepts": ["provincial party identification"],
        "themes": ["parties", "provinces"],
    },
    "cps19_prov_id_str": {
        "display_label": "Strength of provincial party identification",
        "concepts": ["party identification strength"],
        "themes": ["parties", "provinces"],
    },
    "cps19_party_member_36": {
        "display_label": "Member of a federal political party",
        "concepts": ["party membership"],
        "themes": ["parties"],
    },
    "cps19_party_member_37": {
        "display_label": "Member of a provincial political party",
        "concepts": ["party membership"],
        "themes": ["parties"],
    },
    "cps19_party_member_38": {
        "display_label": "Registered supporter of Liberal Party",
        "concepts": ["party support", "liberal party"],
        "themes": ["parties"],
    },
    "cps19_party_member_39": {
        "display_label": "Political party membership (None of the above)",
        "concepts": ["party membership"],
        "themes": ["parties"],
    },
    "cps19_party_member_40": {
        "display_label": "Political party membership (Don't know / Prefer not to answer)",
        "concepts": ["party membership"],
        "themes": ["parties"],
    },
    "cps19_fed_member": {
        "display_label": "Specific federal party of dues-paying membership",
        "concepts": ["party membership"],
        "themes": ["parties"],
    },
    "cps19_fed_member_62_TEXT": {
        "display_label": "Specific federal party membership (other text)",
        "concepts": ["party membership"],
        "themes": ["parties"],
    },
    "cps19_prov_member": {
        "display_label": "Specific provincial party of dues-paying membership",
        "concepts": ["party membership"],
        "themes": ["parties"],
    },
    "cps19_prov_member_295_TEXT": {
        "display_label": "Specific provincial party membership (other text)",
        "concepts": ["party membership"],
        "themes": ["parties"],
    },
    "cps19_fed_donate": {
        "display_label": "Donated money to a federal political party since 2015",
        "concepts": ["campaign donations", "political contributions"],
        "themes": ["elections", "parties"],
    },
    "cps19_groups_therm_1": {
        "display_label": "Feeling toward Racial minorities",
        "concepts": ["group affect", "feeling thermometer", "racial minorities"],
        "themes": ["society"],
    },
    "cps19_groups_therm_2": {
        "display_label": "Feeling toward Immigrants",
        "concepts": ["group affect", "feeling thermometer", "immigrants"],
        "themes": ["society"],
    },
    "cps19_groups_therm_3": {
        "display_label": "Feeling toward Francophones",
        "concepts": ["group affect", "feeling thermometer", "francophones"],
        "themes": ["society"],
    },
    "cps19_groups_therm_4": {
        "display_label": "Feeling toward Feminists",
        "concepts": ["group affect", "feeling thermometer", "feminists"],
        "themes": ["society"],
    },
    "cps19_groups_therm_5": {
        "display_label": "Feeling toward Politicians in general",
        "concepts": ["group affect", "feeling thermometer", "politicians"],
        "themes": ["society", "trust"],
    },
    "cps19_spoil": {
        "display_label": "Ever intentionally spoiled a ballot in an election",
        "concepts": ["ballot spoiling", "protest vote"],
        "themes": ["elections", "voting"],
    },
    "cps19_turnout_2015": {
        "display_label": "Voted in 2015 federal election",
        "concepts": ["past voting", "turnout history"],
        "themes": ["elections", "voting"],
    },
    "cps19_vote_2015": {
        "display_label": "Party voted for in 2015 federal election",
        "concepts": ["past vote choice", "voting history"],
        "themes": ["elections", "parties"],
    },
    "cps19_vote_2015_6_TEXT": {
        "display_label": "Party voted for in 2015 federal election (other text)",
        "concepts": ["past vote choice"],
        "themes": ["elections", "parties"],
    },
    "cps19_debate_en": {
        "display_label": "Watched or listened to English-language federal leaders' debate",
        "concepts": ["leaders debate", "english debate"],
        "themes": ["elections", "media"],
    },
    "cps19_debate_fr": {
        "display_label": "Watched or listened to French-language federal leaders' debate",
        "concepts": ["leaders debate", "french debate"],
        "themes": ["elections", "media"],
    },
    "cps19_religion": {
        "display_label": "Religious affiliation / religion",
        "concepts": ["religion", "religious affiliation"],
        "themes": ["demographics", "religion"],
    },
    "cps19_religion_22_TEXT": {
        "display_label": "Religious affiliation (other specification text)",
        "concepts": ["religion"],
        "themes": ["demographics"],
    },
    "cps19_rel_imp": {
        "display_label": "Importance of religion in life",
        "concepts": ["religiosity", "importance of religion"],
        "themes": ["demographics", "religion"],
    },
    "cps19_bornin_canada": {
        "display_label": "Born in Canada",
        "concepts": ["nativity", "place of birth"],
        "themes": ["demographics"],
    },
    "cps19_bornin_other": {
        "display_label": "Country of birth (if born outside Canada)",
        "concepts": ["country of origin", "immigrant origin"],
        "themes": ["demographics"],
    },
    "cps19_imm_year": {
        "display_label": "Year came to live in Canada",
        "concepts": ["immigration year", "years in canada"],
        "themes": ["demographics"],
    },
    "cps19_ethnicity_23": {
        "display_label": "Ethnic background / origin: Canadian",
        "concepts": ["ethnicity", "ethnic origin"],
        "themes": ["demographics"],
    },
    "cps19_ethnicity_24": {
        "display_label": "Ethnic background / origin: English",
        "concepts": ["ethnicity", "ethnic origin"],
        "themes": ["demographics"],
    },
    "cps19_ethnicity_25": {
        "display_label": "Ethnic background / origin: French",
        "concepts": ["ethnicity", "ethnic origin"],
        "themes": ["demographics"],
    },
    "cps19_ethnicity_26": {
        "display_label": "Ethnic background / origin: Scottish",
        "concepts": ["ethnicity", "ethnic origin"],
        "themes": ["demographics"],
    },
    "cps19_ethnicity_27": {
        "display_label": "Ethnic background / origin: Irish",
        "concepts": ["ethnicity", "ethnic origin"],
        "themes": ["demographics"],
    },
    "cps19_ethnicity_28": {
        "display_label": "Ethnic background / origin: German",
        "concepts": ["ethnicity", "ethnic origin"],
        "themes": ["demographics"],
    },
    "cps19_ethnicity_29": {
        "display_label": "Ethnic background / origin: Italian",
        "concepts": ["ethnicity", "ethnic origin"],
        "themes": ["demographics"],
    },
    "cps19_ethnicity_30": {
        "display_label": "Ethnic background / origin: Chinese",
        "concepts": ["ethnicity", "ethnic origin"],
        "themes": ["demographics"],
    },
    "cps19_ethnicity_31": {
        "display_label": "Ethnic background / origin: First Nations",
        "concepts": ["ethnicity", "ethnic origin"],
        "themes": ["demographics"],
    },
    "cps19_ethnicity_32": {
        "display_label": "Ethnic background / origin: Metis",
        "concepts": ["ethnicity", "ethnic origin"],
        "themes": ["demographics"],
    },
    "cps19_ethnicity_33": {
        "display_label": "Ethnic background / origin: Inuit",
        "concepts": ["ethnicity", "ethnic origin"],
        "themes": ["demographics"],
    },
    "cps19_ethnicity_34": {
        "display_label": "Ethnic background / origin: East Indian",
        "concepts": ["ethnicity", "ethnic origin"],
        "themes": ["demographics"],
    },
    "cps19_ethnicity_35": {
        "display_label": "Ethnic background / origin: Ukrainian",
        "concepts": ["ethnicity", "ethnic origin"],
        "themes": ["demographics"],
    },
    "cps19_ethnicity_36": {
        "display_label": "Ethnic background / origin: Dutch",
        "concepts": ["ethnicity", "ethnic origin"],
        "themes": ["demographics"],
    },
    "cps19_ethnicity_37": {
        "display_label": "Ethnic background / origin: Polish",
        "concepts": ["ethnicity", "ethnic origin"],
        "themes": ["demographics"],
    },
    "cps19_ethnicity_38": {
        "display_label": "Ethnic background / origin: Filipino",
        "concepts": ["ethnicity", "ethnic origin"],
        "themes": ["demographics"],
    },
    "cps19_ethnicity_39": {
        "display_label": "Ethnic background / origin: British",
        "concepts": ["ethnicity", "ethnic origin"],
        "themes": ["demographics"],
    },
    "cps19_ethnicity_40": {
        "display_label": "Ethnic background / origin: Spanish",
        "concepts": ["ethnicity", "ethnic origin"],
        "themes": ["demographics"],
    },
    "cps19_ethnicity_41": {
        "display_label": "Ethnic background / origin: Other ethnicity 1",
        "concepts": ["ethnicity", "ethnic origin"],
        "themes": ["demographics"],
    },
    "cps19_ethnicity_42": {
        "display_label": "Ethnic background / origin: Other ethnicity 2",
        "concepts": ["ethnicity", "ethnic origin"],
        "themes": ["demographics"],
    },
    "cps19_ethnicity_43": {
        "display_label": "Ethnic background / origin: Don't know / Prefer not to answer",
        "concepts": ["ethnicity", "ethnic origin"],
        "themes": ["demographics"],
    },
    "cps19_ethnicity_41_TEXT": {
        "display_label": "Ethnic background / origin: Other ethnicity 1 (text specification)",
        "concepts": ["ethnicity", "ethnic origin"],
        "themes": ["demographics"],
    },
    "cps19_ethnicity_42_TEXT": {
        "display_label": "Ethnic background / origin: Other ethnicity 2 (text specification)",
        "concepts": ["ethnicity", "ethnic origin"],
        "themes": ["demographics"],
    },
    "cps19_sexuality": {
        "display_label": "Sexual orientation / identity",
        "concepts": ["sexual orientation"],
        "themes": ["demographics"],
    },
    "cps19_sexuality_4_TEXT": {
        "display_label": "Sexual orientation (other specification text)",
        "concepts": ["sexual orientation"],
        "themes": ["demographics"],
    },
    "cps19_language_68": {
        "display_label": "Childhood language spoken and understood: English",
        "concepts": ["language", "childhood language"],
        "themes": ["demographics"],
    },
    "cps19_language_69": {
        "display_label": "Childhood language spoken and understood: French",
        "concepts": ["language", "childhood language"],
        "themes": ["demographics"],
    },
    "cps19_language_70": {
        "display_label": "Childhood language spoken and understood: Aboriginal / Indigenous language",
        "concepts": ["language", "childhood language"],
        "themes": ["demographics"],
    },
    "cps19_language_71": {
        "display_label": "Childhood language spoken and understood: Italian",
        "concepts": ["language", "childhood language"],
        "themes": ["demographics"],
    },
    "cps19_language_72": {
        "display_label": "Childhood language spoken and understood: German",
        "concepts": ["language", "childhood language"],
        "themes": ["demographics"],
    },
    "cps19_language_73": {
        "display_label": "Childhood language spoken and understood: Chinese / Cantonese / Mandarin",
        "concepts": ["language", "childhood language"],
        "themes": ["demographics"],
    },
    "cps19_language_74": {
        "display_label": "Childhood language spoken and understood: Spanish",
        "concepts": ["language", "childhood language"],
        "themes": ["demographics"],
    },
    "cps19_language_75": {
        "display_label": "Childhood language spoken and understood: Portuguese",
        "concepts": ["language", "childhood language"],
        "themes": ["demographics"],
    },
    "cps19_language_76": {
        "display_label": "Childhood language spoken and understood: Tagalog / Filipino",
        "concepts": ["language", "childhood language"],
        "themes": ["demographics"],
    },
    "cps19_language_77": {
        "display_label": "Childhood language spoken and understood: Polish",
        "concepts": ["language", "childhood language"],
        "themes": ["demographics"],
    },
    "cps19_language_78": {
        "display_label": "Childhood language spoken and understood: Punjabi",
        "concepts": ["language", "childhood language"],
        "themes": ["demographics"],
    },
    "cps19_language_79": {
        "display_label": "Childhood language spoken and understood: Greek",
        "concepts": ["language", "childhood language"],
        "themes": ["demographics"],
    },
    "cps19_language_80": {
        "display_label": "Childhood language spoken and understood: Arabic",
        "concepts": ["language", "childhood language"],
        "themes": ["demographics"],
    },
    "cps19_language_81": {
        "display_label": "Childhood language spoken and understood: Vietnamese",
        "concepts": ["language", "childhood language"],
        "themes": ["demographics"],
    },
    "cps19_language_82": {
        "display_label": "Childhood language spoken and understood: Arabic",
        "concepts": ["language", "childhood language"],
        "themes": ["demographics"],
    },
    "cps19_language_83": {
        "display_label": "Childhood language spoken and understood: Hindi",
        "concepts": ["language", "childhood language"],
        "themes": ["demographics"],
    },
    "cps19_language_84": {
        "display_label": "Childhood language spoken and understood: Other language",
        "concepts": ["language", "childhood language"],
        "themes": ["demographics"],
    },
    "cps19_language_85": {
        "display_label": "Childhood language spoken and understood: Don't know",
        "concepts": ["language", "childhood language"],
        "themes": ["demographics"],
    },
    "cps19_language_70_TEXT": {
        "display_label": "Childhood language spoken and understood: Aboriginal / Indigenous language (text specification)",
        "concepts": ["language", "childhood language"],
        "themes": ["demographics"],
    },
    "cps19_language_84_TEXT": {
        "display_label": "Childhood language spoken and understood: Other language (text specification)",
        "concepts": ["language", "childhood language"],
        "themes": ["demographics"],
    },
    "cps19_employment": {
        "display_label": "Employment status (CPS)",
        "concepts": ["employment status"],
        "themes": ["demographics"],
    },
    "cps19_employment_12_TEXT": {
        "display_label": "Employment status (other text)",
        "concepts": ["employment status"],
        "themes": ["demographics"],
    },
    "cps19_sector": {
        "display_label": "Sector of employment (private, public, non-profit)",
        "concepts": ["employment sector"],
        "themes": ["demographics"],
    },
    "cps19_union": {
        "display_label": "Union membership status",
        "concepts": ["union membership"],
        "themes": ["demographics", "labor"],
    },
    "cps19_children": {
        "display_label": "Has children",
        "concepts": ["parental status", "family"],
        "themes": ["demographics"],
    },
    "cps19_income_number": {
        "display_label": "Total household income for 2018 (exact amount)",
        "concepts": ["household income"],
        "themes": ["demographics"],
    },
    "cps19_income_cat": {
        "display_label": "Total household income for 2018 (category)",
        "concepts": ["household income"],
        "themes": ["demographics"],
    },
    "cps19_property_1": {
        "display_label": "Residence ownership type: Single-family home",
        "concepts": ["homeownership", "housing"],
        "themes": ["demographics"],
    },
    "cps19_property_2": {
        "display_label": "Residence ownership type: Condominium or apartment",
        "concepts": ["homeownership", "housing"],
        "themes": ["demographics"],
    },
    "cps19_property_3": {
        "display_label": "Residence ownership type: Townhouse or row house",
        "concepts": ["homeownership", "housing"],
        "themes": ["demographics"],
    },
    "cps19_property_4": {
        "display_label": "Residence ownership type: Duplex or triplex",
        "concepts": ["homeownership", "housing"],
        "themes": ["demographics"],
    },
    "cps19_property_5": {
        "display_label": "Residence ownership type: Other residence",
        "concepts": ["homeownership", "housing"],
        "themes": ["demographics"],
    },
    "cps19_property_6": {
        "display_label": "Residence ownership type: None of the above / Renting",
        "concepts": ["homeownership", "housing"],
        "themes": ["demographics"],
    },
    "cps19_marital": {
        "display_label": "Marital status",
        "concepts": ["marital status"],
        "themes": ["demographics"],
    },
    "cps19_household": {
        "display_label": "Number of people living in household",
        "concepts": ["household size"],
        "themes": ["demographics"],
    },
    "pes19_province": {
        "display_label": "Province or territory of residence (PES)",
        "concepts": ["province", "geography"],
        "themes": ["demographics", "geography"],
    },
    "pes19_citizen": {
        "display_label": "Canadian citizenship status (PES)",
        "concepts": ["citizenship"],
        "themes": ["demographics"],
    },
    "pes19_mostimpissue": {
        "display_label": "Most important issue in 2019 federal election (PES)",
        "concepts": ["issue salience", "election priorities"],
        "themes": ["issues", "elections"],
    },
    "pes19_turnout2019": {
        "display_label": "Voted in 2019 federal election (PES)",
        "concepts": ["turnout", "voted"],
        "themes": ["elections", "voting"],
    },
    "pes19_turnout2019_v2": {
        "display_label": "Voted in 2019 federal election (PES version 2)",
        "concepts": ["turnout", "voted"],
        "themes": ["elections", "voting"],
    },
    "pes19_notvotereason1": {
        "display_label": "Main reason for not voting in 2019 federal election",
        "concepts": ["non-voting reasons", "turnout barriers"],
        "themes": ["elections", "voting"],
    },
    "pes19_notvotereason2": {
        "display_label": "Main reason for not voting in 2019 federal election (detailed)",
        "concepts": ["non-voting reasons", "turnout barriers"],
        "themes": ["elections", "voting"],
    },
    "pes19_howvote": {
        "display_label": "Voting method used in 2019 federal election",
        "concepts": ["voting method", "advance polling"],
        "themes": ["elections", "voting"],
    },
    "pes19_howvote_7_TEXT": {
        "display_label": "Voting method used in 2019 federal election (other text)",
        "concepts": ["voting method"],
        "themes": ["elections", "voting"],
    },
    "pes19_votereason": {
        "display_label": "Main motivation for voting in 2019 federal election",
        "concepts": ["voting motivation", "civic duty"],
        "themes": ["elections", "voting"],
    },
    "pes19_votechoice2019": {
        "display_label": "Party voted for in 2019 federal election (PES)",
        "concepts": ["vote choice", "reported vote"],
        "themes": ["elections", "parties"],
    },
    "pes19_votechoice2019_7_TEXT": {
        "display_label": "Party voted for in 2019 federal election (other party text)",
        "concepts": ["vote choice"],
        "themes": ["elections", "parties"],
    },
    "pes19_pr_votechoice": {
        "display_label": "Vote choice if eligible in 2019 federal election (PES)",
        "concepts": ["vote choice", "hypothetical vote"],
        "themes": ["elections", "parties"],
    },
    "pes19_pr_votechoice_7_TEXT": {
        "display_label": "Vote choice if eligible in 2019 federal election (other party text)",
        "concepts": ["vote choice"],
        "themes": ["elections", "parties"],
    },
    "pes19_dem_sat": {
        "display_label": "Satisfaction with Canadian democracy (PES)",
        "concepts": ["democratic satisfaction", "trust in democracy"],
        "themes": ["democracy", "elections"],
    },
    "pes19_campatt": {
        "display_label": "Attention paid to 2019 election campaign",
        "concepts": ["campaign attention", "media exposure"],
        "themes": ["elections", "media"],
    },
    "pes19_contact1": {
        "display_label": "Contacted by a party or candidate during campaign",
        "concepts": ["campaign contact", "voter outreach"],
        "themes": ["elections", "campaigns"],
    },
    "pes19_contact2_1": {
        "display_label": "Contacted during campaign by Liberal Party",
        "concepts": ["campaign contact", "liberal party"],
        "themes": ["elections", "campaigns"],
    },
    "pes19_contact2_2": {
        "display_label": "Contacted during campaign by Conservative Party",
        "concepts": ["campaign contact", "conservative party"],
        "themes": ["elections", "campaigns"],
    },
    "pes19_contact2_3": {
        "display_label": "Contacted during campaign by NDP",
        "concepts": ["campaign contact", "ndp"],
        "themes": ["elections", "campaigns"],
    },
    "pes19_contact2_4": {
        "display_label": "Contacted during campaign by Bloc Québécois",
        "concepts": ["campaign contact", "bloc québécois"],
        "themes": ["elections", "campaigns"],
    },
    "pes19_contact2_5": {
        "display_label": "Contacted during campaign by Green Party",
        "concepts": ["campaign contact", "green party"],
        "themes": ["elections", "campaigns"],
    },
    "pes19_contact2_8": {
        "display_label": "Contacted during campaign (Don't know)",
        "concepts": ["campaign contact"],
        "themes": ["elections", "campaigns"],
    },
    "pes19_contact2_6": {
        "display_label": "Contacted during campaign by People's Party",
        "concepts": ["campaign contact", "people's party"],
        "themes": ["elections", "campaigns"],
    },
    "pes19_contact2_7": {
        "display_label": "Contacted during campaign by Other party / candidate",
        "concepts": ["campaign contact"],
        "themes": ["elections", "campaigns"],
    },
    "pes19_contact2_6_TEXT": {
        "display_label": "Contacted during campaign by Other party / candidate (text)",
        "concepts": ["campaign contact"],
        "themes": ["elections", "campaigns"],
    },
    "pes19_mandate": {
        "display_label": "Belief that winning party has a legitimate mandate to govern",
        "concepts": ["electoral mandate", "government legitimacy"],
        "themes": ["elections", "democracy"],
    },
    "pes19_formgovt": {
        "display_label": "View on what should be more important in forming government (most seats vs party support)",
        "concepts": ["government formation", "parliamentary democracy"],
        "themes": ["government", "democracy"],
    },
    "pes19_keepromises": {
        "display_label": "Belief that political parties keep election promises (PES)",
        "concepts": ["election promises", "party trust"],
        "themes": ["government", "trust"],
    },
    "pes19_groups1_1": {
        "display_label": "Feeling toward Racial minorities (PES)",
        "concepts": ["group affect", "feeling thermometer", "racial minorities"],
        "themes": ["society"],
    },
    "pes19_groups1_2": {
        "display_label": "Feeling toward Immigrants (PES)",
        "concepts": ["group affect", "feeling thermometer", "immigrants"],
        "themes": ["society"],
    },
    "pes19_groups1_3": {
        "display_label": "Feeling toward Francophones (PES)",
        "concepts": ["group affect", "feeling thermometer", "francophones"],
        "themes": ["society"],
    },
    "pes19_groups1_4": {
        "display_label": "Feeling toward Feminists (PES)",
        "concepts": ["group affect", "feeling thermometer", "feminists"],
        "themes": ["society"],
    },
    "pes19_libwords": {
        "display_label": "Immediate word associations with Liberal Party",
        "concepts": ["word association", "party image", "liberal party"],
        "themes": ["parties"],
    },
    "pes19_conwords": {
        "display_label": "Immediate word associations with Conservative Party",
        "concepts": ["word association", "party image", "conservative party"],
        "themes": ["parties"],
    },
    "pes19_ndpwords": {
        "display_label": "Immediate word associations with New Democratic Party (NDP)",
        "concepts": ["word association", "party image", "ndp"],
        "themes": ["parties"],
    },
    "pes19_bqwords": {
        "display_label": "Immediate word associations with Bloc Québécois",
        "concepts": ["word association", "party image", "bloc québécois"],
        "themes": ["parties"],
    },
    "pes19_greenwords": {
        "display_label": "Immediate word associations with Green Party",
        "concepts": ["word association", "party image", "green party"],
        "themes": ["parties"],
    },
    "pes19_peopleswords": {
        "display_label": "Immediate word associations with People's Party (PPC)",
        "concepts": ["word association", "party image", "people's party (ppc)"],
        "themes": ["parties"],
    },
    "pes19_econ_retro": {
        "display_label": "Evaluation of Canadian economy over past 12 months (PES)",
        "concepts": ["economic evaluation", "retrospective economy"],
        "themes": ["economy"],
    },
    "pes19_pos_fptp": {
        "display_label": "Views on changing First Past the Post electoral system (PES)",
        "concepts": ["electoral reform", "voting system"],
        "themes": ["democracy", "elections"],
    },
    "pes19_paymed": {
        "display_label": "Views on allowing private payment for faster medical treatment",
        "concepts": ["two-tier healthcare", "private healthcare"],
        "themes": ["health", "social policy"],
    },
    "pes19_senate": {
        "display_label": "Views on abolishing the Canadian Senate",
        "concepts": ["senate abolition", "parliamentary reform"],
        "themes": ["democracy", "government"],
    },
    "pes19_envirojob": {
        "display_label": "Protecting environment vs creating jobs conflict priority (PES)",
        "concepts": ["environment economy trade-off"],
        "themes": ["environment", "economy"],
    },
    "pes19_hatespeech": {
        "display_label": "Views on banning public hate speech against racial/ethnic/religious groups",
        "concepts": ["hate speech laws", "free speech"],
        "themes": ["society", "rights"],
    },
    "pes19_losetouch": {
        "display_label": "View that elected MPs soon lose touch with people",
        "concepts": ["political alienation", "representation"],
        "themes": ["democracy", "trust"],
    },
    "pes19_womenhome": {
        "display_label": "View that society would be better off if fewer women worked outside home",
        "concepts": ["traditional gender roles", "women in workforce"],
        "themes": ["society", "gender"],
    },
    "pes19_govtcare": {
        "display_label": "View that government does not care much about what people think (PES)",
        "concepts": ["external political efficacy", "responsiveness"],
        "themes": ["democracy", "efficacy"],
    },
    "pes19_complicated": {
        "display_label": "Politics and government seem too complicated to understand (PES)",
        "concepts": ["internal political efficacy"],
        "themes": ["democracy", "efficacy"],
    },
    "pes19_famvalues": {
        "display_label": "View that country would have fewer problems with emphasis on traditional family values",
        "concepts": ["family values", "social conservatism"],
        "themes": ["society", "culture"],
    },
    "pes19_pollie": {
        "display_label": "View that politicians are willing to lie to get elected",
        "concepts": ["politician trust", "political cynicism"],
        "themes": ["democracy", "trust"],
    },
    "pes19_bilingualism": {
        "display_label": "View that Canada has gone too far in pushing bilingualism",
        "concepts": ["bilingualism", "language policy"],
        "themes": ["culture", "language"],
    },
    "pes19_equalrights": {
        "display_label": "View that Canada has gone too far in pushing equal rights",
        "concepts": ["equal rights", "anti-egalitarianism"],
        "themes": ["society", "rights"],
    },
    "pes19_ethid": {
        "display_label": "Importance of ethnicity and language to personal identity",
        "concepts": ["ethnic identity", "cultural identity"],
        "themes": ["identity", "culture"],
    },
    "pes19_fitin": {
        "display_label": "View that too many recent immigrants don't want to fit in to Canadian society",
        "concepts": ["immigrant assimilation", "nativism"],
        "themes": ["immigration", "society"],
    },
    "pes19_immigjobs": {
        "display_label": "View that immigrants take jobs away from other Canadians",
        "concepts": ["immigrant economic impact", "nativism"],
        "themes": ["immigration", "economy"],
    },
    "pes19_govteff": {
        "display_label": "View that governments used to be better at getting things done",
        "concepts": ["state capacity", "government effectiveness"],
        "themes": ["government"],
    },
    "pes19_govtprograms": {
        "display_label": "View that government can no longer afford standard programs and services",
        "concepts": ["welfare state capacity", "fiscal constraints"],
        "themes": ["government", "spending"],
    },
    "pes19_tieus": {
        "display_label": "Preferred closeness of Canada's ties with the United States",
        "concepts": ["canada us relations", "foreign policy"],
        "themes": ["foreign policy"],
    },
    "pes19_tiechina": {
        "display_label": "Preferred closeness of Canada's ties with China",
        "concepts": ["canada china relations", "foreign policy"],
        "themes": ["foreign policy"],
    },
    "pes19_country_1": {
        "display_label": "Feeling toward Canada",
        "concepts": ["country affect", "feeling thermometer", "canada"],
        "themes": ["patriotism", "identity"],
    },
    "pes19_country_2": {
        "display_label": "Feeling toward United States",
        "concepts": ["country affect", "feeling thermometer", "united states"],
        "themes": ["foreign policy"],
    },
    "pes19_country_3": {
        "display_label": "Feeling toward Quebec",
        "concepts": ["province affect", "feeling thermometer", "quebec"],
        "themes": ["federalism", "quebec"],
    },
    "pes19_country_4": {
        "display_label": "Feeling toward China",
        "concepts": ["country affect", "feeling thermometer", "china"],
        "themes": ["foreign policy"],
    },
    "pes19_can_id_1": {
        "display_label": "Importance for being Canadian: Being born in Canada",
        "concepts": ["canadian identity", "nativism"],
        "themes": ["identity"],
    },
    "pes19_can_id_2": {
        "display_label": "Importance for being Canadian: Speaking English or French",
        "concepts": ["canadian identity", "official languages"],
        "themes": ["identity", "language"],
    },
    "pes19_can_id_3": {
        "display_label": "Importance for being Canadian: Sharing Canadian values",
        "concepts": ["canadian identity", "shared values"],
        "themes": ["identity"],
    },
    "pes19_can_id_4": {
        "display_label": "Importance for being Canadian: Respecting Canadian laws and institutions",
        "concepts": ["canadian identity", "civic duty"],
        "themes": ["identity", "democracy"],
    },
    "pes19_ottawa_perf": {
        "display_label": "General performance rating of federal government in Ottawa",
        "concepts": ["government performance", "federal government"],
        "themes": ["government"],
    },
    "pes19_party_rep": {
        "display_label": "Belief that any federal party represents respondent's views well",
        "concepts": ["party representation", "political representation"],
        "themes": ["parties", "representation"],
    },
    "pes19_party_rep_whic": {
        "display_label": "Federal party that represents respondent's views best",
        "concepts": ["party representation", "best party"],
        "themes": ["parties"],
    },
    "pes19_party_rep_whic_7_TEXT": {
        "display_label": "Federal party that represents views best (other text)",
        "concepts": ["party representation"],
        "themes": ["parties"],
    },
    "pes19_party_rate_10": {
        "display_label": "Feeling toward Conservative Party (PES)",
        "concepts": ["party affect", "feeling thermometer", "conservative party"],
        "themes": ["parties"],
    },
    "pes19_party_rate_11": {
        "display_label": "Feeling toward Liberal Party (PES)",
        "concepts": ["party affect", "feeling thermometer", "liberal party"],
        "themes": ["parties"],
    },
    "pes19_party_rate_12": {
        "display_label": "Feeling toward NDP (PES)",
        "concepts": ["party affect", "feeling thermometer", "ndp"],
        "themes": ["parties"],
    },
    "pes19_party_rate_13": {
        "display_label": "Feeling toward Bloc Québécois (PES)",
        "concepts": ["party affect", "feeling thermometer", "bloc québécois"],
        "themes": ["parties"],
    },
    "pes19_party_rate_14": {
        "display_label": "Feeling toward Green Party (PES)",
        "concepts": ["party affect", "feeling thermometer", "green party"],
        "themes": ["parties"],
    },
    "pes19_lead_rate_7": {
        "display_label": "Feeling toward Andrew Scheer (PES)",
        "concepts": ["leader affect", "feeling thermometer", "andrew scheer"],
        "themes": ["leadership", "parties"],
    },
    "pes19_lead_rate_8": {
        "display_label": "Feeling toward Justin Trudeau (PES)",
        "concepts": ["leader affect", "feeling thermometer", "justin trudeau"],
        "themes": ["leadership", "parties"],
    },
    "pes19_lead_rate_9": {
        "display_label": "Feeling toward Jagmeet Singh (PES)",
        "concepts": ["leader affect", "feeling thermometer", "jagmeet singh"],
        "themes": ["leadership", "parties"],
    },
    "pes19_lead_rate_10": {
        "display_label": "Feeling toward Elizabeth May (PES)",
        "concepts": ["leader affect", "feeling thermometer", "elizabeth may"],
        "themes": ["leadership", "parties"],
    },
    "pes19_lead_rate_11": {
        "display_label": "Feeling toward Yves-François Blanchet (PES)",
        "concepts": ["leader affect", "feeling thermometer", "yves-françois blanchet"],
        "themes": ["leadership", "parties"],
    },
    "pes19_lr_parties_1": {
        "display_label": "Perceived left-right placement of Conservative Party (PES)",
        "concepts": ["party ideology", "left-right placement", "conservative party"],
        "themes": ["ideology", "parties"],
    },
    "pes19_lr_parties_2": {
        "display_label": "Perceived left-right placement of Liberal Party (PES)",
        "concepts": ["party ideology", "left-right placement", "liberal party"],
        "themes": ["ideology", "parties"],
    },
    "pes19_lr_parties_3": {
        "display_label": "Perceived left-right placement of NDP (PES)",
        "concepts": ["party ideology", "left-right placement", "ndp"],
        "themes": ["ideology", "parties"],
    },
    "pes19_lr_parties_4": {
        "display_label": "Perceived left-right placement of Green Party (PES)",
        "concepts": ["party ideology", "left-right placement", "green party"],
        "themes": ["ideology", "parties"],
    },
    "pes19_lr_parties_5": {
        "display_label": "Perceived left-right placement of Bloc Québécois (PES)",
        "concepts": ["party ideology", "left-right placement", "bloc québécois"],
        "themes": ["ideology", "parties"],
    },
    "pes19_lr_self_1": {
        "display_label": "Self-placement on left-right political scale (PES)",
        "concepts": ["ideology", "left-right scale"],
        "themes": ["ideology"],
    },
    "pes19_emb_none": {
        "display_label": "Support for adding 'None of the above' option to election ballots",
        "concepts": ["ballot reform", "electoral options"],
        "themes": ["elections", "democracy"],
    },
    "pes19_emb_id": {
        "display_label": "Support for issuing national voter identification card to electors",
        "concepts": ["voter ID", "electoral administration"],
        "themes": ["elections"],
    },
    "pes19_emb_vote16": {
        "display_label": "Support for lowering federal voting age to 16",
        "concepts": ["voting age", "electoral reform"],
        "themes": ["elections", "youth"],
    },
    "pes19_lowturnout": {
        "display_label": "View that low voter turnout weakens Canadian democracy",
        "concepts": ["voter turnout", "democratic health"],
        "themes": ["elections", "democracy"],
    },
    "pes19_internetvote1": {
        "display_label": "Support for allowing Canadians to vote over the internet",
        "concepts": ["online voting", "internet voting"],
        "themes": ["elections", "technology"],
    },
    "pes19_internetvote2": {
        "display_label": "Likelihood of voting over internet if available",
        "concepts": ["online voting", "internet voting"],
        "themes": ["elections", "technology"],
    },
    "pes19_conf_inst1_1": {
        "display_label": "Confidence in Federal government",
        "concepts": ["institutional confidence", "trust in government"],
        "themes": ["trust", "government"],
    },
    "pes19_conf_inst1_2": {
        "display_label": "Confidence in Provincial government",
        "concepts": ["institutional confidence", "trust in government"],
        "themes": ["trust", "provinces"],
    },
    "pes19_conf_inst1_3": {
        "display_label": "Confidence in News media",
        "concepts": ["institutional confidence", "trust in media"],
        "themes": ["trust", "media"],
    },
    "pes19_conf_inst2_1": {
        "display_label": "Confidence in Courts",
        "concepts": ["institutional confidence", "judiciary"],
        "themes": ["trust", "justice"],
    },
    "pes19_conf_inst2_2": {
        "display_label": "Confidence in Organized religion",
        "concepts": ["institutional confidence", "religious institutions"],
        "themes": ["trust", "religion"],
    },
    "pes19_conf_inst2_3": {
        "display_label": "Confidence in Armed forces",
        "concepts": ["institutional confidence", "military"],
        "themes": ["trust", "defence"],
    },
    "pes19_conf_inst2_4": {
        "display_label": "Confidence in Public schools",
        "concepts": ["institutional confidence", "education system"],
        "themes": ["trust", "education"],
    },
    "pes19_conf_inst2_5": {
        "display_label": "Confidence in Big business",
        "concepts": ["institutional confidence", "corporate sector"],
        "themes": ["trust", "economy"],
    },
    "pes19_conf_inst2_6": {
        "display_label": "Confidence in Labour unions",
        "concepts": ["institutional confidence", "unions"],
        "themes": ["trust", "labor"],
    },
    "pes19_conf_inst2_7": {
        "display_label": "Confidence in Public service / civil service",
        "concepts": ["institutional confidence", "civil service"],
        "themes": ["trust", "government"],
    },
    "pes19_conf_inst2_8": {
        "display_label": "Confidence in Police",
        "concepts": ["institutional confidence", "police"],
        "themes": ["trust", "justice"],
    },
    "pes19_conf_inst2_9": {
        "display_label": "Confidence in Elections Canada",
        "concepts": ["institutional confidence", "elections canada"],
        "themes": ["trust", "elections"],
    },
    "pes19_foreign": {
        "display_label": "Confidence that federal election was safe from foreign interference",
        "concepts": ["election security", "foreign interference"],
        "themes": ["elections", "security"],
    },
    "pes19_emb_satif": {
        "display_label": "Satisfaction with way Elections Canada runs federal elections",
        "concepts": ["elections canada", "electoral administration"],
        "themes": ["elections"],
    },
    "pes19_emb8": {
        "display_label": "View on whether Elections Canada ran election fairly",
        "concepts": ["elections canada", "election fairness"],
        "themes": ["elections"],
    },
    "pes19_internetregis": {
        "display_label": "Views on providing date of birth to complete online voter registration",
        "concepts": ["voter registration", "privacy"],
        "themes": ["elections"],
    },
    "pes19_internetrisk1": {
        "display_label": "Views on security risks of internet voting vs accessibility",
        "concepts": ["online voting risks", "cybersecurity"],
        "themes": ["elections", "technology"],
    },
    "pes19_internetrisk2": {
        "display_label": "Views on voter turnout impact of internet voting",
        "concepts": ["online voting impact"],
        "themes": ["elections", "technology"],
    },
    "pes19_emb_register": {
        "display_label": "Received voter registration card in mail",
        "concepts": ["voter registration card"],
        "themes": ["elections"],
    },
    "pes19_emb_card": {
        "display_label": "Information on voter registration card was correct",
        "concepts": ["voter registration card accuracy"],
        "themes": ["elections"],
    },
    "pes19_emb_register2": {
        "display_label": "Registered to vote during election campaign",
        "concepts": ["voter registration"],
        "themes": ["elections"],
    },
    "pes19_emb_reg_how": {
        "display_label": "Method used to register to vote",
        "concepts": ["voter registration method"],
        "themes": ["elections"],
    },
    "pes19_emb_register3": {
        "display_label": "Ease or difficulty of registering to vote",
        "concepts": ["voter registration ease"],
        "themes": ["elections"],
    },
    "pes19_emb4_1": {
        "display_label": "Voter information source: Elections Canada website",
        "concepts": ["voter information", "elections canada"],
        "themes": ["elections", "media"],
    },
    "pes19_emb4_2": {
        "display_label": "Voter information source: Elections Canada voter information card",
        "concepts": ["voter information", "elections canada"],
        "themes": ["elections", "media"],
    },
    "pes19_emb4_3": {
        "display_label": "Voter information source: Elections Canada radio ads",
        "concepts": ["voter information", "elections canada"],
        "themes": ["elections", "media"],
    },
    "pes19_emb4_4": {
        "display_label": "Voter information source: Elections Canada TV ads",
        "concepts": ["voter information", "elections canada"],
        "themes": ["elections", "media"],
    },
    "pes19_emb4_5": {
        "display_label": "Voter information source: Elections Canada newspaper or flyer ads",
        "concepts": ["voter information", "elections canada"],
        "themes": ["elections", "media"],
    },
    "pes19_emb4_6": {
        "display_label": "Voter information source: Social media posts or ads",
        "concepts": ["voter information", "elections canada"],
        "themes": ["elections", "media"],
    },
    "pes19_emb4_7": {
        "display_label": "Voter information source: News media (TV, radio, newspaper)",
        "concepts": ["voter information", "elections canada"],
        "themes": ["elections", "media"],
    },
    "pes19_emb4_8": {
        "display_label": "Voter information source: Political parties or candidates",
        "concepts": ["voter information", "elections canada"],
        "themes": ["elections", "media"],
    },
    "pes19_emb4_9": {
        "display_label": "Voter information source: Friends or family members",
        "concepts": ["voter information", "elections canada"],
        "themes": ["elections", "media"],
    },
    "pes19_emb4_10": {
        "display_label": "Voter information source: Community organizations or groups",
        "concepts": ["voter information", "elections canada"],
        "themes": ["elections", "media"],
    },
    "pes19_emb4_11": {
        "display_label": "Voter information source: Other source 1",
        "concepts": ["voter information", "elections canada"],
        "themes": ["elections", "media"],
    },
    "pes19_emb4_12": {
        "display_label": "Voter information source: Workplace or school",
        "concepts": ["voter information", "elections canada"],
        "themes": ["elections", "media"],
    },
    "pes19_emb4_13": {
        "display_label": "Voter information source: Search engine / internet search",
        "concepts": ["voter information", "elections canada"],
        "themes": ["elections", "media"],
    },
    "pes19_emb4_14": {
        "display_label": "Voter information source: Other source 2",
        "concepts": ["voter information", "elections canada"],
        "themes": ["elections", "media"],
    },
    "pes19_emb4_15": {
        "display_label": "Voter information source: None of the above",
        "concepts": ["voter information", "elections canada"],
        "themes": ["elections", "media"],
    },
    "pes19_emb4_16": {
        "display_label": "Voter information source: Don't know",
        "concepts": ["voter information", "elections canada"],
        "themes": ["elections", "media"],
    },
    "pes19_emb4_11_TEXT": {
        "display_label": "Voter information source: Other source 1 (text specification)",
        "concepts": ["voter information", "elections canada"],
        "themes": ["elections", "media"],
    },
    "pes19_emb4_14_TEXT": {
        "display_label": "Voter information source: Other source 2 (text specification)",
        "concepts": ["voter information", "elections canada"],
        "themes": ["elections", "media"],
    },
    "pes19_emb7_2": {
        "display_label": "Level of information on voting: Where and when to vote",
        "concepts": ["voter knowledge", "electoral information"],
        "themes": ["elections"],
    },
    "pes19_emb7_3": {
        "display_label": "Level of information on voting: Ways / methods available to vote",
        "concepts": ["voter knowledge", "electoral information"],
        "themes": ["elections"],
    },
    "pes19_emb7_5": {
        "display_label": "Level of information on voting: ID requirements to vote",
        "concepts": ["voter knowledge", "electoral information"],
        "themes": ["elections"],
    },
    "pes19_emb_info": {
        "display_label": "Ease or difficulty of finding voting information",
        "concepts": ["voter information access"],
        "themes": ["elections"],
    },
    "pes19_provvote": {
        "display_label": "Provincial vote intention if election held today",
        "concepts": ["provincial vote intention"],
        "themes": ["elections", "provinces"],
    },
    "pes19_provvote_295_TEXT": {
        "display_label": "Provincial vote intention (other party text)",
        "concepts": ["provincial vote intention"],
        "themes": ["elections", "provinces"],
    },
    "pes19_interest_1": {
        "display_label": "General interest in politics (0-10 scale, PES)",
        "concepts": ["political interest", "civic engagement"],
        "themes": ["elections", "democracy"],
    },
    "pes19_socnet1": {
        "display_label": "Number of close friends outside family",
        "concepts": ["social networks", "friendship networks"],
        "themes": ["society"],
    },
    "pes10_socnet3": {
        "display_label": "Frequency of getting together with close friends in person",
        "concepts": ["social interaction", "friendship"],
        "themes": ["society"],
    },
    "pes19_socnet2_1": {
        "display_label": "Close friends belonging to visibly different ethnicity",
        "concepts": ["social diversity", "intergroup contact"],
        "themes": ["society"],
    },
    "pes19_socnet2_2": {
        "display_label": "Close friends who tend to disagree about politics",
        "concepts": ["political disagreement", "social networks"],
        "themes": ["society", "politics"],
    },
    "pes19_socnet2_3": {
        "display_label": "Close friends with graduate or professional degree",
        "concepts": ["social networks", "education background"],
        "themes": ["society"],
    },
    "pes19_discfam": {
        "display_label": "Frequency of discussing politics with family and friends",
        "concepts": ["political discussion"],
        "themes": ["civic participation"],
    },
    "pes19_discwork": {
        "display_label": "Frequency of discussing politics with work or school colleagues",
        "concepts": ["political discussion"],
        "themes": ["civic participation"],
    },
    "pes19_disagreed": {
        "display_label": "Frequency of discussing politics with someone who disagrees",
        "concepts": ["political discussion", "cross-cutting talk"],
        "themes": ["civic participation"],
    },
    "pes19_partic1_1": {
        "display_label": "Campaign participation: Worked for a political party or candidate during campaign",
        "concepts": ["campaign participation", "political engagement"],
        "themes": ["elections", "civic participation"],
    },
    "pes19_partic1_2": {
        "display_label": "Campaign participation: Displayed campaign button, lawn sign or sticker",
        "concepts": ["campaign participation", "political engagement"],
        "themes": ["elections", "civic participation"],
    },
    "pes19_partic1_3": {
        "display_label": "Campaign participation: Donated money to a political party or candidate",
        "concepts": ["campaign participation", "political engagement"],
        "themes": ["elections", "civic participation"],
    },
    "pes19_partic2_1": {
        "display_label": "Political participation: Attended a political meeting or rally",
        "concepts": ["political participation", "civic engagement"],
        "themes": ["civic participation"],
    },
    "pes19_partic2_2": {
        "display_label": "Political participation: Contacted a politician or government official",
        "concepts": ["political participation", "civic engagement"],
        "themes": ["civic participation"],
    },
    "pes19_partic2_3": {
        "display_label": "Political participation: Participated in a demonstration or protest march",
        "concepts": ["political participation", "civic engagement"],
        "themes": ["civic participation"],
    },
    "pes19_partic2_4": {
        "display_label": "Political participation: Signed a petition",
        "concepts": ["political participation", "civic engagement"],
        "themes": ["civic participation"],
    },
    "pes19_partic3_1": {
        "display_label": "Civic participation: Boycotted certain products for political/ethical reasons",
        "concepts": ["civic participation", "political action"],
        "themes": ["civic participation"],
    },
    "pes19_partic3_2": {
        "display_label": "Civic participation: Bought certain products for political/ethical reasons",
        "concepts": ["civic participation", "political action"],
        "themes": ["civic participation"],
    },
    "pes19_partic3_3": {
        "display_label": "Civic participation: Expressed political views on social media or online",
        "concepts": ["civic participation", "political action"],
        "themes": ["civic participation"],
    },
    "pes19_partic3_4": {
        "display_label": "Civic participation: Discussed politics with friends or family",
        "concepts": ["civic participation", "political action"],
        "themes": ["civic participation"],
    },
    "pes19_partic3_5": {
        "display_label": "Civic participation: Volunteered for a community or civic group",
        "concepts": ["civic participation", "political action"],
        "themes": ["civic participation"],
    },
    "pes19_partic3_6": {
        "display_label": "Civic participation: Wore or displayed a political symbol or badge",
        "concepts": ["civic participation", "political action"],
        "themes": ["civic participation"],
    },
    "pes19_volassoc_1": {
        "display_label": "Active membership in voluntary group: Sports or recreational organization",
        "concepts": ["voluntary associations", "civic engagement"],
        "themes": ["civic participation"],
    },
    "pes19_volassoc_2": {
        "display_label": "Active membership in voluntary group: Cultural, educational, or hobby organization",
        "concepts": ["voluntary associations", "civic engagement"],
        "themes": ["civic participation"],
    },
    "pes19_volassoc_3": {
        "display_label": "Active membership in voluntary group: Religious or church organization",
        "concepts": ["voluntary associations", "civic engagement"],
        "themes": ["civic participation"],
    },
    "pes19_volassoc_4": {
        "display_label": "Active membership in voluntary group: Trade union or professional association",
        "concepts": ["voluntary associations", "civic engagement"],
        "themes": ["civic participation"],
    },
    "pes19_volassoc_5": {
        "display_label": "Active membership in voluntary group: Political party or political organization",
        "concepts": ["voluntary associations", "civic engagement"],
        "themes": ["civic participation"],
    },
    "pes19_volassoc_6": {
        "display_label": "Active membership in voluntary group: Environmental organization",
        "concepts": ["voluntary associations", "civic engagement"],
        "themes": ["civic participation"],
    },
    "pes19_volassoc_7": {
        "display_label": "Active membership in voluntary group: Charitable or service organization",
        "concepts": ["voluntary associations", "civic engagement"],
        "themes": ["civic participation"],
    },
    "pes19_volassoc_8": {
        "display_label": "Active membership in voluntary group: Youth or student group",
        "concepts": ["voluntary associations", "civic engagement"],
        "themes": ["civic participation"],
    },
    "pes19_volassoc_9": {
        "display_label": "Active membership in voluntary group: Seniors organization",
        "concepts": ["voluntary associations", "civic engagement"],
        "themes": ["civic participation"],
    },
    "pes19_volassoc_10": {
        "display_label": "Active membership in voluntary group: Ethnic or immigrant organization",
        "concepts": ["voluntary associations", "civic engagement"],
        "themes": ["civic participation"],
    },
    "pes19_volassoc_11": {
        "display_label": "Active membership in voluntary group: Neighborhood or community group",
        "concepts": ["voluntary associations", "civic engagement"],
        "themes": ["civic participation"],
    },
    "pes19_volassoc_12": {
        "display_label": "Active membership in voluntary group: Other voluntary organization",
        "concepts": ["voluntary associations", "civic engagement"],
        "themes": ["civic participation"],
    },
    "pes19_volassoc_13": {
        "display_label": "Active membership in voluntary group: None of the above",
        "concepts": ["voluntary associations", "civic engagement"],
        "themes": ["civic participation"],
    },
    "pes19_volassoc_14": {
        "display_label": "Active membership in voluntary group: Don't know",
        "concepts": ["voluntary associations", "civic engagement"],
        "themes": ["civic participation"],
    },
    "pes19_volassoc_12_TEXT": {
        "display_label": "Active membership in voluntary group: Other voluntary organization (text specification)",
        "concepts": ["voluntary associations", "civic engagement"],
        "themes": ["civic participation"],
    },
    "pes19_partymember": {
        "display_label": "Ever been member of a federal or provincial political party",
        "concepts": ["party membership history"],
        "themes": ["parties"],
    },
    "pes19_diff_power_1": {
        "display_label": "View on whether it makes a difference who is in power",
        "concepts": ["political efficacy", "electoral impact"],
        "themes": ["democracy"],
    },
    "pes19_diff_happens_1": {
        "display_label": "View on whether voting makes any difference",
        "concepts": ["political efficacy", "electoral impact"],
        "themes": ["democracy", "voting"],
    },
    "pes19_mediaelite": {
        "display_label": "View that mainstream news media is controlled by elite interests",
        "concepts": ["media bias", "anti-media attitudes"],
        "themes": ["media", "trust"],
    },
    "pes19_medianolie": {
        "display_label": "View that mainstream media journalists never lie",
        "concepts": ["journalism trust"],
        "themes": ["media", "trust"],
    },
    "pes19_opinion": {
        "display_label": "View that non-factual opinions should be considered in debate",
        "concepts": ["public debate norms", "post-truth"],
        "themes": ["society", "democracy"],
    },
    "pes19_lookslikeme": {
        "display_label": "View that respondent is better represented by someone who looks like them",
        "concepts": ["descriptive representation", "identity representation"],
        "themes": ["representation", "identity"],
    },
    "pes19_womenparl": {
        "display_label": "View that protecting women's interests requires more women in Parliament",
        "concepts": ["gender representation", "women in politics"],
        "themes": ["representation", "gender"],
    },
    "pes19_corruption": {
        "display_label": "Perceived prevalence of corruption among politicians",
        "concepts": ["political corruption", "bribes"],
        "themes": ["democracy", "ethics"],
    },
    "pes19_populism_1": {
        "display_label": "Self-perceived understanding of important political issues",
        "concepts": ["internal political efficacy"],
        "themes": ["democracy", "efficacy"],
    },
    "pes19_populism_2": {
        "display_label": "View that political compromise is selling out on principles",
        "concepts": ["populism", "anti-compromise"],
        "themes": ["ideology", "populism"],
    },
    "pes19_populism_3": {
        "display_label": "View that most politicians do not care about the people",
        "concepts": ["populism", "anti-elitism"],
        "themes": ["ideology", "populism"],
    },
    "pes19_populism_4": {
        "display_label": "View that most politicians are trustworthy",
        "concepts": ["political trust", "anti-populism"],
        "themes": ["trust", "democracy"],
    },
    "pes19_populism_5": {
        "display_label": "View that politicians are the main problem in Canada",
        "concepts": ["populism", "anti-politician sentiment"],
        "themes": ["ideology", "populism"],
    },
    "pes19_populism_6": {
        "display_label": "Support for a strong leader who bends rules to get things done",
        "concepts": ["populism", "authoritarian leadership"],
        "themes": ["ideology", "populism"],
    },
    "pes19_populism_7": {
        "display_label": "View that the people, not politicians, should make key decisions",
        "concepts": ["populism", "direct democracy"],
        "themes": ["ideology", "populism"],
    },
    "pes19_populism_8": {
        "display_label": "View that politicians care only about rich and powerful interests",
        "concepts": ["populism", "anti-elitism"],
        "themes": ["ideology", "populism"],
    },
    "pes19_nativism1": {
        "display_label": "View that minorities should adapt to Canadian customs and traditions",
        "concepts": ["nativism", "cultural assimilation"],
        "themes": ["immigration", "society"],
    },
    "pes19_nativism2": {
        "display_label": "View that majority will should prevail over minority rights",
        "concepts": ["majoritarianism", "minority rights"],
        "themes": ["democracy", "rights"],
    },
    "pes19_nativism3": {
        "display_label": "View that immigrants are generally good for Canada's economy",
        "concepts": ["immigrant economic contribution"],
        "themes": ["immigration", "economy"],
    },
    "pes19_nativism4": {
        "display_label": "View that Canadian culture is generally harmed by immigrants",
        "concepts": ["nativism", "cultural threat"],
        "themes": ["immigration", "culture"],
    },
    "pes19_nativism5": {
        "display_label": "View that immigrants increase crime rates in Canada",
        "concepts": ["nativism", "immigrant crime myth"],
        "themes": ["immigration", "crime"],
    },
    "pes19_canid1": {
        "display_label": "Perceived commonalities with other Canadians",
        "concepts": ["canadian identity", "national attachment"],
        "themes": ["identity"],
    },
    "pes19_canid2": {
        "display_label": "Frequency of thinking about being Canadian",
        "concepts": ["canadian identity", "national identity salience"],
        "themes": ["identity"],
    },
    "pes19_canid3": {
        "display_label": "Pride and gladness in being Canadian",
        "concepts": ["canadian identity", "national pride"],
        "themes": ["identity"],
    },
    "pes19_sdo1": {
        "display_label": "View that problems would lessen if certain groups stayed in their place",
        "concepts": ["social dominance orientation", "hierarchy preference"],
        "themes": ["society", "ideology"],
    },
    "pes19_sdo2": {
        "display_label": "View that conditions should be equalized for different groups",
        "concepts": ["egalitarianism", "group equality"],
        "themes": ["society", "ideology"],
    },
    "pes19_sdo3": {
        "display_label": "View that group equality should be society's ideal",
        "concepts": ["egalitarianism", "group equality"],
        "themes": ["society", "ideology"],
    },
    "pes19_sdo4": {
        "display_label": "View that it is good that certain groups are at top and others at bottom",
        "concepts": ["social dominance orientation", "hierarchy preference"],
        "themes": ["society", "ideology"],
    },
    "pes19_donerm": {
        "display_label": "Views on how much should be done for racial minorities",
        "concepts": ["racial minority policies", "affirmative action"],
        "themes": ["society", "discrimination"],
    },
    "pes19_donew": {
        "display_label": "Views on how much should be done for women",
        "concepts": ["gender equality policies", "women's rights"],
        "themes": ["society", "gender"],
    },
    "pes19_donegl": {
        "display_label": "Views on how much should be done for gays and lesbians",
        "concepts": ["lgbtq+ rights", "gay rights"],
        "themes": ["society", "rights"],
    },
    "pes19_doneqc": {
        "display_label": "Views on how much should be done for Quebec",
        "concepts": ["quebec federalism", "regional policy"],
        "themes": ["federalism", "quebec"],
    },
    "pes19_taxes_1": {
        "display_label": "Fair tax burden rating for Small business",
        "concepts": ["tax policy", "small business tax"],
        "themes": ["economy", "taxation"],
    },
    "pes19_taxes_2": {
        "display_label": "Fair tax burden rating for Big Corporations",
        "concepts": ["tax policy", "corporate tax"],
        "themes": ["economy", "taxation"],
    },
    "pes19_taxes_3": {
        "display_label": "Fair tax burden rating for The Middle Class",
        "concepts": ["tax policy", "middle class tax"],
        "themes": ["economy", "taxation"],
    },
    "pes19_taxes_4": {
        "display_label": "Fair tax burden rating for Wealthy Canadians",
        "concepts": ["tax policy", "wealth tax", "progressive taxation"],
        "themes": ["economy", "taxation"],
    },
    "pes19_taxes_5": {
        "display_label": "Fair tax burden rating for Poor Canadians",
        "concepts": ["tax policy", "low income tax"],
        "themes": ["economy", "taxation"],
    },
    "pes19_abort1": {
        "display_label": "Abortion attitude: Should abortion be banned (scale 1)",
        "concepts": ["abortion policy", "reproductive rights"],
        "themes": ["social policy", "rights"],
    },
    "pes19_abort2": {
        "display_label": "Abortion attitude: Should abortion be banned (scale 2)",
        "concepts": ["abortion policy", "reproductive rights"],
        "themes": ["social policy", "rights"],
    },
    "pes19_abort3": {
        "display_label": "Abortion attitude: Views on whether woman should always have right to abortion",
        "concepts": ["abortion policy", "reproductive rights"],
        "themes": ["social policy", "rights"],
    },
    "pes19_abort4": {
        "display_label": "Abortion attitude: Position on abortion availability (never, under conditions, always)",
        "concepts": ["abortion policy", "reproductive rights"],
        "themes": ["social policy", "rights"],
    },
    "pes19_abort5": {
        "display_label": "Abortion attitude: Ease or difficulty for women to get an abortion",
        "concepts": ["abortion policy", "reproductive rights"],
        "themes": ["social policy", "rights"],
    },
    "pes19_abort6": {
        "display_label": "Abortion attitude: Decision to have an abortion is between a woman and her doctor",
        "concepts": ["abortion policy", "reproductive rights"],
        "themes": ["social policy", "rights"],
    },
    "pes19_trade": {
        "display_label": "View that international trade creates more jobs than it destroys",
        "concepts": ["free trade", "globalization"],
        "themes": ["economy", "trade"],
    },
    "pes19_privjobs": {
        "display_label": "View that government should leave job creation to private sector",
        "concepts": ["free market", "government intervention"],
        "themes": ["economy"],
    },
    "pes19_govt_act_ineq": {
        "display_label": "Support for government measures to reduce income inequality",
        "concepts": ["income inequality", "redistribution"],
        "themes": ["economy", "social policy"],
    },
    "pes19_deserve1": {
        "display_label": "View that anyone who wants to work can find a job",
        "concepts": ["work ethic", "individualism"],
        "themes": ["economy", "society"],
    },
    "pes19_deserve2": {
        "display_label": "View that welfare state reduces willingness to look after oneself",
        "concepts": ["welfare state critique", "individualism"],
        "themes": ["economy", "social policy"],
    },
    "pes19_blame": {
        "display_label": "View that people who don't get ahead should blame themselves, not system",
        "concepts": ["individual responsibility", "systemic barriers"],
        "themes": ["society", "ideology"],
    },
    "pes19_stdofliving": {
        "display_label": "Role of government in guaranteeing basic standard of living",
        "concepts": ["welfare state", "basic income"],
        "themes": ["economy", "social policy"],
    },
    "pes19_trust": {
        "display_label": "General social trust in other people",
        "concepts": ["social trust", "interpersonal trust"],
        "themes": ["trust", "society"],
    },
    "pes19_inequal": {
        "display_label": "View on whether income inequality is a big problem in Canada",
        "concepts": ["income inequality salience"],
        "themes": ["economy", "social policy"],
    },
    "pes19_gap": {
        "display_label": "How much should be done to reduce gap between rich and poor",
        "concepts": ["redistribution", "income gap"],
        "themes": ["economy", "social policy"],
    },
    "pes19_provfed": {
        "display_label": "Preference for strong provincial vs strong federal government",
        "concepts": ["federalism", "jurisdiction preference"],
        "themes": ["federalism", "government"],
    },
    "pes19_hostile1": {
        "display_label": "Hostile sexism scale - women failing to appreciate men",
        "concepts": ["hostile sexism", "gender attitudes"],
        "themes": ["society", "gender"],
    },
    "pes19_hostile2": {
        "display_label": "Hostile sexism scale - women seeking power over men",
        "concepts": ["hostile sexism", "gender attitudes"],
        "themes": ["society", "gender"],
    },
    "pes19_hostile3": {
        "display_label": "Hostile sexism scale - women interpreting remarks as sexist",
        "concepts": ["hostile sexism", "gender attitudes"],
        "themes": ["society", "gender"],
    },
    "pes19_benevolent1": {
        "display_label": "Benevolent sexism scale - women cherished and protected by men",
        "concepts": ["benevolent sexism", "gender attitudes"],
        "themes": ["society", "gender"],
    },
    "pes19_benevolent2": {
        "display_label": "Benevolent sexism scale - women possessing purity",
        "concepts": ["benevolent sexism", "gender attitudes"],
        "themes": ["society", "gender"],
    },
    "pes19_benevolent3": {
        "display_label": "Benevolent sexism scale - good woman set on pedestal",
        "concepts": ["benevolent sexism", "gender attitudes"],
        "themes": ["society", "gender"],
    },
    "pes19_pos_carbon": {
        "display_label": "Federal carbon pricing to reduce greenhouse gas emissions (PES)",
        "concepts": ["carbon tax", "climate change policy"],
        "themes": ["environment", "climate"],
    },
    "pes19_pos_energy": {
        "display_label": "Federal support for Canada's energy sector and pipelines (PES)",
        "concepts": ["oil pipelines", "energy policy"],
        "themes": ["energy", "environment"],
    },
    "pes19_cc1": {
        "display_label": "Belief that climate change is happening",
        "concepts": ["climate change belief"],
        "themes": ["environment", "climate"],
    },
    "pes19_cc2": {
        "display_label": "Perceived main cause of climate change (human vs natural)",
        "concepts": ["climate change cause", "anthropogenic climate change"],
        "themes": ["environment", "climate"],
    },
    "pes19_cc2_3_TEXT": {
        "display_label": "Perceived cause of climate change (other specification text)",
        "concepts": ["climate change cause"],
        "themes": ["environment", "climate"],
    },
    "pes19_pid_close": {
        "display_label": "Usually think of self as close to a federal political party",
        "concepts": ["party closeness"],
        "themes": ["parties"],
    },
    "pes19_little_close": {
        "display_label": "Feel a little closer to one political party than others",
        "concepts": ["party closeness"],
        "themes": ["parties"],
    },
    "pes19_pid": {
        "display_label": "Federal political party felt closest to",
        "concepts": ["closest party", "party identification"],
        "themes": ["parties"],
    },
    "pes19_pid_5_TEXT": {
        "display_label": "Federal political party felt closest to (other text)",
        "concepts": ["closest party"],
        "themes": ["parties"],
    },
    "pes19_pid_strength": {
        "display_label": "Strength of closeness felt to political party",
        "concepts": ["party closeness strength"],
        "themes": ["parties"],
    },
    "pes19_pidtrad": {
        "display_label": "Traditional federal party identification",
        "concepts": ["traditional party identification"],
        "themes": ["parties"],
    },
    "pes19_pidtrad_7_TEXT": {
        "display_label": "Traditional party identification (other text)",
        "concepts": ["traditional party identification"],
        "themes": ["parties"],
    },
    "pes19_pidtradstrong": {
        "display_label": "Strength of traditional federal party identification",
        "concepts": ["party identification strength"],
        "themes": ["parties"],
    },
    "pes19_affective_1": {
        "display_label": "Affective polarization: frequency thinking about closest party",
        "concepts": ["affective polarization", "partisan identity"],
        "themes": ["parties"],
    },
    "pes19_affective_2": {
        "display_label": "Affective polarization: importance of party connection",
        "concepts": ["affective polarization", "partisan identity"],
        "themes": ["parties"],
    },
    "pes19_affective_3": {
        "display_label": "Affective polarization: closeness felt to fellow party supporters",
        "concepts": ["affective polarization", "in-group affect"],
        "themes": ["parties"],
    },
    "pes19_affective_4": {
        "display_label": "Affective polarization: dislike toward rival party supporters",
        "concepts": ["affective polarization", "out-group animus"],
        "themes": ["parties"],
    },
    "pes19_langQC": {
        "display_label": "Perceived threat to French language in Quebec",
        "concepts": ["french language threat", "quebec language"],
        "themes": ["quebec", "language"],
    },
    "pes19_cultureQC": {
        "display_label": "Perceived threat to French culture in Quebec",
        "concepts": ["french culture threat", "quebec culture"],
        "themes": ["quebec", "culture"],
    },
    "pes19_qclang": {
        "display_label": "Perceived situation of French language if Quebec separates",
        "concepts": ["quebec sovereignty impact", "french language"],
        "themes": ["quebec", "sovereignty"],
    },
    "pes19_qcsol": {
        "display_label": "Perceived standard of living if Quebec separates",
        "concepts": ["quebec sovereignty impact", "standard of living"],
        "themes": ["quebec", "sovereignty"],
    },
    "pes19_newerlife": {
        "display_label": "View that newer lifestyles contribute to breakdown of society",
        "concepts": ["traditionalism", "social conservatism"],
        "themes": ["society", "culture"],
    },
    "pes19_happy": {
        "display_label": "Life satisfaction statement (life close to ideal)",
        "concepts": ["life satisfaction", "well-being"],
        "themes": ["well-being"],
    },
    "pes19_satisfied": {
        "display_label": "General satisfaction with life",
        "concepts": ["life satisfaction", "well-being"],
        "themes": ["well-being"],
    },
    "pes19_cognition": {
        "display_label": "Need for cognition (enjoy handling complex thinking tasks)",
        "concepts": ["need for cognition", "personality trait"],
        "themes": ["psychology"],
    },
    "pes19_feminine_1": {
        "display_label": "Self-identity rating on feminine scale (0-100)",
        "concepts": ["gender identity", "femininity"],
        "themes": ["identity", "gender"],
    },
    "pes19_masculine_1": {
        "display_label": "Self-identity rating on masculine scale (0-100)",
        "concepts": ["gender identity", "masculinity"],
        "themes": ["identity", "gender"],
    },
    "pes19_big5_1": {
        "display_label": "Big Five personality trait self-rating: Extraverted / enthusiastic",
        "concepts": ["personality traits", "extraversion"],
        "themes": ["psychology"],
    },
    "pes19_big5_2": {
        "display_label": "Big Five personality trait self-rating: Critical / quarrelsome",
        "concepts": ["personality traits", "agreeableness"],
        "themes": ["psychology"],
    },
    "pes19_big5_3": {
        "display_label": "Big Five personality trait self-rating: Dependable / self-disciplined",
        "concepts": ["personality traits", "conscientiousness"],
        "themes": ["psychology"],
    },
    "pes19_big5_4": {
        "display_label": "Big Five personality trait self-rating: Anxious / easily upset",
        "concepts": ["personality traits", "emotional stability"],
        "themes": ["psychology"],
    },
    "pes19_big5_5": {
        "display_label": "Big Five personality trait self-rating: Open to new experiences / complex",
        "concepts": ["personality traits", "openness"],
        "themes": ["psychology"],
    },
    "pes19_big5_6": {
        "display_label": "Big Five personality trait self-rating: Reserved / quiet",
        "concepts": ["personality traits", "extraversion"],
        "themes": ["psychology"],
    },
    "pes19_big5_7": {
        "display_label": "Big Five personality trait self-rating: Sympathetic / warm",
        "concepts": ["personality traits", "agreeableness"],
        "themes": ["psychology"],
    },
    "pes19_big5_8": {
        "display_label": "Big Five personality trait self-rating: Disorganized / careless",
        "concepts": ["personality traits", "conscientiousness"],
        "themes": ["psychology"],
    },
    "pes19_big5_9": {
        "display_label": "Big Five personality trait self-rating: Calm / emotionally stable",
        "concepts": ["personality traits", "emotional stability"],
        "themes": ["psychology"],
    },
    "pes19_big5_10": {
        "display_label": "Big Five personality trait self-rating: Conventional / uncreative",
        "concepts": ["personality traits", "openness"],
        "themes": ["psychology"],
    },
    "pes19_health": {
        "display_label": "Self-rated general health status",
        "concepts": ["self-rated health"],
        "themes": ["health"],
    },
    "pes19_phealth": {
        "display_label": "Self-rated physical health status",
        "concepts": ["physical health"],
        "themes": ["health"],
    },
    "pes19_mhealth": {
        "display_label": "Self-rated mental health status",
        "concepts": ["mental health"],
        "themes": ["health"],
    },
    "pes19_yob": {
        "display_label": "Year of birth (PES)",
        "concepts": ["age", "year of birth"],
        "themes": ["demographics"],
    },
    "pes19_month_of_birth": {
        "display_label": "Month of birth",
        "concepts": ["birth month"],
        "themes": ["demographics"],
    },
    "pes19_service_freq": {
        "display_label": "Frequency of religious service attendance",
        "concepts": ["religiosity", "church attendance"],
        "themes": ["demographics", "religion"],
    },
    "pes19_parents_born": {
        "display_label": "Parents born outside Canada",
        "concepts": ["immigrant background", "family background"],
        "themes": ["demographics"],
    },
    "pes19_rural_urban": {
        "display_label": "Urban vs rural residence type",
        "concepts": ["urban rural", "geography"],
        "themes": ["demographics", "geography"],
    },
    "pes19_lived": {
        "display_label": "Years lived in current city or community",
        "concepts": ["residence tenure", "community"],
        "themes": ["demographics"],
    },
    "pes19_follow_pol": {
        "display_label": "Frequency of following politics in media",
        "concepts": ["media exposure", "political interest"],
        "themes": ["media"],
    },
    "pes19_lang": {
        "display_label": "Primary language spoken at home",
        "concepts": ["language spoken at home"],
        "themes": ["demographics", "language"],
    },
    "pes19_lang_70_TEXT": {
        "display_label": "Primary language spoken at home (Indigenous language specification)",
        "concepts": ["language"],
        "themes": ["demographics", "language"],
    },
    "pes19_lang_84_TEXT": {
        "display_label": "Primary language spoken at home (other language text)",
        "concepts": ["language"],
        "themes": ["demographics", "language"],
    },
    "pes19_occ_text": {
        "display_label": "Main occupation title (text)",
        "concepts": ["occupation"],
        "themes": ["demographics"],
    },
    "pes19_occ_cat": {
        "display_label": "Main occupation category",
        "concepts": ["occupation", "job category"],
        "themes": ["demographics"],
    },
    "pes19_occ_cat_28_TEXT": {
        "display_label": "Main occupation category (other text)",
        "concepts": ["occupation"],
        "themes": ["demographics"],
    },
    "pes19_employment": {
        "display_label": "Employment status (PES)",
        "concepts": ["employment status"],
        "themes": ["demographics"],
    },
    "pes19_employment_12_TEXT": {
        "display_label": "Employment status (other text)",
        "concepts": ["employment status"],
        "themes": ["demographics"],
    },
}
