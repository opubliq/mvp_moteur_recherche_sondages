"""Rail microdonnées répondant (v33.3) — raw-first → Parquet → Azure Blob.

Rail PARALLÈLE et INDÉPENDANT du rail catalogue (AI Search). Ne touche ni
l'index, ni `run.py`/`build_docs.py`/`embed.py`. Contrat de schéma :
`docs/DECISION_microdata_parquet.md` (v33.1).

Pour chaque sondage :
  localise le fichier brut → lit en raw-first (pyreadstat SAV/DTA
  `apply_value_formats=False`, ou pandas CSV avec détection d'encodage) →
  construit la matrice répondant × variable (IDs de variable RAW préservés) →
  ajoute `__respondent_id` / `__survey_id` / `__weight` → type raw-first →
  écrit un Parquet UTF-8 → upload Blob `{survey_id}.parquet` → met à jour
  `_manifest.json`. Idempotent (ré-écriture sûre par sondage).

Configs LUES EN LECTURE SEULE dans `ingestion/surveys/{survey_id}.py` :
  `WEIGHT_VAR` (poids déclaré) et `RESPONDENT_ID_VAR` (ID répondant RAW).
  EXCLUDED_VARS n'est PAS utilisée : le Parquet capte poids et ID répondant.
"""

from __future__ import annotations

import importlib
import io
import json
import logging
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd
import pyarrow as pa
import pyarrow.parquet as pq
import pyreadstat
from azure.core.exceptions import ResourceNotFoundError
from azure.storage.blob import BlobServiceClient, ContainerClient
from dotenv import load_dotenv

from ingestion.open_text import effective_var_type, is_text_column

load_dotenv()

logger = logging.getLogger("ingestion.microdata")

REPO_ROOT = Path(__file__).parent.parent
DATA_DIR = REPO_ROOT / "data"
NORMALIZED_DIR = Path(__file__).parent / "normalized"

MANIFEST_BLOB = "_manifest.json"
RESERVED_COLS = ("__respondent_id", "__survey_id", "__weight")


# ---------------------------------------------------------------------------
# Azure Blob
# ---------------------------------------------------------------------------


def _require_env(key: str) -> str:
    import os

    val = os.environ.get(key)
    if not val:
        raise RuntimeError(
            f"Variable d'environnement manquante : {key}. "
            "Copier .env.example vers .env et remplir les valeurs Azure Storage."
        )
    return val


def container_client() -> ContainerClient:
    account = _require_env("AZURE_STORAGE_ACCOUNT")
    key = _require_env("AZURE_STORAGE_KEY")
    container = _require_env("AZURE_STORAGE_CONTAINER")
    svc = BlobServiceClient(
        account_url=f"https://{account}.blob.core.windows.net", credential=key
    )
    return svc.get_container_client(container)


# ---------------------------------------------------------------------------
# Découverte des sondages & configs (LECTURE SEULE)
# ---------------------------------------------------------------------------


def discover_survey_ids() -> list[str]:
    """survey_id ayant un module extracteur OU un JSON normalisé + un dossier data/."""
    ids: set[str] = set()
    surveys_dir = Path(__file__).parent / "surveys"
    for p in surveys_dir.glob("*.py"):
        if not p.stem.startswith("_"):
            ids.add(p.stem)
    for p in NORMALIZED_DIR.glob("*.json"):
        ids.add(p.stem)
    # Ne garder que ceux dont le dossier de données existe.
    return sorted(sid for sid in ids if (DATA_DIR / sid).is_dir())


def _survey_config(survey_id: str) -> tuple[str | None, str | None]:
    """(WEIGHT_VAR, RESPONDENT_ID_VAR) déclarés dans le module extracteur, ou (None, None)."""
    try:
        mod = importlib.import_module(f"ingestion.surveys.{survey_id}")
    except ModuleNotFoundError:
        return None, None
    return getattr(mod, "WEIGHT_VAR", None), getattr(mod, "RESPONDENT_ID_VAR", None)


