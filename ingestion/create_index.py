"""Création (idempotente) de l'index Azure AI Search parent-child.

Un seul index `survey-questions` héberge deux types de documents distingués par
le champ `doc_type` ("survey" = parent, "question" = child). Les questions
portent un vecteur d'embedding (`content_vector`, 3072 dims, profil HNSW) et une
configuration sémantique sur `question_text`.

Usage :
    uv run python -m ingestion.create_index            # crée si absent
    uv run python -m ingestion.create_index --recreate # supprime puis recrée
"""

from __future__ import annotations

import argparse

from azure.core.credentials import AzureKeyCredential
from azure.core.exceptions import ResourceNotFoundError
from azure.search.documents.indexes import SearchIndexClient
from azure.search.documents.indexes.models import (
    ComplexField,
    HnswAlgorithmConfiguration,
    HnswParameters,
    SearchableField,
    SearchField,
    SearchFieldDataType,
    SearchIndex,
    SemanticConfiguration,
    SemanticField,
    SemanticPrioritizedFields,
    SemanticSearch,
    SimpleField,
    VectorSearch,
    VectorSearchAlgorithmMetric,
    VectorSearchProfile,
)

from ingestion.config import get_settings

FRENCH_ANALYZER = "fr.microsoft"
HNSW_ALGORITHM_NAME = "hnsw-config"
VECTOR_PROFILE_NAME = "vector-profile-hnsw"
SEMANTIC_CONFIG_NAME = "question-semantic"


def build_index(name: str, dims: int) -> SearchIndex:
    """Construit la définition de l'index parent-child."""

    fields = [
        # --- Clé + discriminant parent/child + lien hiérarchique ---
        SimpleField(name="id", type=SearchFieldDataType.String, key=True),
        SimpleField(
            name="doc_type",
            type=SearchFieldDataType.String,
            filterable=True,
            facetable=True,
        ),
        SimpleField(
            name="parent_id",
            type=SearchFieldDataType.String,
            filterable=True,
        ),
        # --- Métadonnées (partagées parent/child), filterable + facetable ---
        SimpleField(
            name="survey_id",
            type=SearchFieldDataType.String,
            filterable=True,
            facetable=True,
        ),
        SimpleField(
            name="survey_year",
            type=SearchFieldDataType.Int32,
            filterable=True,
            facetable=True,
            sortable=True,
        ),
        SimpleField(
            name="pollster",
            type=SearchFieldDataType.String,
            filterable=True,
            facetable=True,
        ),
        SimpleField(
            name="language",
            type=SearchFieldDataType.String,
            filterable=True,
            facetable=True,
        ),
        # Nom du sondage : affiché dans l'UI (cartes groupées par sondage) et
        # recherchable. Présent sur parent + child (dénormalisé).
        SearchableField(
            name="survey_name",
            type=SearchFieldDataType.String,
            analyzer_name=FRENCH_ANALYZER,
        ),
        SimpleField(
            name="n_respondents",
            type=SearchFieldDataType.Int32,
            filterable=True,
            facetable=True,
            sortable=True,
        ),
        SearchField(
            name="tags",
            type=SearchFieldDataType.Collection(SearchFieldDataType.String),
            filterable=True,
            facetable=True,
        ),
        # --- Champs propres à la question (child) ---
        SimpleField(
            name="variable",
            type=SearchFieldDataType.String,
            filterable=True,
        ),
        SearchableField(
            name="question_text",
            type=SearchFieldDataType.String,
            analyzer_name=FRENCH_ANALYZER,
        ),
        ComplexField(
            name="response_options",
            collection=True,
            fields=[
                SearchableField(
                    name="code",
                    type=SearchFieldDataType.String,
                    analyzer_name=FRENCH_ANALYZER,
                ),
                SearchableField(
                    name="label",
                    type=SearchFieldDataType.String,
                    analyzer_name=FRENCH_ANALYZER,
                ),
            ],
        ),
        SearchField(
            name="content_vector",
            type=SearchFieldDataType.Collection(SearchFieldDataType.Single),
            searchable=True,
            vector_search_dimensions=dims,
            vector_search_profile_name=VECTOR_PROFILE_NAME,
        ),
        SimpleField(
            name="var_type",
            type=SearchFieldDataType.String,
            filterable=True,
            facetable=True,
        ),
        SimpleField(
            name="is_sociodemo",
            type=SearchFieldDataType.Boolean,
            filterable=True,
            facetable=True,
        ),
        SimpleField(
            name="sociodemo_type",
            type=SearchFieldDataType.String,
            filterable=True,
            facetable=True,
        ),
        SearchField(
            name="concepts",
            type=SearchFieldDataType.Collection(SearchFieldDataType.String),
            searchable=True,
            filterable=True,
            facetable=True,
            analyzer_name=FRENCH_ANALYZER,
        ),
        SearchField(
            name="themes",
            type=SearchFieldDataType.Collection(SearchFieldDataType.String),
            searchable=True,
            filterable=True,
            facetable=True,
            analyzer_name=FRENCH_ANALYZER,
        ),
        SimpleField(name="raw_data_file", type=SearchFieldDataType.String),
        SimpleField(
            name="embedding_model",
            type=SearchFieldDataType.String,
            filterable=True,
        ),
    ]

    vector_search = VectorSearch(
        algorithms=[
            HnswAlgorithmConfiguration(
                name=HNSW_ALGORITHM_NAME,
                parameters=HnswParameters(
                    m=4,
                    ef_construction=400,
                    ef_search=500,
                    metric=VectorSearchAlgorithmMetric.COSINE,
                ),
            )
        ],
        profiles=[
            VectorSearchProfile(
                name=VECTOR_PROFILE_NAME,
                algorithm_configuration_name=HNSW_ALGORITHM_NAME,
            )
        ],
    )

    semantic_search = SemanticSearch(
        configurations=[
            SemanticConfiguration(
                name=SEMANTIC_CONFIG_NAME,
                prioritized_fields=SemanticPrioritizedFields(
                    title_field=SemanticField(field_name="question_text"),
                    content_fields=[SemanticField(field_name="question_text")],
                ),
            )
        ]
    )

    return SearchIndex(
        name=name,
        fields=fields,
        vector_search=vector_search,
        semantic_search=semantic_search,
    )


def create_index(recreate: bool = False) -> SearchIndex:
    settings = get_settings()
    client = SearchIndexClient(
        endpoint=settings.search_endpoint,
        credential=AzureKeyCredential(settings.search_admin_key),
    )

    name = settings.index_name

    if recreate:
        try:
            client.delete_index(name)
            print(f"Index existant supprimé : {name}")
        except ResourceNotFoundError:
            print(f"Aucun index à supprimer (absent) : {name}")

    index = build_index(name, settings.embedding_dims)
    result = client.create_or_update_index(index)
    print(
        f"Index '{result.name}' créé/mis à jour "
        f"({len(result.fields)} champs, "
        f"profil vectoriel '{VECTOR_PROFILE_NAME}', "
        f"config sémantique '{SEMANTIC_CONFIG_NAME}')."
    )
    return result


def main() -> None:
    parser = argparse.ArgumentParser(description="Crée l'index Azure AI Search parent-child.")
    parser.add_argument(
        "--recreate",
        action="store_true",
        help="Supprime l'index existant avant de le recréer.",
    )
    args = parser.parse_args()
    create_index(recreate=args.recreate)


if __name__ == "__main__":
    main()
