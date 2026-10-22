"""MRP clé en main pour l'agent : table de post-stratification, modèle hiérarchique, projection.

Usage typique dans run_python (census_niveaux doit inclure le niveau CIBLE et 'pruid') :

    cells = build_poststrat("circonscription_federale_2013")
    fit = mrp_fit(df, y="y", groups=["age", "genre", "education", "province"],
                  area="fed", area_df=load_census_strata("circonscription_federale_2013"),
                  area_vars=["pct_bac_plus_25_64", "pct_lm_francais"])
    res = mrp_poststrat(fit, cells, area_df=load_census_strata("circonscription_federale_2013"))

Les catégories du sondage doivent être recodées dans celles du recensement (voir CATEGORIES et recode_age).
Choix par défaut (à revoir après revue de littérature) : priors faiblement informatifs, effets aléatoires
non centrés, poids d'enquête ignorés dans la vraisemblance, intervalle à 90 %.
"""

from __future__ import annotations

import os
import time
from dataclasses import dataclass, field

import numpy as np
import pandas as pd

DATA_DIR = os.environ.get("SANDBOX_DATA_DIR", "/mnt/data")

AGES = ["0_14", "15_19", "20_24", "25_34", "35_44", "45_54", "55_64", "65_74", "75_plus"]
ADULT_AGES = AGES[1:]
CATEGORIES = {
    "genre": ["homme", "femme"],
    "age": ADULT_AGES,
    "education": ["aucun", "secondaire", "postsec_inf_bac", "bac_plus"],
    "langue": ["francais", "anglais", "autre"],
}
# Part des 18-19 ans dans le groupe 15-19 (hypothèse de répartition uniforme par année d'âge).
SHARE_18_19_IN_15_19 = 0.4

# Niveaux québécois seulement (codes sans préfixe provincial) : semence provinciale = Québec.
_QC_ONLY_LEVELS = {"code_postal", "rta", "municipalite", "mrc", "region_administrative", "rmr", "circonscription_2026"}


