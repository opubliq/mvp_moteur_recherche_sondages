#!/usr/bin/env python3
"""Agrégation des lignes [costlog] en coût CAD — médiane + p90 (bead 97r.8).

Lit un flux de logs (fichier ou stdin), en extrait les lignes `[costlog] {...}`
émises par `src/logic/costlog.ts`, les regroupe par `request_id`, applique la
price card du bead 97r.6, et sort un tableau markdown par **type d'usage**.

    uv run pricing_app/aggregate_costlog.py runs.log
    netlify dev 2>&1 | tee runs.log          # (côté serveur, cf. run_instrumented.py)

MÉDIANE + P90, JAMAIS LA MOYENNE SEULE. Le coût d'une requête agent est une
distribution, pas un scalaire : sa variance est dominée par le nombre de tours
et de `/search` enchaînés. Une moyenne écrase exactement l'information qui
compte pour dimensionner (et pour ne pas se faire surprendre par un client
« analyste »).

Stdlib uniquement — pas de dépendance à installer.
"""

from __future__ import annotations

import argparse
import json
import statistics
import sys
from collections import defaultdict
from dataclasses import dataclass, field
from pathlib import Path

COSTLOG_PREFIX = "[costlog]"

# ---------------------------------------------------------------------------
# Price card — CAD, relevé 2026-07-28 (bead 97r.6)
#
# Source de vérité : pricing_app/price_card_canadaeast_2026-07-28.md. Toute
# modification ici doit s'y refléter (et inversement) — les chiffres sont
# dupliqués pour que le script tourne seul, pas pour diverger.
# ---------------------------------------------------------------------------

PRICE_CARD_DATE = "2026-07-28"
CURRENCY = "CAD"

# CAD par token. `cached` = part du prompt servie depuis le cache (1/10 du prix).
TOKEN_PRICES: dict[str, dict[str, float]] = {
    # gpt-5-mini (GlobalStandard) — sert /annotate
    "annotate": {"input": 3.550e-7, "cached": 3.550e-8, "output": 2.8399e-6},
    # gpt-5.4-mini (GlobalStandard) — sert /decompose et la boucle agent
    "decompose": {"input": 1.0650e-6, "cached": 1.0650e-7, "output": 6.3898e-6},
    "agent_turn": {"input": 1.0650e-6, "cached": 1.0650e-7, "output": 6.3898e-6},
    # text-embedding-3-large (SKU Standard = régional) — pas d'output, pas de cache
    "embed": {"input": 2.244e-7, "cached": 2.244e-7, "output": 0.0},
}

# CAD par search unit — Cohere-rerank-v4.0-pro
RERANK_UNIT_PRICE = 3.5499e-3

# Coût fixe, hors coût marginal : AI Search Basic (0,1434 CAD/h × 730 h).
AI_SEARCH_MONTHLY = 104.68


def line_cost(rec: dict) -> float:
    """Coût CAD d'une ligne costlog isolée."""
    op = rec.get("op")
    if op == "rerank":
        return float(rec.get("units") or 0) * RERANK_UNIT_PRICE

    prices = TOKEN_PRICES.get(op)
    if not prices:
        return 0.0

    prompt = float(rec.get("prompt_tokens") or 0)
    completion = float(rec.get("completion_tokens") or 0)
    # `cached_tokens` est un SOUS-ENSEMBLE de prompt_tokens, pas un supplément.
    # Absent (≠ 0) = l'API ne l'a pas rapporté → hypothèse conservatrice : aucun
    # cache, tout au tarif plein.
    cached = float(rec.get("cached_tokens") or 0)
    cached = min(cached, prompt)

    return (
        (prompt - cached) * prices["input"]
        + cached * prices["cached"]
        + completion * prices["output"]
    )


# ---------------------------------------------------------------------------
# Regroupement par requête
# ---------------------------------------------------------------------------

COMPONENTS = ("decompose", "embed", "rerank", "agent_turn", "annotate")


@dataclass
class Request:
    """Toutes les lignes costlog partageant un `request_id`."""

    request_id: str
    client_id: str = "unknown"
    records: list[dict] = field(default_factory=list)

    @property
    def kind(self) -> str:
        """Type d'usage, déduit des ops présentes.

        L'ordre compte : une requête agent contient des `embed`/`rerank` (les
        /search qu'elle déclenche), donc `agent_turn` doit être testé en premier,
        sinon on la classerait en recherche directe.
        """
        ops = {r.get("op") for r in self.records}
        if "agent_turn" in ops:
            return "agent"
        if "annotate" in ops:
            return "annotation"
        if ops & {"embed", "rerank", "decompose"}:
            return "recherche_directe"
        return "autre"

    def cost_by_component(self) -> dict[str, float]:
        out = {c: 0.0 for c in COMPONENTS}
        for r in self.records:
            op = r.get("op")
            if op in out:
                out[op] += line_cost(r)
        return out

    @property
    def total(self) -> float:
        return sum(self.cost_by_component().values())

    # --- drivers de variance (à reporter, cf. critère d'acceptance) ---
    @property
    def n_turns(self) -> int:
        return sum(1 for r in self.records if r.get("op") == "agent_turn")

    @property
    def n_searches(self) -> int:
        """Un /search = un embed. Le rerank suit, mais l'embed est le marqueur."""
        return sum(1 for r in self.records if r.get("op") == "embed")

    @property
    def n_annotated_items(self) -> int:
        return sum(
            int((r.get("meta") or {}).get("batch_size") or 0)
            for r in self.records
            if r.get("op") == "annotate"
        )

    @property
    def latency_ms(self) -> int:
        return sum(int(r.get("latency_ms") or 0) for r in self.records)

    @property
    def has_cache_info(self) -> bool:
        return any("cached_tokens" in r for r in self.records)


