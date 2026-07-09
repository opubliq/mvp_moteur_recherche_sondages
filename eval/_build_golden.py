"""Assemble eval/golden.jsonl from hand-graded (survey_id, variable, grade) labels.

Grades: exact | partiel | faible  (see eval/README.md for the rubric).
Everything NOT listed is presumed Hors-sujet (standard TREC pooling assumption).

Snippets prefer the authored display_label (readable) and fall back to the raw
question_text. Source is the offline corpus (ingestion/normalized + enrichment);
for the few index-only survey items with no normalized file (cecd_elxn_qc_2018)
we fall back to eval/_snippets_index_only.json (a small cached snippet map).
"""

from __future__ import annotations

import json
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))
from _corpus import load_corpus, snippet  # noqa: E402

OUT = "eval/golden.jsonl"
INDEX_ONLY_SNIPPETS = "eval/_snippets_index_only.json"

QUERY_META = {
    "q01": ("soutien au fédéralisme canadien", "fr",
            "adversarial: vote-intention / turnout / trust-in-gov items stay EXCLUDED even with 'fédéral'/'canada'"),
    "q02": ("souveraineté et indépendance du Québec", "fr",
            "kept separate from q01 federalism and from vote intention"),
    "q03": ("intentions de vote provinciales", "fr",
            "forward-looking provincial vote intention; past-vote/turnout/federal/referendum excluded"),
    "q04": ("participation électorale (avez-vous voté)", "fr",
            "turnout, not vote choice; party-choice items EXCLUDED"),
    "q05": ("confiance envers le gouvernement fédéral", "fr",
            "Continuous Survey of Canadians (06822 waves); interpersonal/media/science trust EXCLUDED"),
    "q06": ("charte des valeurs et laïcité", "fr",
            "Charte des valeurs 2013"),
    "q07": ("accommodements raisonnables et signes religieux", "fr",
            "no dedicated corpus item (0 exact); laïcité/valeurs + religious-freedom + religion-discrimination are partiel/faible"),
    "q08": ("immigration", "fr",
            "cross-survey; misinformation-belief items graded partiel, their confidence follow-ups faible; year-of-immigration sociodemo excluded"),
    "q09": ("système de santé public ou privé", "fr",
            "cecd_sante_can_usa fully swept; public/private structure = exact, outcome-comparison battery = partiel, general system quality = faible"),
    "q10": ("santé mentale", "fr",
            "govcan_habit is a mental-health survey; golden lists canonical labeled MH items (not every binary battery split)"),
    "q11": ("accès au logement et abordabilité", "fr",
            "CONFIRMED THIN: pooling found no dedicated housing survey; only a handful of scattered items"),
    "q12": ("enjeux les plus importants de la campagne", "fr",
            "issue salience is narrow (2 surveys); specific-policy-issue items graded faible"),
    "q13": ("identification partisane gauche-droite", "fr",
            "self L-R placement & party ID = exact; party-on-L-R placement = partiel; underlying value items = faible"),
    "q14": ("housing affordability", "en",
            "CONFIRMED THIN (same as q11); net-zero home-retrofit / energy items share vocabulary but excluded"),
    "q15": ("trust in government services", "en",
            "Continuous Survey of Canadians (EN); federal trust + service satisfaction = exact, other gov levels = partiel"),
}


# ---- helpers to keep the label tables compact ----
def E(survey, *vars_):  # exact
    return [(survey, v, "exact") for v in vars_]


def P(survey, *vars_):  # partiel
    return [(survey, v, "partiel") for v in vars_]


def F(survey, *vars_):  # faible
    return [(survey, v, "faible") for v in vars_]


W1, W2, W3 = "govcan_06822_wave1_2024", "govcan_06822_wave2_2024", "govcan_06822_wave3_2024"
HABIT, PARCA, SANTE = "govcan_habit_2024", "govcan_parca_2024", "cecd_sante_can_usa"
EEQ = "eeq_2014"

LABELS: dict[str, list] = {}

