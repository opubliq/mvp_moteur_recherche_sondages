"""Création (idempotente) de l'index Azure AI Search `survey-verbatims`.

Second index sur le MÊME service Azure AI Search que `survey-questions`
(cf. `ingestion/create_index.py`), mais avec une granularité différente : ici,
un document = une réponse ouverte d'UN répondant à UNE question (au lieu d'une
question agrégée). Le prédicat verbatim est défini une seule fois dans
`ingestion/open_text.py::is_verbatim()` :

    var_type == "open" and text_kind == "prose"

Périmètre de ce module (bead jsu.1) : UNIQUEMENT le schéma de l'index. Le
peuplement (extraction Parquet → documents → upload) est hors périmètre, voir
bead jsu.3 — ce fichier ne contient aucun code d'ingestion.

## survey_id / variable → jointure vers `survey-questions`

Le libellé de la question (`question_text`, `display_label`, `response_options`)
N'EST PAS dupliqué ici : `variable` (+ `survey_id`) sert de clé de jointure
applicative vers le document `question` correspondant dans `survey-questions`.
Même principe que le contrat v33 pour les labels d'options — une seule source
de vérité par type d'information.

## Sociodémo : String = LIBELLÉ, pas code brut

Les 8 champs sociodémo (`gender`, `age`, `education`, `income`, `region`,
`language`, `occupation`, `marital_status` — exactement les clés de
`CANONICAL_SOCIODEMO` dans `ingestion/canonical.py`) sont de type `String`
filterable+facetable. Le ticket jsu.1 impose ce typage mais ne tranche pas
code-vs-libellé ; décision prise ici, engageante pour jsu.3 (peuplement) :
**on stocke le LIBELLÉ lisible** (p.ex. "Femme", "35-44 ans"), jamais le code
brut SPSS/dictionnaire (p.ex. "2", "3"). Un code numérique en facette serait
inutilisable côté UI (l'utilisateur doit voir "Femme", pas "2"). C'est le même
choix que `sociodemo_type`/`CANONICAL_SOCIODEMO` : lisibilité avant
compacité. jsu.3 doit donc résoudre code → libellé (value labels du raw) AVANT
d'écrire ces champs, pas après.

## text_vector : déclaré, jamais peuplé

`text_vector` (Collection(Single), 3072 dims, profil HNSW) est déclaré au
schéma mais restera NULL sur tous les documents. Décision actée dans le ticket
jsu.1 (non rediscutée ici) : la feature de retrieval verbatims (jsu.4) est
BM25 (`text` searchable, analyzer français) + Cohere Rerank, pas de recherche
vectorielle — cf. `docs/reranker-cohere-decision` en mémoire. On déclare le
champ maintenant car Azure permet d'ajouter un champ à un index existant, mais
le peupler après coup exigerait de repousser tous les documents ; autant figer
le schéma tout de suite et réévaluer si le corpus grossit.

Usage :
    uv run python -m ingestion.create_verbatims_index            # crée si absent
    uv run python -m ingestion.create_verbatims_index --recreate # supprime puis recrée
"""

from __future__ import annotations

import argparse

from azure.core.credentials import AzureKeyCredential
from azure.core.exceptions import ResourceNotFoundError
from azure.search.documents.indexes import SearchIndexClient
from azure.search.documents.indexes.models import (
    HnswAlgorithmConfiguration,
    HnswParameters,
    SearchableField,
    SearchField,
    SearchFieldDataType,
    SearchIndex,
    SimpleField,
    VectorSearch,
    VectorSearchAlgorithmMetric,
    VectorSearchProfile,
)

from ingestion.canonical import CANONICAL_SOCIODEMO
from ingestion.config import get_settings