def parse_stream(lines) -> list[Request]:
    by_id: dict[str, Request] = {}
    for raw in lines:
        idx = raw.find(COSTLOG_PREFIX)
        if idx == -1:
            continue
        payload = raw[idx + len(COSTLOG_PREFIX) :].strip()
        try:
            rec = json.loads(payload)
        except json.JSONDecodeError:
            # Ligne tronquée par l'entrelacement de stdout — on la saute plutôt
            # que de fausser un total en silence.
            print(f"⚠️  ligne costlog illisible, ignorée : {payload[:80]}…", file=sys.stderr)
            continue
        rid = rec.get("request_id") or "?"
        req = by_id.setdefault(rid, Request(request_id=rid))
        req.client_id = rec.get("client_id") or req.client_id
        req.records.append(rec)
    return list(by_id.values())


def _min_ts(req: Request) -> str:
    return min((r.get("ts") or "" for r in req.records), default="")


def merge_search_pairs(requests: list[Request]) -> list[Request]:
    """Recolle `/decompose` + `/search` en une requête logique (bead 97r.8).

    `/decompose` et `/search` sont deux appels HTTP distincts (le frontend les
    fait l'un après l'autre, cf. `src/api.ts`) et chacun génère son propre
    `request_id` — il n'existe aucun identifiant partagé côté serveur. Sans ce
    recollage, une recherche utilisateur apparaît comme DEUX lignes
    (`decompose` seul, puis `embed`+`rerank` seuls) et la médiane du coût par
    requête est calculée sur ce mélange de moitiés au lieu du coût réel d'une
    recherche complète.

    Heuristique : par `client_id`, on trie les `decompose`-seuls et les
    `embed`/`rerank`-seuls chronologiquement (par `ts`) puis on les apparie
    dans l'ordre (1er decompose ↔ 1er search, 2e ↔ 2e…). Valide pour du trafic
    séquentiel comme ce protocole de mesure (une requête complète avant la
    suivante) ; sur du trafic concurrent multi-utilisateur réel sous le même
    tenant, l'appariement par ordre chronologique peut se tromper de paire —
    à corriger un jour en propageant un vrai `request_id` partagé du frontend
    (`/decompose` → `/search`).
    """
    others = [r for r in requests if r.kind != "recherche_directe"]
    directe = [r for r in requests if r.kind == "recherche_directe"]

    by_client: dict[str, list[Request]] = defaultdict(list)
    for r in directe:
        by_client[r.client_id].append(r)

    merged: list[Request] = []
    for client_id, reqs in by_client.items():
        decomposes = sorted(
            (r for r in reqs if {rec.get("op") for rec in r.records} == {"decompose"}), key=_min_ts
        )
        searches = sorted(
            (r for r in reqs if {rec.get("op") for rec in r.records} & {"embed", "rerank"}), key=_min_ts
        )
        for d, s in zip(decomposes, searches):
            combined = Request(request_id=f"{d.request_id}+{s.request_id}", client_id=client_id)
            combined.records = d.records + s.records
            merged.append(combined)
        # Orphelins (nombre impair côté decompose ou search) : gardés tels quels
        # plutôt que jetés silencieusement, pour ne pas fausser le compte total.
        merged.extend(decomposes[len(searches):])
        merged.extend(searches[len(decomposes):])

    return others + merged


# ---------------------------------------------------------------------------
# Statistiques
# ---------------------------------------------------------------------------


def p90(values: list[float]) -> float:
    """90e centile, interpolé. Renvoie le max si l'échantillon est minuscule."""
    if not values:
        return 0.0
    if len(values) == 1:
        return values[0]
    ordered = sorted(values)
    pos = 0.9 * (len(ordered) - 1)
    low = int(pos)
    high = min(low + 1, len(ordered) - 1)
    return ordered[low] + (ordered[high] - ordered[low]) * (pos - low)


def median(values: list[float]) -> float:
    return statistics.median(values) if values else 0.0


def fmt(cad: float) -> str:
    """Assez de décimales pour que l'embedding ne s'affiche pas comme 0."""
    if cad == 0:
        return "0"
    if cad >= 0.01:
        return f"{cad:.4f}"
    return f"{cad:.6f}"