MRP_REFERENCE = {
    "structure": (
        "Structure du modèle",
        "Les variables de post-stratification (âge, genre, scolarité) entrent comme EFFETS ALÉATOIRES : le partial "
        "pooling stabilise les cellules petites ou vides (Downes & Carlin 2019, 2020 ; Gelman 2007). Avec très peu de "
        "répondants par circonscription, une hiérarchie géographique intermédiaire (province au-dessus de la "
        "circonscription) aide : l'estimation d'une circonscription est alors portée par sa province et ses "
        "covariables (Zhang et al. 2014 ; Si 2020). Les PRÉDICTEURS D'UNITÉ (part de francophones, de diplômés, "
        "revenu, part des 65+) sont le levier le plus documenté contre le sur-lissage des petites unités (Downes & "
        "Carlin 2020 ; Gelman & Carpenter 2020) — à condition d'être liés à la variable étudiée. Alternatives plus "
        "lourdes (interactions profondes, autoMrP, stacking) : utiles avec de gros échantillons, gains incertains "
        "sinon (Ghitza & Gelman 2013 ; Broniecki et al. 2020 ; Ornstein 2019).",
    ),
    "priors": (
        "Priors et paramétrisation",
        "Prédicteurs continus standardisés, priors faiblement informatifs sur les coefficients logit (Gelman et al. "
        "2008), priors modérément régularisants sur les écarts-types des effets de groupe, paramétrisation NON "
        "CENTRÉE pour éviter les pathologies des modèles hiérarchiques (Papaspiliopoulos et al. 2007 ; Betancourt & "
        "Girolami 2013). Désaccord sur le prior exact des écarts-types : une simulation favorise des priors peu "
        "contraignants (Bruch & Felderer 2022), la littérature bayésienne plus large des priors half-normal ou PC "
        "adaptés à l'échelle (Klein & Kneib 2016). Ici : HalfNormal(1) sur les écarts-types, Normal(0, 1) sur les "
        "prédicteurs standardisés, Normal(0, 2.5) sur l'intercept. Convergence : R-hat < 1.01 et aucune divergence "
        "(Vehtari et al. 2019).",
    ),
    "poids": (
        "Poids d'enquête",
        "Consensus modéré : NE PAS mettre les poids individuels dans la vraisemblance multiniveau par défaut. Quand les "
        "variables de pondération sont modélisées, le MRP non pondéré fait aussi bien ou mieux, et la "
        "pseudo-vraisemblance pondérée est fragile avec de petits groupes (Zhang et al. 2015 ; Rabe-Hesketh & "
        "Skrondal 2006). C'est la post-stratification qui corrige la composition de l'échantillon. Alternative si la "
        "sélection dépend d'autre chose que les variables modélisées : ajouter les poids (ou probabilités "
        "d'inclusion) comme prédicteur ou variable de post-stratification (Si 2020 ; Gelman, Si & West ; "
        "Vandendijck et al. 2016).",
    ),
    "cadre": (
        "Table de post-stratification reconstruite (IPF / MrsP)",
        "Quand seules les marges sont publiées, reconstruire les cellules (raking/IPF, ou MrsP) est valide pour un "
        "usage courant (Leemann & Wasserfallen 2017 ; Li & Si 2022) ; MrsP fait souvent aussi bien que le MRP "
        "standard. Ici : âge × genre × scolarité n'est publié que par province/RMR (StatCan 98-10-0386), donc semence "
        "provinciale rakée aux marges locales âge × genre et scolarité × genre. Hypothèse : la corrélation "
        "âge-scolarité de la province vaut dans chaque unité. Limite : l'incertitude de cette table n'est PAS "
        "propagée, d'où des intervalles un peu trop étroits ; les approches « embedded MRP » la propagent "
        "(Li & Si 2022).",
    ),
    "projection": (
        "Projection à des niveaux plus fins",
        "Projeter sous le niveau où le répondant est localisé (ex. modèle par circonscription, projection par RTA ou "
        "code postal) n'est soutenu que CONDITIONNELLEMENT : ça marche quand les prédicteurs du niveau fin portent "
        "un vrai signal, sinon l'estimation devient « synthétique » (elle reflète surtout la composition "
        "démographique locale) (Zhang et al. 2015 ; Rufat & Howe 2022 ; Taylor et al. 2016). Évidence faible : à "
        "présenter comme EXPLORATOIRE. Les priors spatiaux donnent des résultats mitigés (Leemann & Wasserfallen "
        "2020 ; Sutton et al. 2025).",
    ),
    "validation": (
        "Validation",
        "Valider les estimations PAR UNITÉ, pas seulement la prédiction individuelle : comparaison à des estimations "
        "directes quand n est grand, et validation externe contre des résultats électoraux, des données "
        "administratives ou des sondages locaux (Zhang et al. 2015 ; Park, Gelman & Bafumi 2004). Ordres de "
        "grandeur publiés : corrélations de 0,85 à 0,99 en santé publique, nettement moins bonnes et variables selon "
        "les enjeux pour l'opinion avec des tailles d'échantillon nationales usuelles (Buttice & Highton 2013). La "
        "validation croisée au niveau individuel (PSIS-LOO) peut induire en erreur pour des estimations par unité "
        "(Kuh et al. 2022). Pas encore de validation maison : prévue contre les résultats électoraux par "
        "circonscription.",
    ),
    "incertitude": (
        "Incertitude et seuils de publication",
        "Pas de seuil universel de « n minimal par circonscription » dans la littérature : la fiabilité se juge par "
        "l'incertitude a posteriori (largeur d'intervalle, coefficient de variation) et la validation externe ; le "
        "lissage bayésien sert justement à produire des estimations pour des unités avec peu ou pas de répondants "
        "(Jiang & Rao 2020 ; Hogg et al. 2023). Pour un public non technique, montrer les intervalles ou un niveau "
        "de fiabilité gradué améliore les décisions sans miner la confiance, à condition que les cartes ne soient "
        "pas lues comme déterministes (Joslyn & Savelli 2021).",
    ),
    "pieges": (
        "Pièges connus",
        "Sur-lissage des plus petites unités ; effets fixes de contexte qui sur-ajustent (ils ne sont pas rétrécis "
        "comme les effets de groupe) ; métriques de validation individuelles trompeuses pour des estimations par "
        "unité ; tables synthétiques qui cachent de l'incertitude (Downes & Carlin 2020 ; Broniecki et al. 2020 ; "
        "Kuh et al. 2022 ; Cerina & Duch 2021). D'où un flux de travail conservateur plutôt qu'un modèle maximal.",
    ),
    "ouvert": (
        "Questions ouvertes dans la littérature",
        "Quand des priors spatiaux améliorent-ils le MRP par circonscription au-delà de bons prédicteurs non "
        "spatiaux ? Combien d'incertitude la table reconstruite devrait-elle ajouter aux intervalles ? Quelle règle "
        "(largeur d'intervalle, CV, erreur de validation) pour décider de publier une petite unité ? Et très peu "
        "d'applications canadiennes publiées (Lai 2024).",
    ),
}


