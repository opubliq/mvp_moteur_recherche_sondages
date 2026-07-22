/**
 * Annotation LLM de réponses libres (bead jsu.6) — module partagé.
 *
 * L'utilisateur décrit en texte libre une PROPRIÉTÉ et ses ÉTIQUETTES ; le
 * modèle range chaque réponse dans une (et une seule) étiquette. La propriété
 * devient alors une variable quantitative, croisable avec le reste du sondage
 * (jsu.7).
 *
 * MODÈLE : gpt-5-mini sur `opubliq-sondages-aoai` (décision du bead). C'est un
 * modèle *reasoning* : `temperature` n'est pas réglable (400 sur toute valeur
 * autre que 1) et deux appels identiques peuvent différer à la marge. C'est
 * assumé ici — la boucle de test sur 4-5 réponses existe précisément pour que
 * l'utilisateur voie le classement avant de payer un batch — mais c'est aussi
 * pourquoi on ne promet nulle part que ré-annoter donne le même résultat.
 * `reasoning_effort: "minimal"` : la tâche est un rangement, pas un problème ;
 * l'effort par défaut triplerait les tokens de sortie facturés et le temps de
 * run, sans rien classer de mieux.
 *
 * PLUSIEURS RÉPONSES PAR APPEL, ET C'EST LE QUOTA QUI L'IMPOSE. Le déploiement
 * est plafonné à 30 requêtes/min ET 30 000 tokens/min (mesuré sur les en-têtes
 * `x-ratelimit-*`). Un appel par réponse mettrait 91 minutes pour la plus
 * grosse question du corpus (2 730 réponses) rien qu'en RPM. En groupant, la
 * consigne système est amortie sur tout le paquet et le run redevient borné par
 * les tokens, pas par le nombre d'appels.
 *
 * En contrepartie, grouper crée un risque propre : le modèle saute une réponse
 * ou décale sa numérotation. D'où une sortie CLÉ→ÉTIQUETTE (jamais un tableau
 * positionnel), et `annotateBatch` qui signale les manquants au lieu de
 * réaligner en silence — une annotation décalée d'un cran est indétectable en
 * aval et empoisonne le croisement de jsu.7.
 *
 * SORTIE CONTRAINTE PAR SCHÉMA (`json_schema` strict), PAS PAR CONSIGNE. Mesuré
 * sur des réponses anglaises avec des étiquettes françaises : en `json_object`,
 * le modèle TRADUIT les étiquettes — 'environmental' pour 'environnemental',
 * 'other' pour 'autre' — malgré une consigne explicite de les copier à la
 * lettre. 45 % des réponses d'un lot devenaient inclassables, et cet échec-là
 * est trompeur : il ressemble à un problème de prompt alors que c'est un
 * problème de format. Un `enum` par clé rend l'étiquette hors-liste
 * impossible ; `required` sur toutes les clés rend l'omission impossible.
 */

// ---------------------------------------------------------------------------
// Constantes
// ---------------------------------------------------------------------------

/** Route Chat Completions Azure OpenAI (gpt-5-mini requiert 2024-12-01-preview ou plus récent). */
const AOAI_API_VERSION = "2024-12-01-preview";

/**
 * Étiquette de secours, TOUJOURS ajoutée aux options de l'utilisateur.
 *
 * Sans porte de sortie, un classifieur force : une réponse vide, hors-sujet ou
 * franchement ambiguë atterrit dans l'étiquette la plus proche et gonfle
 * silencieusement un chiffre que l'utilisateur lira comme un résultat. Mieux
 * vaut une catégorie « je ne peux pas trancher » visible dans la distribution.
 */
export const FALLBACK_LABEL = "non classable";

/**
 * Plafond de réponses par appel LLM. 25 tient largement dans les 10 s d'une
 * fonction Netlify synchrone et garde le prompt assez court pour que le modèle
 * n'en perde pas en route.
 */
export const MAX_ITEMS_PER_CALL = 25;

