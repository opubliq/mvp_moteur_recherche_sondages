"""Peuplement de l'index `survey-verbatims` depuis les Parquet répondant (bead jsu.3).

Un document = UNE réponse ouverte d'UN répondant à UNE question. Le schéma vit
dans `ingestion/create_verbatims_index.py` (bead jsu.1) ; ce module ne fait que
le remplir.

## D'où viennent les données : Parquet uniquement

Critère d'acceptation n°1 du ticket : **aucun `.sav`/`.csv` n'est rouvert**. Les
Parquet du Blob (rail v33, `ingestion/microdata.py`) contiennent déjà toutes les
colonnes du raw, une ligne par répondant, avec `__respondent_id` et `__weight`.
La dénormalisation sociodémo est donc un simple SELECT sur la même ligne.

## Quelles colonnes : on INTERROGE le catalogue, on ne devine pas

La liste des colonnes verbatim n'est pas déduite des Parquet (une colonne string
n'est pas un verbatim) : elle est lue dans l'index `survey-questions`, via le
contrat `text_kind` livré par le bead jsu.5 :

    var_type eq 'open' and text_kind eq 'prose'

soit exactement le prédicat `open_text.is_verbatim()` — jamais redéfini ici.
Instantané de référence : `docs/verbatims_corpus.md` (82 questions sur 5
sondages, 17 309 réponses non-vides).

## Piège : les cellules « vides » ne sont pas NULL

Les exports (Qualtrics notamment) écrivent des chaînes blanches, pas des NULL :
`govcan_parca_2024.C8IO` a 13 751 valeurs non-NULL pour seulement 2 730
verbatims réels. Un filtre `notna()` produirait ~5× trop de documents vides. On
filtre donc sur la valeur **strippée non vide**, exactement comme
`open_text._clean_values()`.

## Sociodémo : le Parquet porte le CODE, l'index porte le LIBELLÉ

jsu.1 a tranché : les 8 champs sociodémo de `survey-verbatims` portent le
libellé lisible ("Woman"), jamais le code brut ("2") — un code en facette est
inutilisable côté UI. Or les Parquet sont raw-first : ils contiennent les codes.
La table de correspondance est déjà dans `survey-questions` (`is_sociodemo`,
`sociodemo_type`, `response_options`), on la relit par sondage.

Deux frictions de typage, toutes deux sources de bugs SILENCIEUX (tout ressort
null sans erreur), d'où `normalize_code()` :
  - les `code` de `response_options` sont des **strings** dans l'index, les
    valeurs Parquet sont des entiers ou des floats (`2.0` pour une colonne
    nullable) ;
  - les colonnes sociodémo peuvent elles aussi contenir des blancs.

## Pas d'embedding

`text_vector` est déclaré au schéma mais **jamais peuplé** (décision jsu.1, cf.
l'en-tête de `create_verbatims_index.py`) : le retrieval verbatims (jsu.4) est
BM25 + Cohere Rerank. Aucun appel AOAI ici — l'ingestion est donc rapide et
rejouable gratuitement.

Usage :
    uv run python -m ingestion.run_verbatims                       # les 5 sondages
    uv run python -m ingestion.run_verbatims --only govcan_parca_2024
"""

from __future__ import annotations

import io
import logging
from collections import defaultdict
from typing import Any

import pandas as pd
import pyarrow.parquet as pq
from azure.core.credentials import AzureKeyCredential
from azure.search.documents import SearchClient

from ingestion.canonical import CANONICAL_SOCIODEMO
from ingestion.config import get_settings
from ingestion.create_verbatims_index import VERBATIMS_INDEX_NAME
from ingestion.microdata import container_client

logger = logging.getLogger("ingestion.verbatims")

# Même taille de batch que le rail catalogue (`run.py`) : la limite service
# Azure AI Search est 1000 documents, 500 laisse de la marge sur le poids des
# verbatims longs.
UPLOAD_BATCH_SIZE = 500

# Filtre OData = transcription littérale de `open_text.is_verbatim()`. Le
# prédicat Python reste la source de vérité ; ici on ne peut pas l'appeler
# (le tri se fait côté service), donc on documente l'équivalence.
VERBATIM_FILTER = "var_type eq 'open' and text_kind eq 'prose'"

