"""TREC-style pooling driver for building near-complete relevant sets.

Per query the candidate pool is the deduped union (by survey_id+variable) of:
  1. Hybrid top-100      (BM25 + vector)      -- FR and EN variant
  2. Vector-only top-100                       -- FR and EN variant
  3. BM25-only top-100                         -- FR and EN variant
  4. Full sweep of the on-topic survey(s): every non-sociodemo question.
  5. Theme-keyword regex sweep across the whole corpus (optional per query).

Provenance is recorded per item so we can tell which items would have been
MISSED by the original hybrid top-40 (the recall the pooling recovers).

Writes:
  eval/_pool.json          machine-readable pool + provenance
  eval/_pool/<qid>.txt     human-readable pool for judging
"""

from __future__ import annotations

import json
import os
import re
import sys
import unicodedata

from fetch_candidates import fetch_candidates

from _corpus import load_corpus, snippet

TOPK = 100
PRIMARY_TOP40 = 40  # "original hybrid top-40" baseline for false-negative accounting

# qid -> (fr_query, en_query, primary_lang, [full-sweep survey_ids], grep_regex or None)
QUERIES = {
    "q01": ("soutien au fédéralisme canadien",
            "support for Canadian federalism, attachment to Canada, Quebec staying in Canada",
            "fr", ["eeq_2014", "cecd_elxn_can_2011"], r"federalis|attachement au canada|fedie|autonomis"),
    "q02": ("souveraineté et indépendance du Québec",
            "Quebec sovereignty and independence referendum, separation",
            "fr", ["eeq_2014", "cecd_elxn_can_2011"], r"souverain|independan|indépendan|referendum|référendum|separ|séparat"),
    "q03": ("intentions de vote provinciales",
            "provincial vote intention, which party would you vote for in a provincial election",
            "fr", ["cecd_elxn_qc_1998", "cecd_elxn_qc_2007", "cecd_elxn_qc_2012", "cecd_charte_2013_10", "cecd_elxn_can_2011"],
            r"intention de vote|voteriez|pour quel parti|elections provinciales|élections provinciales"),
    "q04": ("participation électorale, avez-vous voté",
            "voter turnout, did you vote, abstention, likelihood of voting",
            "fr", ["cecd_elxn_qc_1998", "cecd_elxn_qc_2007", "cecd_elxn_qc_2012", "cecd_elxn_can_2011"],
            r"alle.? voter|avez-vous voté|participation|abstention|aller voter|turnout|devoir de voter"),
    "q05": ("confiance envers le gouvernement fédéral",
            "trust in the federal government, Government of Canada",
            "fr", ["govcan_06822_wave1_2024", "govcan_06822_wave2_2024", "govcan_06822_wave3_2024"],
            r"confiance|trust|satisfa.*gouvern|gouvernement fédéral"),
    "q06": ("charte des valeurs et laïcité",
            "Quebec charter of values, secularism law",
            "fr", ["cecd_charte_2013_10", "eeq_2014"], r"charte|laic|laïc|valeurs quebec"),
    "q07": ("accommodements raisonnables et signes religieux",
            "reasonable accommodation, religious symbols, freedom of religion, discrimination based on religion",
            "fr", ["eeq_2014", "cecd_charte_2013_10"],
            r"accommod|signe religieu|religieu|laic|laïc|religion|discrimin|tolera|diversit"),
    "q08": ("immigration",
            "immigration, immigrants, refugees, newcomers",
            "fr", ["govcan_06822_wave1_2024", "govcan_06822_wave2_2024", "govcan_06822_wave3_2024", "eeq_2014"],
            r"immigr|migra|refugee|réfugié|newcomer|nouveaux arrivants"),
    "q09": ("système de santé public ou privé",
            "public versus private health care system, government insurance",
            "fr", ["cecd_sante_can_usa"], r"health care|système de santé|public|privé|private|insurance|assurance"),
    "q10": ("santé mentale",
            "mental health, psychological wellbeing",
            "fr", [], r"mental health|santé mentale|\bmental\b|\bMH_|psycholog|depress|anxi|wellbeing|well-being|suicid"),
    "q11": ("accès au logement et abordabilité",
            "housing access and affordability, cost of housing, rent, mortgage",
            "fr", [],
            r"housing|logement|afford.*hous|hous.*afford|\brent\b|mortgage|hypothèque|loyer|living quarter|propriétaire|residence principale"),
    "q12": ("enjeux les plus importants de la campagne",
            "most important issue in the election campaign, issue salience",
            "fr", ["cecd_elxn_qc_1998", "cecd_elxn_qc_2007", "cecd_elxn_qc_2012", "eeq_2014"],
            r"enjeu|issue|plus important|priorité"),
    "q13": ("identification partisane gauche-droite",
            "party identification, left-right ideological self-placement",
            "fr", ["eeq_2014", "cecd_sante_can_usa"],
            r"gauche.?droite|left.?right|liberal or conservative|partisan|identifi.*part|axe gauche"),
    "q14": ("housing affordability",
            "abordabilité et accès au logement",
            "en", [],
            r"housing|logement|afford.*hous|hous.*afford|\brent\b|mortgage|loyer|living quarter|propriétaire|residence principale"),
    "q15": ("trust in government services",
            "confiance envers les services gouvernementaux et le gouvernement",
            "en", ["govcan_06822_wave1_2024", "govcan_06822_wave2_2024", "govcan_06822_wave3_2024"],
            r"trust|confiance|government service|public servant|federal government"),
}


