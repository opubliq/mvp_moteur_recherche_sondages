/**
 * Outil agent `run_python` (bead 9ou.4) — exécution de code Python en bac à
 * sable pour les analyses complexes (régressions, pondération, tendances,
 * profils) sur les micro-données des sondages.
 *
 * Cible : Azure Container Apps dynamic sessions (pool « PythonLTS », code
 * interpreter), appelé par son API REST (pool management endpoint + jeton Entra,
 * audience `https://dynamicsessions.io`). Le bac à sable ne reçoit AUCUN
 * identifiant de stockage : c'est le backend qui lit les Parquet du Blob et les
 * téléverse dans la session (API fichiers, `/mnt/data/<survey_id>.parquet`).
 *
 * Découpage (testable, remplaçable) :
 *  - `SandboxExecutor` : interface bas niveau (lister / téléverser / exécuter).
 *    `AcaSessionsExecutor` l'implémente en HTTP (fetch injectable).
 *  - `createRunPythonTool(deps)` : logique de l'outil (validation, plafond
 *    d'appels par requête, upload des Parquet manquants, enrobage du code,
 *    extraction figures/tableaux, troncature). UNE instance par requête agent.
 *  - `toModelPayload(result)` : ce qu'on renvoie au LLM (sans base64 d'images).
 *
 * Aucun `process.env` ici : la config est injectée (même esprit que
 * `MicrodataProvider` dans agent.ts). Intégration : docs/python_sandbox.md.
 */

// ---------------------------------------------------------------------------
// Schéma de l'outil (format function calling, comme TOOL_DEFS dans agent.ts)
// ---------------------------------------------------------------------------

export const RUN_PYTHON_TOOL_NAME = "run_python";

/**
 * Type de pool de sessions visé (`RUN_PYTHON_POOL_KIND`) :
 *  - `pythonlts` (défaut) : code interpreter géré par Azure ;
 *  - `custom` : pool `CustomContainer` avec notre image (sandbox/Dockerfile) qui
 *    réimplémente la même API REST (sandbox/server.py) et ajoute l'inférence
 *    bayésienne hiérarchique (numpyro/JAX, PyMC, Bambi, ArviZ) pour la MRP.
 * Seule la description de l'outil change : l'exécuteur HTTP est le même.
 */
export type SandboxPoolKind = "pythonlts" | "custom";

export function parsePoolKind(v: string | undefined): SandboxPoolKind {
  return v?.trim().toLowerCase() === "custom" ? "custom" : "pythonlts";
}

/**
 * Choix du pool depuis les app settings (objet injecté, pas `process.env`) :
 * `RUN_PYTHON_POOL_KIND=custom` → `ACA_SESSIONS_CUSTOM_POOL_ENDPOINT`, sinon
 * `ACA_SESSIONS_POOL_ENDPOINT` (comportement historique). Les deux endpoints
 * coexistent : revenir en arrière = retirer `RUN_PYTHON_POOL_KIND`.
 */
export function resolveSandboxPool(env: Record<string, string | undefined>): {
  kind: SandboxPoolKind;
  endpoint: string | undefined;
} {
  const kind = parsePoolKind(env.RUN_PYTHON_POOL_KIND);
  const endpoint = kind === "custom" ? env.ACA_SESSIONS_CUSTOM_POOL_ENDPOINT : env.ACA_SESSIONS_POOL_ENDPOINT;
  return { kind, endpoint: endpoint?.trim() || undefined };
}

const PYTHONLTS_PACKAGES ="pandas, numpy, statsmodels, scipy, scikit-learn, matplotlib, plotnine";
const CUSTOM_PACKAGES = `${PYTHONLTS_PACKAGES}, numpyro + jax (CPU), pymc, bambi, arviz`;

/** Phrase ajoutée à la description quand le pool custom est actif. */
export const CUSTOM_POOL_BAYES_HINT =
  "Inférence bayésienne hiérarchique disponible (MRP) : préfère numpyro (NUTS sur JAX, rapide ; 2 cœurs → " +
  "`num_chains=2, chain_method='parallel'`) ; pymc/bambi disponibles mais plus lents (compilation) ; arviz pour " +
  "les résumés. Garde le modèle compact (effets groupés, ~500 warmup/500 tirages) : timeout par appel. ";

function runPythonDescription(kind: SandboxPoolKind): string {
  const packages = kind === "custom" ? CUSTOM_PACKAGES : PYTHONLTS_PACKAGES;
  const bayes = kind === "custom" ? CUSTOM_POOL_BAYES_HINT : "";
  return (
    `Exécute du code Python (${packages}) dans un bac à sable isolé, ` +
    "pour les analyses que `crosstab` ne couvre pas : régressions multivariées, pondération, tendances entre sondages, profils. " +
    "Passe `survey_ids` pour charger les micro-données : chaque sondage est disponible dans `/mnt/data/<survey_id>.parquet` " +
    "et via `load('<survey_id>')` (DataFrame pandas). Colonnes : `__respondent_id`, `__weight` (poids, À UTILISER pour toute " +
    "estimation), puis les variables raw (codes ; labels via get_survey). " +
    "Passe `census_niveaux` (ex. `[\"circonscription_2026\"]`) pour charger, en plus, le profil de recensement 2021 de " +
    "TOUTES les unités de ce niveau géographique via `load_census_strata('<niveau>')` (DataFrame pandas, une ligne par " +
    "unité : `code`, `nom`, `population`, `menages`, puis des ratios agrégés `pct_*`/`revenu_*` par unité — PAS une table " +
    "de comptes croisés par cellule démographique). Utile pour joindre un niveau géo des micro-données de sondage à ces " +
    "covariables de territoire (ex. petite régression multiniveau + repondération approximative par zone) ; niveaux " +
    "disponibles via l'outil geo_profile (`niveaux`), dont `circonscription_federale_2013` (ordre des `fedname`/`feduid` " +
    "de ces_2021, ces_2025, eeq_2022) et `circonscription_federale_2023`. " +
    "POST-STRATIFICATION / MRP : `census_niveaux` charge aussi les COMPTES du recensement via " +
    "`load_strata('<niveau>', 'marginals'|'cells')` (format long : code, nom, tableau, genre, age, langue, education, n). " +
    "`ipf(seed, marginals, dims)` (raking) reconstruit les cellules croisées d'une unité à partir de ces marges. " +
    "AVANT tout MRP ou post-stratification, appelle `mrp_guide()` : il imprime un gabarit qui utilise les fonctions " +
    "prêtes (pool custom) `recode_age`, `build_poststrat`, `mrp_fit` (modèle hiérarchique bayésien) et `mrp_poststrat` " +
    "(estimations par unité avec intervalle 90 %) — utilise-les au lieu d'écrire ton propre modèle. " +
    bayes +
    "Les variables Python et les fichiers persistent " +
    "entre les appels d'une même conversation. Sortie : `print(...)` (tronquée), `show_table(df, title)` pour un petit tableau, " +
    "et les figures sont capturées automatiquement en PNG : toute figure matplotlib ouverte, et tout ggplot plotnine " +
    "(grammaire ggplot2 : `from plotnine import *`) affiché par `p.show()` ou laissé en dernière expression. Un style " +
    "sobre est déjà appliqué (fond blanc, palette de l'app dans `OPQ_PALETTE`) : n'ajoute pas de thème. Pas d'accès réseau. Seulement pour des sondages à has_microdata=true."
  );
}

