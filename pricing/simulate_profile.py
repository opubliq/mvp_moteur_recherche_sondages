#!/usr/bin/env python3
"""Simule le coût marginal mensuel d'un profil client (bead 97r.9).

Prend un profil de volumes (n_recherches, n_requêtes_agent, n_items_annotés)
et le multiplie par les coûts unitaires mesurés (bead 97r.8, médiane + p90).
Ne mesure rien : consomme les chiffres déjà agrégés dans
`cout_mesure_2026-08-01.md`, dupliqués ici pour que le script tourne seul
(source de vérité = le fichier mesuré, cf. `aggregate_costlog.py`).

    uv run pricing_app/simulate_profile.py --profile analyste
    uv run pricing_app/simulate_profile.py --n-recherches 100 --n-agent 300 --n-annot 200

Voir `modele_parametrique_97r9.md` pour la formule, les 4 profils et les
seuils de capacité (TPM, index AI Search).
"""

from __future__ import annotations

import argparse

# Coûts unitaires CAD — cout_mesure_2026-08-01.md (bead 97r.8)
COST_SEARCH = {"median": 0.008250, "p90": 0.008656}   # par /search (decompose+embed+rerank)
COST_AGENT = {"median": 0.008883, "p90": 0.026100}    # par requête agent (tous tours + /search internes)
COST_ITEM_ANNOTATE = {"median": 0.000035, "p90": 0.000035}  # par item annoté (n=2 batchs seulement)

PROFILES = {
    "leger": {"n_recherches": 500, "n_agent": 20, "n_annot": 0},
    "analyste": {"n_recherches": 100, "n_agent": 300, "n_annot": 200},
    "annotation_lourd": {"n_recherches": 50, "n_agent": 20, "n_annot": 5000},
    "equilibre": {"n_recherches": 300, "n_agent": 100, "n_annot": 1000},
}


def simulate(n_recherches: int, n_agent: int, n_annot: int) -> dict[str, float]:
    median = (
        n_recherches * COST_SEARCH["median"]
        + n_agent * COST_AGENT["median"]
        + n_annot * COST_ITEM_ANNOTATE["median"]
    )
    p90 = (
        n_recherches * COST_SEARCH["p90"]
        + n_agent * COST_AGENT["p90"]
        + n_annot * COST_ITEM_ANNOTATE["p90"]
    )
    return {"median": median, "p90": p90}


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--profile", choices=sorted(PROFILES), help="profil prédéfini")
    parser.add_argument("--n-recherches", type=int, help="nb de recherches directes / mois")
    parser.add_argument("--n-agent", type=int, help="nb de requêtes agent / mois")
    parser.add_argument("--n-annot", type=int, help="nb d'items annotés / mois")
    args = parser.parse_args()

    if args.profile:
        vols = PROFILES[args.profile]
        label = args.profile
    elif args.n_recherches is not None and args.n_agent is not None and args.n_annot is not None:
        vols = {"n_recherches": args.n_recherches, "n_agent": args.n_agent, "n_annot": args.n_annot}
        label = "custom"
    else:
        parser.error("préciser --profile OU --n-recherches/--n-agent/--n-annot ensemble")
        return

    cost = simulate(vols["n_recherches"], vols["n_agent"], vols["n_annot"])
    print(f"Profil : {label}")
    print(f"  recherches directes : {vols['n_recherches']}/mois")
    print(f"  requêtes agent      : {vols['n_agent']}/mois")
    print(f"  items annotés       : {vols['n_annot']}/mois")
    print(f"  coût marginal médian : {cost['median']:.4f} CAD/mois")
    print(f"  coût marginal p90    : {cost['p90']:.4f} CAD/mois")


if __name__ == "__main__":
    main()
