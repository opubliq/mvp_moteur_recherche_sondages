/**
 * Scanner de réponses libres — proposition automatique d'une grille d'annotation.
 *
 * L'INVERSE DE `annotate.ts`. Là-bas l'utilisateur DÉCRIT une propriété et ses
 * étiquettes, le modèle range. Ici le modèle LIT un échantillon de réponses et
 * PROPOSE une propriété à distinguer + les étiquettes qui la découpent. C'est
 * l'amorce du cold start : devant une question ouverte qu'on ne connaît pas, on
 * ne sait pas encore quoi annoter. Le scan préremplit la carte d'annotation ;
 * l'utilisateur corrige, essaie sur 4-5 réponses, puis lance le batch comme
 * d'habitude. Le scan ne remplace jamais l'essai — il donne un point de départ.
 *
 * UN SEUL APPEL, SUR UN ÉCHANTILLON. Contrairement à l'annotation qui balaie
 * toute la question par paquets, le scan ne regarde qu'un échantillon
 * (~`SCAN_SAMPLE_SIZE` réponses tirées au hasard dans toute la question). Une
 * grille de catégories se dessine sur quelques dizaines de réponses variées ;
 * lui en donner mille ne l'affinerait pas et ferait exploser le budget des 10 s
 * d'une fonction Netlify synchrone.
 *
 * MODÈLE : gpt-5-mini sur `opubliq-sondages-aoai`, comme l'annotation — on reste
 * 100 % Azure et on réutilise la même plomberie. `reasoning_effort: "low"` (et
 * non "minimal" comme l'annotation) : proposer une taxonomie MECE est une vraie
 * synthèse, pas un rangement ; l'effort minimal produit des étiquettes qui se
 * chevauchent ou ratent la dimension intéressante. "low" reste sous le budget
 * de temps sur un échantillon de cette taille.
 *
 * SORTIE CONTRAINTE PAR SCHÉMA (`json_schema` strict). Le mode strict d'Azure
 * ignore `minItems`/`maxItems` : le nombre d'étiquettes est cadré par la
 * consigne et re-borné ici (`clampLabels`), jamais par le schéma.
 */

// ---------------------------------------------------------------------------
// Constantes
// ---------------------------------------------------------------------------

/** Route Chat Completions Azure OpenAI (gpt-5-mini requiert 2024-12-01-preview ou plus récent). */
const AOAI_API_VERSION = "2024-12-01-preview";

/**
 * Échantillon présenté au modèle. Assez pour couvrir la variété d'une question
 * ouverte, assez court pour tenir dans un appel synchrone avec de la marge.
 */
export const SCAN_SAMPLE_SIZE = 40;

/**
 * Bornes du nombre d'étiquettes proposées. En deçà de 2, il n'y a rien à
 * distinguer ; au-delà de 6, ce n'est plus une propriété mais une taxonomie que
 * personne ne relira — et l'annotation en aval plafonne de toute façon à
 * `MAX_OPTIONS`. Le fallback « non classable » n'est PAS proposé ici : il est
 * ajouté d'office au moment d'annoter (cf. `effectiveLabels`).
 */
export const MIN_SCAN_LABELS = 2;
export const MAX_SCAN_LABELS = 6;

/** Réponses tronquées avant l'envoi : une réponse fleuve ne doit pas manger le budget de tokens de tout le lot. */
const MAX_CHARS_PER_ITEM = 600;

/**
 * Budget de sortie. Une grille = une phrase de propriété + quelques étiquettes
 * courtes, mais les tokens de *reasoning* sont comptés ici et l'effort "low" en
 * consomme plus que "minimal". Trop bas, la sortie est tronquée et inexploitable.
 */
const MAX_COMPLETION_TOKENS = 2500;

/**
 * Plafond de temps sur l'appel AOAI. Sous les 10 s de la fonction Netlify pour
 * rendre une erreur franche plutôt que de se faire tuer par la plateforme. Un
 * peu plus large que l'annotation (8 s) : l'effort "low" pense davantage, et
 * c'est un appel unique, pas un maillon d'un run de plusieurs minutes.
 */