LABELS["q01"] = (
    E("cecd_elxn_can_2011", "you2", "you3") + E("cecd_elxn_qc_2007", "z2q15b") + E(EEQ, "Q49")
    + P("cecd_elxn_can_2011", "you1") + P(EEQ, "Q13", "Q14A", "Q14B", "Q26A", "Q26B", "Q20", "Q21")
    + F(EEQ, "Q15", "Q12", "Q45", "Q22")
)

LABELS["q02"] = (
    E("cecd_elxn_qc_2018", "rts_q7") + E(EEQ, "Q19", "Q18", "Q53")
    + E("cecd_elxn_can_2011", "souv1", "souv2", "you4")
    + E("cecd_elxn_qc_2007", "intref1", "intref2") + E("cecd_elxn_qc_2012", "intvoteref")
    + E("cecd_elxn_qc_1998", "q16a_crop", "q16b_crop", "voteref")
    + P(EEQ, "Q46", "Q47", "Q48", "Q50", "Q27A", "Q12", "Q17", "Q16", "Q22")
    + P("cecd_elxn_qc_2007", "z1abandon")
    + F(EEQ, "Q23", "Q24A", "Q24B", "Q24C", "Q25", "Q26A", "Q26B", "Q27B", "Q45", "Q20")
)

LABELS["q03"] = (
    E("cecd_elxn_qc_1998", "vpl", "intvote", "intvote2", "q7a_crop", "q7b_crop")
    + E("cecd_charte_2013_10", "prov1", "prov2", "intvoteprov", "intvoteprov2", "vote1", "vote3")
    + E("cecd_elxn_can_2011", "prov1", "prov2")
    + E("cecd_elxn_qc_2012", "intvoteprov1", "intvoteprov2")
    + E("cecd_elxn_qc_2007", "intvote1", "intvote2")
    + E("cecd_elxn_qc_2018", "rv1a", "rv1b")
    + P("cecd_elxn_qc_2007", "deuxint")
    + F("cecd_elxn_qc_2007", "defini", "indecis") + F("cecd_elxn_qc_2012", "definitif", "indecis2")
    + F("cecd_elxn_qc_1998", "q2post")
)

LABELS["q04"] = (
    E("cecd_elxn_qc_2012", "participation") + E("cecd_elxn_qc_2018", "rts_q1", "rts_q4")
    + E("cecd_elxn_qc_2007", "voteoui", "raisannul") + E(EEQ, "Q2")
    + E("cecd_elxn_can_2011", "z2") + E("cecd_elxn_qc_1998", "q1post")
    + P("cecd_elxn_can_2011", "pol1") + P("cecd_elxn_qc_2018", "q1a", "qa", "q6_02", "q6_03", "q6_04", "q6_08")
    + P("cecd_elxn_qc_1998", "allervot") + P(EEQ, "Q16")
    + F("cecd_elxn_qc_1998", "allervo2") + F("cecd_elxn_qc_2018", "q6_01", "q6_05", "q6_06", "q6_09", "q6_10")
)

