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

export const RUN_PYTHON_TOOL_DEF = {
  type: "function",
  function: {
    name: RUN_PYTHON_TOOL_NAME,
    description:
      "Exécute du code Python (pandas, numpy, statsmodels, scipy, scikit-learn, matplotlib, plotnine) dans un bac à sable isolé, " +
      "pour les analyses que `crosstab` ne couvre pas : régressions multivariées, pondération, tendances entre sondages, profils. " +
      "Passe `survey_ids` pour charger les micro-données : chaque sondage est disponible dans `/mnt/data/<survey_id>.parquet` " +
      "et via `load('<survey_id>')` (DataFrame pandas). Colonnes : `__respondent_id`, `__weight` (poids, À UTILISER pour toute " +
      "estimation), puis les variables raw (codes ; labels via get_survey). Les variables Python et les fichiers persistent " +
      "entre les appels d'une même conversation. Sortie : `print(...)` (tronquée), `show_table(df, title)` pour un petit tableau, " +
      "et les figures sont capturées automatiquement en PNG : toute figure matplotlib ouverte, et tout ggplot plotnine " +
      "(grammaire ggplot2 : `from plotnine import *`) affiché par `p.show()` ou laissé en dernière expression. Un style " +
      "sobre est déjà appliqué (fond blanc, palette de l'app dans `OPQ_PALETTE`) : n'ajoute pas de thème. Pas d'accès réseau. Seulement pour des sondages à has_microdata=true.",
    parameters: {
      type: "object",
      properties: {
        code: { type: "string", description: "Code Python à exécuter." },
        survey_ids: {
          type: "array",
          description: "Sondages dont les micro-données doivent être chargées dans la session (optionnel si déjà chargés).",
          items: { type: "string" },
        },
      },
      required: ["code"],
      additionalProperties: false,
    },
  },
} as const;

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
_opq_tables = []
def load(survey_id):
    import pandas as _pd
    return _pd.read_parquet(f"/mnt/data/{survey_id}.parquet")
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
  limits?: Partial<RunPythonLimits>;
  now?: () => number;
}

export interface RunPythonTool {
  /** Ne lève pas sur erreur métier : renvoie `{ error }` (comme executeTool). */
  run(args: Record<string, unknown>): Promise<RunPythonResult | { error: string }>;
  readonly callsMade: number;
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
  const limits: RunPythonLimits = { ...DEFAULT_RUN_PYTHON_LIMITS, ...deps.limits };
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

    if (calls >= limits.maxCallsPerRequest) {
      return { error: `plafond d'appels run_python atteint (${limits.maxCallsPerRequest} par requête) ; rédige ta réponse` };
    }
    calls += 1;

    const start = now();
    try {
      if (surveyIds.length > 0) {
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