const AOAI_TIMEOUT_MS = 9000;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Endpoint + clé + déploiement chat Azure OpenAI, injectés explicitement. */
export interface ScanEnv {
  AOAI_ENDPOINT: string;
  AOAI_KEY: string;
  AOAI_CHAT_DEPLOYMENT: string;
}

/** Une réponse de l'échantillon : son texte suffit, le scan n'a pas besoin des ids. */
export interface ScanItem {
  text: string;
}

/** La grille proposée : exactement ce qu'attend la carte d'annotation. */
export interface ScanResult {
  /** Description en une phrase de ce qu'il vaut la peine de distinguer. */
  property: string;
  /** Étiquettes MECE, sans le fallback (ajouté à l'annotation). */
  labels: string[];
  /** Une ligne expliquant l'angle choisi — aide l'utilisateur à juger la proposition. */
  rationale?: string;
  /** Tokens facturés, remontés pour information. */
  usage?: { prompt: number; completion: number };
}

/** Levée sur quota dépassé (429) : le client doit réessayer plus tard, pas boucler. */
export class ScanRateLimitError extends Error {
  constructor(public retryAfterMs: number) {
    super("Quota du modèle atteint");
    this.name = "ScanRateLimitError";
  }
}

interface AoaiChatResponse {
  choices: Array<{ message: { content: string }; finish_reason?: string }>;
  usage?: { prompt_tokens: number; completion_tokens: number };
}

// ---------------------------------------------------------------------------
// Prompt
// ---------------------------------------------------------------------------

export function buildScanSystemPrompt(questionText: string): string {
  return `On te donne un ÉCHANTILLON de réponses libres à une question de sondage citoyen. Ta tâche : proposer UNE grille d'annotation exploitable, c'est-à-dire une propriété intéressante à distinguer dans ces réponses et les étiquettes qui la découpent.

QUESTION POSÉE AUX RÉPONDANTS
${questionText}

CE QUE TU PRODUIS
- property : une phrase disant ce que la grille distingue (ex. « la personne exprime-t-elle de la peur, de l'optimisme, ou de l'indifférence face à l'avenir ? »).
- labels : de ${MIN_SCAN_LABELS} à ${MAX_SCAN_LABELS} étiquettes courtes (1-3 mots), dans la LANGUE de la question.
- rationale : une phrase qui dit pourquoi cet angle est pertinent pour CES réponses.

RÈGLES POUR LES ÉTIQUETTES
- MECE : elles ne se chevauchent pas, et couvrent l'essentiel de ce que disent les réponses de l'échantillon.
- Ancrées dans l'échantillon : chaque étiquette doit correspondre à des réponses que tu as réellement vues, pas à ce que tu imagines qu'on pourrait répondre.
- Une dimension à la fois : ne mélange pas le thème abordé et le ton employé dans la même grille — choisis l'angle le plus saillant.
- N'AJOUTE PAS d'étiquette « autre » / « non classable » / « divers » : une catégorie fourre-tout est ajoutée automatiquement plus tard.
- Préfère peu d'étiquettes nettes à beaucoup d'étiquettes fines : c'est un point de départ que l'utilisateur affinera.

Réponds UNIQUEMENT en JSON : {"property":"…","labels":["…","…"],"rationale":"…"}`;
}

/**
 * Schéma strict de la sortie. Pas de `minItems`/`maxItems` (ignorés en mode
 * strict) : le nombre d'étiquettes est cadré par la consigne et re-borné par
 * `clampLabels`. `additionalProperties: false` interdit au modèle d'inventer
 * des champs.
 */
export function buildScanResponseSchema() {
  return {
    name: "annotation_scheme",
    strict: true,
    schema: {
      type: "object",
      properties: {
        property: { type: "string", description: "Ce que la grille distingue, en une phrase." },
        labels: {
          type: "array",
          items: { type: "string" },
          description: `De ${MIN_SCAN_LABELS} à ${MAX_SCAN_LABELS} étiquettes courtes.`,
        },
        rationale: { type: "string", description: "Pourquoi cet angle, en une phrase." },
      },
      required: ["property", "labels", "rationale"],
      additionalProperties: false,
    },
  };
}

