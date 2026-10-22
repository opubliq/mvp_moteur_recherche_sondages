/**
 * Test de fumée de bout en bout du pool custom (docs/python_sandbox.md) via le
 * VRAI chemin TypeScript (AcaSessionsExecutor + createRunPythonTool + prélude) :
 *   1. téléverse un petit Parquet synthétique (2 000 lignes, 50 groupes) ;
 *   2. le lit (`load`) — mesure le démarrage à froid ;
 *   3. ajuste une régression logistique hiérarchique numpyro (NUTS) ;
 *   4. renvoie une figure matplotlib (sauvée en PNG localement).
 *
 * Usage (Node ≥ 22) :
 *   node --experimental-transform-types scripts/smoke_custom_pool.ts
 *     [--endpoint https://<pool>.<env>.canadaeast.azurecontainerapps.io]   (défaut : $ACA_SESSIONS_CUSTOM_POOL_ENDPOINT)
 *     [--local http://localhost:8080]   (conteneur local `docker run -p 8080:8080`, sans jeton)
 *     [--out <dossier>]                 (PNG des figures ; défaut : dossier temporaire)
 * Jeton : `az account get-access-token --resource https://dynamicsessions.io` (rôle
 * « Azure ContainerApps Session Executor » requis sur le pool).
 */
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DuckDBInstance } from "@duckdb/node-api";
import {
  AcaSessionsExecutor,
  createRunPythonTool,
  DYNAMIC_SESSIONS_AUDIENCE,
  type RunPythonResult,
} from "../src/logic/pythonSandbox.ts";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

const local = arg("local");
const endpoint = arg("endpoint") ?? process.env.ACA_SESSIONS_CUSTOM_POOL_ENDPOINT;
if (!local && !endpoint) throw new Error("--endpoint ou ACA_SESSIONS_CUSTOM_POOL_ENDPOINT requis (ou --local)");
const outDir = arg("out") ?? mkdtempSync(join(tmpdir(), "smoke-pool-"));

// --- Parquet synthétique : y ~ Bernoulli(logit⁻¹(-0.3 + 0.8 x + u_g)), u_g ~ N(0, 0.7) ---
async function makeParquet(): Promise<Uint8Array> {
  const path = join(outDir, "smoke_mrp.parquet");
  const db = await DuckDBInstance.create(":memory:");
  const c = await db.connect();
  await c.run("SELECT setseed(0.42)");
  await c.run(`
    CREATE TABLE g AS SELECT i AS grp, 0.7 * sqrt(-2 * ln(random())) * cos(2 * pi() * random()) AS u FROM range(50) t(i);
    CREATE TABLE d AS
      SELECT r AS __respondent_id, 1.0 AS __weight, (r % 50)::INT AS grp,
             sqrt(-2 * ln(random())) * cos(2 * pi() * random()) AS x
      FROM range(2000) t(r);
    COPY (
      SELECT d.__respondent_id, d.__weight, d.grp, d.x,
             (random() < 1 / (1 + exp(-(-0.3 + 0.8 * d.x + g.u))))::INT AS y
      FROM d JOIN g USING (grp) ORDER BY d.__respondent_id
    ) TO '${path}' (FORMAT parquet);`);
  c.closeSync();
  return new Uint8Array(readFileSync(path));
}

const FIT = `
import time, numpy as np, jax, jax.numpy as jnp, numpyro, numpyro.distributions as dist
from numpyro.infer import MCMC, NUTS
import matplotlib.pyplot as plt
numpyro.set_host_device_count(2)
df = load("smoke_mrp")
g = df["grp"].to_numpy(); x = df["x"].to_numpy(); y = df["y"].to_numpy()
G = int(g.max()) + 1
def model(g, x, y=None):
    a = numpyro.sample("a", dist.Normal(0, 2)); b = numpyro.sample("b", dist.Normal(0, 2))
    s = numpyro.sample("s", dist.HalfNormal(1))
    with numpyro.plate("G", G):
        z = numpyro.sample("z", dist.Normal(0, 1))
    numpyro.sample("y", dist.Bernoulli(logits=a + b * x + s * z[g]), obs=y)
t0 = time.time()
mcmc = MCMC(NUTS(model), num_warmup=500, num_samples=500, num_chains=2, chain_method="parallel", progress_bar=False)
mcmc.run(jax.random.PRNGKey(0), g, x, y)
fit_s = time.time() - t0
p = mcmc.get_samples()
u = (p["s"][:, None] * p["z"]).mean(0)
fig, ax = plt.subplots()
ax.scatter(range(G), u); ax.set_title("Effets de groupe (moyenne a posteriori)")
print({"fit_s": round(fit_s, 1), "a": round(float(p["a"].mean()), 2), "b": round(float(p["b"].mean()), 2),
       "s": round(float(p["s"].mean()), 2), "devices": jax.local_device_count(), "jax": jax.__version__})
`;

const getToken = local
  ? async () => "local"
  : async () =>
      execFileSync("az", ["account", "get-access-token", "--resource", DYNAMIC_SESSIONS_AUDIENCE, "--query", "accessToken", "-o", "tsv"], {
        encoding: "utf8",
      }).trim();

// En local, l'exécuteur exige https : on réécrit l'origine vers le conteneur.
const FAKE = "https://local.invalid";
const fetchImpl: typeof fetch = local
  ? (input, init) => fetch(String(input).replace(FAKE, local.replace(/\/+$/, "")), init)
  : fetch;

const executor = new AcaSessionsExecutor({ poolManagementEndpoint: local ? FAKE : endpoint!, getToken, fetch: fetchImpl });
const parquet = await makeParquet();
const tool = createRunPythonTool({
  executor,
  sessionId: `smoke-${crypto.randomUUID()}`,
  poolKind: "custom",
  fetchParquet: async () => parquet,
  limits: { timeoutSeconds: 200 },
});

async function step(label: string, args: Record<string, unknown>): Promise<RunPythonResult> {
  const t0 = Date.now();
  const r = await tool.run(args);
  const s = ((Date.now() - t0) / 1000).toFixed(1);
  if ("error" in r && !("figures" in r)) throw new Error(`${label}: ${r.error}`);
  const res = r as RunPythonResult;
  console.log(`[${label}] ${s} s`, JSON.stringify({ ...res, figures: res.figures.map((f) => f.id) }).slice(0, 600));
  return res;
}

console.log(`cible : ${local ?? endpoint} ; Parquet ${parquet.byteLength} o`);
await step("froid: upload + lecture", {
  code: "df = load('smoke_mrp'); import sys; print(df.shape, df['y'].mean().round(3), sys.version.split()[0])",
  survey_ids: ["smoke_mrp"],
});
await step("chaud: lecture", { code: "len(df)" });
const fit = await step("numpyro hiérarchique", { code: FIT, survey_ids: ["smoke_mrp"] });
fit.figures.forEach((f, i) => writeFileSync(join(outDir, `fig-${i + 1}.png`), Buffer.from(f.base64, "base64")));
if (fit.figures.length === 0) throw new Error("aucune figure renvoyée");
console.log(`figures : ${outDir}`);
