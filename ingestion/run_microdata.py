"""Point d'entrée CLI du rail microdonnées (v33.3).

Rail PARALLÈLE et INDÉPENDANT du rail catalogue (`ingestion.run`). Lit les
données brutes d'un sondage et écrit un Parquet répondant-niveau dans le Blob
Azure `survey-responses`, puis met à jour `_manifest.json`. Idempotent.

Usage :
    # un sondage
    uv run python -m ingestion.run_microdata eeq_2014

    # plusieurs
    uv run python -m ingestion.run_microdata eeq_2014 govcan_habit_2024

    # backfill : tous les sondages ayant des données locales
    uv run python -m ingestion.run_microdata --all
"""

from __future__ import annotations

import argparse
import logging

from ingestion.microdata import (
    container_client,
    discover_survey_ids,
    process_survey,
)


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Ingestion Parquet microdonnées répondant → Azure Blob (rail séparé)."
    )
    parser.add_argument(
        "survey_ids",
        nargs="*",
        metavar="SURVEY_ID",
        help="Un ou plusieurs survey_id à traiter.",
    )
    parser.add_argument(
        "--all",
        action="store_true",
        help="Traite tous les sondages ayant un dossier data/ local (backfill).",
    )
    args = parser.parse_args()

    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(name)s | %(message)s",
        datefmt="%H:%M:%S",
    )
    logging.getLogger("azure").setLevel(logging.WARNING)
    logger = logging.getLogger("ingestion.run_microdata")

    if args.all:
        survey_ids = discover_survey_ids()
    else:
        survey_ids = args.survey_ids

    if not survey_ids:
        raise SystemExit(
            "Aucun sondage précisé. Donner un ou plusieurs survey_id, ou --all.\n"
            f"Disponibles : {', '.join(discover_survey_ids())}"
        )

    container = container_client()
    logger.info("Sondages à traiter : %s", ", ".join(survey_ids))

    ok, failed = 0, []
    for sid in survey_ids:
        try:
            entry = process_survey(sid, container=container)
            ok += 1
            print(
                f"  ✓ {sid}: {entry['n_respondents']} répondants, "
                f"{entry['n_vars']} vars, weight_source={entry['weight_source']}"
            )
        except Exception as exc:  # noqa: BLE001 — on continue le batch, on remonte à la fin
            failed.append((sid, exc))
            logger.error("[%s] ÉCHEC : %s", sid, exc)

    print(f"\nTerminé : {ok} sondage(s) OK, {len(failed)} en échec.")
    if failed:
        for sid, exc in failed:
            print(f"  ✗ {sid}: {exc}")
        raise SystemExit(1)


if __name__ == "__main__":
    main()