# Nom de cet index. Volontairement PAS piloté par `settings.index_name`
# (`ingestion/config.py`) : ce dernier vaut `survey-questions` par défaut et
# sert de config partagée pour tout le module d'ingestion. `survey-verbatims`
# est un second index sur le même service Azure AI Search (même endpoint, même
# clé admin) — on passe donc son nom en constante explicite plutôt que
# d'ajouter une variable d'environnement pour une simple chaîne fixe.
VERBATIMS_INDEX_NAME = "survey-verbatims"

FRENCH_ANALYZER = "fr.microsoft"
HNSW_ALGORITHM_NAME = "hnsw-config"
VECTOR_PROFILE_NAME = "vector-profile-hnsw"

# Les 8 champs sociodémo du schéma = exactement les clés de CANONICAL_SOCIODEMO
# (gender, age, education, income, region, language, occupation, marital_status).
# Dérivés d'ici plutôt que recopiés en dur : un ajout futur à la table
# canonique se propage sans toucher ce module.
SOCIODEMO_FIELDS = tuple(CANONICAL_SOCIODEMO.keys())


def build_index(name: str, dims: int) -> SearchIndex:
    """Construit la définition de l'index verbatims (un document = une réponse)."""

    fields = [
        # --- Clé ---
        # `{survey_id}__{variable}__{respondent_id}` : garantit l'unicité même
        # si le même respondent_id existe dans deux sondages ou répond à
        # plusieurs questions ouvertes.
        SimpleField(name="id", type=SearchFieldDataType.String, key=True),
        # --- Identification / jointure vers survey-questions ---
        SimpleField(
            name="survey_id",
            type=SearchFieldDataType.String,
            filterable=True,
            facetable=True,
        ),
        # Clé de jointure applicative vers `survey-questions.variable` : le
        # libellé de la question n'est pas dénormalisé ici (source unique).
        SimpleField(
            name="variable",
            type=SearchFieldDataType.String,
            filterable=True,
            facetable=True,
        ),
        SimpleField(
            name="respondent_id",
            type=SearchFieldDataType.Int64,
            filterable=True,
        ),
        # --- Le verbatim lui-même : c'est le BM25 ---
        SearchableField(
            name="text",
            type=SearchFieldDataType.String,
            analyzer_name=FRENCH_ANALYZER,
        ),
        # Déclaré, jamais peuplé — voir docstring du module.
        SearchField(
            name="text_vector",
            type=SearchFieldDataType.Collection(SearchFieldDataType.Single),
            searchable=True,
            vector_search_dimensions=dims,
            vector_search_profile_name=VECTOR_PROFILE_NAME,
        ),
        # --- Poids du répondant (pondération d'échantillonnage) ---
        SimpleField(
            name="weight",
            type=SearchFieldDataType.Double,
            filterable=True,
        ),
    ]

    # --- Les 8 champs sociodémo : String = LIBELLÉ lisible, cf. docstring ---
    for socio_field in SOCIODEMO_FIELDS:
        fields.append(
            SimpleField(
                name=socio_field,
                type=SearchFieldDataType.String,
                filterable=True,
                facetable=True,
            )
        )

    # Même profil vectoriel HNSW que `survey-questions` (cf. create_index.py) :
    # mêmes paramètres pour rester cohérent même si ce vecteur n'est pas peuplé.
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

    return SearchIndex(
        name=name,
        fields=fields,
        vector_search=vector_search,
    )


def create_index(recreate: bool = False) -> SearchIndex:
    settings = get_settings()
    client = SearchIndexClient(
        endpoint=settings.search_endpoint,
        credential=AzureKeyCredential(settings.search_admin_key),
    )

    name = VERBATIMS_INDEX_NAME

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
        f"profil vectoriel '{VECTOR_PROFILE_NAME}')."
    )
    return result


def main() -> None:
    parser = argparse.ArgumentParser(description="Crée l'index Azure AI Search `survey-verbatims`.")
    parser.add_argument(
        "--recreate",
        action="store_true",
        help="Supprime l'index existant avant de le recréer.",
    )
    args = parser.parse_args()
    create_index(recreate=args.recreate)


if __name__ == "__main__":
    main()
