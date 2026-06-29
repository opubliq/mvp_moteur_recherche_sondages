"""Tests du garde-fou anti-fabrication (ingestion/validate.py)."""

import pytest

from ingestion.models import SurveyFile
from ingestion.validate import (
    FabricatedTextError,
    assert_no_fabricated_text,
    fabrication_reason,
    find_issues,
)


def _survey(questions: list[dict]) -> SurveyFile:
    return SurveyFile.model_validate(
        {
            "survey": {"survey_id": "T", "survey_name": "Test"},
            "questions": questions,
        }
    )


# ---------------------------------------------------------------------------
# fabrication_reason — cas FABRIQUÉS (doivent retourner une raison)
# ---------------------------------------------------------------------------


def test_text_equals_variable_is_fabricated() -> None:
    assert fabrication_reason("VOT1", "VOT1") is not None


def test_text_equals_variable_ignoring_case_accents_punct() -> None:
    # variante : casse + ponctuation → toujours détecté comme = variable
    assert fabrication_reason("REGIO", "regio.") is not None


def test_variable_with_trailing_dot_is_fabricated() -> None:
    assert fabrication_reason("Q3", "Q3.") is not None


@pytest.mark.parametrize(
    "placeholder",
    ["<none>", "none", "N/A", "n/a", "TODO", "Question 1", "variable", "???", "---"],
)
def test_placeholders_detected(placeholder: str) -> None:
    assert fabrication_reason("Q1", placeholder) is not None


def test_empty_text_detected() -> None:
    # pydantic interdit déjà le vide ; on teste la fonction directement.
    assert fabrication_reason("Q1", "   ") is not None


def test_numeric_only_text_detected() -> None:
    assert fabrication_reason("Q1", "12345") is not None


# ---------------------------------------------------------------------------
# fabrication_reason — cas RÉELS (doivent passer : retournent None)
# ---------------------------------------------------------------------------


def test_real_question_text_ok() -> None:
    assert fabrication_reason("Q1", "Avez-vous confiance envers le gouvernement fédéral?") is None


def test_short_real_label_ok() -> None:
    # wording court mais réel : ne doit PAS être un faux positif.
    assert fabrication_reason("QSEXE", "Sexe") is None
    assert fabrication_reason("AGE", "À quelle catégorie d'âge appartenez-vous?") is None


def test_variable_substring_of_real_text_ok() -> None:
    # le nom de variable apparaît dans un vrai wording → OK (multi-mots).
    assert fabrication_reason("Q3", "Q3 : êtes-vous satisfait des services?") is None


# ---------------------------------------------------------------------------
# find_issues / assert_no_fabricated_text
# ---------------------------------------------------------------------------


def test_find_issues_flags_empty_label() -> None:
    sf = _survey(
        [
            {
                "variable": "Q1",
                "question_text": "Question réelle issue du raw?",
                "response_options": [{"code": 1, "label": "   "}],
            }
        ]
    )
    issues = find_issues(sf)
    assert any("label vide" in i for i in issues)


def test_assert_raises_on_fabricated() -> None:
    sf = _survey([{"variable": "VOT1", "question_text": "VOT1"}])
    with pytest.raises(FabricatedTextError):
        assert_no_fabricated_text(sf)


def test_assert_passes_on_clean_survey() -> None:
    sf = _survey(
        [
            {
                "variable": "Q1",
                "question_text": "Avez-vous voté à la dernière élection?",
                "response_options": [
                    {"code": 1, "label": "Oui"},
                    {"code": 2, "label": "Non"},
                ],
            }
        ]
    )
    # ne doit pas lever
    assert_no_fabricated_text(sf)


def test_error_message_lists_variable() -> None:
    sf = _survey(
        [
            {"variable": "Q1", "question_text": "Vraie question valide ici?"},
            {"variable": "REGIO", "question_text": "REGIO"},
        ]
    )
    with pytest.raises(FabricatedTextError) as exc:
        assert_no_fabricated_text(sf)
    assert "REGIO" in str(exc.value)