SOCIODEMO_FIELDS = tuple(CANONICAL_SOCIODEMO.keys())


# ---------------------------------------------------------------------------
# Logique pure (testée dans tests/test_verbatims.py)
# ---------------------------------------------------------------------------


def normalize_code(value: Any) -> str | None:
    """Ramène une valeur Parquet à la forme des `code` de `response_options` (string).

    Sans ça, le lookup échoue en silence : les codes de l'index sont des
    strings ("2"), les colonnes Parquet des entiers (`2`) — ou des floats
    (`2.0`) dès qu'elles sont nullables — voire des strings blanches.
    """
    if value is None or (not isinstance(value, str) and pd.isna(value)):
        return None
    if isinstance(value, str):
        s = value.strip()
        return s or None
    if isinstance(value, float):
        # `2.0` doit matcher le code "2" ; on ne tronque un float que s'il est
        # entier, pour ne jamais inventer une valeur (raw-first).
        if value.is_integer():
            return str(int(value))
        return repr(value)
    return str(value)


def clean_text(value: Any) -> str | None:
    """Verbatim exploitable, ou None. Même règle que `open_text._clean_values()`."""
    if value is None or (not isinstance(value, str) and pd.isna(value)):
        return None
    s = str(value).strip()
    return s or None


def pick_sociodemo_variable(
    survey_id: str,
    sociodemo_type: str,
    candidates: dict[str, dict[str, str]],
    df: pd.DataFrame,
) -> str:
    """Choisit LA variable porteuse d'un `sociodemo_type` quand il y en a plusieurs.

    Cas réel : `cecd_elxn_qc_2007` expose `sexe` ET `genre_post` pour `gender`,
    et trois variables pour `region`. Le hasard (ordre de retour du service) ne
    doit pas décider quel libellé finit en facette.

    Règle : on retient la variable dont le plus grand nombre de lignes se
    RÉSOUT réellement en libellé, ties cassées par ordre alphabétique. Trancher
    à l'alphabet seul choisirait `genre_post` (68 % de couverture, variable
    post-hoc administrée à un sous-échantillon) plutôt que `sexe` (100 %) : le
    critère « couverture » est tout aussi déterministe et strictement meilleur.
    L'ambiguïté est loguée dans tous les cas, pour rester arbitrable à la main.
    """

    def coverage(variable: str) -> int:
        if variable not in df.columns:
            return -1
        labels, _ = resolve_sociodemo_series(df[variable], candidates[variable])
        return sum(1 for x in labels if x is not None)

    scored = sorted((-coverage(v), v) for v in candidates)
    chosen = scored[0][1]
    if len(scored) > 1:
        logger.warning(
            "[%s] %s : %d variables candidates (%s) — retenu : %s "
            "(meilleure couverture : %d lignes résolues).",
            survey_id,
            sociodemo_type,
            len(scored),
            ", ".join(f"{v}={-s}" for s, v in scored),
            chosen,
            -scored[0][0],
        )
    return chosen


def resolve_sociodemo_series(
    series: pd.Series, code_to_label: dict[str, str]
) -> tuple[list[str | None], int]:
    """Traduit une colonne de codes en libellés. Retourne (libellés, n_codes_inconnus).

    Un code présent dans les données mais absent des `response_options` donne
    None (jamais une valeur inventée) et incrémente le compteur — c'est le
    signal qu'il faut regarder le dictionnaire du sondage, pas un détail.
    """
    labels: list[str | None] = []
    unknown = 0
    for raw in series:
        code = normalize_code(raw)
        if code is None:
            labels.append(None)
            continue
        label = code_to_label.get(code)
        if label is None:
            unknown += 1
        labels.append(label)
    return labels, unknown