def mrp_reference(sujet: str | None = None) -> None:
    """Explications détaillées et sources sur le MRP (revue de littérature). Sans argument : liste des sujets.
    À utiliser pour justifier un choix de méthode ou répondre à une question de l'usager sur le MRP."""
    if not sujet:
        print("Sujets : " + ", ".join(f"{k} ({v[0]})" for k, v in MRP_REFERENCE.items()))
        print("Usage : mrp_reference('poids')")
        return
    key = sujet.lower().strip()
    if key not in MRP_REFERENCE:
        print(f"Sujet inconnu : {sujet}. Sujets : {', '.join(MRP_REFERENCE)}")
        return
    titre, texte = MRP_REFERENCE[key]
    print(f"{titre}\n\n{texte}")


def recode_age(years) -> pd.Series:
    """Âge en années → groupe du recensement (15_19 ... 75_plus). Moins de 15 ans → NaN."""
    a = pd.to_numeric(pd.Series(years), errors="coerce")
    bins = [15, 20, 25, 35, 45, 55, 65, 75, 200]
    return pd.cut(a, bins=bins, right=False, labels=ADULT_AGES).astype(object)


def _read_strata(niveau: str, kind: str) -> pd.DataFrame:
    path = os.path.join(DATA_DIR, f"strata_{kind}_{niveau}.parquet")
    if not os.path.exists(path):
        raise FileNotFoundError(f"{path} absent : passe census_niveaux=['{niveau}', 'pruid'] dans l'appel run_python")
    return pd.read_parquet(path)


def _province_of(niveau: str, codes: pd.Series) -> pd.Series:
    if niveau in _QC_ONLY_LEVELS:
        return pd.Series("24", index=codes.index)
    if niveau == "pruid":
        return codes.astype(str)
    return codes.astype(str).str[:2]


