"""Générateur DÉTERMINISTE de la fixture des primitives statistiques (bead aat.2).

Produit deux artefacts commités, partagés par les tests TS (vitest) et Python
(pytest) :

- ``tests/fixtures/microdata_fixture.parquet`` — un mini-Parquet répondant-niveau
  au contrat DECISION_microdata_parquet (colonnes ``__respondent_id`` /
  ``__survey_id`` / ``__weight`` + variables RAW), avec poids non uniformes,
  valeurs NULL structurelles et codes de refus, pour exercer NULL/exclude.
- ``tests/fixtures/microdata_expected.json`` — les valeurs de RÉFÉRENCE de chaque
  primitive, calculées ici avec des bibliothèques INDÉPENDANTES de notre code
  (numpy pour la corrélation pondérée, statsmodels WLS pour OLS/ANOVA, scipy pour
  les p-values et le t de Welch). C'est la vérité-terrain contre laquelle le cœur
  TS (``executeMicrodataQuery``) et la ré-implémentation pytest sont validés.

Régénérer : ``uv run python -m tests.gen_microdata_fixture``.
"""

from __future__ import annotations

import json
from pathlib import Path

import numpy as np
import pyarrow as pa
import pyarrow.parquet as pq
import statsmodels.api as sm
from scipy import stats

FIX_DIR = Path(__file__).parent / "fixtures"
PARQUET = FIX_DIR / "microdata_fixture.parquet"
EXPECTED = FIX_DIR / "microdata_expected.json"

SURVEY_ID = "fixture_survey"
REFUS_X = 99  # code de refus de la cible X (échelle 0..10)
REFUS_Y = 999  # code de refus de la cible Y (thermomètre 0..100)


def build_frame() -> dict[str, np.ndarray]:
    rng = np.random.default_rng(20260723)
    n = 240

    weight = np.round(rng.uniform(0.3, 3.0, n), 6)  # poids non uniformes
    gender = rng.integers(1, 3, n)  # 1/2
    age = rng.integers(1, 4, n)  # 3 groupes 1/2/3 (pour ANOVA)

    # X = échelle 0..10 corrélée à l'âge ; Y = thermomètre 0..100 corrélé à X.
    x = np.clip(np.round(2 + 1.5 * age + rng.normal(0, 2, n)), 0, 10).astype(float)
    y = np.clip(np.round(30 + 4.0 * x + rng.normal(0, 12, n)), 0, 100).astype(float)

    # Injecter des refus (codes conservés RAW) et des NULL structurels.
    x_codes = x.copy()
    y_codes = y.copy()
    x_codes[rng.choice(n, 12, replace=False)] = REFUS_X
    y_codes[rng.choice(n, 10, replace=False)] = REFUS_Y
    y_codes[rng.choice(n, 6, replace=False)] = np.nan  # NULL structurel

    return {
        "__respondent_id": np.arange(n, dtype=np.int64),
        "__survey_id": np.array([SURVEY_ID] * n),
        "__weight": weight.astype(np.float64),
        "GENDER": gender.astype(np.int16),
        "AGEGRP": age.astype(np.int16),
        "XSCALE": x_codes.astype(np.float64),
        "YTHERM": y_codes.astype(np.float64),
    }


def write_parquet(cols: dict[str, np.ndarray]) -> None:
    FIX_DIR.mkdir(parents=True, exist_ok=True)
    arrays = {}
    for k, v in cols.items():
        if k == "YTHERM":
            # NaN -> NULL Parquet (missing structurel), refus conservés.
            mask = np.isnan(v)
            arrays[k] = pa.array(v, mask=mask, type=pa.float64())
        else:
            arrays[k] = pa.array(v)
    pq.write_table(pa.table(arrays), PARQUET)


# --------------------------------------------------------------------------- #
# Références statistiques pondérées (bibliothèques indépendantes)              #
# --------------------------------------------------------------------------- #
def kish_se_mean(x: np.ndarray, w: np.ndarray) -> float:
    """SE d'une moyenne pondérée : sqrt(var_w / (n_eff - 1)) (Kish + Bessel)."""
    sw = w.sum()
    mean = (w * x).sum() / sw
    var_w = (w * x * x).sum() / sw - mean**2
    n_eff = sw**2 / (w * w).sum()
    return float(np.sqrt(max(var_w, 0.0) / (n_eff - 1)))


def kish_neff(w: np.ndarray) -> float:
    return float(w.sum() ** 2 / (w * w).sum())


def weighted_mean(x: np.ndarray, w: np.ndarray) -> float:
    return float((w * x).sum() / w.sum())


def proportion_ref(codes: np.ndarray, w: np.ndarray) -> list[dict]:
    """Distribution pondérée + SE de proportion (indicateur, n_eff global)."""
    sw = w.sum()
    n_eff = kish_neff(w)
    out = []
    for code in sorted(np.unique(codes)):
        m = codes == code
        cw = w[m].sum()
        p = cw / sw
        se = np.sqrt(max(p * (1 - p), 0.0) / (n_eff - 1))
        out.append(
            {
                "target_code": int(code),
                "raw_n": int(m.sum()),
                "weighted_n": float(cw),
                "share": float(p),
                "share_se": float(se),
            }
        )
    return out