/**
 * Plafond réduit quand on demande les justifications : le modèle rédige alors
 * une phrase par réponse, et 25 réponses ont dépassé les 8 s du timeout en
 * mesure réelle — donc les 10 s de la fonction Netlify. L'essai porte de toute
 * façon sur une poignée de réponses cochées.
 */
export const MAX_ITEMS_WITH_REASON = 10;

/**
 * Budget de sortie. Les tokens de *reasoning* sont facturés et comptés ici :
 * trop bas, la réponse est tronquée (`finish_reason: "length"`) et le paquet
 * entier est perdu. ~90 tokens/réponse en mode justifié, ~25 sinon, plus une
 * marge fixe pour le raisonnement même en effort minimal.
 */
function maxCompletionTokens(count: number, withReason: boolean): number {
  return 1500 + count * (withReason ? 90 : 25);
}

/**
 * Plafond de temps sur l'appel AOAI. Sous les 10 s de la fonction Netlify, pour
 * rendre une erreur franche plutôt que de se faire tuer par la plateforme —
 * le client sait alors qu'il peut rejouer ce paquet.
 */
const AOAI_TIMEOUT_MS = 8000;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Endpoint + clé + déploiement chat Azure OpenAI, injectés explicitement. */
export interface AnnotateEnv {
  AOAI_ENDPOINT: string;
  AOAI_KEY: string;
  AOAI_CHAT_DEPLOYMENT: string;
}

/** Ce que l'utilisateur définit : une propriété, ses étiquettes, la question d'origine. */
export interface AnnotationSpec {
  /** Description en texte libre de ce qu'on cherche à distinguer. */
  property: string;
  /** Étiquettes proposées par l'utilisateur (sans le fallback, ajouté ici). */
  options: string[];
  /** Libellé de la question posée aux répondants — sans lui, une réponse libre est illisible. */
  questionText: string;
}

/** Une réponse à annoter : son id et son texte, rien d'autre. */
export interface AnnotationItem {
  id: string;
  text: string;
}

/** Le verdict du modèle sur une réponse. */
export interface Annotation {
  label: string;
  /** Justification courte — demandée en mode test seulement (cf. `withReason`). */
  reason?: string;
}

export interface AnnotateResult {
  /** id de réponse → verdict. Peut être incomplet : voir `missing`. */
  annotations: Record<string, Annotation>;
  /** ids que le modèle n'a pas classés (omission ou étiquette illisible). */
  missing: string[];
  /** Tokens facturés, remontés jusqu'au client pour piloter le rythme du batch. */
  usage?: { prompt: number; completion: number };
}

/** Levée sur quota dépassé (429) : le client doit ralentir, pas abandonner. */
export class RateLimitError extends Error {
  constructor(public retryAfterMs: number) {
    super("Quota du modèle atteint");
    this.name = "RateLimitError";
  }
}

interface AoaiChatResponse {
  choices: Array<{ message: { content: string }; finish_reason?: string }>;
  usage?: { prompt_tokens: number; completion_tokens: number };
}

// ---------------------------------------------------------------------------
// Prompt
// ---------------------------------------------------------------------------

/** Étiquettes effectives : celles de l'utilisateur, nettoyées, + le fallback. */
export function effectiveLabels(options: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const o of options) {
    const label = o.trim();
    if (!label) continue;
    const key = label.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(label);
  }
  if (!seen.has(FALLBACK_LABEL)) out.push(FALLBACK_LABEL);
  return out;
}