def build_poststrat(niveau: str, adults_only: bool = True, max_iter: int = 100, tol: float = 1e-6) -> pd.DataFrame:
    """Table de post-stratification genre × age × education par unité du niveau CIBLE.

    Semence = cellules provinciales age_genre_education (StatCan 98-10-0386), rakée (IPF) vers les marges
    locales age_genre (15+) et education_genre de chaque unité. La marge d'éducation (univers 15+ en ménages
    privés) est recalée sur le total 15+ de age_genre, par genre. Si adults_only, le groupe 15_19 est réduit
    à SHARE_18_19_IN_15_19 (approximation des 18-19 ans).
    Retourne : code, nom, province, genre, age, education, n.
    """
    m = _read_strata(niveau, "marginals")
    seed = _read_strata("pruid", "cells")
    seed = seed[seed["tableau"] == "age_genre_education"][["code", "genre", "age", "education", "n"]]
    seed = seed.rename(columns={"code": "province", "n": "n0"})

    ag = m[(m["tableau"] == "age_genre") & (m["age"].isin(ADULT_AGES))][["code", "nom", "genre", "age", "n"]]
    eg = m[m["tableau"] == "education_genre"][["code", "genre", "education", "n"]]
    tot_ag = ag.groupby(["code", "genre"])["n"].sum().rename("tot_ag")
    eg = eg.join(tot_ag, on=["code", "genre"])
    eg["n"] = eg["n"] / eg.groupby(["code", "genre"])["n"].transform("sum") * eg["tot_ag"]
    eg = eg.drop(columns="tot_ag").dropna()

    units = ag[["code", "nom"]].drop_duplicates()
    units = units[units["code"].isin(eg["code"].unique())].copy()
    units["province"] = _province_of(niveau, units["code"]).values
    cells = units.merge(seed, on="province", how="inner")
    if cells.empty:
        raise ValueError("aucune semence provinciale trouvée pour ce niveau (charger 'pruid' dans census_niveaux)")
    cells["n"] = cells["n0"].clip(lower=1e-6)

    t_ag = ag.set_index(["code", "genre", "age"])["n"]
    t_eg = eg.set_index(["code", "genre", "education"])["n"]
    k_ag = pd.MultiIndex.from_frame(cells[["code", "genre", "age"]])
    k_eg = pd.MultiIndex.from_frame(cells[["code", "genre", "education"]])
    target_ag = t_ag.reindex(k_ag).to_numpy()
    target_eg = t_eg.reindex(k_eg).to_numpy()
    for _ in range(max_iter):
        for keys, target in ((["code", "genre", "age"], target_ag), (["code", "genre", "education"], target_eg)):
            cur = cells.groupby(keys)["n"].transform("sum").to_numpy()
            with np.errstate(divide="ignore", invalid="ignore"):
                f = np.where(cur > 0, target / cur, 0.0)
            cells["n"] = cells["n"].to_numpy() * np.nan_to_num(f, nan=0.0)
        cur = cells.groupby(["code", "genre", "age"])["n"].transform("sum").to_numpy()
        if np.nanmax(np.abs(cur - np.nan_to_num(target_ag))) < tol * max(1.0, np.nanmax(target_ag)):
            break

    if adults_only:
        cells.loc[cells["age"] == "15_19", "n"] *= SHARE_18_19_IN_15_19
    cells = cells[cells["n"] > 0]
    return cells[["code", "nom", "province", "genre", "age", "education", "n"]].reset_index(drop=True)


@dataclass
class MRPFit:
    groups: list[str]
    levels: dict[str, list[str]]
    area: str | None
    area_levels: list[str]
    area_vars: list[str]
    area_mean: np.ndarray
    area_sd: np.ndarray
    samples: dict[str, np.ndarray]
    n_respondents: int
    n_by_area: dict[str, int] = field(default_factory=dict)
    seconds: float = 0.0
    max_rhat: float = float("nan")
    divergences: int = 0

    @property
    def converged(self) -> bool:
        return self.divergences == 0 and (np.isnan(self.max_rhat) or self.max_rhat < 1.01)

    def summary(self) -> str:
        s = self.samples
        parts = [f"n={self.n_respondents}", f"tirages={len(s['alpha'])}", f"{self.seconds:.0f}s",
                 f"rhat_max={self.max_rhat:.3f}", f"divergences={self.divergences}",
                 "CONVERGENCE OK" if self.converged else "ATTENTION : convergence douteuse (augmente warmup/draws)"]
        for g in self.groups:
            parts.append(f"sd[{g}]={np.median(s['sigma_' + g]):.2f}")
        if self.area:
            parts.append(f"sd[{self.area}]={np.median(s['sigma_area']):.2f}")
        for i, v in enumerate(self.area_vars):
            parts.append(f"b[{v}]={np.median(s['beta'][:, i]):+.2f}")
        return " | ".join(parts)


def _area_matrix(area_df: pd.DataFrame, codes, area_vars, mean, sd) -> np.ndarray:
    a = area_df.assign(code=area_df["code"].astype(str)).drop_duplicates("code").set_index("code")
    x = a.reindex([str(c) for c in codes])[area_vars].to_numpy(dtype=float)
    x = (x - mean) / sd
    return np.nan_to_num(x, nan=0.0)  # unité sans profil → valeur moyenne


