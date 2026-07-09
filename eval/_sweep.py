"""Corpus-wide keyword sweep for recall (finds relevant items retrieval ranks low).

Usage:
    uv run python eval/_sweep.py "laic|religieu|accommod|voile|signe religieux"
Matches the regex (case-insensitive, accent-insensitive) against
question_text + response labels + display_label across ALL surveys.
"""

from __future__ import annotations

import re
import sys
import unicodedata

from _corpus import load_corpus


def deaccent(s: str) -> str:
    return "".join(
        c for c in unicodedata.normalize("NFD", s) if unicodedata.category(c) != "Mn"
    )


def main() -> None:
    pattern = sys.argv[1]
    rx = re.compile(deaccent(pattern), re.IGNORECASE)
    corpus = load_corpus()
    hits = []
    for key, rec in corpus.items():
        hay = deaccent(
            " ".join([rec["question_text"], rec["response_labels"], rec["display_label"]])
        )
        if rx.search(hay):
            hits.append(rec)
    for rec in hits:
        socio = "SOCIO" if rec["is_sociodemo"] else ""
        print(f"[{rec['survey_id']}/{rec['variable']}] {socio}")
        print(f"   LBL: {rec['display_label'][:110]}")
        print(f"   QT : {rec['question_text'][:100]}")
    print(f"\n{len(hits)} hits for /{pattern}/", file=sys.stderr)


if __name__ == "__main__":
    main()
