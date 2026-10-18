/**
 * Outils agent `geo_profile` / `geo_lookup` et, pour les comptes internes
 * explicitement autorisés, `geo_donation_index` (beads 9ou.5 / 9ou.18) — branche le dépôt
 * frère `geo-marketing-api` (FastAPI + DuckDB sur GeoParquet, recensement 2021
 * par aire de diffusion) comme outil de l'agent analytique.
 *
 * Par défaut, le scope reste RECENSEMENT SEULEMENT. `assertAllowedPath` refuse
 * toujours `/dons/*`. L'unique exception est une méthode POST dédiée au chemin
 * constant `/dons/indice`, construite seulement si le handler a déjà validé le
 * feature flag ET le courriel exact de l'utilisateur interne. La revue 9ou.17
 * reste requise avant toute exposition client.
 *
 * Même esprit d'injection que `MicrodataProvider` / `RunPythonTool` dans
 * agent.ts : aucun `process.env` ici, tout est passé par `GeoToolEnv`. Le
 * handler (Azure Function) construit l'instance et ne la branche QUE si
 * `GEO_API_BASE_URL` est configuré (feature flag, même mécanique que
 * `RUN_PYTHON_ENABLED` / `buildRunPythonTool`, cf. azure-functions/src/functions/agent.ts).
 */

// ---------------------------------------------------------------------------
// Liste blanche des routes (garde-fou technique anti-dons)
// ---------------------------------------------------------------------------

/**
 * Chemins census/geo autorisés. Chaque entrée est un `RegExp` ancré sur le
 * chemin complet (sans query string). AUCUNE entrée `/dons/*` ne doit jamais
 * être ajoutée ici — c'est la seule porte par laquelle une requête sort vers
 * geo-marketing-api dans ce module.
 */
export const GEO_ALLOWED_PATHS: RegExp[] = [
  /^\/ad\/profile$/,
  /^\/ad\/variables$/,
  /^\/ad\/\d+$/,
  /^\/niveaux$/,
  /^\/geo\/cp\/[A-Za-z0-9]+$/,
  /^\/profil\/[a-z0-9_]+$/,
  /^\/profil\/[a-z0-9_]+\/[^/]+$/,
];

export class GeoForbiddenPathError extends Error {
  constructor(path: string) {
    super(`Chemin geo-marketing-api non autorisé (hors liste blanche census/geo) : ${path}`);
    this.name = "GeoForbiddenPathError";
  }
}

/** Lève `GeoForbiddenPathError` si `path` (sans query string) n'est pas dans la liste blanche census/geo. Jamais `/dons/*`. */
export function assertAllowedPath(path: string): void {
  const pathOnly = path.split("?")[0];
  if (/dons/i.test(pathOnly) || !GEO_ALLOWED_PATHS.some((re) => re.test(pathOnly))) {
    throw new GeoForbiddenPathError(path);
  }
}

// ---------------------------------------------------------------------------
// Auth : jeton optionnel (managed identity ou statique)
// ---------------------------------------------------------------------------

export type GeoTokenProvider = () => Promise<string>;
type FetchLike = typeof fetch;

/**
 * Jeton d'identité managée pour l'audience de l'app registration geo-marketing-api
 * (server-to-server, Easy Auth AAD). Même mécanique que
 * `managedIdentityTokenProvider` de `pythonSandbox.ts`, mais paramétrée par
 * `audience` : la ressource dynamic sessions n'a rien à voir avec celle de
 * l'API géo. Voir `docs/geo_integration.md` pour l'app registration à créer
 * (aucune n'existe encore : geo-marketing-api n'est pas déployée).
 */