LABELS["q05"] = (
    E(W1, "TRUST_GOV_CAN", "TRUST_GOC_CLIM", "TRUST_GOC_COVID", "TRUST_GOC_IMM",
      "TRUST_FACET_GC_CARE", "TRUST_FACET_GC_COMPETENT", "TRUST_FACET_GC_FLIPFLOP",
      "TRUST_FACET_GC_INTEGRITY", "TRUST_FACET_GC_OPEN")
    + E(W2, "TRUST_GOV_CAN", "TRUST_GOV_PAST", "TRUST_GOV_PUBHEALTH", "TRUST_GOV_CLIMATE", "TRUST_GOV_DIG",
        "TRUST_FACET_GC_CARE", "TRUST_FACET_GC_COMPETENT", "TRUST_FACET_GC_GOODJOB", "TRUST_FACET_GC_INTEGRITY",
        "TRUST_FACET_GC_OPEN", "TRUST_FACET_GC_PROMISES", "TRUST_FACET_GC_PUBCONCERN",
        "TRUST_FACET_GC_SKILLWORKER", "TRUST_FACET_GC_WELFARE")
    + E(W3, "TRUST_GOV_CAN", "TRUST_GOV_PAST", "TRUST_GOV_PUBHEALTH", "TRUST_GOV_CLIMATE",
        "TRUST_GOV_IMMIGRATION", "TRUST_GOV_HOUSING", "TRUST_GOV_SOCMED",
        "TRUST_FACET_GC_COMPETENT", "TRUST_FACET_GC_OPEN", "TRUST_FACET_GC_PUBCONCERN", "CONSPOP_G")
    + E(HABIT, "TRUST_GOOD_GOC", "TRUST_GOOD_PHAC") + E(PARCA, "D6_D")
    + P("cecd_elxn_can_2011", "sastf")
    + P(W1, "TRUST_GOV_PROVTERR", "TRUST_GOV_MUNI")
    + P(W3, "TRUST_GOV_PROVTERR", "TRUST_GOV_MUNI", "TRUST_ELXNCAN", "TRUST_PS", "TRUST_POLITICIANS",
        "TRUST_GOV_CAN_SOCEST", "FEDGOV_SAT")
    + P(HABIT, "TRUST_GOOD_PROV") + P(PARCA, "D6_E", "D6_F")
    + F(W3, "FEDGOV_SERV", "FEDGOV_SERV_COUNT", "FEDGOV_METHOD", "FEDGOV_TIME")
    + F(HABIT, "TRUST_GOOD_PROV_HEALTH", "TRUST_GOOD_LOCAL_HEALTH")
)

LABELS["q06"] = (
    E(EEQ, "Q54", "Q44A", "Q44B") + E("cecd_charte_2013_10", "pc1")
    + P(EEQ, "Q15") + F(EEQ, "Q41")
)

LABELS["q07"] = (
    P(EEQ, "Q44A", "Q44B", "Q54") + P("cecd_charte_2013_10", "pc1")
    + P(W1, "DEMCAN_EXPRELIG") + P(W3, "DEMCAN_EXPRELIG")
    + F(EEQ, "Q41") + F(HABIT, "DISCRIMINATION_REASONSC5") + F(W2, "SOCMED_DEM_ACCEPTING")
    + F(SANTE, "RELIG")
)

LABELS["q08"] = (
    E(W1, "ATT_IMM_BETTERPLACE", "WORRIED_IMM_ECON", "POLICY_IMM_NEWIMM")
    + E(W3, "WORRIED_IMMIGRATION", "POLICY_IMMIGRATION", "POLICY_IMMIGRATION_CONSENSUS")
    + E("cecd_elxn_qc_2018", "rts_q6") + E(EEQ, "Q41", "Q36E")
    + P(W1, "TRUST_GOC_IMM", "SOCCON_IMM", "PROXIMAL_IMM", "SOC_TRUST_IMM",
        "MIS_T_IMM_1", "MIS_T_IMM_2", "MIS_T_IMM_3", "MIS_T_IMM_4", "MIS_T_IMM_5",
        "MIS_F_IMM_1", "MIS_F_IMM_2", "MIS_F_IMM_3", "MIS_F_IMM_4", "MIS_F_IMM_5")
    + P(W3, "TRUST_GOV_IMMIGRATION", "SOC_TRUST_IMM", "MIS_T_IMM_1", "MIS_T_IMM_2", "MIS_F_IMM_1", "MIS_F_IMM_2")
    + F(W1, "MIS_CONFID_T_IMM_1", "MIS_CONFID_T_IMM_2", "MIS_CONFID_T_IMM_3", "MIS_CONFID_T_IMM_4",
        "MIS_CONFID_T_IMM_5", "MIS_CONFID_F_IMM_1", "MIS_CONFID_F_IMM_2", "MIS_CONFID_F_IMM_3",
        "MIS_CONFID_F_IMM_4", "MIS_CONFID_F_IMM_5")
)