export function runPythonToolDef(kind: SandboxPoolKind = "pythonlts") {
  return {
    type: "function",
    function: {
      name: RUN_PYTHON_TOOL_NAME,
      description: runPythonDescription(kind),
      parameters: {
        type: "object",
        properties: {
          code: { type: "string", description: "Code Python à exécuter." },
          survey_ids: {
            type: "array",
            description: "Sondages dont les micro-données doivent être chargées dans la session (optionnel si déjà chargés).",
            items: { type: "string" },
          },
          census_niveaux: {
            type: "array",
            description: "Niveaux géographiques (recensement 2021) à charger en bulk dans la session (optionnel si déjà chargés).",
            items: { type: "string" },
          },
        },
        required: ["code"],
        additionalProperties: false,
      },
    },
  } as const;
}

export type RunPythonToolDef = ReturnType<typeof runPythonToolDef>;

/** Définition par défaut (pool PythonLTS) — texte inchangé. */
export const RUN_PYTHON_TOOL_DEF: RunPythonToolDef = runPythonToolDef("pythonlts");

// ---------------------------------------------------------------------------
// Limites
// ---------------------------------------------------------------------------

export interface RunPythonLimits {
  /** Appels `run_python` max par requête agent. */
  maxCallsPerRequest: number;
  /** Timeout d'exécution (s) passé à la session. Plafond plateforme : 220 s. */
  timeoutSeconds: number;
  /** Longueur max du code soumis (caractères). */
  maxCodeChars: number;
  /** Sondages max par appel. */
  maxSurveysPerCall: number;
  /** Niveaux census max par appel (bulk export, bead 9ou.19). */
  maxCensusNiveauxPerCall: number;
  /** Taille max d'un Parquet téléversé (octets). Plafond plateforme : 128 Mo. */
  maxUploadBytes: number;
  /** Troncature de stdout / stderr renvoyés (caractères). */
  maxStdoutChars: number;
  maxStderrChars: number;
  /** Figures PNG max par appel, et taille max (base64, caractères) de chacune. */
  maxFigures: number;
  maxFigureBase64Chars: number;
  /** Tableaux max par appel, lignes et colonnes max par tableau. */
  maxTables: number;
  maxTableRows: number;
  maxTableCols: number;
}

export const DEFAULT_RUN_PYTHON_LIMITS: RunPythonLimits = {
  maxCallsPerRequest: 6,
  timeoutSeconds: 90,
  maxCodeChars: 20_000,
  maxSurveysPerCall: 5,
  maxCensusNiveauxPerCall: 3,
  maxUploadBytes: 100 * 1024 * 1024,
  maxStdoutChars: 8_000,
  maxStderrChars: 4_000,
  maxFigures: 4,
  maxFigureBase64Chars: 1_500_000,
  maxTables: 5,
  maxTableRows: 50,
  maxTableCols: 30,
};

/** Plafond dur d'une exécution côté dynamic sessions. */
export const ACA_MAX_EXECUTION_SECONDS = 220;

// ---------------------------------------------------------------------------
// Exécuteur abstrait
// ---------------------------------------------------------------------------

/** Résultat brut d'une exécution, normalisé entre versions d'API. */
export interface RawExecution {
  status: string;
  /** Tronqués par la plateforme à ~4 095 caractères : diagnostic seulement. */
  stdout: string;
  stderr: string;
  /** Valeur (texte) de la dernière expression : non tronquée, porte la charge utile JSON. */
  result: string;
}

export interface SandboxExecutor {
  /** Noms des fichiers présents dans `/mnt/data` de la session. */
  listFiles(sessionId: string): Promise<string[]>;
  /** Téléverse `bytes` sous `/mnt/data/<filename>`. */
  uploadFile(sessionId: string, filename: string, bytes: Uint8Array): Promise<void>;
  /** Exécute `code` (synchrone) et renvoie stdout/stderr. */
  execute(sessionId: string, code: string, timeoutSeconds: number): Promise<RawExecution>;
}

export class SandboxError extends Error {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "SandboxError";
    this.status = status;
  }
}

// ---------------------------------------------------------------------------
// Implémentation Azure Container Apps dynamic sessions
// ---------------------------------------------------------------------------

/**
 * Chemins par version d'API. `2024-02-02-preview` est celle des intégrations
 * officielles (LangChain, Semantic Kernel) ; `2025-10-02-preview` est celle de
 * la doc actuelle (`/executions`, `/files`). Le parseur de réponse accepte les
 * deux formes connues.
 */
