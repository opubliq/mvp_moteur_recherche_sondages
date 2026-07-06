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

from ingestion.models import Question, Survey, SurveyFile


def embed_text(question: Question) -> str:
    """Retourne le texte à embedder pour le vecteur QUESTION (`content_vector`).

    Question-dominant, sans contexte de sondage (celui-ci vit dans un vecteur
    séparé `survey_vector`, cf. `survey_embed_text`). Assemble, séparés par des
    sauts de ligne :
        question_text     (wording verbatim — ancre)
        display_label     (titre lisible, si présent)
        labels des choix de réponse
        concepts          (mots-clés, si présents)

    Le calcul d'embedding est délégué à l'orchestrateur ; aucun appel réseau ici.
    """
    parts = [question.question_text]
    if question.display_label:
        parts.append(question.display_label)
    for opt in question.response_options:
        parts.append(opt.label)
    if question.concepts:
        parts.append(", ".join(question.concepts))
    return "\n".join(parts)


def survey_embed_text(survey: Survey) -> str:
    """Retourne le texte à embedder pour le vecteur SONDAGE (`survey_vector`).

    Contexte de niveau sondage (identique pour toutes ses questions) : nom +
    description. Ce vecteur, dénormalisé sur chaque question, est interrogé à la
    recherche avec un poids MOINDRE que `content_vector` (cf. netlify/search.ts)
    → il oriente vers les sondages thématiquement pertinents sans écraser le
    signal propre à la question.
    """
    text = survey.survey_name
    if survey.survey_description:
        text = f"{text} — {survey.survey_description}"
    return text


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
        "survey_description": survey.survey_description,
        "survey_year": survey.year,
        "survey_month": survey.survey_month,
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
            "display_label": question.display_label,
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
            "survey_month": survey.survey_month,
            "pollster": survey.pollster,
            "language": survey.language,
            "n_respondents": survey.n_respondents,
            "tags": survey.tags,
            # content_vector intentionnellement absent :
            # l'orchestrateur le calcule et l'injecte.
        }
        docs.append(child_doc)

    return docs