export function geoManagedIdentityTokenProvider(opts: {
  identityEndpoint: string;
  identityHeader: string;
  audience: string;
  clientId?: string;
  fetch?: FetchLike;
  now?: () => number;
}): GeoTokenProvider {
  const f = opts.fetch ?? ((...a: Parameters<FetchLike>) => fetch(...a));
  const now = opts.now ?? Date.now;
  let cached: { token: string; expiresAtMs: number } | null = null;
  return async () => {
    if (cached && cached.expiresAtMs - 5 * 60_000 > now()) return cached.token;
    const q = new URLSearchParams({ resource: opts.audience, "api-version": "2019-08-01" });
    if (opts.clientId) q.set("client_id", opts.clientId);
    const res = await f(`${opts.identityEndpoint}?${q.toString()}`, {
      headers: { "X-IDENTITY-HEADER": opts.identityHeader },
    });
    if (!res.ok) throw new Error(`Jeton identité managée (géo) refusé (HTTP ${res.status})`);
    const json = (await res.json()) as { access_token?: string; expires_on?: string | number };
    if (!json.access_token) throw new Error("Jeton identité managée (géo) absent");
    const exp = Number(json.expires_on);
    cached = { token: json.access_token, expiresAtMs: Number.isFinite(exp) ? exp * 1000 : now() + 10 * 60_000 };
    return cached.token;
  };
}

/** Jeton fixe (dev local, ou en attendant le câblage managed identity). */
export function geoStaticTokenProvider(token: string): GeoTokenProvider {
  return async () => token;
}