export function buildSystemPrompt(spec: AnnotationSpec, withReason: boolean): string {
  const labels = effectiveLabels(spec.options);
  const format = withReason
    ? `{"1":{"l":"étiquette","r":"justification"},"2":{"l":"étiquette","r":"justification"}}`
    : `{"1":"étiquette","2":"étiquette"}`;

  const hasFallback = labels.some((l) => l.toLowerCase() === FALLBACK_LABEL);

  return `Tu classes des réponses libres à une question de sondage citoyen. Pour CHAQUE réponse numérotée, tu choisis UNE SEULE étiquette.

QUESTION POSÉE AUX RÉPONDANTS
${spec.questionText}

CONSIGNE DE L'UTILISATEUR — ce qu'il cherche à distinguer
${spec.property.trim()}

ÉTIQUETTES POSSIBLES
${labels.map((l) => `- ${l}`).join("\n")}

RÈGLES
- Une seule étiquette par réponse.
- Classe ce que la réponse DIT, pas ce que tu supposes de la personne qui l'a écrite.
- Les réponses sont INDÉPENDANTES : ne t'appuie pas sur les autres réponses du lot pour trancher, et ne cherche aucun équilibre entre les étiquettes.
- Les réponses sont brutes : fautes, majuscules, une ligne ou un paragraphe, français ou anglais. Ça n'entre pas dans le classement.${
    withReason
      ? "\n- Justification : 12 mots maximum, dans la langue de la question, appuyée sur les mots de la réponse."
      : ""
  }
${
  hasFallback
    ? `
QUAND UTILISER « ${FALLBACK_LABEL} » — RESTRICTIF
- UNIQUEMENT si la réponse elle-même est inexploitable : vide, illisible, ou sans aucun rapport avec la question posée.
- L'ABSENCE de la propriété cherchée n'est PAS un cas « ${FALLBACK_LABEL} ». Si la réponse se lit et que la propriété n'y est simplement pas, elle appartient à l'étiquette qui décrit cette absence (« non », « autre », « aucun »…). Une réponse claire où la propriété est absente est un cas FACILE, pas un cas ambigu.
- « Je ne suis pas certain de l'intention de la personne » n'est pas un motif. Tu tranches sur ce que la réponse dit littéralement ; tu n'as jamais accès à l'intention, et l'exiger reviendrait à tout mettre au refuge.
- Si la consigne de l'utilisateur ci-dessus dit explicitement quoi faire des cas ambigus, elle PRIME sur cette section.
`
    : `
IL N'Y A PAS D'ÉTIQUETTE DE SECOURS : chaque réponse doit recevoir une des étiquettes ci-dessus. Tranche sur ce que la réponse dit littéralement, même quand elle est brève ou maladroite.
`
}
Réponds UNIQUEMENT en JSON, une clé par numéro de réponse : ${format}`;
}

/**
 * Schéma strict de la sortie : une clé obligatoire par réponse du lot, dont la
 * valeur ne peut être qu'une des étiquettes. C'est ce qui remplace la confiance
 * dans la consigne (cf. l'en-tête de fichier).
 *
 * L'énumération est factorisée dans `$defs` plutôt que recopiée sous chacune
 * des 25 clés : le schéma voyage dans le prompt et se paie en tokens à chaque
 * appel, donc sur toute la fenêtre de quota. Mesuré : 1 231 → 1 053 tokens
 * d'entrée par paquet, et l'écart grandit avec le nombre d'étiquettes.
 */
export function buildResponseSchema(count: number, labels: string[], withReason: boolean) {
  const keys = Array.from({ length: count }, (_, i) => String(i + 1));
  const value = withReason
    ? {
        type: "object",
        properties: {
          l: { $ref: "#/$defs/label" },
          r: { type: "string", description: "Justification, 12 mots maximum" },
        },
        required: ["l", "r"],
        additionalProperties: false,
      }
    : { $ref: "#/$defs/label" };

  return {
    name: "annotations",
    strict: true,
    schema: {
      type: "object",
      properties: Object.fromEntries(keys.map((k) => [k, value])),
      required: keys,
      additionalProperties: false,
      $defs: { label: { type: "string", enum: labels } },
    },
  };
}

/** Le lot, numéroté. Les délimiteurs tiennent les réponses multi-lignes à distance les unes des autres. */
export function buildUserPrompt(items: AnnotationItem[]): string {
  return items
    .map((it, i) => `[${i + 1}]\n${it.text.trim() || "(réponse vide)"}\n[/${i + 1}]`)
    .join("\n\n");
}

// ---------------------------------------------------------------------------
// Annotation
// ---------------------------------------------------------------------------

