"""Tests de opubliq_mrp sur données synthétiques.

    uv run --with "numpyro==0.22.0" --with "jax[cpu]" --with pandas --with pyarrow --with pytest pytest sandbox/test_opubliq_mrp.py
"""

import itertools

import numpy as np
import pandas as pd
import pytest

import opubliq_mrp as M

EDU = M.CATEGORIES["education"]
GENRES = M.CATEGORIES["genre"]


@pytest.fixture()
def data_dir(tmp_path, monkeypatch):
    monkeypatch.setattr(M, "DATA_DIR", str(tmp_path))
    rng = np.random.default_rng(0)
    seed = [
        {"code": "24", "type": "cells", "tableau": "age_genre_education", "genre": g, "age": a, "education": e,
         "n": float(rng.integers(100, 1000))}
        for g, a, e in itertools.product(GENRES, M.ADULT_AGES, EDU)
    ]
    pd.DataFrame(seed).to_parquet(tmp_path / "strata_cells_pruid.parquet")
    rows = []
    for code in ["24001", "24002", "24003"]:
        for g, a in itertools.product(GENRES, M.AGES):
            rows.append({"code": code, "nom": f"U{code}", "tableau": "age_genre", "genre": g, "age": a,
                         "education": None, "n": float(rng.integers(200, 2000))})
        for g, e in itertools.product(GENRES, EDU):
            rows.append({"code": code, "nom": f"U{code}", "tableau": "education_genre", "genre": g, "age": None,
                         "education": e, "n": float(rng.integers(500, 5000))})
    pd.DataFrame(rows).to_parquet(tmp_path / "strata_marginals_circonscription_federale_2013.parquet")
    return tmp_path


def test_recode_age():
    r = M.recode_age([14, 18, 19, 20, 34, 80])
    assert pd.isna(r.iloc[0])
    assert list(r.iloc[1:]) == ["15_19", "15_19", "20_24", "25_34", "75_plus"]


def test_build_poststrat_matches_marginals(data_dir):
    cells = M.build_poststrat("circonscription_federale_2013", adults_only=False)
    m = pd.read_parquet(data_dir / "strata_marginals_circonscription_federale_2013.parquet")
    ag = m[(m.tableau == "age_genre") & m.age.isin(M.ADULT_AGES)].set_index(["code", "genre", "age"]).n
    got = cells.groupby(["code", "genre", "age"]).n.sum()
    assert np.allclose(got.sort_index(), ag.reindex(got.index).sort_index(), rtol=1e-4)
    edu_share = cells.groupby(["code", "genre", "education"]).n.sum() / cells.groupby(["code", "genre"]).n.sum()
    eg = m[m.tableau == "education_genre"].set_index(["code", "genre", "education"]).n
    eg_share = eg / eg.groupby(level=[0, 1]).transform("sum")
    assert np.allclose(edu_share.sort_index(), eg_share.reindex(edu_share.index).sort_index(), atol=1e-4)


def test_fit_and_poststrat_recover_signal(data_dir):
    cells = M.build_poststrat("circonscription_federale_2013")
    rng = np.random.default_rng(1)
    edu_eff = dict(zip(EDU, [-1.0, -0.3, 0.3, 1.0]))
    idx = rng.choice(len(cells), size=800, p=(cells.n / cells.n.sum()).to_numpy())
    svy = cells.iloc[idx].copy()
    svy["y"] = rng.binomial(1, 1 / (1 + np.exp(-svy.education.map(edu_eff))))
    fit = M.mrp_fit(svy, "y", ["age", "genre", "education"], area="code", draws=200, warmup=200, chains=1)
    edu_z = np.median(fit.samples["z_education"] * fit.samples["sigma_education"][:, None], axis=0)
    order = [fit.levels["education"].index(e) for e in EDU]
    assert np.all(np.diff(edu_z[order]) > 0)
    res = M.mrp_poststrat(fit, cells)
    assert set(res.code) == {"24001", "24002", "24003"}
    assert ((res.lo <= res.estimate) & (res.estimate <= res.hi)).all()
    assert res.n_repondants.sum() == len(svy)