LABELS["q09"] = (
    E(SANTE, "Q42", "Q46", "Q47", "Q48", "Q52A1", "Q52A2", "Q55", "Q56",
      "Q57A", "Q57B", "Q57C", "Q58", "Q58A", "Q58A1", "Q58B", "Q58C",
      "Q59", "Q60", "Q61", "Q62", "Q66A1", "Q66A2")
    + P(SANTE, "Q29", "Q30A", "Q30B", "Q30C", "Q30D", "Q30E", "Q44", "Q45",
        "Q53A", "Q53B", "Q53C", "Q53D", "Q53E", "Q53F", "Q53G",
        "Q54A", "Q54B", "Q54C", "Q54D", "Q54E", "Q54F", "Q54G",
        "Q63", "Q64", "Q65", "Q66")
    + P("cecd_elxn_qc_2007", "z1q15")
    + F(SANTE, "Q6", "Q7", "Q8", "Q9", "Q10", "Q11", "Q12", "Q13", "Q35")
)

LABELS["q10"] = (
    E(HABIT, "HEALTH_MENTAL_STATUS", "MH_FORMAL_DIAGNOSISC3", "MH_SUSPECTED_SELFC3", "MH_STRUGGLE_SELFC3",
      "MENTAL_SELF_CONDITION_TREATMENTC3", "MENTAL_FAMILY_DIAGNOSIS", "SERVICE_MH_BARRIERS",
      "SERVICE_HEALTH_MENTAL", "QUALITY_MHP", "HOTLINE_MH_988", "HOTLINE_MH_KNOW", "HOTLINE_MH_USE",
      "SOCCON_MH_CONDITION", "BESCI_MHEALTHA", "BESCI_MHEALTHB", "BESCI_MHEALTHC", "BESCI_MHEALTHD",
      "HELPSEEK_STIGMA_SHAME", "HELPSEEK_PROPENSITY_KNOW", "MH_HELPFUL_ACTIVITYC1", "MH_HELPFUL_ACTIVITYC5",
      "MH_HELPFUL_ACTIVITYC6", "POLICY_RANKC1", "SERVICE_MH_QUALITY_GP", "SERVICE_MH_QUALITY_PSYCH",
      "SERVICE_MH_QUALITY_CRISIS", "PHAC_AWARE_INFO_MH", "SPECIFIC_HEALTH_THREAT_2")
    + E(W3, "GENERAL_MENTAL")
    + P(HABIT, "SERVICE_COVERAGEC6", "MENTAL_TREAT_PRESCRIBEDC3", "SERVICE_HEALTHCAREC4",
        "SUPPORTERSC13", "MENTAL_SELF_DIAGNOSISC1")
    + F(HABIT, "CLIMATE_HEALTH_ANXIETY", "DISCRIMINATION_REASONSC10", "DISABILITY_TYPEC8",
        "MH_HELPFUL_ACTIVITYC7", "MH_HELPFUL_ACTIVITYC10")
)

LABELS["q11"] = (
    E(W3, "WORRIED_HOUSING") + E(HABIT, "AFFORDABILITY_HOUSING")
    + P(W1, "HOUSING") + P(W3, "LIVINGQUARTER_MORTGAGE", "TRUST_GOV_HOUSING")
    + P(PARCA, "A6") + P(EEQ, "Q60A")
    + F(EEQ, "Q60B", "Q60C", "Q60D", "Q60E")
)

LABELS["q12"] = (
    E("cecd_elxn_qc_2007", "z1q9") + E(EEQ, "Q1")
    + P(EEQ, "Q18")
    + F("cecd_elxn_qc_2007", "z1q16", "z1q17", "z1q18", "z1q19")
)

LABELS["q13"] = (
    E("cecd_elxn_qc_2018", "rts_q8") + E(SANTE, "Q69", "Q70", "Q67", "Q68") + E(EEQ, "Q32", "Q55", "Q56")
    + P(EEQ, "Q31A", "Q31B", "Q31C", "Q31D", "Q31E", "Q31F", "Q5", "Q4")
    + F(SANTE, "Q71", "Q71A", "Q72", "Q73", "Q74", "Q75", "Q76", "Q77")
)

LABELS["q14"] = (
    E(W3, "WORRIED_HOUSING") + E(HABIT, "AFFORDABILITY_HOUSING")
    + P(W3, "TRUST_GOV_HOUSING", "LIVINGQUARTER_MORTGAGE") + P(W1, "HOUSING")
    + P(PARCA, "A6") + P(EEQ, "Q60A")
    + F(EEQ, "Q60B", "Q60C", "Q60D", "Q60E")
)

