"""Mapping : SurveyFile normalisé → documents Azure AI Search (parent-child).

Chaque appel à `build_docs` retourne une liste plate de dicts prêts à
indexer : un doc parent (doc_type="survey") suivi d'un doc child par question
(doc_type="question"). Le champ `content_vector` N'est PAS calculé ici —
l'orchestrateur d'ingestion le remplit après avoir appelé l'API d'embeddings.

`embed_text(question)` expose le texte à embedder pour une question :
    question_text + "\n" + labels des response_options (un par ligne).
"""

from __future__ import annotations

from typing import Any

from ingestion.models import Question, SurveyFile


def embed_text(question: Question) -> str:
    """Retourne le texte à embedder pour une question.

    Concatène question_text et les libellés des choix de réponse,
    séparés par des sauts de ligne.  Le calcul d'embedding est délégué
    à l'orchestrateur ; cette fonction ne fait aucun appel réseau.
    """
    parts = [question.question_text]
    for opt in question.response_options:
        parts.append(opt.label)
    return "\n".join(parts)


def build_docs(survey_file: SurveyFile) -> list[dict[str, Any]]:
    """Convertit un SurveyFile validé en liste de docs Azure AI Search.

    Retour :
        [parent_doc, child_doc_1, child_doc_2, ...]

    Le doc parent porte doc_type="survey".
    Chaque child porte doc_type="question", parent_id=survey_id,
    et les métadonnées du sondage dénormalisées pour les filtres.
    Le champ content_vector est absent (l'orchestrateur le remplira).
    """
    survey = survey_file.survey

    # --- doc parent ---
    parent_doc: dict[str, Any] = {
        "id": survey.survey_id,
        "doc_type": "survey",
        "survey_id": survey.survey_id,
        "survey_name": survey.survey_name,
        "survey_year": survey.year,
        "pollster": survey.pollster,
        "language": survey.language,
        "n_respondents": survey.n_respondents,
        "raw_data_file": survey.raw_data_file,
        "tags": survey.tags,
    }

    docs: list[dict[str, Any]] = [parent_doc]

    # --- docs child (un par question) ---
    for question in survey_file.questions:
        child_doc: dict[str, Any] = {
            # Identifiant unique : survey_id + __ + variable
            "id": f"{survey.survey_id}__{question.variable}",
            "doc_type": "question",
            "parent_id": survey.survey_id,
            # Champ de recherche principal
            "variable": question.variable,
            "question_text": question.question_text,
            "response_options": [
                {"code": str(opt.code), "label": opt.label} for opt in question.response_options
            ],
            "var_type": question.var_type,
            "is_sociodemo": question.is_sociodemo,
            "sociodemo_type": question.sociodemo_type,
            "concepts": question.concepts,
            "themes": question.themes,
            # Métadonnées sondage dénormalisées (pour filtres sans JOIN)
            "survey_id": survey.survey_id,
            "survey_name": survey.survey_name,
            "survey_year": survey.year,
            "pollster": survey.pollster,
            "language": survey.language,
            "n_respondents": survey.n_respondents,
            "tags": survey.tags,
            # content_vector intentionnellement absent :
            # l'orchestrateur le calcule et l'injecte.
        }
        docs.append(child_doc)

    return docs