def _catalog_var_types(survey_id: str) -> dict[str, str]:
    """{variable: var_type} depuis le JSON normalisé (pilote le typage raw-first)."""
    p = NORMALIZED_DIR / f"{survey_id}.json"
    if not p.exists():
        return {}
    data = json.loads(p.read_text(encoding="utf-8"))
    return {
        q["variable"]: q.get("var_type")
        for q in data.get("questions", [])
        if q.get("variable")
    }


def _locate_raw(survey_id: str) -> Path:
    """Localise le fichier de données brut dans data/{survey_id}/."""
    sdir = DATA_DIR / survey_id
    if not sdir.is_dir():
        raise FileNotFoundError(f"Dossier de données introuvable : {sdir}")

    basename: str | None = None
    norm = NORMALIZED_DIR / f"{survey_id}.json"
    if norm.exists():
        rdf = json.loads(norm.read_text(encoding="utf-8"))["survey"].get("raw_data_file")
        if rdf:
            basename = Path(rdf).name

    if basename:
        cand = sdir / basename
        if cand.exists():
            return cand
        hits = list(sdir.glob(basename))
        if hits:
            return hits[0]

    # Fallback : premier fichier de données par extension prioritaire
    # (insensible à la casse : certains fichiers sont en .SAV majuscule).
    all_files = sorted(p for p in sdir.iterdir() if p.is_file())
    for ext in (".sav", ".dta", ".csv"):
        hits = [p for p in all_files if p.suffix.lower() == ext]
        if hits:
            return hits[0]
    raise FileNotFoundError(
        f"Aucun fichier .sav/.dta/.csv trouvé dans {sdir} pour {survey_id}."
    )


# ---------------------------------------------------------------------------
# Lecture raw-first
# ---------------------------------------------------------------------------


def _read_csv(path: Path) -> pd.DataFrame:
    """Lit un CSV avec détection d'encodage (govcan est souvent latin-1/cp1252)."""
    for enc in ("utf-8", "cp1252", "latin-1"):
        try:
            df = pd.read_csv(path, encoding=enc, low_memory=False)
            logger.info("[csv] %s lu en %s", path.name, enc)
            return df
        except UnicodeDecodeError:
            continue
    # latin-1 accepte tous les octets : ne devrait jamais arriver ici.
    return pd.read_csv(path, encoding="latin-1", low_memory=False)


def read_raw(path: Path) -> pd.DataFrame:
    ext = path.suffix.lower()
    if ext == ".sav":
        df, _ = pyreadstat.read_sav(str(path), apply_value_formats=False)
    elif ext == ".dta":
        df, _ = pyreadstat.read_dta(str(path), apply_value_formats=False)
    elif ext == ".csv":
        df = _read_csv(path)
    else:
        raise ValueError(f"Format non géré : {path.suffix} ({path})")
    return df


# ---------------------------------------------------------------------------
# Typage raw-first → pyarrow
# ---------------------------------------------------------------------------

_INT_TYPES = [
    (pa.int8(), -(2**7), 2**7 - 1),
    (pa.int16(), -(2**15), 2**15 - 1),
    (pa.int32(), -(2**31), 2**31 - 1),
    (pa.int64(), -(2**63), 2**63 - 1),
]


def _smallest_int_type(mn: float, mx: float) -> pa.DataType:
    for pa_t, lo, hi in _INT_TYPES:
        if lo <= mn and mx <= hi:
            return pa_t
    return pa.int64()


def _string_array(series: pd.Series) -> pa.Array:
    """NaN structurel → NULL ; toute autre valeur conservée telle quelle (str)."""
    vals = [None if pd.isna(v) else str(v) for v in series]
    return pa.array(vals, type=pa.string())


def _numeric_array(series: pd.Series) -> pa.Array:
    """Downcast float→int si toutes les valeurs non-nulles sont entières, sinon double.

    NaN structurel → NULL. Codes de refus (99/98/9999) CONSERVÉS comme valeurs.
    """
    s = pd.to_numeric(series, errors="coerce").astype("float64")
    arr = pa.array(s.to_numpy(), from_pandas=True)  # float64, NaN → null
    non_null = s.dropna()
    if len(non_null) and bool((non_null % 1 == 0).all()):
        mn, mx = float(non_null.min()), float(non_null.max())
        # Au-delà de l'int64, un float « entier » (ex. 3.2e23) ne tient dans aucun
        # entier : on le garde en double (raw-first, valeur préservée).
        if -(2**63) <= mn and mx <= 2**63 - 1:
            return arr.cast(_smallest_int_type(mn, mx))
    return arr  # double