def summarize(label: str, kind: str, requests: list[Request]) -> str:
    if not requests:
        return f"### {label}\n\n_Aucune requête de ce type dans les logs._\n"

    totals = [r.total for r in requests]
    lines = [
        f"### {label} — n = {len(requests)}",
        "",
        f"| Composant | Médiane ({CURRENCY}) | p90 ({CURRENCY}) |",
        "|---|---:|---:|",
    ]
    for comp in COMPONENTS:
        vals = [r.cost_by_component()[comp] for r in requests]
        if not any(vals):
            continue
        lines.append(f"| {comp} | {fmt(median(vals))} | {fmt(p90(vals))} |")
    lines.append(f"| **total / requête** | **{fmt(median(totals))}** | **{fmt(p90(totals))}** |")
    lines.append("")

    # Drivers de variance — exigés par le critère d'acceptance du bead.
    turns = [r.n_turns for r in requests]
    searches = [r.n_searches for r in requests]
    lat = [r.latency_ms / 1000 for r in requests]
    drivers = [
        f"| Driver | Médiane | p90 |",
        "|---|---:|---:|",
    ]
    if any(turns):
        drivers.append(f"| tours d'agent | {median(turns):.1f} | {p90(turns):.1f} |")
    if any(searches):
        drivers.append(f"| `/search` déclenchés | {median(searches):.1f} | {p90(searches):.1f} |")
    drivers.append(f"| latence cumulée (s) | {median(lat):.1f} | {p90(lat):.1f} |")
    if len(drivers) > 2:
        lines.extend(drivers)
        lines.append("")

    if kind == "annotation":
        items = sum(r.n_annotated_items for r in requests)
        if items:
            cost_per_item = sum(totals) / items
            lines.append(f"**Coût par item annoté** : {fmt(cost_per_item)} {CURRENCY} "
                         f"({items} items sur {len(requests)} batchs).")
            lines.append("")

    ratio = (p90(totals) / median(totals)) if median(totals) else 0
    if ratio:
        lines.append(f"Rapport p90/médiane : **×{ratio:.1f}**.")
        lines.append("")

    return "\n".join(lines)


def report(requests: list[Request]) -> str:
    by_kind: dict[str, list[Request]] = defaultdict(list)
    for r in requests:
        by_kind[r.kind].append(r)

    n_cache = sum(1 for r in requests if r.has_cache_info)

    out = [
        "# Coût marginal mesuré — médiane & p90 (bead 97r.8)",
        "",
        f"Price card : `price_card_canadaeast_{PRICE_CARD_DATE}.md` — tous les montants en **{CURRENCY}**.",
        f"Requêtes agrégées : **{len(requests)}** ({', '.join(f'{k}: {len(v)}' for k, v in sorted(by_kind.items()))}).",
        "",
    ]

    for kind, label in (
        ("recherche_directe", "Recherche directe"),
        ("agent", "Requête agent"),
        ("annotation", "Annotation"),
    ):
        out.append(summarize(label, kind, by_kind.get(kind, [])))

    if by_kind.get("autre"):
        out.append(f"_{len(by_kind['autre'])} requête(s) non classées (ops inattendues)._\n")

    out.extend(
        [
            "## Notes de lecture",
            "",
            f"- **Cache de prompt** : {n_cache}/{len(requests)} requêtes portent `cached_tokens`. "
            "Absent = l'API ne l'a pas rapporté → facturé au tarif plein (hypothèse conservatrice).",
            f"- **Hors coût marginal** : AI Search Basic, {AI_SEARCH_MONTHLY} {CURRENCY}/mois, "
            "coût fixe par palier — à ne pas diviser par le nombre de requêtes.",
            "- Le p90 est le chiffre à retenir pour dimensionner ; la médiane décrit le cas courant.",
            "",
        ]
    )
    return "\n".join(out)


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("logfile", nargs="?", help="fichier de logs (défaut : stdin)")
    ap.add_argument("-o", "--output", help="écrire le rapport markdown dans ce fichier")
    ap.add_argument("--client", help="ne garder que ce client_id")
    ap.add_argument("--csv", help="exporter le détail par requête en CSV")
    args = ap.parse_args()

    stream = Path(args.logfile).open(encoding="utf-8", errors="replace") if args.logfile else sys.stdin
    with stream as fh:
        requests = parse_stream(fh)
    requests = merge_search_pairs(requests)

    if args.client:
        requests = [r for r in requests if r.client_id == args.client]

    if not requests:
        print("Aucune ligne [costlog] trouvée.", file=sys.stderr)
        return 1

    if args.csv:
        import csv

        with Path(args.csv).open("w", newline="", encoding="utf-8") as fh:
            w = csv.writer(fh)
            w.writerow(["request_id", "client_id", "kind", *COMPONENTS, "total_cad",
                        "n_turns", "n_searches", "latency_ms"])
            for r in sorted(requests, key=lambda x: -x.total):
                c = r.cost_by_component()
                w.writerow([r.request_id, r.client_id, r.kind,
                            *[f"{c[k]:.8f}" for k in COMPONENTS],
                            f"{r.total:.8f}", r.n_turns, r.n_searches, r.latency_ms])
        print(f"CSV écrit : {args.csv}", file=sys.stderr)

    md = report(requests)
    if args.output:
        Path(args.output).write_text(md, encoding="utf-8")
        print(f"Rapport écrit : {args.output}", file=sys.stderr)
    else:
        print(md)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
