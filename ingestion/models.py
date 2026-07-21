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
    # Titre lisible AUTHORÉ (LLM) — ne remplace pas question_text (verbatim raw).
    # Sert l'affichage UI et sauve les libellés bruts trop courts/cryptiques.
    # Champ « mou » : jamais protégé par validate.py, matérialisé en enrichment.
    display_label: str | None = None
    response_options: list[ResponseOption] = Field(default_factory=list)
    var_type: str | None = None  # ex. "single", "multiple", "open", "scale"
    # Nature du contenu d'une colonne TEXTE (orthogonal à var_type) :
    # "prose" (verbatim) | "short" (1-2 mots, codable) | "numeric" (nombre stocké
    # en string → var_type requalifié `continuous`) | "empty" | None (non-texte).
    # DÉRIVÉ des données au build par ingestion/open_text.py — jamais authoré en
    # enrichment, jamais renseigné par un extracteur.
    text_kind: str | None = None
    is_sociodemo: bool = False
    # Ordinalité des catégories (ORTHOGONALE à var_type) : true si les niveaux
    # ont un ORDRE intrinsèque (Likert accord/désaccord, satisfaction, fréquence,
    # importance…). Authoré en enrichment ; dérivé à true pour les `scale` au
    # build. Débloque le gradient séquentiel + l'ordre des graphes microdonnées.
    is_ordinal: bool = False
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
    # Résumé AUTHORÉ (LLM) de ce que couvre le sondage (contexte UI + recherche).
    # Champ « mou » optionnel, matérialisé en enrichment.
    survey_description: str | None = None
    year: int | None = None
    # Mois du terrain (1-12), best-effort : rempli si dérivable (survey_id, date
    # d'élection, codebook), sinon None. Jamais fabriqué.
    survey_month: int | None = None
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