def mrp_fit(
    df: pd.DataFrame,
    y: str,
    groups: list[str],
    area: str | None = None,
    area_df: pd.DataFrame | None = None,
    area_vars: list[str] | None = None,
    draws: int = 500,
    warmup: int = 500,
    chains: int = 2,
    seed: int = 0,
) -> MRPFit:
    """Logistique hiérarchique (numpyro, NUTS) : intercept + effet aléatoire par groupe (et par unité `area`)
    + prédicteurs d'unité standardisés tirés de area_df (colonne 'code' = valeurs de df[area]).
    Les lignes avec y ou un groupe manquant sont exclues. Poids d'enquête NON utilisés (la post-stratification corrige)."""
    import jax
    import jax.numpy as jnp
    import numpyro
    import numpyro.distributions as dist
    from numpyro.infer import MCMC, NUTS

    numpyro.set_host_device_count(max(chains, 1))
    area_vars = list(area_vars or [])
    cols = [y, *groups] + ([area] if area else [])
    d = df.dropna(subset=cols).copy()
    yy = pd.to_numeric(d[y]).astype(int).to_numpy()
    if not set(np.unique(yy)) <= {0, 1}:
        raise ValueError(f"{y} doit être 0/1")

    levels, idx = {}, {}
    for g in groups:
        lv = sorted(d[g].astype(str).unique())
        levels[g] = lv
        idx[g] = pd.Categorical(d[g].astype(str), categories=lv).codes
    area_levels, area_idx, x = [], None, None
    mean = np.zeros(len(area_vars))
    sd = np.ones(len(area_vars))
    if area:
        area_levels = sorted(d[area].astype(str).unique())
        area_idx = pd.Categorical(d[area].astype(str), categories=area_levels).codes
    if area_vars:
        if area_df is None or not area:
            raise ValueError("area_vars exige area et area_df")
        raw = area_df.assign(code=area_df["code"].astype(str))[area_vars].to_numpy(dtype=float)
        mean, sd = np.nanmean(raw, axis=0), np.nanstd(raw, axis=0)
        sd[sd == 0] = 1.0
        x = _area_matrix(area_df, d[area].astype(str), area_vars, mean, sd)

    def model():
        alpha = numpyro.sample("alpha", dist.Normal(0.0, 2.5))
        eta = alpha
        for g in groups:
            s = numpyro.sample(f"sigma_{g}", dist.HalfNormal(1.0))
            z = numpyro.sample(f"z_{g}", dist.Normal(0.0, 1.0).expand([len(levels[g])]))
            eta = eta + s * z[jnp.asarray(idx[g])]
        if area:
            s = numpyro.sample("sigma_area", dist.HalfNormal(1.0))
            z = numpyro.sample("z_area", dist.Normal(0.0, 1.0).expand([len(area_levels)]))
            eta = eta + s * z[jnp.asarray(area_idx)]
        if area_vars:
            b = numpyro.sample("beta", dist.Normal(0.0, 1.0).expand([len(area_vars)]))
            eta = eta + jnp.asarray(x) @ b
        numpyro.sample("y", dist.Bernoulli(logits=eta), obs=jnp.asarray(yy))

    t0 = time.time()
    mcmc = MCMC(NUTS(model), num_warmup=warmup, num_samples=draws, num_chains=chains,
                chain_method="parallel" if chains > 1 else "sequential", progress_bar=False)
    mcmc.run(jax.random.PRNGKey(seed))
    samples = {k: np.asarray(v) for k, v in mcmc.get_samples().items()}
    if "beta" not in samples:
        samples["beta"] = np.zeros((len(samples["alpha"]), 0))
    max_rhat = float("nan")
    if chains > 1:
        from numpyro.diagnostics import split_gelman_rubin
        by_chain = mcmc.get_samples(group_by_chain=True)
        max_rhat = float(max(np.nanmax(np.asarray(split_gelman_rubin(np.asarray(v)))) for v in by_chain.values()))
    divergences = int(np.asarray(mcmc.get_extra_fields()["diverging"]).sum())
    n_by_area = d[area].astype(str).value_counts().to_dict() if area else {}
    return MRPFit(groups, levels, area, area_levels, area_vars, mean, sd, samples, len(d), n_by_area,
                  time.time() - t0, max_rhat, divergences)


def _effects(fit: MRPFit, name: str, known: list[str], values: pd.Series, rng) -> np.ndarray:
    """Effets (tirages × lignes) ; une modalité absente du sondage reçoit un tirage N(0, sigma)."""
    s = fit.samples
    sigma = s["sigma_area" if name == "area" else f"sigma_{name}"]
    z = s["z_area" if name == "area" else f"z_{name}"]
    vals = values.astype(str).to_numpy()
    uniq, inv = np.unique(vals, return_inverse=True)
    pos = {lv: i for i, lv in enumerate(known)}
    cols = np.empty((len(sigma), len(uniq)))
    for j, u in enumerate(uniq):
        cols[:, j] = sigma * (z[:, pos[u]] if u in pos else rng.standard_normal(len(sigma)))
    return cols[:, inv]


