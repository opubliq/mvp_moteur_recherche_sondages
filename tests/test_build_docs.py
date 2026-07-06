"""Tests : modèles Pydantic + build_docs + embed_text."""

import pytest
from pydantic import ValidationError

from ingestion.build_docs import build_docs, embed_text, survey_embed_text
from ingestion.models import Question, Survey, SurveyFile

# ---------------------------------------------------------------------------
# Fixture : exemple de sondage minimal mais complet
# ---------------------------------------------------------------------------

SURVEY_DICT = {
    "survey": {
        "survey_id": "CROP2023_CONF",
        "survey_name": "Confiance envers les institutions 2023",
        "year": 2023,
        "pollster": "CROP",
        "language": "fr",
        "n_respondents": 1500,
        "raw_data_file": "data/CROP2023/crop2023.sav",
        "tags": ["confiance", "institutions"],
    },
    "questions": [
        {
            "variable": "Q1",
            "question_text": "Avez-vous confiance envers le gouvernement fédéral?",
            "response_options": [
                {"code": 1, "label": "Tout à fait confiance"},
                {"code": 2, "label": "Plutôt confiance"},
                {"code": 3, "label": "Plutôt pas confiance"},
                {"code": 4, "label": "Pas du tout confiance"},
            ],
            "var_type": "single",
            "is_sociodemo": False,
            "concepts": ["confiance", "gouvernement"],
            "themes": ["démocratie"],
        },
        {
            "variable": "D_AGE",
            "question_text": "Quel est votre groupe d'âge?",
            "response_options": [
                {"code": 1, "label": "18-34 ans"},
                {"code": 2, "label": "35-54 ans"},
                {"code": 3, "label": "55 ans et plus"},
            ],
            "var_type": "single",
            "is_sociodemo": True,
            "sociodemo_type": "age",
        },
    ],
}


@pytest.fixture()
def survey_file() -> SurveyFile:
    return SurveyFile.model_validate(SURVEY_DICT)


# ---------------------------------------------------------------------------
# Tests modèles Pydantic
# ---------------------------------------------------------------------------


def test_survey_file_parsed(survey_file: SurveyFile) -> None:
    """SurveyFile se désérialise depuis un dict valide."""
    assert survey_file.survey.survey_id == "CROP2023_CONF"
    assert len(survey_file.questions) == 2


def test_survey_fields(survey_file: SurveyFile) -> None:
    survey = survey_file.survey
    assert survey.year == 2023
    assert survey.pollster == "CROP"
    assert survey.language == "fr"
    assert survey.n_respondents == 1500
    assert "confiance" in survey.tags


def test_question_fields(survey_file: SurveyFile) -> None:
    q = survey_file.questions[0]
    assert q.variable == "Q1"
    assert len(q.response_options) == 4
    assert q.response_options[0].code == 1
    assert q.response_options[0].label == "Tout à fait confiance"
    assert q.is_sociodemo is False


def test_sociodemo_question(survey_file: SurveyFile) -> None:
    d_age = survey_file.questions[1]
    assert d_age.is_sociodemo is True
    assert d_age.sociodemo_type == "age"


def test_defaults_applied() -> None:
    """Champs optionnels prennent leurs valeurs par défaut."""
    sf = SurveyFile.model_validate(
        {
            "survey": {"survey_id": "TEST001", "survey_name": "Test"},
            "questions": [],
        }
    )
    assert sf.survey.language == "fr"
    assert sf.survey.tags == []
    assert sf.questions == []


def test_validation_empty_survey_id() -> None:
    with pytest.raises(ValidationError):
        Survey(survey_id="", survey_name="Test")


def test_validation_empty_question_text() -> None:
    with pytest.raises(ValidationError):
        Question(variable="Q1", question_text="   ")


def test_validation_empty_variable() -> None:
    with pytest.raises(ValidationError):
        Question(variable="", question_text="Une question?")


# ---------------------------------------------------------------------------
# Tests embed_text
# ---------------------------------------------------------------------------


def test_embed_text_concatenates(survey_file: SurveyFile) -> None:
    q = survey_file.questions[0]
    text = embed_text(q)
    assert "Avez-vous confiance envers le gouvernement fédéral?" in text
    assert "Tout à fait confiance" in text
    assert "Pas du tout confiance" in text


def test_embed_text_starts_with_question(survey_file: SurveyFile) -> None:
    q = survey_file.questions[0]
    text = embed_text(q)
    assert text.startswith(q.question_text)


def test_embed_text_newline_separated(survey_file: SurveyFile) -> None:
    q = survey_file.questions[0]
    text = embed_text(q)
    lines = text.split("\n")
    assert lines[0] == q.question_text
    assert lines[1] == "Tout à fait confiance"
    assert lines[4] == "Pas du tout confiance"


