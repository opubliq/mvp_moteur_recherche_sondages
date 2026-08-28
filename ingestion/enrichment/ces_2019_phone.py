"""Enrichment authoré — ces_2019_phone. Produit par subagent LLM (2026-08-28)."""

SURVEY = {
    "description": "2019 Canadian Election Study (CES) Phone Survey — campaign wave and post-election wave covering political attitudes, vote choice, leader ratings, policy issues, and demographics for the October 21, 2019 federal election.",
    "month": 10,  # Main fieldwork month (September - November 2019)
}

QUESTIONS = {
    "q1": {
        "display_label": "Canadian citizenship status",
        "concepts": ["citizenship", "canadian politics"],
        "themes": ["demographics", "elections"],
    },
    "q2": {
        "display_label": "Year of birth",
        "concepts": ["birth year", "age"],
        "themes": ["demographics"],
    },
    "q3": {
        "display_label": "Gender identity",
        "concepts": ["gender"],
        "themes": ["demographics"],
    },
    "q4": {
        "display_label": "Province or territory of residence",
        "concepts": ["province", "geography"],
        "themes": ["demographics", "geography"],
    },
    "q6": {
        "display_label": "Satisfaction with Canadian democracy",
        "concepts": ["democratic satisfaction", "trust in democracy"],
        "themes": ["democracy", "elections"],
    },
    "q7": {
        "display_label": "Most important issue personally in federal election",
        "concepts": ["most important issue", "issue salience"],
        "themes": ["issues", "elections"],
    },
    "q8": {
        "display_label": "Party best at addressing most important issue",
        "concepts": ["issue ownership", "party competence"],
        "themes": ["parties", "issues", "elections"],
    },
    "q8_7_": {
        "display_label": "Party best at addressing most important issue (other party specify)",
        "concepts": ["issue ownership", "party competence"],
        "themes": ["parties", "issues"],
    },
    "q9": {
        "display_label": "General interest in politics (0-10 scale)",
        "concepts": ["political interest", "civic engagement"],
        "themes": ["elections", "democracy"],
    },
    "q10": {
        "display_label": "Likelihood of voting on election day",
        "concepts": ["turnout intention", "voting likelihood"],
        "themes": ["elections", "voting"],
    },
    "q11": {
        "display_label": "Federal party vote choice intention",
        "concepts": ["vote choice", "party preference"],
        "themes": ["elections", "parties"],
    },
    "q11_7_": {
        "display_label": "Federal party vote choice intention (other party specify)",
        "concepts": ["vote choice", "party preference"],
        "themes": ["elections", "parties"],
    },
    "q12": {
        "display_label": "Federal party vote choice leaning",
        "concepts": ["vote choice", "leaning voters"],
        "themes": ["elections", "parties"],
    },
    "q12_7_": {
        "display_label": "Federal party vote choice leaning (other party specify)",
        "concepts": ["vote choice", "leaning voters"],
        "themes": ["elections", "parties"],
    },
    "q13": {
        "display_label": "Satisfaction with federal government performance under Justin Trudeau",
        "concepts": ["government satisfaction", "trudeau government"],
        "themes": ["elections", "government"],
    },
    "q14": {
        "display_label": "Feeling toward Liberal Party",
        "concepts": ["party affect", "feeling thermometer", "liberal party"],
        "themes": ["parties"],
    },
    "q15": {
        "display_label": "Feeling toward Conservative Party",
        "concepts": ["party affect", "feeling thermometer", "conservative party"],
        "themes": ["parties"],
    },
    "q16": {
        "display_label": "Feeling toward NDP",
        "concepts": ["party affect", "feeling thermometer", "ndp"],
        "themes": ["parties"],
    },
    "q17": {
        "display_label": "Feeling toward Bloc Québécois",
        "concepts": ["party affect", "feeling thermometer", "bloc québécois"],
        "themes": ["parties"],
    },
    "q18": {
        "display_label": "Feeling toward Green Party",
        "concepts": ["party affect", "feeling thermometer", "green party"],
        "themes": ["parties"],
    },
    "q19": {
        "display_label": "Feeling toward People's Party (PPC)",
        "concepts": ["party affect", "feeling thermometer", "people's party (ppc)"],
        "themes": ["parties"],
    },
    "q20": {
        "display_label": "Feeling toward Justin Trudeau",
        "concepts": ["leader affect", "feeling thermometer", "justin trudeau"],
        "themes": ["leadership", "parties"],
    },
    "q21": {
        "display_label": "Feeling toward Andrew Scheer",
        "concepts": ["leader affect", "feeling thermometer", "andrew scheer"],
        "themes": ["leadership", "parties"],
    },
    "q22": {
        "display_label": "Feeling toward Jagmeet Singh",
        "concepts": ["leader affect", "feeling thermometer", "jagmeet singh"],
        "themes": ["leadership", "parties"],
    },
    "q23": {
        "display_label": "Feeling toward Yves-François Blanchet",
        "concepts": ["leader affect", "feeling thermometer", "yves-françois blanchet"],
        "themes": ["leadership", "parties"],
    },
    "q24": {
        "display_label": "Feeling toward Elizabeth May",
        "concepts": ["leader affect", "feeling thermometer", "elizabeth may"],
        "themes": ["leadership", "parties"],
    },
    "q25": {
        "display_label": "Feeling toward Maxime Bernier",
        "concepts": ["leader affect", "feeling thermometer", "maxime bernier"],
        "themes": ["leadership", "parties"],
    },
    "q27_a": {
        "display_label": "Federal spending on education",
        "concepts": ["education spending", "budget priorities"],
        "themes": ["spending", "education"],
    },
    "q27_b": {
        "display_label": "Federal spending on the environment",
        "concepts": ["environmental spending", "climate budget"],
        "themes": ["spending", "environment"],
    },
    "q27_c": {
        "display_label": "Federal spending on crime and justice",
        "concepts": ["justice spending", "law enforcement budget"],
        "themes": ["spending", "justice"],
    },
    "q27_d": {
        "display_label": "Federal spending on national defence",
        "concepts": ["defence spending", "military budget"],
        "themes": ["spending", "defence"],
    },
    "q27_e": {
        "display_label": "Federal spending on immigrants and minorities",
        "concepts": ["immigrant spending", "minority programs"],
        "themes": ["spending", "immigration", "social"],
    },
    "q31": {
        "display_label": "Evaluation of Canadian economy over past year",
        "concepts": ["economic evaluation", "retrospective economy"],
        "themes": ["economy"],
    },
    "q32": {
        "display_label": "Impact of federal government policies on Canadian economy",
        "concepts": ["economic attribution", "government performance"],
        "themes": ["economy", "government"],
    },
    "q33": {
        "display_label": "Party best at managing Canadian economy",
        "concepts": ["issue ownership", "party competence", "economy"],
        "themes": ["parties", "issues", "economy"],
    },
    "q33_7_": {
        "display_label": "Party best at managing Canadian economy (other party specify)",
        "concepts": ["issue ownership", "party competence"],
        "themes": ["parties", "issues"],
    },
    "q34": {
        "display_label": "Party best at protecting the environment",
        "concepts": ["issue ownership", "party competence", "environment"],
        "themes": ["parties", "issues", "environment"],
    },
    "q34_7_": {
        "display_label": "Party best at protecting the environment (other party specify)",
        "concepts": ["issue ownership", "party competence"],
        "themes": ["parties", "issues"],
    },
    "q35": {
        "display_label": "Party with best chance of winning most seats nationally",
        "concepts": ["election prediction", "party seat prediction"],
        "themes": ["elections"],
    },
    "q35_7_": {
        "display_label": "Party with best chance of winning most seats nationally (other party specify)",
        "concepts": ["election prediction"],
        "themes": ["elections"],
    },
    "q36": {
        "display_label": "Party with second best chance of winning most seats nationally",
        "concepts": ["election prediction", "party seat prediction"],
        "themes": ["elections"],
    },
    "q36_7_": {
        "display_label": "Party with second best chance of winning most seats nationally (other party specify)",
        "concepts": ["election prediction"],
        "themes": ["elections"],
    },
    "q37": {
        "display_label": "Party with best chance of winning in local riding",
        "concepts": ["local election prediction", "riding election prediction"],
        "themes": ["elections", "candidates"],
    },
    "q37_7_": {
        "display_label": "Party with best chance of winning in local riding (other party specify)",
        "concepts": ["local election prediction"],
        "themes": ["elections"],
    },
    "q38": {
        "display_label": "Party with second best chance of winning in local riding",
        "concepts": ["local election prediction", "riding election prediction"],
        "themes": ["elections", "candidates"],
    },
    "q38_7_": {
        "display_label": "Party with second best chance of winning in local riding (other party specify)",
        "concepts": ["local election prediction"],
        "themes": ["elections"],
    },
    "q39": {
        "display_label": "Preferred admission level for immigrants to Canada",
        "concepts": ["immigration levels"],
        "themes": ["immigration"],
    },
    "q40": {
        "display_label": "Preferred admission level for refugees to Canada",
        "concepts": ["refugee policy", "refugee admission"],
        "themes": ["immigration"],
    },
    "q75": {
        "display_label": "Evaluation of government handling of SNC-Lavalin affair",
        "concepts": ["snc-lavalin affair", "government ethics", "political scandals"],
        "themes": ["government", "ethics"],
    },
    "q44": {
        "display_label": "Daily time spent consuming news and political information",
        "concepts": ["news consumption", "media exposure"],
        "themes": ["media"],
    },
    "q76": {
        "display_label": "Voting viewed as a civic duty vs personal choice",
        "concepts": ["civic duty", "voting norms"],
        "themes": ["democracy", "voting"],
    },
    "q45": {
        "display_label": "Volunteering frequency for organization in past 12 months",
        "concepts": ["volunteering", "civic engagement"],
        "themes": ["civic participation"],
    },
    "q46": {
        "display_label": "Belief that Justin Trudeau kept 2015 election promises",
        "concepts": ["election promises", "accountability", "trudeau government"],
        "themes": ["government", "trust"],
    },
    "q47": {
        "display_label": "Personal financial situation over past year",
        "concepts": ["personal finances", "pocketbook economy"],
        "themes": ["economy"],
    },
    "q48": {
        "display_label": "Political knowledge: Name of provincial Premier",
        "concepts": ["political knowledge", "premier"],
        "themes": ["democracy", "knowledge"],
    },
    "q49": {
        "display_label": "Political knowledge: Name of federal Minister of Finance",
        "concepts": ["political knowledge", "finance minister"],
        "themes": ["democracy", "knowledge"],
    },
    "q52": {
        "display_label": "Federal political party identification",
        "concepts": ["party identification", "federal party choice"],
        "themes": ["parties"],
    },
    "q52_7_": {
        "display_label": "Federal political party identification (other party specify)",
        "concepts": ["party identification"],
        "themes": ["parties"],
    },
    "q53": {
        "display_label": "Strength of federal party identification",
        "concepts": ["party identification strength"],
        "themes": ["parties"],
    },
    "q54": {
        "display_label": "Satisfaction with provincial government performance",
        "concepts": ["provincial government satisfaction"],
        "themes": ["government", "provinces"],
    },
    "q59": {
        "display_label": "Voted in 2015 federal election",
        "concepts": ["past voting", "turnout history"],
        "themes": ["elections", "voting"],
    },
    "q60": {
        "display_label": "Party voted for in 2015 federal election",
        "concepts": ["past vote choice", "voting history"],
        "themes": ["elections", "parties"],
    },
    "q60_7_": {
        "display_label": "Party voted for in 2015 federal election (other party specify)",
        "concepts": ["past vote choice"],
        "themes": ["elections", "parties"],
    },
    "q77": {
        "display_label": "Watched or listened to federal leaders debate",
        "concepts": ["leaders debate", "election debates"],
        "themes": ["elections", "media"],
    },
    "q43": {
        "display_label": "Favourability toward Quebec sovereignty",
        "concepts": ["quebec sovereignty", "quebec independence"],
        "themes": ["quebec", "sovereignty"],
    },
    "q61": {
        "display_label": "Highest level of education completed",
        "concepts": ["education", "attainment"],
        "themes": ["demographics"],
    },
    "q62": {
        "display_label": "Religious affiliation",
        "concepts": ["religion", "religious affiliation"],
        "themes": ["demographics"],
    },
    "q62_22_": {
        "display_label": "Religious affiliation (other specify)",
        "concepts": ["religion"],
        "themes": ["demographics"],
    },
    "q63": {
        "display_label": "Importance of religion in life",
        "concepts": ["religiosity", "importance of religion"],
        "themes": ["demographics", "religion"],
    },
    "q64": {
        "display_label": "Country of birth",
        "concepts": ["country of birth", "place of origin"],
        "themes": ["demographics", "immigration"],
    },
    "q64_13_": {
        "display_label": "Country of birth (other specify)",
        "concepts": ["country of birth"],
        "themes": ["demographics"],
    },
    "q65": {
        "display_label": "Year of arrival in Canada",
        "concepts": ["immigration year", "years in canada"],
        "themes": ["demographics", "immigration"],
    },
    "q66a_1": {
        "display_label": "Ethnic background: Canadian",
        "concepts": ["ethnic origin", "cultural identity"],
        "themes": ["demographics"],
    },
    "q66a_2": {
        "display_label": "Ethnic background: English",
        "concepts": ["ethnic origin", "cultural identity"],
        "themes": ["demographics"],
    },
    "q66a_3": {
        "display_label": "Ethnic background: Irish",
        "concepts": ["ethnic origin", "cultural identity"],
        "themes": ["demographics"],
    },
    "q66a_4": {
        "display_label": "Ethnic background: British",
        "concepts": ["ethnic origin", "cultural identity"],
        "themes": ["demographics"],
    },
    "q66a_5": {
        "display_label": "Ethnic background: French",
        "concepts": ["ethnic origin", "cultural identity"],
        "themes": ["demographics"],
    },
    "q66a_6": {
        "display_label": "Ethnic background: Italian",
        "concepts": ["ethnic origin", "cultural identity"],
        "themes": ["demographics"],
    },
    "q66a_7": {
        "display_label": "Ethnic background: Chinese",
        "concepts": ["ethnic origin", "cultural identity"],
        "themes": ["demographics"],
    },
    "q66a_8": {
        "display_label": "Ethnic background: German",
        "concepts": ["ethnic origin", "cultural identity"],
        "themes": ["demographics"],
    },
    "q66a_9": {
        "display_label": "Ethnic background: Polish",
        "concepts": ["ethnic origin", "cultural identity"],
        "themes": ["demographics"],
    },
    "q66a_10": {
        "display_label": "Ethnic background: Dutch",
        "concepts": ["ethnic origin", "cultural identity"],
        "themes": ["demographics"],
    },
    "q66a_11": {
        "display_label": "Ethnic background: Indian",
        "concepts": ["ethnic origin", "cultural identity"],
        "themes": ["demographics"],
    },
    "q66a_12": {
        "display_label": "Ethnic background: Scottish",
        "concepts": ["ethnic origin", "cultural identity"],
        "themes": ["demographics"],
    },
    "q66a_13": {
        "display_label": "Ethnic background: Ukrainian",
        "concepts": ["ethnic origin", "cultural identity"],
        "themes": ["demographics"],
    },
    "q66a_14": {
        "display_label": "Ethnic background: French Canadian",
        "concepts": ["ethnic origin", "cultural identity"],
        "themes": ["demographics"],
    },
    "q66a_15": {
        "display_label": "Ethnic background: Indigenous / First Nations / Metis / Inuit",
        "concepts": ["indigenous identity", "ethnic origin"],
        "themes": ["demographics"],
    },
    "q66a_16": {
        "display_label": "Ethnic background: Québécois",
        "concepts": ["ethnic origin", "quebec identity"],
        "themes": ["demographics", "quebec"],
    },
    "q66a_17": {
        "display_label": "Ethnic background: Other",
        "concepts": ["ethnic origin", "cultural identity"],
        "themes": ["demographics"],
    },
    "q66a_17_": {
        "display_label": "Ethnic background: Other (specify)",
        "concepts": ["ethnic origin"],
        "themes": ["demographics"],
    },
    "q66_1": {
        "display_label": "Additional ethnic background: Only Canadian mentioned",
        "concepts": ["ethnic origin"],
        "themes": ["demographics"],
    },
    "q66_3": {
        "display_label": "Additional ethnic background: English",
        "concepts": ["ethnic origin"],
        "themes": ["demographics"],
    },
    "q66_4": {
        "display_label": "Additional ethnic background: Irish",
        "concepts": ["ethnic origin"],
        "themes": ["demographics"],
    },
    "q66_5": {
        "display_label": "Additional ethnic background: British",
        "concepts": ["ethnic origin"],
        "themes": ["demographics"],
    },
    "q66_6": {
        "display_label": "Additional ethnic background: French",
        "concepts": ["ethnic origin"],
        "themes": ["demographics"],
    },
    "q66_7": {
        "display_label": "Additional ethnic background: Italian",
        "concepts": ["ethnic origin"],
        "themes": ["demographics"],
    },
    "q66_8": {
        "display_label": "Additional ethnic background: Chinese",
        "concepts": ["ethnic origin"],
        "themes": ["demographics"],
    },
    "q66_9": {
        "display_label": "Additional ethnic background: German",
        "concepts": ["ethnic origin"],
        "themes": ["demographics"],
    },
    "q66_10": {
        "display_label": "Additional ethnic background: Polish",
        "concepts": ["ethnic origin"],
        "themes": ["demographics"],
    },
    "q66_11": {
        "display_label": "Additional ethnic background: Dutch",
        "concepts": ["ethnic origin"],
        "themes": ["demographics"],
    },
    "q66_12": {
        "display_label": "Additional ethnic background: Indian",
        "concepts": ["ethnic origin"],
        "themes": ["demographics"],
    },
    "q66_13": {
        "display_label": "Additional ethnic background: Scottish",
        "concepts": ["ethnic origin"],
        "themes": ["demographics"],
    },
    "q66_14": {
        "display_label": "Additional ethnic background: Ukrainian",
        "concepts": ["ethnic origin"],
        "themes": ["demographics"],
    },
    "q66_15": {
        "display_label": "Additional ethnic background: French Canadian",
        "concepts": ["ethnic origin"],
        "themes": ["demographics"],
    },
    "q66_16": {
        "display_label": "Additional ethnic background: Indigenous / First Nations / Metis / Inuit",
        "concepts": ["indigenous identity", "ethnic origin"],
        "themes": ["demographics"],
    },
    "q66_17": {
        "display_label": "Additional ethnic background: Québécois",
        "concepts": ["ethnic origin", "quebec identity"],
        "themes": ["demographics", "quebec"],
    },
    "q66_18": {
        "display_label": "Additional ethnic background: Other",
        "concepts": ["ethnic origin"],
        "themes": ["demographics"],
    },
    "q66_18_": {
        "display_label": "Additional ethnic background: Other (specify)",
        "concepts": ["ethnic origin"],
        "themes": ["demographics"],
    },
    "q67": {
        "display_label": "Mother tongue / first language learned",
        "concepts": ["mother tongue", "language"],
        "themes": ["demographics", "language"],
    },
    "q67_31_": {
        "display_label": "Mother tongue (other specify)",
        "concepts": ["language"],
        "themes": ["demographics"],
    },
    "q68": {
        "display_label": "Employment status",
        "concepts": ["employment", "job status"],
        "themes": ["demographics", "economy"],
    },
    "q68_12_": {
        "display_label": "Employment status (other specify)",
        "concepts": ["employment"],
        "themes": ["demographics"],
    },
    "q69": {
        "display_label": "Total household income before taxes",
        "concepts": ["household income", "income"],
        "themes": ["demographics", "economy"],
    },
    "q70": {
        "display_label": "Household income bracket",
        "concepts": ["household income", "income bracket"],
        "themes": ["demographics", "economy"],
    },
    "q71": {
        "display_label": "Household size (number of residents)",
        "concepts": ["household size"],
        "themes": ["demographics"],
    },
    "q26a": {
        "display_label": "Landline telephone in household",
        "concepts": ["telephone access", "survey methodology"],
        "themes": ["demographics", "media"],
    },
    "q26b": {
        "display_label": "Mobile telephone in household",
        "concepts": ["mobile phone access", "survey methodology"],
        "themes": ["demographics", "media"],
    },
    "q77eng": {
        "display_label": "Watched or listened to English-language leaders debate",
        "concepts": ["leaders debate", "english debate"],
        "themes": ["elections", "media"],
    },
    "q77fr": {
        "display_label": "Watched or listened to French-language leaders debate",
        "concepts": ["leaders debate", "french debate"],
        "themes": ["elections", "media"],
    },
    "p1": {
        "display_label": "Main issue in the election campaign",
        "concepts": ["most important issue", "campaign issues"],
        "themes": ["issues", "elections"],
    },
    "p2": {
        "display_label": "Voted in 2019 federal election",
        "concepts": ["voted in election", "turnout"],
        "themes": ["elections", "voting"],
    },
    "p3": {
        "display_label": "Federal party voted for in 2019 election",
        "concepts": ["vote choice", "reported vote"],
        "themes": ["elections", "parties"],
    },
    "p3_7_": {
        "display_label": "Federal party voted for in 2019 election (other party specify)",
        "concepts": ["vote choice"],
        "themes": ["elections", "parties"],
    },
    "p4": {
        "display_label": "Satisfaction with Canadian democracy (post-election)",
        "concepts": ["democratic satisfaction", "trust in democracy"],
        "themes": ["democracy", "elections"],
    },
    "p5": {
        "display_label": "Evaluation of federal government performance over past four years",
        "concepts": ["government evaluation", "federal government performance"],
        "themes": ["government", "elections"],
    },
    "p6": {
        "display_label": "Rating of Conservative Party (0-10 scale)",
        "concepts": ["party affect", "feeling thermometer", "conservative party"],
        "themes": ["parties"],
    },
    "p7": {
        "display_label": "Rating of Liberal Party (0-10 scale)",
        "concepts": ["party affect", "feeling thermometer", "liberal party"],
        "themes": ["parties"],
    },
    "p8": {
        "display_label": "Rating of NDP (0-10 scale)",
        "concepts": ["party affect", "feeling thermometer", "ndp"],
        "themes": ["parties"],
    },
    "p9": {
        "display_label": "Rating of Green Party (0-10 scale)",
        "concepts": ["party affect", "feeling thermometer", "green party"],
        "themes": ["parties"],
    },
    "p10": {
        "display_label": "Rating of Bloc Québécois (0-10 scale)",
        "concepts": ["party affect", "feeling thermometer", "bloc québécois"],
        "themes": ["parties"],
    },
    "p11": {
        "display_label": "Rating of People's Party (PPC) (0-10 scale)",
        "concepts": ["party affect", "feeling thermometer", "people's party (ppc)"],
        "themes": ["parties"],
    },
    "p12": {
        "display_label": "Rating of Andrew Scheer (0-10 scale)",
        "concepts": ["leader affect", "feeling thermometer", "andrew scheer"],
        "themes": ["leadership", "parties"],
    },
    "p13": {
        "display_label": "Rating of Justin Trudeau (0-10 scale)",
        "concepts": ["leader affect", "feeling thermometer", "justin trudeau"],
        "themes": ["leadership", "parties"],
    },
    "p14": {
        "display_label": "Rating of Jagmeet Singh (0-10 scale)",
        "concepts": ["leader affect", "feeling thermometer", "jagmeet singh"],
        "themes": ["leadership", "parties"],
    },
    "p15": {
        "display_label": "Rating of Elizabeth May (0-10 scale)",
        "concepts": ["leader affect", "feeling thermometer", "elizabeth may"],
        "themes": ["leadership", "parties"],
    },
    "p16": {
        "display_label": "Rating of Yves-François Blanchet (0-10 scale)",
        "concepts": ["leader affect", "feeling thermometer", "yves-françois blanchet"],
        "themes": ["leadership", "parties"],
    },
    "p17": {
        "display_label": "Rating of Maxime Bernier (0-10 scale)",
        "concepts": ["leader affect", "feeling thermometer", "maxime bernier"],
        "themes": ["leadership", "parties"],
    },
    "p18": {
        "display_label": "Impact of Quebec sovereignty on French language situation",
        "concepts": ["quebec sovereignty", "french language"],
        "themes": ["quebec", "sovereignty", "language"],
    },
    "p19": {
        "display_label": "Impact of Quebec sovereignty on personal standard of living",
        "concepts": ["quebec sovereignty", "standard of living"],
        "themes": ["quebec", "sovereignty", "economy"],
    },
    "p20_a": {
        "display_label": "Role of government: leave job creation entirely to private sector",
        "concepts": ["role of government", "free market", "job creation"],
        "themes": ["economy", "ideology"],
    },
    "p20_b": {
        "display_label": "Internal political efficacy: politics seems too complicated to understand",
        "concepts": ["internal political efficacy"],
        "themes": ["democracy", "efficacy"],
    },
    "p20_c": {
        "display_label": "Importance of politicians behaving ethically in office",
        "concepts": ["political ethics", "integrity"],
        "themes": ["government", "ethics"],
    },
    "p20_d": {
        "display_label": "Government action to reduce income inequality",
        "concepts": ["income inequality", "redistribution"],
        "themes": ["economy", "social policy"],
    },
    "p20_e": {
        "display_label": "Traditional gender roles: society better off if fewer women worked outside home",
        "concepts": ["gender roles", "women in workforce"],
        "themes": ["society", "gender"],
    },
    "p20_f": {
        "display_label": "Individualism vs systemic blame: people who don't get ahead should blame themselves",
        "concepts": ["individual responsibility", "systemic inequality"],
        "themes": ["ideology", "society"],
    },
    "p20_g": {
        "display_label": "Subjective political competence: understanding major political issues",
        "concepts": ["political efficacy", "political competence"],
        "themes": ["democracy", "efficacy"],
    },
    "p20_h": {
        "display_label": "View on political compromise: compromise as selling out principles",
        "concepts": ["political compromise", "partisanship"],
        "themes": ["democracy", "ideology"],
    },
    "p20_i": {
        "display_label": "Populism: most politicians do not care about average people",
        "concepts": ["populism", "political cynicism", "trust in politicians"],
        "themes": ["democracy", "populism"],
    },
    "p20_j": {
        "display_label": "Trustworthiness of politicians: most politicians are trustworthy",
        "concepts": ["trust in politicians", "political trust"],
        "themes": ["democracy", "trust"],
    },
    "p20_k": {
        "display_label": "Populism: politicians are the main problem in Canada",
        "concepts": ["populism", "anti-establishment"],
        "themes": ["democracy", "populism"],
    },
    "p20_l": {
        "display_label": "Strong leadership vs democratic rules",
        "concepts": ["strong leadership", "authoritarian attitudes"],
        "themes": ["democracy", "leadership"],
    },
    "p20_m": {
        "display_label": "Direct democracy vs politician decision-making",
        "concepts": ["direct democracy", "populism"],
        "themes": ["democracy", "populism"],
    },
    "p20_n": {
        "display_label": "Populism: politicians care only about interests of rich and powerful",
        "concepts": ["populism", "economic elite"],
        "themes": ["democracy", "populism"],
    },
    "p21_a": {
        "display_label": "Cultural assimilation: minorities should adapt to Canadian traditions",
        "concepts": ["assimilation", "minorities", "cultural norms"],
        "themes": ["immigration", "society"],
    },
    "p21_b": {
        "display_label": "Majority rule vs minority rights",
        "concepts": ["majority rule", "minority rights"],
        "themes": ["democracy", "rights"],
    },
    "p22_a": {
        "display_label": "Impact of immigrants on Canadian economy",
        "concepts": ["immigration impact", "economic impact of immigration"],
        "themes": ["immigration", "economy"],
    },
    "p22_b": {
        "display_label": "Impact of immigrants on Canadian culture",
        "concepts": ["immigration impact", "cultural impact of immigration"],
        "themes": ["immigration", "culture"],
    },
    "p22_c": {
        "display_label": "Impact of immigrants on Canadian crime rates",
        "concepts": ["immigration impact", "crime rates"],
        "themes": ["immigration", "crime"],
    },
    "p23": {
        "display_label": "Do any federal parties represent respondent's views reasonably well",
        "concepts": ["party representation", "political alignment"],
        "themes": ["parties", "representation"],
    },
    "p24": {
        "display_label": "Party that represents respondent's views best",
        "concepts": ["party representation", "best party fit"],
        "themes": ["parties", "representation"],
    },
    "p24_7_": {
        "display_label": "Party that represents respondent's views best (other specify)",
        "concepts": ["party representation"],
        "themes": ["parties"],
    },
    "p25_a": {
        "display_label": "Importance of being born in Canada for being truly Canadian",
        "concepts": ["national identity", "nativism", "canadian identity"],
        "themes": ["identity", "society"],
    },
    "p25_b": {
        "display_label": "Importance of grandparents born in Canada for being truly Canadian",
        "concepts": ["national identity", "ancestral identity"],
        "themes": ["identity", "society"],
    },
    "p25_c": {
        "display_label": "Importance of speaking English or French for being truly Canadian",
        "concepts": ["national identity", "official languages"],
        "themes": ["identity", "language"],
    },
    "p25_d": {
        "display_label": "Importance of following Canadian customs for being truly Canadian",
        "concepts": ["national identity", "cultural conformity"],
        "themes": ["identity", "culture"],
    },
    "p26": {
        "display_label": "Perceived prevalence of political corruption in Canada",
        "concepts": ["political corruption", "bribe taking"],
        "themes": ["government", "ethics"],
    },
    "p27": {
        "display_label": "General interest in politics (post-election scale)",
        "concepts": ["political interest", "civic engagement"],
        "themes": ["democracy", "elections"],
    },
    "p28": {
        "display_label": "Frequency of following political news media",
        "concepts": ["media consumption", "following politics"],
        "themes": ["media"],
    },
    "p29_a": {
        "display_label": "Political participation: boycotted or bought products for ethical/political reasons",
        "concepts": ["ethical consumerism", "political participation"],
        "themes": ["civic participation"],
    },
    "p29_b": {
        "display_label": "Political participation: volunteered for political party or candidate",
        "concepts": ["campaign volunteering", "political participation"],
        "themes": ["civic participation", "elections"],
    },
    "p29_c": {
        "display_label": "Political participation: attended rally or protest demonstration",
        "concepts": ["protest participation", "political rallies"],
        "themes": ["civic participation"],
    },
    "p30": {
        "display_label": "Charitable donation frequency in past 12 months",
        "concepts": ["charitable giving", "civic engagement"],
        "themes": ["civic participation"],
    },
    "p31": {
        "display_label": "Membership in provincial or federal political party",
        "concepts": ["party membership"],
        "themes": ["parties", "civic participation"],
    },
    "p32": {
        "display_label": "Retrospective evaluation of Canadian economy over past 12 months",
        "concepts": ["economic evaluation", "retrospective economy"],
        "themes": ["economy"],
    },
    "p33": {
        "display_label": "Perceived difference between who is in power",
        "concepts": ["party polarization", "perceived party differences"],
        "themes": ["parties", "democracy"],
    },
    "p34": {
        "display_label": "Efficacy of voting: whether voting makes a difference",
        "concepts": ["external political efficacy", "voting efficacy"],
        "themes": ["democracy", "voting"],
    },
    "p35_a": {
        "display_label": "What should be done for racial minorities",
        "concepts": ["minority rights", "racial equality"],
        "themes": ["social policy", "discrimination"],
    },
    "p35_b": {
        "display_label": "What should be done for women",
        "concepts": ["gender equality", "women rights"],
        "themes": ["social policy", "gender"],
    },
    "p35_c": {
        "display_label": "What should be done for gays and lesbians",
        "concepts": ["lgbtq rights", "sexual minority rights"],
        "themes": ["social policy", "rights"],
    },
    "p36": {
        "display_label": "Perceived left-right placement of Liberal Party",
        "concepts": ["party ideology", "left-right placement", "liberal party"],
        "themes": ["ideology", "parties"],
    },
    "p37": {
        "display_label": "Perceived left-right placement of Conservative Party",
        "concepts": ["party ideology", "left-right placement", "conservative party"],
        "themes": ["ideology", "parties"],
    },
    "p38": {
        "display_label": "Perceived left-right placement of NDP",
        "concepts": ["party ideology", "left-right placement", "ndp"],
        "themes": ["ideology", "parties"],
    },
    "p39": {
        "display_label": "Perceived left-right placement of Bloc Québécois",
        "concepts": ["party ideology", "left-right placement", "bloc québécois"],
        "themes": ["ideology", "parties"],
    },
    "p40": {
        "display_label": "Perceived left-right placement of Green Party",
        "concepts": ["party ideology", "left-right placement", "green party"],
        "themes": ["ideology", "parties"],
    },
    "p41": {
        "display_label": "Perceived left-right placement of People's Party (PPC)",
        "concepts": ["party ideology", "left-right placement", "people's party (ppc)"],
        "themes": ["ideology", "parties"],
    },
    "p42": {
        "display_label": "Self-placement on left-right political scale",
        "concepts": ["ideology", "left-right scale"],
        "themes": ["ideology"],
    },
    "p43": {
        "display_label": "Closeness of Canada-US ties",
        "concepts": ["canada us relations", "foreign policy"],
        "themes": ["foreign policy"],
    },
    "p44": {
        "display_label": "Action to reduce gap between rich and poor",
        "concepts": ["income inequality", "wealth redistribution"],
        "themes": ["economy", "social policy"],
    },
    "p45": {
        "display_label": "Closeness to any federal political party",
        "concepts": ["party identification", "partisan attachment"],
        "themes": ["parties"],
    },
    "p46": {
        "display_label": "Feeling a little closer to one party",
        "concepts": ["party identification", "partisan leaning"],
        "themes": ["parties"],
    },
    "p47": {
        "display_label": "Party respondent feels closest to",
        "concepts": ["party identification"],
        "themes": ["parties"],
    },
    "p47_7_": {
        "display_label": "Party respondent feels closest to (other specify)",
        "concepts": ["party identification"],
        "themes": ["parties"],
    },
    "p48": {
        "display_label": "Strength of closeness to party",
        "concepts": ["party identification strength"],
        "themes": ["parties"],
    },
    "p49": {
        "display_label": "Birth month",
        "concepts": ["birth month"],
        "themes": ["demographics"],
    },
    "p50": {
        "display_label": "Marital status",
        "concepts": ["marital status"],
        "themes": ["demographics"],
    },
    "p51": {
        "display_label": "Union membership",
        "concepts": ["union membership", "labour union"],
        "themes": ["demographics", "labor"],
    },
    "p52": {
        "display_label": "Occupation",
        "concepts": ["occupation", "job title"],
        "themes": ["demographics", "economy"],
    },
    "p53": {
        "display_label": "Employment sector (public, private, non-profit)",
        "concepts": ["employment sector", "public vs private sector"],
        "themes": ["demographics", "economy"],
    },
    "p54": {
        "display_label": "Frequency of attending religious services",
        "concepts": ["religious attendance", "religiosity"],
        "themes": ["demographics", "religion"],
    },
    "p55": {
        "display_label": "Parents born outside Canada",
        "concepts": ["immigrant parents", "second generation immigrant"],
        "themes": ["demographics", "immigration"],
    },
    "p56_1": {
        "display_label": "Language usually spoken at home: English",
        "concepts": ["home language", "language"],
        "themes": ["demographics", "language"],
    },
    "p56_2": {
        "display_label": "Language usually spoken at home: French",
        "concepts": ["home language", "language"],
        "themes": ["demographics", "language"],
    },
    "p56_3": {
        "display_label": "Language usually spoken at home: Chinese, Cantonese",
        "concepts": ["home language", "language"],
        "themes": ["demographics", "language"],
    },
    "p56_4": {
        "display_label": "Language usually spoken at home: Chinese, Mandarin",
        "concepts": ["home language", "language"],
        "themes": ["demographics", "language"],
    },
    "p56_5": {
        "display_label": "Language usually spoken at home: Punjabi",
        "concepts": ["home language", "language"],
        "themes": ["demographics", "language"],
    },
    "p56_6": {
        "display_label": "Language usually spoken at home: Spanish",
        "concepts": ["home language", "language"],
        "themes": ["demographics", "language"],
    },
    "p56_7": {
        "display_label": "Language usually spoken at home: Tagalog",
        "concepts": ["home language", "language"],
        "themes": ["demographics", "language"],
    },
    "p56_8": {
        "display_label": "Language usually spoken at home: Arabic",
        "concepts": ["home language", "language"],
        "themes": ["demographics", "language"],
    },
    "p56_9": {
        "display_label": "Language usually spoken at home: Other",
        "concepts": ["home language", "language"],
        "themes": ["demographics", "language"],
    },
    "p56_9_": {
        "display_label": "Language usually spoken at home: Other (specify)",
        "concepts": ["home language"],
        "themes": ["demographics"],
    },
    "p57": {
        "display_label": "Urban/rural location of residence",
        "concepts": ["urban rural residence", "community type"],
        "themes": ["demographics", "geography"],
    },
}
