"""Exécuté au build (utilisateur non-root) : vérifie les imports et pré-remplit
le cache de compilation C de PyTensor (~/.pytensor), sinon chaque session
froide recompile les ops de base de PyMC/Bambi."""

import importlib

for m in [
    "pandas", "numpy", "pyarrow.parquet", "statsmodels.api", "scipy.stats", "sklearn",
    "matplotlib", "plotnine", "jax", "numpyro", "pymc", "bambi", "arviz", "opubliq_mrp",
]:
    mod = importlib.import_module(m)
    print(m, getattr(mod, "__version__", ""))

import numpy as np
import pymc as pm

rng = np.random.default_rng(0)
g = rng.integers(0, 5, 200)
y = rng.binomial(1, 0.4, 200)
with pm.Model():
    a = pm.Normal("a", 0, 1)
    s = pm.HalfNormal("s", 1)
    z = pm.Normal("z", 0, 1, shape=5)
    pm.Bernoulli("y", logit_p=a + s * z[g], observed=y)
    pm.sample(draws=20, tune=20, chains=1, cores=1, progressbar=False, random_seed=0)
print("warmup ok")