/** Gate exact : aucun joker ni domaine, car l'inscription publique ne vérifie pas la propriété du courriel. */
export function isGeoDonationsAllowed(email: string, enabled: string | undefined, allowlist: string | undefined): boolean {
  if (enabled !== "true") return false;
  const normalized = email.trim().toLowerCase();
  if (!normalized) return false;
  return (allowlist ?? "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean)
    .includes(normalized);
}

// ---------------------------------------------------------------------------
// Schémas des outils (format function calling, comme TOOL_DEFS dans agent.ts)
// ---------------------------------------------------------------------------

export const GEO_PROFILE_TOOL_NAME = "geo_profile";
export const GEO_LOOKUP_TOOL_NAME = "geo_lookup";
export const GEO_DONATION_INDEX_TOOL_NAME = "geo_donation_index";

/** Niveaux géographiques exposés (miroir de `NIVEAUX` côté geo-marketing-api). */
export const GEO_NIVEAUX = [
  "ad",
  "pruid",
  "code_postal",
  "rta",
  "municipalite",
  "mrc",
  "region_administrative",
  "rmr",
  "circonscription_2026",
] as const;

export const GEO_PROFILE_TOOL_DEF = {
  type: "function",
  function: {
    name: GEO_PROFILE_TOOL_NAME,
    description:
      "Portrait socio-démographique d'un territoire (recensement 2021, StatCan, via l'API géo interne — PAS un sondage : " +
      "ce sont des données de population, pas une mesure déclarative). Donne UN de : {niveau, code} (ex. niveau:\"municipalite\", " +
      "code:\"Lévis\" ou un nom/code pour circonscription_2026, mrc, region_administrative, rmr, pruid, ad, rta, code_postal), " +
      "ou {postal_code} seul (= niveau code_postal), ou {lat, lon} (profil de l'aire de diffusion à ce point). " +
      "Renvoie population, ménages, variables clés (revenu, langue, âge, éducation, immigration — ce que l'API fournit), " +
      "couverture et notes de précision. Cite TOUJOURS la source (« Recensement 2021, StatCan, via API géo ») et le " +
      "territoire/unité exacts dans ta réponse.",
    parameters: {
      type: "object",
      properties: {
        niveau: { type: "string", enum: [...GEO_NIVEAUX], description: "Niveau géographique (omis si postal_code ou lat/lon)." },
        code: { type: "string", description: "Code ou nom de l'unité (ex. code postal, nom de municipalité/circonscription, dauid)." },
        postal_code: { type: "string", description: "Code postal canadien (ex. G1V0A6) — raccourci pour niveau:code_postal." },
        lat: { type: "number", description: "Latitude (avec lon) : profil de l'aire de diffusion contenant ce point." },
        lon: { type: "number", description: "Longitude (avec lat)." },
      },
      additionalProperties: false,
    },
  },
} as const;

export const GEO_LOOKUP_TOOL_DEF = {
  type: "function",
  function: {
    name: GEO_LOOKUP_TOOL_NAME,
    description:
      "Résout un code postal canadien en RTA, aire de diffusion, municipalité(s) et circonscription provinciale 2026 " +
      "(géo-référencement, PAS un profil socio-démo complet — utilise ensuite geo_profile sur le résultat pour le portrait). " +
      "Utile pour retrouver le bon niveau/code avant d'appeler geo_profile.",
    parameters: {
      type: "object",
      properties: { postal_code: { type: "string", description: "Code postal canadien (ex. G1V0A6)." } },
      required: ["postal_code"],
      additionalProperties: false,
    },
  },
} as const;

export const GEO_DONATION_INDEX_TOOL_DEF = {
  type: "function",
  function: {
    name: GEO_DONATION_INDEX_TOOL_NAME,
    description:
      "OUTIL INTERNE. Calcule l'indice désidentifié de potentiel de financement politique (0–1) produit par " +
      "geo-marketing-api à partir des contributions provinciales DGEQ 2018–2025. Fournis exactement une municipalité " +
      "OU une liste d'au plus 100 codes postaux. La réponse ne contient jamais de donateur, montant, nombre de dons ni " +
      "résultat par parti. L'indice dépend de la pondération demandée : ne le présente jamais comme une probabilité, un " +
      "comportement individuel ou une mesure brute des dons.",
    parameters: {
      type: "object",
      properties: {
        municipalite: { type: "string", description: "Nom ou code d'une municipalité québécoise." },
        codes_postaux: {
          type: "array",
          items: { type: "string" },
          maxItems: 100,
          description: "Codes postaux complets canadiens (maximum 100).",
        },
        poids_entites: {
          type: "object",
          additionalProperties: { type: "number", minimum: 0 },
          description: "Poids optionnels par entité/parti; motifs fnmatch acceptés par l'API, '*' = défaut.",
        },
        poids_annees: {
          type: "object",
          additionalProperties: { type: "number", minimum: 0 },
          description: "Poids optionnels par année; '*' = défaut.",
        },
        poids_types: {
          type: "object",
          additionalProperties: { type: "number", minimum: 0 },
          description: "Poids optionnels par type d'entité; '*' = défaut.",
        },
        top_n: {
          type: "integer",
          minimum: 1,
          maximum: 25,
          description: "Nombre de codes les plus/moins élevés à retourner pour une municipalité (défaut 10).",
        },
      },
      additionalProperties: false,
    },
  },
} as const;

/** Ajout au prompt système quand l'outil géo est branché (feature flag, GEO_API_BASE_URL). */
export const GEO_PROMPT_ADDITION = `

OUTIL SUPPLÉMENTAIRE — PORTRAIT DE TERRITOIRE (recensement, pas un sondage)
- geo_lookup(postal_code) et geo_profile(niveau/code | postal_code | lat/lon) : profil socio-démographique d'un territoire (recensement 2021, StatCan, via l'API géo interne). Ce sont des données de POPULATION (comptages), à ne JAMAIS confondre avec les données de SONDAGE (déclaratives, pondérées, avec marge d'erreur) : si une réponse combine les deux, distingue clairement "mesuré par sondage" vs "profil du territoire (recensement)".
- Cite TOUJOURS la source exacte ("Recensement 2021, StatCan, via API géo") et le territoire/unité précis (ex. "circonscription de Rosemont", "code postal G1V 0A6").
- Utilise geo_lookup d'abord si tu n'as qu'un code postal et veux la circonscription/municipalité ; utilise geo_profile pour le portrait chiffré.
- Si aucun outil geo_donation_index ne t'est offert, les dons sont hors périmètre pour cet utilisateur : ne tente pas d'y accéder.`;

/** Ajout visible seulement pour un courriel interne explicitement autorisé. */
export const GEO_DONATIONS_PROMPT_ADDITION = `

OUTIL INTERNE — INDICE DE DONS DGEQ
- geo_donation_index est un indice dérivé 0–1 par code postal, calculé à partir des contributions politiques provinciales DGEQ 2018–2025. Il est réservé à l'usage interne Opubliq.
- La réponse de l'API est désidentifiée : elle ne fournit jamais de donateur, montant, nombre de dons, taux brut ou détail par parti. N'invente et ne déduis jamais ces éléments.
- Décris toujours l'indice comme un score relatif dépendant de la pondération demandée, jamais comme une probabilité, un comportement individuel ou une causalité. Cite « DGEQ 2018–2025, indice interne dérivé via API géo ».
- Pour une municipalité, synthétise la distribution et les codes les plus/moins élevés; pour une liste de codes postaux, compare uniquement ceux demandés.`;

// ---------------------------------------------------------------------------
// Compaction (même esprit que compactCrosstabResult / compactSearchResults dans agent.ts)
// ---------------------------------------------------------------------------

function roundGeoNum(x: unknown): unknown {
  if (typeof x !== "number" || !Number.isFinite(x)) return x;
  if (Number.isInteger(x)) return x;
  // Grandes valeurs (population, revenu en $) -> entier ; petites (%, taux) -> 2 décimales.
  return Math.abs(x) >= 1000 ? Math.round(x) : Number(x.toFixed(2));
}

/** `{var: val}` → `["var=val", ...]`, nombres arrondis : moins de tokens qu'un objet JSON. */
function compactVariables(vars: unknown): string[] {
  if (!vars || typeof vars !== "object") return [];
  return Object.entries(vars as Record<string, unknown>)
    .filter(([, v]) => v !== null && v !== undefined)
    .map(([k, v]) => `${k}=${roundGeoNum(v)}`);
}

/** Profil `/profil/{niveau}/{code}` ou `/ad/profile` compacté pour le modèle. */
export function compactGeoProfile(p: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {
    source: "Recensement 2021, StatCan, via API géo (geo-marketing-api)",
    niveau: p.niveau ?? "ad",
    code: p.code ?? p.dauid,
    nom: p.nom,
    population: roundGeoNum(p.population),
    menages: roundGeoNum(p.menages),
    n_ad: p.n_ad,
    precision: p.precision,
    variables: compactVariables(p.variables),
  };
  if (Array.isArray(p.notes) && p.notes.length > 0) out.notes = p.notes;
  if (typeof p.statut === "string") out.statut = p.statut;
  if (p.couverture && typeof p.couverture === "object") {
    const vals = Object.values(p.couverture as Record<string, unknown>).filter((v) => typeof v === "number") as number[];
    if (vals.length > 0) out.couverture_moyenne = roundGeoNum(vals.reduce((a, b) => a + b, 0) / vals.length);
  }
  for (const k of Object.keys(out)) if (out[k] === undefined || out[k] === null) delete out[k];
  return out;
}

/** Réponse `/geo/cp/{code}` compactée. */
export function compactGeoLookup(r: Record<string, unknown>): Record<string, unknown> {
  const municipalites = Array.isArray(r.municipalites)
    ? (r.municipalites as Record<string, unknown>[]).map(
        (m) => `${m.nom_mun} (${roundGeoNum((Number(m.part) || 0) * 100)}%)`,
      )
    : [];
  const out: Record<string, unknown> = {
    code_postal: r.code_postal,
    rta: r.rta,
    dauid: r.dauid,
    municipalites,
    circonscription_2026: r.circonscription_2026,
  };
  if (typeof r.statut === "string" && r.statut !== "actif") out.statut = r.statut;
  for (const k of Object.keys(out)) if (out[k] === undefined || out[k] === null) delete out[k];
  return out;
}

interface DonationResult {
  code_postal: string;
  indice: number;
}

/** Réponse désidentifiée et bornée destinée au modèle; aucune donnée brute de dons. */
export function compactDonationIndex(r: Record<string, unknown>, opts: { topN: number; explicitCodes: boolean }): Record<string, unknown> {
  const rows = (Array.isArray(r.resultats) ? r.resultats : [])
    .filter((x): x is Record<string, unknown> => Boolean(x && typeof x === "object"))
    .map((x): DonationResult | null => {
      const code = typeof x.code_postal === "string" ? normalizePostalCode(x.code_postal) : "";
      const indice = Number(x.indice);
      return code && Number.isFinite(indice) ? { code_postal: code, indice: Number(indice.toFixed(4)) } : null;
    })
    .filter((x): x is DonationResult => x !== null)
    .sort((a, b) => b.indice - a.indice || a.code_postal.localeCompare(b.code_postal));
  const values = rows.map((x) => x.indice).sort((a, b) => a - b);
  const mean = values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
  const mid = Math.floor(values.length / 2);
  const median = values.length === 0 ? null : values.length % 2 ? values[mid] : (values[mid - 1] + values[mid]) / 2;
  const sensitivity = r.test_sensibilite && typeof r.test_sensibilite === "object"
    ? (r.test_sensibilite as Record<string, unknown>)
    : {};

  return {
    source: "DGEQ 2018–2025, indice interne dérivé via API géo",
    interpretation: "Score relatif 0–1 dépendant de la pondération; ni probabilité, ni mesure individuelle, ni volume brut de dons.",
    n_codes: rows.length,
    distribution: values.length
      ? {
          minimum: values[0],
          moyenne: Number((mean as number).toFixed(4)),
          mediane: Number((median as number).toFixed(4)),
          maximum: values[values.length - 1],
        }
      : null,
    ...(opts.explicitCodes
      ? { resultats: rows }
      : { plus_eleves: rows.slice(0, opts.topN), plus_faibles: rows.slice(-opts.topN).reverse() }),
    test_sensibilite: {
      conforme: sensitivity.conforme === true,
      variation_max: Number.isFinite(Number(sensitivity.variation_max))
        ? Number(Number(sensitivity.variation_max).toFixed(4))
        : null,
    },
  };
}

// ---------------------------------------------------------------------------
// Client HTTP + outil
// ---------------------------------------------------------------------------

export interface GeoToolEnv {
  /** URL de base de geo-marketing-api (ex. http://localhost:8000, ou l'URL Container Apps une fois déployée). */
  baseUrl: string;
  /** Jeton bearer optionnel (server-to-server). Absent en dev local (bypass ENVIRONNEMENT=dev côté API géo). */
  getToken?: GeoTokenProvider;
  /** Autorise uniquement la méthode dédiée `/dons/indice`; validé par le handler pour un utilisateur interne exact. */
  allowDonations?: boolean;
  fetch?: FetchLike;
}

export interface GeoTool {
  profile(args: Record<string, unknown>): Promise<unknown>;
  lookup(args: Record<string, unknown>): Promise<unknown>;
  /** Absente de l'objet (et donc du schéma/prompt agent) pour tout utilisateur non autorisé. */
  donationIndex?: (args: Record<string, unknown>) => Promise<unknown>;
}

async function geoGet(env: GeoToolEnv, path: string): Promise<Record<string, unknown>> {
  assertAllowedPath(path);
  const f = env.fetch ?? fetch;
  const headers: Record<string, string> = {};
  if (env.getToken) headers.Authorization = `Bearer ${await env.getToken()}`;
  const res = await f(`${env.baseUrl.replace(/\/+$/, "")}${path}`, { headers });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`geo-marketing-api HTTP ${res.status} sur ${path}${text ? ` : ${text.slice(0, 300)}` : ""}`);
  }
  return (await res.json()) as Record<string, unknown>;
}

