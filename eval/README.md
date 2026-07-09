# Golden evaluation dataset (`golden.jsonl`)

Hand-labeled ground truth for the survey-question search engine. 15 realistic
queries, each with a near-complete set of relevant survey questions and a
relevance grade. Used to measure the engine's Exact / Partiel / Faible scoring
against an independent human judgment — both precision (are the engine's hits
truly relevant?) and **recall** (does it miss truly-relevant items?).

## Grading rubric (3 grades + exclude)

Judged **independently of any score the engine assigns**:

- **exact** — the question's PRIMARY subject *is* the query concept.
- **partiel** — covers a facet / a related dimension of the concept.
- **faible** — tangentially touches it: shares the theme but is really about
  something adjacent; marginally useful to a searcher, not "about" the query.
- **exclude** (absent from `relevant`) — shares only vocabulary, genuinely
  different topic → presumed Hors-sujet. The adversarial exclusions (q01
  vote-intention, q04 party-choice, etc.) live here on purpose.

Sociodemographic items (age, region, income, language, year-of-immigration…)
are excluded unless the query is literally sociodemographic.

The `faible` tier exists so the harness can credit the engine for correctly
placing a tangential item in its Faible tier instead of penalizing it as a
false Hors-sujet — and so recall is measurable across all three tiers.

## Pooling method (how the relevant sets were built)

The corpus is small (12 surveys, ~3083 non-sociodemo questions) and topically
siloed. A top-40 retrieval pool is too thin to measure recall (a relevant item
ranked 41+ would never be judged). So per query we judged the **deduped union
(by survey_id+variable)** of these sources — TREC-style pooling:

1. **Hybrid** top-100 (BM25 + vector).
2. **Vector-only** top-100.
3. **BM25-only** top-100.
4. **Bilingual variants**: sources 1–3 run in BOTH a FR and an EN phrasing and
   pooled (a FR query underranks the EN-only surveys — govcan / HABIT / PARCA —
   and vice-versa).
5. **Theme-keyword regex sweep** over the whole corpus (`ingestion/normalized/*`
   question_text + response-option labels + authored display_label).
6. **Full sweep of the on-topic survey(s)**: every non-sociodemo question of the
   1–3 surveys whose subject matches the query was judged, not only the retrieved
   ones. This is the strongest recall guarantee.

Everything in the union not judged relevant is presumed Hors-sujet (standard
pooling assumption). Pool sizes ranged ~230–800 candidates per query.

### Full-swept survey(s) per query
| query | fully swept survey(s) |
|-------|-----------------------|
| q01, q02 | eeq_2014, cecd_elxn_can_2011 |
| q03, q04 | QC election panels (cecd_elxn_qc_1998/2007/2012, charte_2013, elxn_can_2011) |
| q05, q15 | govcan_06822 wave1/2/3 |
| q06, q07 | cecd_charte_2013_10, eeq_2014 |
| q08 | govcan_06822 wave1/2/3, eeq_2014 |
| q09 | cecd_sante_can_usa |
| q12 | QC election panels, eeq_2014 |
| q13 | eeq_2014, cecd_sante_can_usa |
| q10, q11, q14 | none — no single on-topic survey; relied on keyword sweep (see notes) |

Notes / caveats:
- **`cecd_elxn_qc_2018`** is in the index but has no `ingestion/normalized/*`
  file, so it could not be full-swept offline — it was pooled via search only
  (its snippets come from `_snippets_index_only.json`).
- **q10 (santé mentale)**: `govcan_habit_2024` IS a mental-health survey, but its
  MH battery is normalized into ~200 binary indicator variables (each
  multi-select option becomes its own `…C1/C2/…` doc). The golden set lists the
  **canonical labeled representative** of each MH question, not every binary
  split, to keep the ground truth meaningful. Same collapsing applies to the
  govcan trust/immigration batteries (q05/q08/q15).
- **q11 / q14 (housing)**: pooling CONFIRMED there is no dedicated housing
  survey — only a handful of scattered items exist. This is a real negative
  result (thin corpus), not a labeling gap.

## Files
- `fetch_candidates.py` — search helper; `mode` = hybrid | vector | bm25.
- `_corpus.py` — offline corpus loader (normalized + enrichment display_labels).
- `_sweep.py` — CLI keyword sweep over the corpus (source 5).
- `_pool.py` — pooling driver (sources 1–6) → regenerates the candidate pool.
- `_build_golden.py` — holds the hand-graded `(survey_id, variable, grade)`
  label tables and assembles `golden.jsonl`. Reproducible & auditable.
