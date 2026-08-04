"""Table de routage sondage → client, pour l'auto-routage à l'ingestion.

Un `survey_id` absent de `PRIVATE_SURVEYS` va dans l'index public. Un
`survey_id` présent va EXCLUSIVEMENT dans l'index de son client (jamais dans le
public) — cf. `docs/multi_tenant_design.md`. Convention de nommage :
`{base_index_name}-{client_slug}` (ex. `survey-questions-opubliq`,
`survey-verbatims-opubliq`).

`ingestion.run` et `ingestion.run_verbatims`/`ingestion.verbatims` groupent les
sondages découverts par index cible via `index_name_for()` et poussent chaque
groupe vers son propre index, en une seule invocation — pas besoin de relancer
la commande par client.
"""

from __future__ import annotations

PRIVATE_SURVEYS: dict[str, str] = {
    "medaillon_organismes_qualitatif": "opubliq",
}


def index_name_for(survey_id: str, base_index_name: str) -> str:
    """Nom de l'index Azure AI Search cible pour ce sondage."""
    client = PRIVATE_SURVEYS.get(survey_id)
    return f"{base_index_name}-{client}" if client else base_index_name