def mrp_poststrat(
    fit: MRPFit,
    cells: pd.DataFrame,
    area_df: pd.DataFrame | None = None,
    by: str = "code",
    area_col: str | None = None,
    interval: float = 0.9,
    max_draws: int = 400,
    chunk_units: int = 2000,
    seed: int = 0,
) -> pd.DataFrame:
    """Projette le modèle sur la table de cellules et agrège par unité `by`.

    cells doit contenir les colonnes des groupes du modèle + n + by. area_df = profil du niveau CIBLE (colonne
    'code' = cells[by]) pour les prédicteurs d'unité. area_col : colonne de cells portant l'unité du modèle
    (défaut : by si le niveau cible = niveau du modèle ; sinon l'effet d'unité est tiré de N(0, sigma)).
    Retourne : by, nom, estimate (médiane), lo, hi, pop, n_repondants."""
    rng = np.random.default_rng(seed)
    s = fit.samples
    nd = len(s["alpha"])
    keep = np.arange(nd) if nd <= max_draws else np.linspace(0, nd - 1, max_draws).astype(int)
    s = {k: v[keep] for k, v in s.items()}
    sub = MRPFit(**{**fit.__dict__, "samples": s})
    missing = [g for g in fit.groups if g not in cells.columns]
    if missing:
        raise ValueError(f"colonnes absentes de cells : {missing}")

    c = cells.sort_values(by).reset_index(drop=True)
    unit_codes, starts = np.unique(c[by].astype(str).to_numpy(), return_index=True)
    order = np.argsort(starts)
    unit_codes, starts = unit_codes[order], starts[order]
    bounds = list(starts) + [len(c)]
    lo_q, hi_q = (1 - interval) / 2, 1 - (1 - interval) / 2
    acol = area_col or (by if fit.area else None)
    out = []
    for u0 in range(0, len(unit_codes), chunk_units):
        u1 = min(u0 + chunk_units, len(unit_codes))
        part = c.iloc[bounds[u0]:bounds[u1]]
        eta = np.repeat(s["alpha"][:, None], len(part), axis=1)
        for g in fit.groups:
            eta = eta + _effects(sub, g, fit.levels[g], part[g], rng)
        if fit.area and acol and acol in part.columns:
            eta = eta + _effects(sub, "area", fit.area_levels, part[acol], rng)
        elif fit.area:
            eta = eta + s["sigma_area"][:, None] * rng.standard_normal((len(keep), len(part)))
        if fit.area_vars:
            if area_df is None:
                raise ValueError("area_df (profil du niveau cible) requis : le modèle a des prédicteurs d'unité")
            x = _area_matrix(area_df, part[by].astype(str), fit.area_vars, fit.area_mean, fit.area_sd)
            eta = eta + s["beta"] @ x.T
        p = 1.0 / (1.0 + np.exp(-eta))
        n = part["n"].to_numpy(dtype=float)
        local = np.array(bounds[u0:u1 + 1]) - bounds[u0]
        num = np.add.reduceat(p * n, local[:-1], axis=1)
        den = np.add.reduceat(n, local[:-1])
        est = num / den
        for j, code in enumerate(unit_codes[u0:u1]):
            out.append((code, est[:, j], den[j]))
    names = c.drop_duplicates(by).set_index(c.drop_duplicates(by)[by].astype(str))
    res = pd.DataFrame({
        by: [o[0] for o in out],
        "estimate": [float(np.median(o[1])) for o in out],
        "lo": [float(np.quantile(o[1], lo_q)) for o in out],
        "hi": [float(np.quantile(o[1], hi_q)) for o in out],
        "pop": [o[2] for o in out],
    })
    if "nom" in names.columns:
        res.insert(1, "nom", names["nom"].reindex(res[by]).to_numpy())
    res["n_repondants"] = res[by].map(fit.n_by_area).fillna(0).astype(int) if fit.area else np.nan
    return res