async function geoPostDonationIndex(env: GeoToolEnv, body: Record<string, unknown>): Promise<Record<string, unknown>> {
  if (!env.allowDonations) throw new GeoForbiddenPathError("/dons/indice");
  const f = env.fetch ?? fetch;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (env.getToken) headers.Authorization = `Bearer ${await env.getToken()}`;
  const path = "/dons/indice"; // Chemin constant : aucun routage /dons contrôlé par le modèle.
  const res = await f(`${env.baseUrl.replace(/\/+$/, "")}${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`geo-marketing-api HTTP ${res.status} sur ${path}${text ? ` : ${text.slice(0, 300)}` : ""}`);
  }
  return (await res.json()) as Record<string, unknown>;
}

const CP_RE = /^[A-Za-z]\d[A-Za-z]\s?\d[A-Za-z]\d$/;

function normalizePostalCode(cp: string): string {
  return cp.toUpperCase().replace(/[\s-]/g, "");
}

function normalizeWeights(raw: unknown): Record<string, number> | undefined | { error: string } {
  if (raw === undefined) return undefined;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return { error: "La pondération doit être un objet clé → poids." };
  const entries = Object.entries(raw as Record<string, unknown>);
  if (entries.length > 100) return { error: "Au plus 100 poids par dimension." };
  const out: Record<string, number> = {};
  for (const [key, value] of entries) {
    const n = Number(value);
    if (!key.trim() || !Number.isFinite(n) || n < 0) return { error: `Poids invalide pour '${key}'.` };
    out[key.trim()] = n;
  }
  return out;
}

/** Construit les outils géo pour une requête agent. Les dons sont absents par défaut. */
export function createGeoTool(env: GeoToolEnv): GeoTool {
  const tool: GeoTool = {
    async profile(args) {
      const niveauArg = typeof args.niveau === "string" ? args.niveau : undefined;
      const codeArg = typeof args.code === "string" ? args.code.trim() : undefined;
      const postalArg = typeof args.postal_code === "string" ? args.postal_code.trim() : undefined;
      const lat = typeof args.lat === "number" ? args.lat : undefined;
      const lon = typeof args.lon === "number" ? args.lon : undefined;

      if (lat !== undefined && lon !== undefined) {
        const p = await geoGet(env, `/ad/profile?lat=${encodeURIComponent(lat)}&lng=${encodeURIComponent(lon)}`);
        return compactGeoProfile({ niveau: "ad", code: p.dauid, ...p });
      }
      if (postalArg) {
        if (!CP_RE.test(postalArg)) return { error: `Code postal invalide (format A1A1A1) : ${postalArg}` };
        const cp = normalizePostalCode(postalArg);
        const p = await geoGet(env, `/profil/code_postal/${encodeURIComponent(cp)}`);
        return compactGeoProfile(p);
      }
      if (niveauArg && codeArg) {
        if (!(GEO_NIVEAUX as readonly string[]).includes(niveauArg)) {
          return { error: `niveau inconnu : ${niveauArg}. Niveaux valides : ${GEO_NIVEAUX.join(", ")}` };
        }
        const p = await geoGet(env, `/profil/${encodeURIComponent(niveauArg)}/${encodeURIComponent(codeArg)}`);
        return compactGeoProfile(p);
      }
      return { error: "Fournis {niveau, code}, {postal_code} ou {lat, lon}." };
    },
    async lookup(args) {
      const postalArg = typeof args.postal_code === "string" ? args.postal_code.trim() : "";
      if (!postalArg || !CP_RE.test(postalArg)) {
        return { error: `Code postal invalide (format A1A1A1) : ${postalArg}` };
      }
      const r = await geoGet(env, `/geo/cp/${encodeURIComponent(normalizePostalCode(postalArg))}`);
      return compactGeoLookup(r);
    },
  };
  if (env.allowDonations) {
    tool.donationIndex = async (args) => {
      const municipalite = typeof args.municipalite === "string" ? args.municipalite.trim() : "";
      const rawCodes = Array.isArray(args.codes_postaux) ? args.codes_postaux : [];
      if (Boolean(municipalite) === (rawCodes.length > 0)) {
        return { error: "Fournis exactement une municipalite OU une liste codes_postaux." };
      }
      if (rawCodes.length > 100) return { error: "Au plus 100 codes postaux par appel." };
      const codes = rawCodes.map((x) => String(x).trim());
      const invalid = codes.find((cp) => !CP_RE.test(cp));
      if (invalid) return { error: `Code postal invalide (format A1A1A1) : ${invalid}` };

      const entites = normalizeWeights(args.poids_entites);
      const annees = normalizeWeights(args.poids_annees);
      const types = normalizeWeights(args.poids_types);
      for (const weights of [entites, annees, types]) {
        if (weights && "error" in weights) return weights;
      }
      const ponderation = {
        ...(entites ? { entites } : {}),
        ...(annees ? { annees } : {}),
        ...(types ? { types } : {}),
      };
      const body = {
        territoire: municipalite
          ? { municipalite }
          : { codes_postaux: [...new Set(codes.map(normalizePostalCode))] },
        ponderation,
      };
      const raw = await geoPostDonationIndex(env, body);
      const requestedTopN = Number(args.top_n);
      const topN = Number.isInteger(requestedTopN) ? Math.min(25, Math.max(1, requestedTopN)) : 10;
      return compactDonationIndex(raw, { topN, explicitCodes: !municipalite });
    };
  }
  return tool;
}