def _to_arrow_column(series: pd.Series, var_type: str | None) -> pa.Array:
    # Un `open` du catalogue n'est qu'une colonne string : sa nature réelle se lit
    # dans les données (même règle que le rail catalogue, cf. open_text.py). Un
    # `open` dont TOUTES les valeurs sont des nombres est requalifié `continuous`
    # et typé numériquement — seuil strict à 100 %, donc sans perte raw-first.
    if var_type == "open":
        var_type, text_kind = effective_var_type(var_type, series)
        if text_kind == "numeric":
            return _numeric_array(series)  # requalifié `continuous`

    # Texte libre ou colonne chaîne non déclarée au catalogue → string (raw-first).
    # `is_text_column` plutôt qu'un test `dtype == object` : sous pandas ≥ 2 les
    # colonnes chaîne de pyreadstat ont le dtype `str`, et le test échouait
    # silencieusement — les verbatims partaient en `_numeric_array`, donc en
    # colonne double entièrement nulle (constaté sur cecd_elxn_qc_1998).
    if var_type == "open" or is_text_column(series):
        return _string_array(series)
    return _numeric_array(series)


def _resp_id_array(
    df: pd.DataFrame, resp_id_var: str | None, n: int
) -> tuple[pa.Array, str | None]:
    """__respondent_id : ID RAW numérique si dispo, sinon index de ligne 0..N-1."""
    if resp_id_var and resp_id_var in df.columns:
        s = pd.to_numeric(df[resp_id_var], errors="coerce")
        # Exiger numérique complet ET unique : certains fichiers ont un ID dégénéré
        # (eeq : QUEST entièrement 0). Sinon → index de ligne.
        if bool(s.notna().all()) and bool(s.is_unique):
            return pa.array(s.to_numpy(), from_pandas=True).cast(pa.int64()), resp_id_var
        logger.warning(
            "RESPONDENT_ID_VAR=%s inutilisable (non numérique complet ou non unique) "
            "→ index de ligne.",
            resp_id_var,
        )
    return pa.array(np.arange(n, dtype="int64")), None


def _weight_array(
    df: pd.DataFrame, weight_var: str | None, n: int
) -> tuple[pa.Array, str | None, str, int]:
    """__weight (non-nullable). WEIGHT_VAR déclaré → 'provided', sinon 1.0 'uniform'.

    Nulls résiduels d'un poids déclaré → imputés à la MOYENNE des poids observés
    (neutre quelle que soit l'échelle : 1.0 n'est neutre que pour un poids à moyenne 1 ;
    la moyenne fait contribuer le répondant « comme un répondant moyen »). Le nombre
    d'imputations est tracé dans le manifest (weight_imputed_n).
    """
    if weight_var and weight_var in df.columns:
        w = pd.to_numeric(df[weight_var], errors="coerce").astype("float64")
        n_null = int(w.isna().sum())
        n_imputed = 0
        if n_null:
            if n_null == n:
                raise ValueError(
                    f"WEIGHT_VAR={weight_var} est entièrement nul : "
                    "impossible d'imputer. Remonter à l'utilisateur."
                )
            mean_w = float(w.mean())  # moyenne des non-nulls
            w = w.fillna(mean_w)
            n_imputed = n_null
            logger.warning(
                "[%s] %d poids nul(s) imputé(s) à la moyenne (%.4f) → couverture complète.",
                weight_var, n_imputed, mean_w,
            )
        return pa.array(w.to_numpy(), type=pa.float64()), weight_var, "provided", n_imputed
    if weight_var:
        logger.warning(
            "WEIGHT_VAR=%s déclaré mais absent des données → poids uniforme.", weight_var
        )
    return pa.array(np.ones(n, dtype="float64"), type=pa.float64()), None, "uniform", 0