export const ACA_API_PROFILES = {
  "2024-02-02-preview": { execute: "code/execute", upload: "files/upload", list: "files" },
  "2025-10-02-preview": { execute: "executions", upload: "files", list: "files" },
} as const;

export type AcaApiVersion = keyof typeof ACA_API_PROFILES;
export const DEFAULT_ACA_API_VERSION: AcaApiVersion = "2024-02-02-preview";

export type TokenProvider = () => Promise<string>;
type FetchLike = typeof fetch;

export interface AcaSessionsConfig {
  /** Ex. https://canadaeast.dynamicsessions.io/subscriptions/<sub>/resourceGroups/<rg>/sessionPools/<pool> */
  poolManagementEndpoint: string;
  getToken: TokenProvider;
  apiVersion?: AcaApiVersion;
  fetch?: FetchLike;
  /** Marge (s) ajoutée au timeout d'exécution pour l'abort HTTP. */
  httpGraceSeconds?: number;
}

export class AcaSessionsExecutor implements SandboxExecutor {
  private readonly base: string;
  private readonly apiVersion: AcaApiVersion;
  private readonly fetchImpl: FetchLike;
  private readonly grace: number;

  constructor(private readonly cfg: AcaSessionsConfig) {
    if (!/^https:\/\//.test(cfg.poolManagementEndpoint)) {
      throw new Error("poolManagementEndpoint doit être une URL https");
    }
    this.base = cfg.poolManagementEndpoint.replace(/\/+$/, "");
    this.apiVersion = cfg.apiVersion ?? DEFAULT_ACA_API_VERSION;
    if (!(this.apiVersion in ACA_API_PROFILES)) throw new Error(`apiVersion inconnue : ${this.apiVersion}`);
    this.fetchImpl = cfg.fetch ?? ((...a: Parameters<FetchLike>) => fetch(...a));
    this.grace = cfg.httpGraceSeconds ?? 15;
  }

  private url(path: string, sessionId: string): string {
    const q = new URLSearchParams({ "api-version": this.apiVersion, identifier: sessionId });
    return `${this.base}/${path}?${q.toString()}`;
  }