def build_verbatim_docs(
    survey_id: str,
    df: pd.DataFrame,
    variables: list[str],
    sociodemo_labels: dict[str, list[str | None]],
) -> list[dict[str, Any]]:
    """Dépivote un Parquet en documents `survey-verbatims`.

    `sociodemo_labels` : {champ sociodémo → libellé par ligne} déjà résolu (même
    longueur que `df`), pour ne pas refaire le lookup à chaque colonne verbatim.

    Une cellule strippée non vide = un document. `id` déterministe
    `{survey_id}__{variable}__{respondent_id}` : c'est lui qui rend le
    `merge_or_upload` rejouable sans duplication.
    """
    respondent_ids = df["__respondent_id"].tolist()
    weights = df["__weight"].tolist()
    # Un sondage sans ce `sociodemo_type` (aucun des 5 n'a `marital_status`)
    # écrit explicitement null : `merge_or_upload` pose alors la valeur null,
    # ce qui garde le document identique d'un run à l'autre.
    socio = {f: sociodemo_labels.get(f) for f in SOCIODEMO_FIELDS}

    docs: list[dict[str, Any]] = []
    for variable in variables:
        if variable not in df.columns:
            logger.warning("[%s] colonne %s absente du Parquet — sautée.", survey_id, variable)
            continue
        for pos, raw in enumerate(df[variable].tolist()):
            text = clean_text(raw)
            if text is None:
                continue
            rid = int(respondent_ids[pos])
            doc: dict[str, Any] = {
                "id": f"{survey_id}__{variable}__{rid}",
                "survey_id": survey_id,
                "variable": variable,
                "respondent_id": rid,
                "text": text,
                "weight": float(weights[pos]),
            }
            for field, labels in socio.items():
                doc[field] = labels[pos] if labels is not None else None
            docs.append(doc)
    return docs


# ---------------------------------------------------------------------------
# Accès au catalogue `survey-questions` (LECTURE SEULE)
# ---------------------------------------------------------------------------


def questions_client() -> SearchClient:
    settings = get_settings()
    return SearchClient(
        endpoint=settings.search_endpoint,
        index_name=settings.index_name,
        credential=AzureKeyCredential(settings.search_admin_key),
    )


def verbatims_client() -> SearchClient:
    settings = get_settings()
    return SearchClient(
        endpoint=settings.search_endpoint,
        index_name=VERBATIMS_INDEX_NAME,
        credential=AzureKeyCredential(settings.search_admin_key),
    )


def fetch_verbatim_columns(client: SearchClient) -> dict[str, list[str]]:
    """{survey_id: [variables verbatim]} — la source est le catalogue, pas le Parquet."""
    results = client.search(
        search_text="*",
        filter=VERBATIM_FILTER,
        select="survey_id,variable",
        top=1000,
    )
    by_survey: dict[str, list[str]] = defaultdict(list)
    for doc in results:
        by_survey[doc["survey_id"]].append(doc["variable"])
    return {sid: sorted(v) for sid, v in sorted(by_survey.items())}


def fetch_sociodemo_candidates(
    client: SearchClient, survey_id: str
) -> dict[str, dict[str, dict[str, str]]]:
    """{sociodemo_type: {variable Parquet: {code: label}}} pour un sondage.

    Retourne TOUTES les variables candidates : l'arbitrage entre elles a besoin
    des données (cf. `pick_sociodemo_variable`), pas seulement du catalogue.

    Un `sociodemo_type` absent du sondage est absent du dict : aucun des 5
    sondages n'a `marital_status`, `cecd_elxn_qc_1998` n'a ni `income`, ni
    `region`, ni `language`. Champ laissé null, c'est normal.
    """
    results = client.search(
        search_text="*",
        filter=f"survey_id eq '{survey_id}' and is_sociodemo eq true",
        select="variable,sociodemo_type,response_options",
        top=1000,
    )
    candidates: dict[str, dict[str, dict[str, str]]] = defaultdict(dict)
    for doc in results:
        stype = doc.get("sociodemo_type")
        if stype not in SOCIODEMO_FIELDS:
            continue
        options = doc.get("response_options") or []
        # Les codes de l'index sont déjà des strings, mais on les normalise
        # quand même : un code "01" ou " 2 " côté catalogue casserait sinon le
        # lookup aussi sûrement qu'un entier côté Parquet.
        code_to_label = {
            normalize_code(o.get("code")): o.get("label")
            for o in options
            if normalize_code(o.get("code")) is not None and o.get("label")
        }
        candidates[stype][doc["variable"]] = code_to_label

    return dict(candidates)


# ---------------------------------------------------------------------------
# Parquet
# ---------------------------------------------------------------------------