/** L'échantillon, une réponse par bloc, tronqué pour ne pas déborder le budget. */
export function buildScanUserPrompt(items: ScanItem[]): string {
  return items
    .map((it, i) => {
      const text = it.text.trim().slice(0, MAX_CHARS_PER_ITEM) || "(réponse vide)";
      return `[${i + 1}] ${text}`;
    })
    .join("\n");
}

// ---------------------------------------------------------------------------
// Nettoyage de la sortie
// ---------------------------------------------------------------------------

/**
 * Dédoublonne, retire le vide, et re-borne à `MAX_SCAN_LABELS`. Le modèle
 * respecte en général la consigne, mais le schéma strict ne peut pas garantir
 * le compte : on le fait ici, seule barrière fiable.
 */
export function clampLabels(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of raw) {
    if (typeof item !== "string") continue;
    const label = item.trim();
    if (!label) continue;
    const key = label.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(label);
    if (out.length >= MAX_SCAN_LABELS) break;
  }
  return out;
}

// ---------------------------------------------------------------------------
// Scan
// ---------------------------------------------------------------------------

/**
 * Propose une grille d'annotation à partir d'un échantillon de réponses.
 *
 * @throws {ScanRateLimitError} sur 429 — l'appelant réessaie plus tard.
 * @throws {Error} sur toute autre panne (réseau, 5xx, réponse illisible, ou
 *   grille trop pauvre pour être exploitable).
 */
export async function scanSample(
  items: ScanItem[],
  questionText: string,
  env: ScanEnv,
): Promise<ScanResult> {
  if (items.length === 0) throw new Error("Échantillon vide : aucune réponse à scanner");

  const endpoint = (env.AOAI_ENDPOINT ?? "").replace(/\/$/, "");
  const url = `${endpoint}/openai/deployments/${env.AOAI_CHAT_DEPLOYMENT}/chat/completions?api-version=${AOAI_API_VERSION}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "api-key": env.AOAI_KEY ?? "" },
    body: JSON.stringify({
      messages: [
        { role: "system", content: buildScanSystemPrompt(questionText) },
        { role: "user", content: buildScanUserPrompt(items) },
      ],
      response_format: { type: "json_schema", json_schema: buildScanResponseSchema() },
      reasoning_effort: "low",
      max_completion_tokens: MAX_COMPLETION_TOKENS,
    }),
    signal: AbortSignal.timeout(AOAI_TIMEOUT_MS),
  });

  if (res.status === 429) {
    const retryAfter = Number(res.headers.get("retry-after"));
    throw new ScanRateLimitError(Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 20000);
  }
  if (!res.ok) {
    throw new Error(`AOAI error ${res.status}: ${await res.text()}`);
  }

  const json = (await res.json()) as AoaiChatResponse;
  const choice = json.choices?.[0];
  const content = choice?.message?.content;
  if (!content) {
    throw new Error(
      choice?.finish_reason === "length"
        ? "Réponse du modèle tronquée (max_completion_tokens atteint)"
        : "Réponse vide du modèle",
    );
  }

  let parsed: { property?: unknown; labels?: unknown; rationale?: unknown };
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error("Réponse du modèle illisible (JSON invalide)");
  }

  const property = typeof parsed.property === "string" ? parsed.property.trim() : "";
  const labels = clampLabels(parsed.labels);
  const rationale = typeof parsed.rationale === "string" ? parsed.rationale.trim() : "";

  if (!property || labels.length < MIN_SCAN_LABELS) {
    throw new Error("Le modèle n'a pas su dégager de grille exploitable sur cet échantillon");
  }

  return {
    property,
    labels,
    ...(rationale ? { rationale } : {}),
    ...(json.usage
      ? { usage: { prompt: json.usage.prompt_tokens, completion: json.usage.completion_tokens } }
      : {}),
  };
}