  private async request(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
    const token = await this.cfg.getToken();
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    let res: Response;
    try {
      res = await this.fetchImpl(url, {
        ...init,
        headers: { ...(init.headers as Record<string, string> | undefined), Authorization: `Bearer ${token}` },
        signal: ctrl.signal,
      });
    } catch (err) {
      if (ctrl.signal.aborted) throw new SandboxError(504, "Bac à sable : délai HTTP dépassé");
      throw new SandboxError(502, `Bac à sable injoignable : ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      clearTimeout(timer);
    }
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new SandboxError(res.status, `Bac à sable HTTP ${res.status} : ${text.slice(0, 300)}`);
    }
    return res;
  }

  async listFiles(sessionId: string): Promise<string[]> {
    const p = ACA_API_PROFILES[this.apiVersion];
    const res = await this.request(this.url(p.list, sessionId), { method: "GET" }, 30_000);
    const json = (await res.json()) as { value?: Array<{ properties?: { filename?: string }; filename?: string }> };
    return (json.value ?? [])
      .map((f) => f.properties?.filename ?? f.filename)
      .filter((n): n is string => typeof n === "string");
  }

  async uploadFile(sessionId: string, filename: string, bytes: Uint8Array): Promise<void> {
    const p = ACA_API_PROFILES[this.apiVersion];
    const form = new FormData();
    // Copie dans un ArrayBuffer neuf : le typage DOM refuse un Uint8Array<ArrayBufferLike>.
    const buf = new Uint8Array(bytes.byteLength);
    buf.set(bytes);
    form.append("file", new Blob([buf.buffer], { type: "application/octet-stream" }), filename);
    await this.request(this.url(p.upload, sessionId), { method: "POST", body: form }, 120_000);
  }

  async execute(sessionId: string, code: string, timeoutSeconds: number): Promise<RawExecution> {
    const p = ACA_API_PROFILES[this.apiVersion];
    const t = Math.min(Math.max(1, Math.round(timeoutSeconds)), ACA_MAX_EXECUTION_SECONDS);
    const body = {
      properties: { codeInputType: "inline", executionType: "synchronous", code, timeoutInSeconds: t },
    };
    const res = await this.request(
      this.url(p.execute, sessionId),
      { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) },
      (t + this.grace) * 1000,
    );
    return parseExecutionResponse(await res.json());
  }
}

/**
 * Normalise les formes de réponse connues :
 *  - `{ properties: { status, stdout, stderr, result } }` (2024-02-02-preview ;
 *    `result` = valeur texte de la dernière expression)
 *  - `{ status, result: { stdout, stderr, executionResult } }` (forme /executions)
 */
export function parseExecutionResponse(json: unknown): RawExecution {
  const j = (json ?? {}) as Record<string, any>;
  const props = (j.properties ?? j) as Record<string, any>;
  const inner = (props.result && typeof props.result === "object" ? props.result : {}) as Record<string, any>;
  const str = (v: unknown) => (typeof v === "string" ? v : "");
  return {
    status: str(props.status) || str(j.status) || "Unknown",
    stdout: str(props.stdout) || str(inner.stdout),
    stderr: str(props.stderr) || str(inner.stderr),
    result: str(props.result) || str(inner.executionResult),
  };
}

// ---------------------------------------------------------------------------
// Jetons Entra (audience https://dynamicsessions.io)
// ---------------------------------------------------------------------------

export const DYNAMIC_SESSIONS_AUDIENCE = "https://dynamicsessions.io";

/**
 * Jeton via l'identité managée d'Azure Functions / App Service
 * (variables `IDENTITY_ENDPOINT` + `IDENTITY_HEADER`, injectées ici). Mis en
 * cache jusqu'à 5 min avant expiration.
 */
export function managedIdentityTokenProvider(opts: {
  identityEndpoint: string;
  identityHeader: string;
  clientId?: string;
  fetch?: FetchLike;
  now?: () => number;
}): TokenProvider {
  const f = opts.fetch ?? ((...a: Parameters<FetchLike>) => fetch(...a));
  const now = opts.now ?? Date.now;
  let cached: { token: string; expiresAtMs: number } | null = null;
  return async () => {
    if (cached && cached.expiresAtMs - 5 * 60_000 > now()) return cached.token;
    const q = new URLSearchParams({ resource: DYNAMIC_SESSIONS_AUDIENCE, "api-version": "2019-08-01" });
    if (opts.clientId) q.set("client_id", opts.clientId);
    const res = await f(`${opts.identityEndpoint}?${q.toString()}`, {
      headers: { "X-IDENTITY-HEADER": opts.identityHeader },
    });
    if (!res.ok) throw new SandboxError(res.status, `Jeton identité managée refusé (HTTP ${res.status})`);
    const json = (await res.json()) as { access_token?: string; expires_on?: string | number };
    if (!json.access_token) throw new SandboxError(500, "Jeton identité managée absent");
    const exp = Number(json.expires_on);
    cached = { token: json.access_token, expiresAtMs: Number.isFinite(exp) ? exp * 1000 : now() + 10 * 60_000 };
    return cached.token;
  };
}

/** Jeton fixe (dev local : `az account get-access-token --resource https://dynamicsessions.io`). */
export function staticTokenProvider(token: string): TokenProvider {
  return async () => token;
}

// ---------------------------------------------------------------------------
// Identifiant de session
// ---------------------------------------------------------------------------

/**
 * Identifiant de session déterministe par (utilisateur, conversation), NON
 * devinable et jamais fourni par le client : HMAC-SHA256(secret, user|conv),
 * 64 caractères hex (format accepté : 4–128 alphanumériques). Une même
 * conversation retrouve sa session (données déjà chargées, variables Python).
 */
export async function sessionIdentifier(secret: string, userId: string, conversationId: string): Promise<string> {
  if (!secret) throw new Error("secret de session requis");
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, [
    "sign",
  ]);
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", key, enc.encode(`${userId}|${conversationId}`)));
  return Array.from(sig, (b) => b.toString(16).padStart(2, "0")).join("");
}

// ---------------------------------------------------------------------------
// Enrobage du code Python
// ---------------------------------------------------------------------------

const SURVEY_ID_RE = /^[A-Za-z0-9_-]{1,100}$/;
const CENSUS_NIVEAU_RE = /^[a-z0-9_]{1,40}$/;

/**
 * Palette des figures, alignée sur le thème de l'app (src/index.css) : teal
 * primaire (oklch 0.58 0.10 196.4 ≈ #008c8e), corail secondaire, puis teinte
 * foncée / claire du teal, gris, ocre.
 */
export const FIGURE_PALETTE = ["#008c8e", "#f0695a", "#05595a", "#73d1d2", "#8a8f98", "#d9a43b"] as const;

function toBase64(s: string): string {
  const bytes = new TextEncoder().encode(s);
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(bin);
}

/**
 * Code réellement exécuté. Contrainte plateforme (mesurée sur le pool, 2026-10) :
 * `stdout` et `stderr` de la réponse sont TRONQUÉS à ~4 095 caractères chacun,
 * alors que `result` (valeur de la dernière expression de la cellule) passe
 * intact (2 Mo testés). Donc :
 *  - prélude : helpers `load`, `show_table`, backend Agg + style par défaut
 *    matplotlib / plotnine (palette de l'app, fond blanc, 150 dpi) ;
 *  - le code de l'agent (base64, aucun échappement) est exécuté dans
 *    `globals()` (l'état persiste), stdout/stderr CAPTURÉS en mémoire ; si la
 *    dernière instruction est une expression, elle est évaluée comme dans un
 *    notebook (un ggplot est dessiné, sinon son repr est affiché) ;
 *  - épilogue : figures matplotlib ouvertes + figures plotnine dessinées → PNG
 *    base64, puis TOUT (stdout, stderr, erreur, figures, tableaux) est renvoyé
 *    en JSON comme dernière expression → champ `result`.
 */
export function wrapCode(code: string, limits: RunPythonLimits): string {
  const b64 = toBase64(code);
  const pal = JSON.stringify(FIGURE_PALETTE);
  // Marge de capture côté Python (la troncature fine est faite en TS).
  const outCap = limits.maxStdoutChars * 2;
  const errCap = limits.maxStderrChars * 2;
  return `
import ast as _opq_ast, base64 as _opq_b64, contextlib as _opq_ctx, io as _opq_io, json as _opq_json, sys as _opq_sys, traceback as _opq_tb
OPQ_PALETTE = ${pal}
try:
    import matplotlib as _opq_mpl
    _opq_mpl.use("Agg")
    from cycler import cycler as _opq_cycler
    _opq_mpl.rcParams.update({
        "figure.figsize": (7, 4.2), "figure.dpi": 100, "savefig.dpi": 150, "savefig.bbox": "tight",
        "figure.facecolor": "white", "axes.facecolor": "white", "savefig.facecolor": "white",
        "font.size": 11, "axes.titlesize": 13, "axes.titleweight": "bold", "axes.titlelocation": "left",
        "axes.labelsize": 11, "xtick.labelsize": 10, "ytick.labelsize": 10, "legend.fontsize": 10, "legend.frameon": False,
        "axes.spines.top": False, "axes.spines.right": False, "axes.edgecolor": "#9aa3ab",
        "text.color": "#1f2933", "axes.labelcolor": "#1f2933", "xtick.color": "#4a5560", "ytick.color": "#4a5560",
        "axes.grid": True, "axes.grid.axis": "y", "grid.color": "#e6e9ec", "grid.linewidth": 0.8, "axes.axisbelow": True,
        "axes.prop_cycle": _opq_cycler(color=OPQ_PALETTE), "lines.linewidth": 2,
    })
except Exception:
    pass
try:
    import plotnine as _opq_p9
    if not getattr(_opq_p9, "_opq_styled", False):
        _opq_p9.theme_set(_opq_p9.theme_minimal(base_size=11) + _opq_p9.theme(
            figure_size=(7, 4.2), dpi=150,
            plot_background=_opq_p9.element_rect(fill="white", color="white"),
            panel_grid_minor=_opq_p9.element_blank(),
            plot_title=_opq_p9.element_text(size=13, weight="bold", ha="left")))
        for _opq_k in dir(_opq_p9):
            _opq_g = getattr(_opq_p9, _opq_k)
            _opq_aes = getattr(_opq_g, "DEFAULT_AES", None) if _opq_k.startswith("geom_") else None
            if isinstance(_opq_aes, dict):
                if _opq_aes.get("fill") == "#595959":
                    _opq_aes["fill"] = OPQ_PALETTE[0]
                if _opq_aes.get("color") in ("black", "#3366FF") and _opq_k in ("geom_line", "geom_path", "geom_point", "geom_step", "geom_smooth"):
                    _opq_aes["color"] = OPQ_PALETTE[0]
        from plotnine.scales import scale_color as _opq_sc
        _opq_hue_init = _opq_sc.scale_color_hue.__post_init__
        def _opq_hue_post_init(self, *a, **k):
            _opq_hue_init(self, *a, **k)
            _hue = self.palette
            self.palette = lambda n: list(OPQ_PALETTE[:n]) if n <= len(OPQ_PALETTE) else _hue(n)
        _opq_sc.scale_color_hue.__post_init__ = _opq_hue_post_init
        _opq_draw = _opq_p9.ggplot.draw
        def _opq_draw_capture(self, *a, **k):
            _fig = _opq_draw(self, *a, **k)
            _opq_p9._opq_figs.append(_fig)
            return _fig
        _opq_p9.ggplot.draw = _opq_draw_capture
        _opq_p9._opq_figs = []
        _opq_p9._opq_styled = True
except Exception:
    pass
_OPQ_MRP_GUIDE = """MRP (regression multiniveau + post-stratification) - UTILISE LES FONCTIONS PRETES, n'improvise pas le modele.

PRE-REQUIS : run_python avec survey_ids=[...] et census_niveaux=[<niveau CIBLE>, 'pruid'] (+ le niveau du modele
s'il differe). Fonctions disponibles : recode_age, build_poststrat, mrp_fit, mrp_poststrat, CATEGORIES.

GABARIT (adapte seulement les recodages et les noms de variables) :

    df = load('ces_2025')
    d = df[df['MA_VARIABLE'].isin([1, 2])].copy()             # reponses valides seulement
    d['y'] = (d['MA_VARIABLE'] == 1).astype(int)                # 0/1
    d['age'] = recode_age(d['cps25_age_in_years'])              # groupes du recensement
    d['genre'] = d['cps25_genderid'].map({1: 'homme', 2: 'femme'})
    d['education'] = d['cps25_education'].map({...})           # vers aucun/secondaire/postsec_inf_bac/bac_plus
    d['code'] = d['feduid'].astype('Int64').astype(str)          # circonscription (ordre 2013)
    d['province'] = d['code'].str[:2]                           # code de province du recensement
    prof = load_census_strata('circonscription_federale_2013')
    fit = mrp_fit(d, 'y', ['age', 'genre', 'education', 'province'], area='code',
                  area_df=prof, area_vars=['pct_bac_plus_25_64', 'pct_lm_francais', 'pct_age_65_plus',
                             'revenu_median_apres_impot_menage_approx'])
    print(fit.summary())                                        # si pas CONVERGENCE OK : relance avec warmup/draws plus eleves
    cells = build_poststrat('circonscription_federale_2013')    # ou 'rta', 'municipalite', ...
    res = mrp_poststrat(fit, cells, area_df=prof)               # area_df = profil du niveau CIBLE
    show_table(res.sort_values('estimate', ascending=False).head(15), 'Estimations MRP')

POINTS A RESPECTER
- Categories (CATEGORIES) : genre homme/femme ; age 15_19 ... 75_plus ; education aucun, secondaire,
  postsec_inf_bac, bac_plus. Verifie les labels avec get_survey avant de recoder. Exclus NSP/refus.
- Codes de province du recensement (2 chiffres) : 10 T.-N.-L., 11 I.-P.-E., 12 N.-E., 13 N.-B., 24 Quebec,
  35 Ontario, 46 Manitoba, 47 Saskatchewan, 48 Alberta, 59 C.-B., 60-62 territoires.
- fedname/feduid de ces_2021, ces_2025 et eeq_2022 sont dans l'ordre 2013 : circonscription_federale_2013.
- Projection a un niveau plus fin (rta, code_postal, municipalite...) : build_poststrat(<niveau fin>) et
  area_df = load_census_strata(<niveau fin>) ; l'effet de circonscription est alors tire de sa loi (plus d'incertitude).
- Les poids d'enquete ne sont PAS utilises dans le modele : la post-stratification corrige la composition.
- Rapporte estimate avec lo-hi (intervalle 90 %) et n_repondants par unite. Pas de seuil universel de n minimal :
  c'est la largeur de l'intervalle qui dit si une estimation est utilisable ; signale les unites ou elle depasse ~20 points.
- Langue : pas dans les cellules ; elle entre via pct_lm_francais (predicteur d'unite).
- Projection sous le niveau ou le repondant est localise (rta, code_postal) : la litterature ne la valide que
  faiblement -> presente-la comme EXPLORATOIRE (elle reflete surtout la composition demographique locale).
- L'incertitude de la table reconstruite (IPF) n'est pas propagee : les intervalles sont un peu trop etroits.

A DIRE DANS LA REPONSE
Methode (MRP bayesien, effets aleatoires age/genre/education/province/circonscription + profils de territoire,
post-stratification Recensement 2021 avec semence provinciale age x genre x scolarite rakee aux marges locales),
hypotheses (groupe 15-19 reduit aux 18-19, categories regroupees), n par unite (petites unites = estimation surtout
portee par le modele) et que ce sont des ESTIMATIONS modelisees, pas des sondages locaux.
"""
_opq_tables = []
def load(survey_id):
    import pandas as _pd
    return _pd.read_parquet(f"/mnt/data/{survey_id}.parquet")
def load_census_strata(niveau):
    import pandas as _pd
    return _pd.read_parquet(f"/mnt/data/census_{niveau}.parquet")
def load_strata(niveau, type="marginals"):
    """Comptes du recensement 2021 (format long) pour la post-stratification : type='marginals' (marges à raker)
    ou 'cells' (cellules croisées, semence IPF). Colonnes : code, nom, nom_fr, nom_en, type, tableau, univers,
    genre, age, langue, education, n, couverture, source. Exige census_niveaux=['<niveau>'] dans l'appel run_python."""
    import os as _os
    import pandas as _pd
    path = f"/mnt/data/strata_{type}_{niveau}.parquet"
    if not _os.path.exists(path):
        raise FileNotFoundError(f"{path} absent : passe census_niveaux=['{niveau}'] (cells n'existe pas pour tous les niveaux)")
    return _pd.read_parquet(path)
def mrp_guide():
    print(_OPQ_MRP_GUIDE)
try:
    from opubliq_mrp import build_poststrat, mrp_fit, mrp_poststrat, recode_age, CATEGORIES
except Exception:
    pass
def ipf(seed, marginals, dims, max_iter=50, tol=1e-6):
    """Iterative proportional fitting (raking) : estime une table de cellules croisées
    (post-strat, une ligne par combinaison de 'dims') cohérente avec des marginaux connus,
    à partir d'une table 'seed' (comptes initiaux, même forme que la cible, ex. 1 partout si
    aucune info a priori sur les corrélations entre dimensions).
    - seed : DataFrame avec une colonne par dim de 'dims' + une colonne 'n' (compte initial).
    - marginals : dict {dim: DataFrame[dim, 'n']} - total connu par modalité de CHAQUE dimension.
    - dims : liste des colonnes de dimension (ex. ['age_grp', 'sexe', 'educ']).
    Retourne seed avec 'n' ajusté pour matcher exactement chaque marginal (aux 'tol' près).
    Limite : suppose l'indépendance conditionnelle résiduelle entre dims non observée dans 'seed' ;
    une vraie table de cellules croisées (recensement) reste préférable quand elle existe."""
    import pandas as _pd
    df = seed.copy()
    for _ in range(max_iter):
        maxdiff = 0.0
        for d in dims:
            target = marginals[d].set_index(d)["n"]
            cur = df.groupby(d)["n"].sum()
            factor = (target / cur.replace(0, _pd.NA)).reindex(df[d]).fillna(1.0).to_numpy()
            df["n"] = df["n"].to_numpy() * factor
            maxdiff = max(maxdiff, float((cur - target.reindex(cur.index)).abs().max()))
        if maxdiff < tol:
            break
    return df
def show_table(df, title=None):
    try:
        import pandas as _pd
        d = df if isinstance(df, _pd.DataFrame) else _pd.DataFrame(df)
        d = d.reset_index() if not isinstance(d.index, _pd.RangeIndex) else d
        n_rows, n_cols = d.shape
        d = d.iloc[:${limits.maxTableRows}, :${limits.maxTableCols}]
        _opq_tables.append({"title": None if title is None else str(title), "columns": [str(c) for c in d.columns],
            "rows": _opq_json.loads(d.to_json(orient="values", default_handler=str)),
            "truncated": bool(n_rows > d.shape[0] or n_cols > d.shape[1])})
    except Exception as e:
        print(f"show_table: {e}", file=_opq_sys.stderr)
_opq_error = None
_opq_out, _opq_err = _opq_io.StringIO(), _opq_io.StringIO()
with _opq_ctx.redirect_stdout(_opq_out), _opq_ctx.redirect_stderr(_opq_err):
    try:
        _opq_tree = _opq_ast.parse(_opq_b64.b64decode("${b64}").decode("utf-8"), "<run_python>")
        _opq_last = None
        if _opq_tree.body and isinstance(_opq_tree.body[-1], _opq_ast.Expr):
            _opq_last = _opq_ast.Expression(_opq_tree.body.pop().value)
        exec(compile(_opq_tree, "<run_python>", "exec"), globals())
        if _opq_last is not None:
            _opq_v = eval(compile(_opq_last, "<run_python>", "eval"), globals())
            _opq_first = _opq_v[0] if isinstance(_opq_v, (list, tuple)) and _opq_v else _opq_v
            if type(_opq_v).__name__ == "ggplot" and hasattr(_opq_v, "draw"):
                _opq_v.draw()
            elif _opq_v is not None and not type(_opq_first).__module__.startswith(("matplotlib", "plotnine")):
                print(repr(_opq_v))
    except BaseException as _opq_e:
        _opq_error = f"{type(_opq_e).__name__}: {_opq_e}"
        _opq_tb.print_exc()
    _opq_figs = []
    try:
        import matplotlib.pyplot as _opq_plt
        _opq_all = [_opq_plt.figure(n) for n in _opq_plt.get_fignums()]
        _opq_drawn = getattr(_opq_sys.modules.get("plotnine"), "_opq_figs", [])
        _opq_all += [f for f in _opq_drawn if all(f is not g for g in _opq_all)]
        _opq_drawn.clear()
        for _opq_f in _opq_all:
            if len(_opq_figs) >= ${limits.maxFigures}:
                break
            _opq_buf = _opq_io.BytesIO()
            _opq_f.savefig(_opq_buf, format="png", dpi=150, bbox_inches="tight", facecolor="white")
            _opq_s = _opq_b64.b64encode(_opq_buf.getvalue()).decode("ascii")
            if len(_opq_s) > ${limits.maxFigureBase64Chars}:
                print("figure ignorée : trop volumineuse", file=_opq_sys.stderr)
            else:
                _opq_figs.append(_opq_s)
        _opq_plt.close("all")
    except Exception as _opq_e:
        print(f"figures : {_opq_e}", file=_opq_sys.stderr)
_opq_o, _opq_r = _opq_out.getvalue(), _opq_err.getvalue()
_opq_json.dumps({"error": _opq_error, "stdout": _opq_o[:${outCap}], "stderr": _opq_r[-${errCap}:],
    "figures": _opq_figs, "tables": _opq_tables[:${limits.maxTables}]})
`.trimStart();
}

// ---------------------------------------------------------------------------
// Outil
// ---------------------------------------------------------------------------

export interface SandboxFigure {
  id: string;
  mime: "image/png";
  base64: string;
}

export interface SandboxTable {
  title: string | null;
  columns: string[];
  rows: unknown[][];
  truncated: boolean;
}

export interface RunPythonResult {
  ok: boolean;
  /** Erreur Python (type: message) si le code a levé. */
  error?: string;
  stdout: string;
  stderr: string;
  stdout_truncated: boolean;
  stderr_truncated: boolean;
  figures: SandboxFigure[];
  tables: SandboxTable[];
  loaded_surveys: string[];
  loaded_census_niveaux: string[];
  duration_ms: number;
}

export interface RunPythonDeps {
  executor: SandboxExecutor;
  /** Identifiant de session de la conversation (cf. `sessionIdentifier`). */
  sessionId: string;
  /**
   * Octets du Parquet d'un sondage. DOIT appliquer le contrôle d'accès du
   * tenant (lever / rejeter si le sondage n'est pas accessible).
   */
  fetchParquet(surveyId: string): Promise<Uint8Array>;
  /**
   * Octets du bulk export census d'un niveau géo (bead 9ou.19, `/profil/export/{niveau}`
   * côté geo-marketing-api). Absent = `census_niveaux` refusé (feature flag géo non branché).
   */
  fetchCensusParquet?(niveau: string): Promise<Uint8Array>;
  /** Strates MRP (`/strata/export/{niveau}?type=`), chargées avec le profil quand présent. */
  fetchStrataParquet?(niveau: string, type: "marginals" | "cells"): Promise<Uint8Array>;
  limits?: Partial<RunPythonLimits>;
  now?: () => number;
  /** Pool visé : ne change que la description exposée au modèle (`toolDef`). Défaut `pythonlts`. */
  poolKind?: SandboxPoolKind;
}

export interface RunPythonTool {
  /** Ne lève pas sur erreur métier : renvoie `{ error }` (comme executeTool). */
  run(args: Record<string, unknown>): Promise<RunPythonResult | { error: string }>;
  readonly callsMade: number;
  /** Schéma à offrir au modèle (description adaptée au pool) ; absent = `RUN_PYTHON_TOOL_DEF`. */
  readonly toolDef?: RunPythonToolDef;
}

function truncateHead(s: string, max: number): [string, boolean] {
  return s.length > max ? [s.slice(0, max) + "\n…[tronqué]", true] : [s, false];
}

/** stderr : on garde la FIN (la ligne utile d'un traceback est la dernière). */
function truncateTail(s: string, max: number): [string, boolean] {
  return s.length > max ? ["[tronqué]…\n" + s.slice(s.length - max), true] : [s, false];
}

/** Charge utile JSON produite par l'épilogue de `wrapCode` (champ `result`). */
function parsePayload(result: string): Record<string, unknown> | null {
  if (!result) return null;
  try {
    const p = JSON.parse(result) as unknown;
    return p && typeof p === "object" && !Array.isArray(p) ? (p as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

export function createRunPythonTool(deps: RunPythonDeps): RunPythonTool {
  // Ignore les clés `undefined` (env var absente) : sinon le spread écrase le
  // défaut et un timeout NaN fait avorter le fetch immédiatement.
  const overrides = Object.fromEntries(
    Object.entries(deps.limits ?? {}).filter(([, v]) => v !== undefined && !Number.isNaN(v)),
  ) as Partial<RunPythonLimits>;
  const limits: RunPythonLimits = { ...DEFAULT_RUN_PYTHON_LIMITS, ...overrides };
  const now = deps.now ?? Date.now;
  let calls = 0;
  let figSeq = 0;

  async function run(args: Record<string, unknown>): Promise<RunPythonResult | { error: string }> {
    const code = typeof args.code === "string" ? args.code : "";
    if (!code.trim()) return { error: "code est requis" };
    if (code.length > limits.maxCodeChars) return { error: `code trop long (max ${limits.maxCodeChars} caractères)` };

    const rawIds = args.survey_ids === undefined ? [] : args.survey_ids;
    if (!Array.isArray(rawIds)) return { error: "survey_ids doit être une liste" };
    const surveyIds = [...new Set(rawIds.map((s) => String(s).trim()).filter(Boolean))];
    if (surveyIds.length > limits.maxSurveysPerCall) {
      return { error: `trop de sondages (max ${limits.maxSurveysPerCall} par appel)` };
    }
    const bad = surveyIds.find((s) => !SURVEY_ID_RE.test(s));
    if (bad) return { error: `survey_id invalide : ${bad}` };

    const rawNiveaux = args.census_niveaux === undefined ? [] : args.census_niveaux;
    if (!Array.isArray(rawNiveaux)) return { error: "census_niveaux doit être une liste" };
    const censusNiveaux = [...new Set(rawNiveaux.map((s) => String(s).trim()).filter(Boolean))];
    if (censusNiveaux.length > 0 && !deps.fetchCensusParquet) {
      return { error: "census_niveaux n'est pas disponible pour cette requête" };
    }
    if (censusNiveaux.length > limits.maxCensusNiveauxPerCall) {
      return { error: `trop de niveaux census (max ${limits.maxCensusNiveauxPerCall} par appel)` };
    }
    const badNiveau = censusNiveaux.find((n) => !CENSUS_NIVEAU_RE.test(n));
    if (badNiveau) return { error: `census niveau invalide : ${badNiveau}` };

    if (calls >= limits.maxCallsPerRequest) {
      return { error: `plafond d'appels run_python atteint (${limits.maxCallsPerRequest} par requête) ; rédige ta réponse` };
    }
    calls += 1;

    const start = now();
    try {
      if (surveyIds.length > 0 || censusNiveaux.length > 0) {
        const present = new Set(await deps.executor.listFiles(deps.sessionId));
        for (const id of surveyIds) {
          const filename = `${id}.parquet`;
          if (present.has(filename)) continue;
          let bytes: Uint8Array;
          try {
            bytes = await deps.fetchParquet(id);
          } catch (err) {
            return { error: `micro-données indisponibles pour ${id} : ${err instanceof Error ? err.message : String(err)}` };
          }
          if (bytes.byteLength > limits.maxUploadBytes) {
            return { error: `Parquet de ${id} trop volumineux pour le bac à sable` };
          }
          await deps.executor.uploadFile(deps.sessionId, filename, bytes);
        }
        for (const niveau of censusNiveaux) {
          const filename = `census_${niveau}.parquet`;
          if (present.has(filename)) continue;
          let bytes: Uint8Array;
          try {
            bytes = await deps.fetchCensusParquet!(niveau);
          } catch (err) {
            return { error: `census indisponible pour ${niveau} : ${err instanceof Error ? err.message : String(err)}` };
          }
          if (bytes.byteLength > limits.maxUploadBytes) {
            return { error: `Parquet census de ${niveau} trop volumineux pour le bac à sable` };
          }
          await deps.executor.uploadFile(deps.sessionId, filename, bytes);
        }
        // Strates MRP : best-effort (les cellules n'existent pas pour tous les niveaux) ;
        // load_strata() signale le fichier manquant au modèle.
        if (deps.fetchStrataParquet) {
          for (const niveau of censusNiveaux) {
            for (const type of ["marginals", "cells"] as const) {
              const filename = `strata_${type}_${niveau}.parquet`;
              if (present.has(filename)) continue;
              try {
                const bytes = await deps.fetchStrataParquet(niveau, type);
                if (bytes.byteLength > 0 && bytes.byteLength <= limits.maxUploadBytes) {
                  await deps.executor.uploadFile(deps.sessionId, filename, bytes);
                }
              } catch {
                // indisponible pour ce niveau : load_strata() le dira
              }
            }
          }
        }
      }

      const raw = await deps.executor.execute(deps.sessionId, wrapCode(code, limits), limits.timeoutSeconds);
      const payload = parsePayload(raw.result);
      // Sans charge utile, on renvoie le stdout/stderr bruts (tronqués par la
      // plateforme) pour le diagnostic.
      const outText = payload ? (typeof payload.stdout === "string" ? payload.stdout : "") : raw.stdout;
      const errText = payload ? (typeof payload.stderr === "string" ? payload.stderr : "") : raw.stderr;
      const [stdout, stdoutTrunc] = truncateHead(outText, limits.maxStdoutChars);
      const [stderr, stderrTrunc] = truncateTail(errText, limits.maxStderrChars);

      const figures: SandboxFigure[] = [];
      const rawFigs = Array.isArray(payload?.figures) ? (payload!.figures as unknown[]) : [];
      for (const f of rawFigs.slice(0, limits.maxFigures)) {
        if (typeof f !== "string" || f.length === 0 || f.length > limits.maxFigureBase64Chars) continue;
        figures.push({ id: `fig-${++figSeq}`, mime: "image/png", base64: f });
      }
      const tables: SandboxTable[] = (Array.isArray(payload?.tables) ? (payload!.tables as SandboxTable[]) : [])
        .slice(0, limits.maxTables)
        .map((t) => ({
          title: typeof t.title === "string" ? t.title : null,
          columns: Array.isArray(t.columns) ? t.columns.slice(0, limits.maxTableCols).map(String) : [],
          rows: Array.isArray(t.rows) ? t.rows.slice(0, limits.maxTableRows) : [],
          truncated: Boolean(t.truncated),
        }));

      // Pas de charge utile = le prélude/épilogue n'a pas tourné jusqu'au bout
      // (timeout, crash du noyau) : on le signale comme erreur.
      const error =
        payload === null
          ? `exécution interrompue (statut ${raw.status})`
          : typeof payload.error === "string"
            ? payload.error
            : undefined;

      return {
        ok: error === undefined,
        ...(error !== undefined ? { error } : {}),
        stdout,
        stderr,
        stdout_truncated: stdoutTrunc,
        stderr_truncated: stderrTrunc,
        figures,
        tables,
        loaded_surveys: surveyIds,
        loaded_census_niveaux: censusNiveaux,
        duration_ms: now() - start,
      };
    } catch (err) {
      if (err instanceof SandboxError) return { error: err.message };
      return { error: `bac à sable : ${err instanceof Error ? err.message : String(err)}` };
    }
  }

  return {
    run,
    get callsMade() {
      return calls;
    },
    toolDef: deps.poolKind === "custom" ? runPythonToolDef("custom") : RUN_PYTHON_TOOL_DEF,
  };
}

/**
 * Charge utile pour le message `tool` renvoyé au LLM : les images sont
 * remplacées par leur id (le base64 coûterait des milliers de tokens et le
 * modèle ne le lit pas) ; l'UI reçoit les figures complètes par ailleurs.
 */
export function toModelPayload(result: RunPythonResult | { error: string }): unknown {
  if (!("figures" in result)) return result;
  const { figures, ...rest } = result;
  return { ...rest, figures: figures.map((f) => ({ id: f.id, mime: f.mime })) };
}