def corr_ref(x: np.ndarray, y: np.ndarray, w: np.ndarray) -> dict:
    cov = np.cov(x, y, aweights=w)  # numpy : covariance pondérée (indépendant)
    r = float(cov[0, 1] / np.sqrt(cov[0, 0] * cov[1, 1]))
    n = len(x)
    df = n - 2
    t = r * np.sqrt(df / (1 - r * r))
    p = float(2 * stats.t.sf(abs(t), df))
    return {"r": r, "t": float(t), "df": df, "p_value": p, "raw_n": n}


def ols_ref(x: np.ndarray, y: np.ndarray, w: np.ndarray) -> dict:
    # statsmodels WLS : référence indépendante pour pente/ordonnée/SE.
    model = sm.WLS(y, sm.add_constant(x), weights=w).fit()
    return {
        "intercept": float(model.params[0]),
        "slope": float(model.params[1]),
        "se_slope": float(model.bse[1]),
        "t_slope": float(model.tvalues[1]),
        "df": int(model.df_resid),
        "p_value": float(model.pvalues[1]),
        "r_squared": float(model.rsquared),
        "raw_n": int(model.nobs),
    }


def welch_ref(x1, w1, x2, w2) -> dict:
    m1, m2 = weighted_mean(x1, w1), weighted_mean(x2, w2)
    se1, se2 = kish_se_mean(x1, w1), kish_se_mean(x2, w2)
    v1, v2 = kish_neff(w1) - 1, kish_neff(w2) - 1
    diff = m1 - m2
    se_diff = np.sqrt(se1**2 + se2**2)
    t = diff / se_diff
    df = (se1**2 + se2**2) ** 2 / (se1**4 / v1 + se2**4 / v2)
    p = float(2 * stats.t.sf(abs(t), df))
    return {"diff": float(diff), "t": float(t), "df": float(df), "p_value": p}


def anova_ref(y: np.ndarray, g: np.ndarray, w: np.ndarray) -> dict:
    # statsmodels WLS y ~ C(g) : F et df identiques à une ANOVA pondérée.
    import pandas as pd

    d = pd.DataFrame({"y": y, "g": g.astype(str), "w": w})
    model = sm.WLS.from_formula("y ~ C(g)", data=d, weights=d["w"]).fit()
    return {
        "f": float(model.fvalue),
        "df_between": int(model.df_model),
        "df_within": int(model.df_resid),
        "p_value": float(model.f_pvalue),
    }


def build_expected(cols: dict[str, np.ndarray]) -> dict:
    w = cols["__weight"]
    gender = cols["GENDER"]
    age = cols["AGEGRP"]
    xs = cols["XSCALE"]
    yt = cols["YTHERM"]

    # Masques : NULL (NaN) exclu ; refus exclu quand demandé.
    x_ok = ~np.isnan(xs) & (xs != REFUS_X)
    y_ok = ~np.isnan(yt) & (yt != REFUS_Y)
    xy = x_ok & y_ok

    # 1) SE de proportion (distribution GENDER, aucun NULL/refus).
    prop = proportion_ref(gender, w)

    # 2) t-test de moyenne (XSCALE par GENDER, refus X exclu).
    g1 = (gender == 1) & x_ok
    g2 = (gender == 2) & x_ok
    ttest_mean = welch_ref(xs[g1], w[g1], xs[g2], w[g2])
    ttest_mean["mean1"] = weighted_mean(xs[g1], w[g1])
    ttest_mean["mean2"] = weighted_mean(xs[g2], w[g2])
    ttest_mean["se1"] = kish_se_mean(xs[g1], w[g1])
    ttest_mean["se2"] = kish_se_mean(xs[g2], w[g2])

    # 2b) t-test de proportion (succès XSCALE>=6 par GENDER, sur X valide).
    succ = (xs >= 6).astype(float)
    p1 = (gender == 1) & x_ok
    p2 = (gender == 2) & x_ok
    ttest_prop = welch_ref(succ[p1], w[p1], succ[p2], w[p2])

    # 3) Corrélation de Pearson pondérée XSCALE × YTHERM.
    corr = corr_ref(xs[xy], yt[xy], w[xy])

    # 4) OLS bivariée YTHERM ~ XSCALE.
    ols = ols_ref(xs[xy], yt[xy], w[xy])

    # 5) ANOVA XSCALE par AGEGRP (3 groupes, refus X exclu).
    anova = anova_ref(xs[x_ok], age[x_ok], w[x_ok])

    return {
        "survey_id": SURVEY_ID,
        "refus_x": REFUS_X,
        "refus_y": REFUS_Y,
        "proportion_gender": prop,
        "ttest_mean_xscale_by_gender": ttest_mean,
        "ttest_prop_xge6_by_gender": ttest_prop,
        "corr_xscale_ytherm": corr,
        "ols_ytherm_on_xscale": ols,
        "anova_xscale_by_agegrp": anova,
    }


def main() -> None:
    cols = build_frame()
    write_parquet(cols)
    expected = build_expected(cols)
    EXPECTED.write_text(json.dumps(expected, indent=2, ensure_ascii=False))
    print(f"wrote {PARQUET} and {EXPECTED}")
    print(json.dumps(expected, indent=2))


if __name__ == "__main__":
    main()
