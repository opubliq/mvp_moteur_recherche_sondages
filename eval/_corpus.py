"""Offline corpus loader for recall sweeps.

Merges `ingestion/normalized/<survey>.json` (question_text, response_options,
is_sociodemo) with `ingestion/enrichment/<survey>.py` (display_label, concepts,
themes) into one lookup keyed by (survey_id, variable).
"""

from __future__ import annotations

import glob
import importlib
import json
import os

NORM_DIR = "ingestion/normalized"


def load_corpus() -> dict[tuple[str, str], dict]:
    out: dict[tuple[str, str], dict] = {}
    for path in sorted(glob.glob(f"{NORM_DIR}/*.json")):
        survey_id = os.path.splitext(os.path.basename(path))[0]
        norm = json.load(open(path, encoding="utf-8"))
        try:
            enr = importlib.import_module(f"ingestion.enrichment.{survey_id}")
            labels = getattr(enr, "QUESTIONS", {})
        except ModuleNotFoundError:
            labels = {}
        for q in norm.get("questions", []):
            var = q["variable"]
            opts = " ".join(
                (o.get("label") or "") for o in (q.get("response_options") or [])
            )
            meta = labels.get(var, {})
            out[(survey_id, var)] = {
                "survey_id": survey_id,
                "variable": var,
                "question_text": (q.get("question_text") or "").strip(),
                "response_labels": opts.strip(),
                "display_label": (meta.get("display_label") or "").strip(),
                "concepts": meta.get("concepts") or q.get("concepts") or [],
                "themes": meta.get("themes") or q.get("themes") or [],
                "is_sociodemo": bool(q.get("is_sociodemo")),
            }
    return out


def snippet(rec: dict, limit: int = 120) -> str:
    """Readable snippet, preferring the authored display_label."""
    text = rec.get("display_label") or rec.get("question_text") or ""
    return text.replace("\n", " ")[:limit]