/** Ramène une étiquette produite par le modèle sur une étiquette autorisée. */
function canonicalLabel(raw: unknown, labels: string[]): string | null {
  if (typeof raw !== "string") return null;
  const v = raw.trim().toLowerCase();
  if (!v) return null;
  return labels.find((l) => l.toLowerCase() === v) ?? null;
}

/**
 * Annote UN lot de réponses en un appel.
 *
 * Ne rejoue rien et n'invente rien : les réponses non classées ressortent dans
 * `missing`, à charge de l'appelant de les rejouer ou de les marquer. Le
 * découpage, la cadence et la reprise sont l'affaire du client (cf.
 * `src/lib/annotationRun.ts`), qui seul connaît le run complet.
 *
 * @throws {RateLimitError} sur 429 — l'appelant doit attendre puis rejouer.
 * @throws {Error} sur toute autre panne (réseau, 5xx, réponse illisible).
 */
export async function annotateBatch(
  items: AnnotationItem[],
  spec: AnnotationSpec,
  env: AnnotateEnv,
  opts: { withReason?: boolean } = {},
): Promise<AnnotateResult> {
  if (items.length === 0) return { annotations: {}, missing: [] };

  const withReason = opts.withReason ?? false;
  const labels = effectiveLabels(spec.options);
  const endpoint = (env.AOAI_ENDPOINT ?? "").replace(/\/$/, "");
  const url = `${endpoint}/openai/deployments/${env.AOAI_CHAT_DEPLOYMENT}/chat/completions?api-version=${AOAI_API_VERSION}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "api-key": env.AOAI_KEY ?? "" },
    body: JSON.stringify({
      messages: [
        { role: "system", content: buildSystemPrompt(spec, withReason) },
        { role: "user", content: buildUserPrompt(items) },
      ],
      response_format: {
        type: "json_schema",
        json_schema: buildResponseSchema(items.length, labels, withReason),
      },
      reasoning_effort: "minimal",
      max_completion_tokens: maxCompletionTokens(items.length, withReason),
    }),
    signal: AbortSignal.timeout(AOAI_TIMEOUT_MS),
  });

  if (res.status === 429) {
    // Azure renvoie `retry-after` en secondes ; à défaut, la fenêtre de quota
    // est d'une minute, on attend donc franchement plutôt que de marteler.
    const retryAfter = Number(res.headers.get("retry-after"));
    throw new RateLimitError(Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 20000);
  }
  if (!res.ok) {
    throw new Error(`AOAI error ${res.status}: ${await res.text()}`);
  }

  const json = (await res.json()) as AoaiChatResponse;
  const choice = json.choices?.[0];
  const content = choice?.message?.content;
  if (!content) {
    // `length` = budget de sortie épuisé (reasoning compris) : le JSON est
    // tronqué, donc inexploitable. Le dire explicitement évite de chercher un
    // bug de prompt là où il n'y a qu'un plafond trop bas.
    throw new Error(
      choice?.finish_reason === "length"
        ? "Réponse du modèle tronquée (max_completion_tokens atteint)"
        : "Réponse vide du modèle",
    );
  }

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(content) as Record<string, unknown>;
  } catch {
    throw new Error("Réponse du modèle illisible (JSON invalide)");
  }

  const annotations: Record<string, Annotation> = {};
  const missing: string[] = [];

  items.forEach((it, i) => {
    const entry = parsed[String(i + 1)];
    const rawLabel = entry && typeof entry === "object" ? (entry as Record<string, unknown>).l : entry;
    const label = canonicalLabel(rawLabel, labels);
    if (!label) {
      missing.push(it.id);
      return;
    }
    const rawReason = entry && typeof entry === "object" ? (entry as Record<string, unknown>).r : undefined;
    annotations[it.id] = {
      label,
      ...(withReason && typeof rawReason === "string" && rawReason.trim()
        ? { reason: rawReason.trim() }
        : {}),
    };
  });

  return {
    annotations,
    missing,
    ...(json.usage
      ? { usage: { prompt: json.usage.prompt_tokens, completion: json.usage.completion_tokens } }
      : {}),
  };
}