LABELS["q15"] = (
    E(W1, "TRUST_GOV_CAN", "TRUST_GOC_CLIM", "TRUST_GOC_COVID", "TRUST_GOC_IMM",
      "TRUST_FACET_GC_CARE", "TRUST_FACET_GC_COMPETENT", "TRUST_FACET_GC_INTEGRITY", "TRUST_FACET_GC_OPEN")
    + E(W2, "TRUST_GOV_CAN", "TRUST_GOV_PAST", "TRUST_GOV_PUBHEALTH", "TRUST_GOV_CLIMATE", "TRUST_GOV_DIG",
        "TRUST_FACET_GC_COMPETENT", "TRUST_FACET_GC_GOODJOB", "TRUST_FACET_GC_OPEN", "TRUST_FACET_GC_PROMISES",
        "TRUST_FACET_GC_PUBCONCERN", "TRUST_FACET_GC_WELFARE")
    + E(W3, "TRUST_GOV_CAN", "TRUST_GOV_PUBHEALTH", "TRUST_GOV_CLIMATE", "TRUST_GOV_IMMIGRATION",
        "TRUST_GOV_HOUSING", "TRUST_GOV_SOCMED", "TRUST_ELXNCAN", "TRUST_PS", "FEDGOV_SAT",
        "TRUST_FACET_GC_COMPETENT", "TRUST_FACET_GC_OPEN", "TRUST_FACET_GC_PUBCONCERN", "CONSPOP_G")
    + E(HABIT, "TRUST_GOOD_GOC", "TRUST_GOOD_PHAC") + E(PARCA, "D6_D")
    + P(W1, "TRUST_GOV_PROVTERR", "TRUST_GOV_MUNI")
    + P(W3, "TRUST_GOV_PROVTERR", "TRUST_GOV_MUNI", "TRUST_POLITICIANS", "TRUST_GOV_CAN_SOCEST")
    + P(HABIT, "TRUST_GOOD_PROV", "TRUST_GOOD_PROV_HEALTH", "TRUST_GOOD_LOCAL_HEALTH")
    + P(PARCA, "D6_E", "D6_F") + P(SANTE, "Q13")
    + F(W3, "FEDGOV_SERV", "FEDGOV_SERV_COUNT", "FEDGOV_METHOD", "FEDGOV_TIME")
    + F(HABIT, "SUPPORTERSC5")
)


def build_snippets() -> dict:
    corpus = load_corpus()
    snip = {(s, v): snippet(rec) for (s, v), rec in corpus.items()}
    if os.path.exists(INDEX_ONLY_SNIPPETS):
        extra = json.load(open(INDEX_ONLY_SNIPPETS, encoding="utf-8"))
        for k, text in extra.items():
            s, v = k.split("/", 1)
            if (s, v) not in snip or not snip[(s, v)]:
                snip[(s, v)] = text
    return snip


def main() -> None:
    snip = build_snippets()
    warnings = 0
    lines = []
    for qid, labels in LABELS.items():
        query, lang, note = QUERY_META[qid]
        rel = []
        seen = set()
        for survey_id, variable, grade in labels:
            key = (survey_id, variable)
            if key in seen:
                print(f"DUPLICATE {qid}: {key}", file=sys.stderr)
                continue
            seen.add(key)
            if key not in snip:
                print(f"WARNING {qid}: {key} not found", file=sys.stderr)
                warnings += 1
                text = ""
            else:
                text = snip[key]
            rel.append({"survey_id": survey_id, "variable": variable, "grade": grade,
                        "question_text": text})
        obj = {"id": qid, "query": query, "lang": lang, "note": note, "relevant": rel}
        lines.append(json.dumps(obj, ensure_ascii=False))
    with open(OUT, "w", encoding="utf-8") as f:
        f.write("\n".join(lines) + "\n")
    print(f"wrote {OUT} ({len(lines)} queries); warnings={warnings}", file=sys.stderr)


if __name__ == "__main__":
    main()