def read_parquet(survey_id: str, container: Any) -> pd.DataFrame:
    """Télécharge `{survey_id}.parquet` du Blob et le rend en DataFrame (lecture seule)."""
    blob = container.get_blob_client(f"{survey_id}.parquet")
    payload = blob.download_blob().readall()
    return pq.read_table(io.BytesIO(payload)).to_pandas()


# ---------------------------------------------------------------------------
# Orchestration
# ---------------------------------------------------------------------------


def ingest_survey(
    survey_id: str,
    variables: list[str],
    catalog: SearchClient,
    target: SearchClient,
    container: Any,
) -> dict[str, Any]:
    """Ingère les verbatims d'un sondage. Retourne un rapport (docs, taux sociodémo)."""
    df = read_parquet(survey_id, container)
    logger.info(
        "[%s] Parquet lu : %d répondants × %d colonnes, %d question(s) verbatim.",
        survey_id,
        len(df),
        len(df.columns),
        len(variables),
    )

    # 1. Résolution code → libellé, une fois par sondage (pas par colonne).
    candidates = fetch_sociodemo_candidates(catalog, survey_id)
    sociodemo_labels: dict[str, list[str | None]] = {}
    coverage: dict[str, dict[str, Any]] = {}
    for stype, by_var in sorted(candidates.items()):
        variable = pick_sociodemo_variable(survey_id, stype, by_var, df)
        code_to_label = by_var[variable]
        if variable not in df.columns:
            logger.warning(
                "[%s] %s : variable %s absente du Parquet — champ laissé null.",
                survey_id,
                stype,
                variable,
            )
            continue
        labels, unknown = resolve_sociodemo_series(df[variable], code_to_label)
        sociodemo_labels[stype] = labels
        resolved = sum(1 for x in labels if x is not None)
        coverage[stype] = {
            "variable": variable,
            "resolved_rows": resolved,
            "rate": resolved / len(df) if len(df) else 0.0,
            "unknown_codes": unknown,
        }
        if unknown:
            logger.warning(
                "[%s] %s (%s) : %d valeur(s) au code inconnu du catalogue → null.",
                survey_id,
                stype,
                variable,
                unknown,
            )

    missing = [f for f in SOCIODEMO_FIELDS if f not in sociodemo_labels]
    if missing:
        logger.info("[%s] sociodémo absent du sondage : %s", survey_id, ", ".join(missing))

    # 2. Dépivotage (filtre blanc inclus).
    docs = build_verbatim_docs(survey_id, df, variables, sociodemo_labels)
    logger.info("[%s] %d verbatim(s) non-vide(s) à pousser.", survey_id, len(docs))

    # 3. Upload idempotent par batches — même patron que `run.py` : on vérifie
    # le succès DOCUMENT PAR DOCUMENT, l'API ne lève pas sur un échec partiel.
    for i in range(0, len(docs), UPLOAD_BATCH_SIZE):
        batch = docs[i : i + UPLOAD_BATCH_SIZE]
        results = target.merge_or_upload_documents(documents=batch)
        failed = [r for r in results if not r.succeeded]
        if failed:
            raise RuntimeError(
                f"[{survey_id}] {len(failed)} document(s) en échec à l'upload : "
                + ", ".join(f"{r.key} ({r.error_message})" for r in failed[:5])
            )

    logger.info("[%s] OK — %d documents indexés.", survey_id, len(docs))
    return {"survey_id": survey_id, "n_docs": len(docs), "sociodemo": coverage}


def run(only: str | None = None) -> list[dict[str, Any]]:
    """Point d'entrée programmatique : tous les sondages verbatim, ou un seul."""
    catalog = questions_client()
    target = verbatims_client()
    container = container_client()

    columns = fetch_verbatim_columns(catalog)
    if only is not None:
        if only not in columns:
            raise SystemExit(
                f"Sondage '{only}' sans question verbatim. "
                f"Disponibles : {', '.join(sorted(columns))}"
            )
        columns = {only: columns[only]}

    total_questions = sum(len(v) for v in columns.values())
    logger.info(
        "Sondages verbatim : %d (%d questions).", len(columns), total_questions
    )

    reports = [
        ingest_survey(sid, variables, catalog, target, container)
        for sid, variables in columns.items()
    ]

    total = sum(r["n_docs"] for r in reports)
    logger.info(
        "Terminé : %d documents poussés sur %d sondage(s).", total, len(reports)
    )
    return reports