def deaccent(s: str) -> str:
    return "".join(c for c in unicodedata.normalize("NFD", s) if unicodedata.category(c) != "Mn")


def main() -> None:
    corpus = load_corpus()
    pool: dict[str, dict] = {}

    for qid, (fr_q, en_q, primary, sweep_surveys, grep) in QUERIES.items():
        print(f"pooling {qid}", file=sys.stderr)
        prov: dict[tuple[str, str], set[str]] = {}
        hybrid_primary_rank: dict[tuple[str, str], int] = {}

        variants = [("fr", fr_q), ("en", en_q)]
        for lang, q in variants:
            for mode in ("hybrid", "vector", "bm25"):
                res = fetch_candidates(q, top=TOPK, k=TOPK, mode=mode)
                for rank, c in enumerate(res):
                    key = (c["survey_id"], c["variable"])
                    prov.setdefault(key, set()).add(f"{mode}_{lang}")
                    if lang == primary and mode == "hybrid":
                        hybrid_primary_rank.setdefault(key, rank + 1)

        # source 4: full sweep of on-topic surveys (non-sociodemo)
        for (sid, var), rec in corpus.items():
            if sid in sweep_surveys and not rec["is_sociodemo"]:
                prov.setdefault((sid, var), set()).add(f"sweep:{sid}")

        # source 5: theme-keyword regex over whole corpus
        if grep:
            rx = re.compile(deaccent(grep), re.IGNORECASE)
            for (sid, var), rec in corpus.items():
                hay = deaccent(" ".join([rec["question_text"], rec["response_labels"], rec["display_label"]]))
                if rx.search(hay):
                    prov.setdefault((sid, var), set()).add("grep")

        # assemble
        items = []
        for key in sorted(prov):
            sid, var = key
            rec = corpus.get(key)
            sources = sorted(prov[key])
            in_top40 = key in hybrid_primary_rank and hybrid_primary_rank[key] <= PRIMARY_TOP40
            item = {
                "survey_id": sid,
                "variable": var,
                "sources": sources,
                "hybrid_primary_rank": hybrid_primary_rank.get(key),
                "in_original_top40": in_top40,
                "in_corpus": rec is not None,
                "is_sociodemo": rec["is_sociodemo"] if rec else None,
                "display_label": rec["display_label"] if rec else "",
                "question_text": rec["question_text"] if rec else "",
                "response_labels": rec["response_labels"][:160] if rec else "",
                "concepts": rec["concepts"] if rec else [],
                "snippet": snippet(rec) if rec else "",
            }
            items.append(item)
        pool[qid] = {"fr": fr_q, "en": en_q, "primary": primary,
                     "sweep_surveys": sweep_surveys, "n_pool": len(items), "items": items}
        print(f"  {qid}: pool={len(items)}", file=sys.stderr)

    json.dump(pool, open("eval/_pool.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)

    os.makedirs("eval/_pool", exist_ok=True)
    for qid, info in pool.items():
        # Judging shortlist: items that hit a theme grep OR belong to a fully
        # swept on-topic survey. Pure vector/bm25 noise (no keyword, off-topic
        # survey) is dropped from the view but kept in _pool.json.
        shown = [
            it for it in info["items"]
            if not it["is_sociodemo"]
            and ("grep" in it["sources"] or any(s.startswith("sweep:") for s in it["sources"]))
        ]
        lines = [f"===== {qid} fr='{info['fr']}' en='{info['en']}' "
                 f"(pool={info['n_pool']} shortlist={len(shown)}) ====="]
        for it in shown:
            fn = "" if it["in_original_top40"] else "  <NEW>"
            src = ",".join(it["sources"])
            lines.append(f"[{it['survey_id']}/{it['variable']}]{fn} src={src} r={it['hybrid_primary_rank']}")
            lines.append(f"   LBL: {it['display_label'][:110]}")
            lines.append(f"   QT : {it['question_text'][:95]}")
            if it["response_labels"]:
                lines.append(f"   OPT: {it['response_labels'][:80]}")
        open(f"eval/_pool/{qid}.txt", "w", encoding="utf-8").write("\n".join(lines))
    print("wrote eval/_pool.json + eval/_pool/*.txt", file=sys.stderr)


if __name__ == "__main__":
    main()