def test_embed_text_no_options() -> None:
    q = Question(variable="Q_OPEN", question_text="Commentaires libres?")
    text = embed_text(q)
    assert text == "Commentaires libres?"


def test_embed_text_includes_display_label_and_concepts() -> None:
    q = Question(
        variable="raison1",
        question_text="Première raison invoquée",
        display_label="Première raison du choix électoral",
        concepts=["motivation électorale", "raison du vote"],
    )
    text = embed_text(q)
    assert q.question_text in text
    assert "Première raison du choix électoral" in text
    assert "motivation électorale, raison du vote" in text


def test_embed_text_excludes_survey_context(survey_file: SurveyFile) -> None:
    """Le vecteur QUESTION ne contient PAS le contexte sondage (vecteur séparé)."""
    q = survey_file.questions[0]
    text = embed_text(q)
    assert survey_file.survey.survey_name not in text


def test_survey_embed_text_name_only() -> None:
    survey = Survey(survey_id="S1", survey_name="Sondage X")
    assert survey_embed_text(survey) == "Sondage X"


def test_survey_embed_text_with_description() -> None:
    survey = Survey(
        survey_id="S1",
        survey_name="Sondage X",
        survey_description="Enquête sur la confiance institutionnelle.",
    )
    assert survey_embed_text(survey) == "Sondage X — Enquête sur la confiance institutionnelle."


# ---------------------------------------------------------------------------
# Tests build_docs
# ---------------------------------------------------------------------------


def test_build_docs_count(survey_file: SurveyFile) -> None:
    """Un parent + N children."""
    docs = build_docs(survey_file)
    assert len(docs) == 1 + len(survey_file.questions)


def test_parent_doc(survey_file: SurveyFile) -> None:
    docs = build_docs(survey_file)
    parent = docs[0]
    assert parent["doc_type"] == "survey"
    assert parent["id"] == "CROP2023_CONF"
    assert parent["survey_id"] == "CROP2023_CONF"
    assert parent["survey_name"] == "Confiance envers les institutions 2023"
    assert parent["survey_year"] == 2023
    assert parent["pollster"] == "CROP"
    assert "confiance" in parent["tags"]


def test_child_doc_id(survey_file: SurveyFile) -> None:
    docs = build_docs(survey_file)
    child_q1 = docs[1]
    assert child_q1["id"] == "CROP2023_CONF__Q1"


def test_child_doc_type(survey_file: SurveyFile) -> None:
    docs = build_docs(survey_file)
    for doc in docs[1:]:
        assert doc["doc_type"] == "question"


def test_child_parent_id(survey_file: SurveyFile) -> None:
    docs = build_docs(survey_file)
    for child in docs[1:]:
        assert child["parent_id"] == "CROP2023_CONF"


def test_child_denormalized_survey_fields(survey_file: SurveyFile) -> None:
    """Les métadonnées du sondage sont dénormalisées sur chaque child."""
    docs = build_docs(survey_file)
    for child in docs[1:]:
        assert child["survey_id"] == "CROP2023_CONF"
        assert child["survey_name"] == "Confiance envers les institutions 2023"
        assert child["survey_year"] == 2023
        assert child["pollster"] == "CROP"
        assert child["language"] == "fr"


def test_child_no_content_vector(survey_file: SurveyFile) -> None:
    """content_vector ne doit PAS être présent — rôle de l'orchestrateur."""
    docs = build_docs(survey_file)
    for child in docs[1:]:
        assert "content_vector" not in child


def test_child_response_options_codes_as_str(survey_file: SurveyFile) -> None:
    """Les codes de réponse sont convertis en string dans les docs."""
    docs = build_docs(survey_file)
    child_q1 = docs[1]
    for opt in child_q1["response_options"]:
        assert isinstance(opt["code"], str)


def test_child_question_fields(survey_file: SurveyFile) -> None:
    docs = build_docs(survey_file)
    child_q1 = docs[1]
    assert child_q1["variable"] == "Q1"
    assert child_q1["question_text"] == "Avez-vous confiance envers le gouvernement fédéral?"
    assert child_q1["var_type"] == "single"
    assert child_q1["is_sociodemo"] is False
    assert "confiance" in child_q1["concepts"]


def test_build_docs_empty_questions() -> None:
    """Un sondage sans questions produit uniquement le doc parent."""
    sf = SurveyFile.model_validate(
        {"survey": {"survey_id": "EMPTY001", "survey_name": "Vide"}, "questions": []}
    )
    docs = build_docs(sf)
    assert len(docs) == 1
    assert docs[0]["doc_type"] == "survey"
