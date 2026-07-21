"""Point d'entrée CLI du peuplement de l'index `survey-verbatims` (bead jsu.3).

Rail INDÉPENDANT du catalogue (`ingestion.run`) et des microdonnées
(`ingestion.run_microdata`) : il ne fait que LIRE les Parquet du Blob et l'index
`survey-questions`, et n'écrit que dans `survey-verbatims`. Aucun `.sav` ouvert,
aucun embedding (cf. l'en-tête de `ingestion/verbatims.py`).

Usage :
    uv run python -m ingestion.run_verbatims                        # les 5 sondages
    uv run python -m ingestion.run_verbatims --only cecd_elxn_qc_2018
"""

from __future__ import annotations

import argparse
import logging

from ingestion.verbatims import run, verbatims_client


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Peuple l'index Azure AI Search `survey-verbatims` depuis les Parquet."
    )
    parser.add_argument(
        "--only",
        metavar="SURVEY_ID",
        default=None,
        help="N'ingère que ce survey_id.",
    )
    args = parser.parse_args()

    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(name)s | %(message)s",
        datefmt="%H:%M:%S",
    )
    # Le client Azure logge chaque requête HTTP en INFO : trop verbeux.
    logging.getLogger("azure").setLevel(logging.WARNING)

    reports = run(only=args.only)

    print()
    total = 0
    for r in reports:
        total += r["n_docs"]
        print(f"  ✓ {r['survey_id']}: {r['n_docs']} verbatims")
        for stype, cov in sorted(r["sociodemo"].items()):
            print(
                f"      {stype:15s} ← {cov['variable']:12s} "
                f"résolu {cov['rate']:6.1%} ({cov['resolved_rows']} lignes)"
                + (f", {cov['unknown_codes']} code(s) inconnu(s)" if cov["unknown_codes"] else "")
            )
    print(f"\nTotal poussé : {total} documents.")
    print(f"Doc count index : {verbatims_client().get_document_count()}")


if __name__ == "__main__":
    main()