- `_snippets_index_only.json` — cached snippets for index-only survey items
  (cecd_elxn_qc_2018) that have no normalized file.
- `_pool_provenance.json` — for each golden item: which sources found it, its
  hybrid-primary rank, and whether it was inside the original hybrid top-40
  (the false-negative accounting).
- `golden.jsonl` — the deliverable.

Regenerate: `uv run python eval/_pool.py && uv run python eval/_build_golden.py`.

## Per-query counts by grade

| id  | query | exact | partiel | faible | total | outside top-40 |
|-----|-------|------:|--------:|-------:|------:|---------------:|
| q01 | soutien au fédéralisme canadien | 4 | 8 | 4 | 16 | 4 |
| q02 | souveraineté et indépendance du Québec | 13 | 10 | 10 | 33 | 5 |
| q03 | intentions de vote provinciales | 19 | 1 | 5 | 25 | 8 |
| q04 | participation électorale | 8 | 9 | 6 | 23 | 7 |
| q05 | confiance envers le gouvernement fédéral | 37 | 13 | 6 | 56 | 44 |
| q06 | charte des valeurs et laïcité | 4 | 1 | 1 | 6 | 1 |
| q07 | accommodements raisonnables et signes religieux | 0 | 6 | 4 | 10 | 2 |
| q08 | immigration | 9 | 20 | 10 | 39 | 9 |
| q09 | système de santé public ou privé | 22 | 27 | 9 | 58 | 21 |
| q10 | santé mentale | 29 | 5 | 5 | 39 | 29 |
| q11 | accès au logement et abordabilité | 2 | 5 | 4 | 11 | 5 |
| q12 | enjeux les plus importants de la campagne | 2 | 1 | 4 | 7 | 4 |
| q13 | identification partisane gauche-droite | 8 | 8 | 8 | 24 | 7 |
| q14 | housing affordability (en) | 2 | 5 | 4 | 11 | 6 |
| q15 | trust in government services (en) | 35 | 12 | 5 | 52 | 38 |
| **all** | | **194** | **131** | **85** | **410** | **190 (46%)** |

**"outside top-40"** = relevant items that were NOT in the original hybrid
top-40 retrieval pool — i.e. false negatives the pooling recovered. 46% of all
relevant items would have been missed by the original approach; the recall
metric is meaningless without them.

## Recall recovery — concrete false-negatives (would have been missed)

- **q05 / q15 (trust)**: only ~15 trust items surfaced in the original FR
  top-40; the full sweep of the three govcan_06822 waves + the EN variant added
  ~40 more, e.g. `wave2/TRUST_GOV_CAN` ("Current trust in the federal
  government"), `wave2/TRUST_GOV_PAST`, and the whole `TRUST_FACET_GC_*` battery
  (`wave1/TRUST_FACET_GC_FLIPFLOP` was found **only** by the survey sweep).
- **q10 (santé mentale)**: 29 of 39 relevant items were outside the FR top-40 —
  the FR query badly underranks the EN HABIT survey. `MENTAL_FAMILY_DIAGNOSIS`
  and `QUALITY_MHP` were recovered **only by the keyword grep** (no search mode
  ranked them in-pool); `SERVICE_MH_BARRIERS` came from the EN variant.
- **q09 (santé)**: the full sweep of cecd_sante_can_usa added core public/private
  items the top-40 missed, e.g. `Q47` ("which system is more efficient"),
  `Q48` ("which is fairer"), `Q58` ("a two-tier system would hurt Canadian
  families").
- **q07 (accommodements)**: `habit/DISCRIMINATION_REASONSC5` (treated unfairly
  due to religion) and `wave2/SOCMED_DEM_ACCEPTING` (tolerance of ethnic/
  religious groups) — both absent from the top-40, recovered by grep + EN
  variant, graded `faible`.

## Adversarial exclusions (the bug this set measures)

Still enforced under the 3-grade scale — these stay EXCLUDED, not demoted to
faible:
- **q01 (fédéralisme)** excludes `cecd_elxn_can_2011/fede1`/`fede2` (federal vote
  intention), `z2` (turnout), `sastf` (satisfaction) — the reported bug.
- **q05 (confiance)** excludes `you3` (intensité du fédéralisme → q01), `fede1`,
  and all interpersonal / media / science trust (`SOC_TRUST_*`, `TRUSTSCIENTISTS`,
  `TRUST_MEDIA`).
- **q04 (turnout)** excludes party-choice items (`voteprov`, `eeq/Q3`).
- **q03** excludes federal vote intention (`fede1`) and referendum vote.