# ---------------------------------------------------------------------------
# Construction de la table Parquet
# ---------------------------------------------------------------------------


def build_table(
    survey_id: str,
    df: pd.DataFrame,
    weight_var: str | None,
    resp_id_var: str | None,
) -> tuple[pa.Table, dict[str, Any]]:
    n = len(df)
    var_types = _catalog_var_types(survey_id)

    resp_arr, resp_source = _resp_id_array(df, resp_id_var, n)
    weight_arr, weight_source_var, weight_source, weight_imputed_n = _weight_array(
        df, weight_var, n
    )

    arrays: list[pa.Array] = [
        resp_arr,
        pa.array([survey_id] * n, type=pa.string()),
        weight_arr,
    ]
    fields: list[pa.Field] = [
        pa.field("__respondent_id", pa.int64(), nullable=False),
        pa.field("__survey_id", pa.string(), nullable=False),
        pa.field("__weight", pa.float64(), nullable=False),
    ]

    for col in df.columns:
        name = col
        if name in RESERVED_COLS:
            name = f"{col}__raw"  # collision improbable avec un ID RAW ; on préserve
            logger.warning("Colonne RAW %s entre en collision avec __ → renommée %s", col, name)
        arr = _to_arrow_column(df[col], var_types.get(col))
        arrays.append(arr)
        fields.append(pa.field(name, arr.type, nullable=True))

    table = pa.Table.from_arrays(arrays, schema=pa.schema(fields))

    meta = {
        "survey_id": survey_id,
        "n_respondents": n,
        "n_vars": len(df.columns),
        "weight_var": weight_source_var,
        "weight_source": weight_source,
        "weight_imputed_n": weight_imputed_n,
        "respondent_id_var": resp_source,
    }
    return table, meta


# ---------------------------------------------------------------------------
# Manifest
# ---------------------------------------------------------------------------


def _update_manifest(container: ContainerClient, entry: dict[str, Any]) -> None:
    blob = container.get_blob_client(MANIFEST_BLOB)
    try:
        data = json.loads(blob.download_blob().readall())
    except ResourceNotFoundError:
        data = {"surveys": []}
    surveys = [s for s in data.get("surveys", []) if s.get("survey_id") != entry["survey_id"]]
    surveys.append(entry)
    surveys.sort(key=lambda s: s["survey_id"])
    data["surveys"] = surveys
    blob.upload_blob(
        json.dumps(data, ensure_ascii=False, indent=2).encode("utf-8"), overwrite=True
    )


# ---------------------------------------------------------------------------
# Orchestration par sondage
# ---------------------------------------------------------------------------


def process_survey(
    survey_id: str, container: ContainerClient | None = None
) -> dict[str, Any]:
    """Traite un sondage : raw → Parquet → upload Blob → maj manifest. Idempotent."""
    if container is None:
        container = container_client()

    weight_var, resp_id_var = _survey_config(survey_id)
    raw_path = _locate_raw(survey_id)
    logger.info("[%s] lecture raw : %s", survey_id, raw_path.name)
    df = read_raw(raw_path)

    table, meta = build_table(survey_id, df, weight_var, resp_id_var)

    buf = io.BytesIO()
    pq.write_table(table, buf, compression="snappy")  # dictionary encoding par défaut
    buf.seek(0)
    blob_name = f"{survey_id}.parquet"
    container.get_blob_client(blob_name).upload_blob(buf.getvalue(), overwrite=True)
    logger.info(
        "[%s] Parquet uploadé (%s) : %d répondants × %d vars",
        survey_id,
        blob_name,
        meta["n_respondents"],
        meta["n_vars"],
    )

    entry = {**meta, "updated_at": datetime.now(UTC).isoformat()}
    _update_manifest(container, entry)
    logger.info(
        "[%s] manifest à jour (weight_source=%s, weight_var=%s, respondent_id_var=%s)",
        survey_id,
        entry["weight_source"],
        entry["weight_var"],
        entry["respondent_id_var"],
    )
    return entry
