"""Modèles Pydantic v2 du contrat JSON normalisé (sondage → questions).

Un fichier de sondage normalisé est désérialisé comme `SurveyFile`,
qui contient un `Survey` et une liste de `Question`.
"""

from __future__ import annotations

from pydantic import BaseModel, Field, field_validator


class ResponseOption(BaseModel):
    """Un choix de réponse : code numérique + libellé textuel."""

    code: int | str
    label: str


class Question(BaseModel):
    """Une question de sondage avec ses métadonnées analytiques."""

    variable: str = Field(..., description="Nom de variable RAW (ex. Q1, V23)")
    question_text: str
    response_options: list[ResponseOption] = Field(default_factory=list)
    var_type: str | None = None  # ex. "single", "multiple", "open", "scale"
    is_sociodemo: bool = False
    sociodemo_type: str | None = None  # ex. "age", "gender", "education"
    concepts: list[str] = Field(default_factory=list)
    themes: list[str] = Field(default_factory=list)

    @field_validator("variable")
    @classmethod
    def variable_not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("variable ne peut pas être vide")
        return v

    @field_validator("question_text")
    @classmethod
    def question_text_not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("question_text ne peut pas être vide")
        return v


class Survey(BaseModel):
    """Métadonnées d'un sondage (niveau parent)."""

    survey_id: str = Field(..., description="Identifiant unique du sondage")
    survey_name: str
    year: int | None = None
    pollster: str | None = None
    language: str = "fr"
    n_respondents: int | None = None
    raw_data_file: str | None = None
    tags: list[str] = Field(default_factory=list)

    @field_validator("survey_id")
    @classmethod
    def survey_id_not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("survey_id ne peut pas être vide")
        return v

    @field_validator("survey_name")
    @classmethod
    def survey_name_not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("survey_name ne peut pas être vide")
        return v


class SurveyFile(BaseModel):
    """Enveloppe de haut niveau d'un fichier normalisé JSON."""

    survey: Survey
    questions: list[Question] = Field(default_factory=list)
