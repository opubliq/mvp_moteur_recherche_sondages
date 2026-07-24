/**
 * Orchestration d'un run d'annotation (bead jsu.6) — côté client.
 *
 * POURQUOI CÔTÉ CLIENT. Les fonctions Netlify du projet sont synchrones (~10 s) :
 * annoter mille réponses en un appel est impossible. Le découpage remonte donc
 * ici, et ce n'est pas un pis-aller — c'est ce qui rend la progression RÉELLE
 * (norme explicite de `SearchProgress.tsx`), la reprise possible paquet par
 * paquet plutôt que « tout ou rien », et la cadence pilotable.
 *
 * L'UNIVERS N'EST PAS LA LISTE AFFICHÉE. En mode recherche, l'écran montre 15
 * citations reclassées par Cohere ; le run, lui, porte sur TOUTES les réponses
 * de la question — sinon le chiffre produit ne veut rien dire. D'où
 * `fetchUniverse`, qui pagine `/verbatims` en mode parcours (`top` plafonné à
 * 200 côté fonction) indépendamment de ce que l'utilisateur regarde.
 *
 * LA CADENCE EST IMPOSÉE PAR LE QUOTA, PAS PAR LA LATENCE. Le déploiement
 * gpt-5-mini est plafonné à 30 requêtes/min ET 30 000 tokens/min (mesuré sur les
 * en-têtes `x-ratelimit-*`). Un paquet de 25 réponses coûte ~1 200 tokens et
 * ~2,4 s : c'est le plafond de TOKENS qui mord en premier, ~25 appels/min. On
 * vise donc délibérément un peu en dessous (`MIN_DISPATCH_INTERVAL_MS`) plutôt
 * que de foncer et de vivre sous 429 — pousser plus fort ne finirait pas plus
 * vite, puisque le quota est une fenêtre, pas une file.
 */

import { annotateChunk, AnnotateRateLimitError, fetchVerbatims } from "../api";
import {
  MAX_ITEMS_PER_CALL,
  MAX_ITEMS_WITH_REASON,
  type Annotation,
  type AnnotationSpec,
} from "../logic/annotate";
import type { Verbatim } from "../types";

/**
 * Plafond de réponses par run. Aucune question du corpus ne s'en approche (la
 * plus grosse, `C8IO` de govcan_parca_2024, en compte 2 730) : ce n'est pas une
 * limite qu'on rencontre en usage normal, c'est le garde-fou qui empêche un
 * futur sondage bien plus gros de lancer des milliers d'appels LLM sur un clic.
 */
export const MAX_RUN_ITEMS = 5000;

/** Page de récupération de l'univers — le maximum accepté par `/verbatims`. */
const UNIVERSE_PAGE = 200;

/**
 * Intervalle minimum entre deux départs d'appel : ~23 appels/min, soit
 * ~28 000 tokens/min à 1 200 tokens le paquet — juste sous le quota. Marge
 * assumée : un run de 2 730 réponses prend ~4,8 min plutôt que de passer son
 * temps à encaisser des 429 pour finir au même moment.
 */
const MIN_DISPATCH_INTERVAL_MS = 2600;

/**
 * Deux appels en vol. Le débit est fixé par l'intervalle ci-dessus ; la
 * concurrence ne sert qu'à ce qu'un appel lent ne décale pas toute la file.
 */
const MAX_IN_FLIGHT = 2;

/** Tentatives par paquet sur erreur franche (réseau, 5xx). Le 429 ne compte pas : il attend. */
const MAX_ATTEMPTS = 3;

export type RunPhase = "fetching" | "annotating" | "waiting" | "done" | "aborted" | "error";

export interface RunProgress {
  phase: RunPhase;
  /** Réponses annotées jusqu'ici. */
  done: number;
  /** Réponses de l'univers (0 tant que la récupération n'est pas finie). */
  total: number;
  /** Réponses définitivement non classées (paquet en échec après reprises). */
  failed: number;
  /** En phase `waiting` : temps d'attente restant imposé par le quota. */
  waitUntil?: number;
}

export interface RunOutcome {
  total: number;
  annotated: number;
  failed: number;
  aborted: boolean;
}

const sleep = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    const t = setTimeout(resolve, ms);
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(t);
        reject(new DOMException("Aborted", "AbortError"));
      },
      { once: true },
    );
  });

const isAbort = (err: unknown) => err instanceof DOMException && err.name === "AbortError";

/**
 * Récupère TOUTES les réponses d'une question, page par page, en mode parcours.
 *
 * `onPage` sert à afficher un décompte qui monte pendant la récupération : sur
 * 2 730 réponses ce sont 14 allers-retours, assez pour qu'un écran figé passe
 * pour un plantage.
 */
export async function fetchUniverse(
  surveyId: string,
  variable: string,
  opts: { cap?: number; signal?: AbortSignal; onPage?: (fetched: number, total: number) => void } = {},
): Promise<{ rows: Verbatim[]; total: number; truncated: boolean }> {
  const cap = opts.cap ?? MAX_RUN_ITEMS;
  const rows: Verbatim[] = [];
  let total = 0;

  for (;;) {
    const res = await fetchVerbatims({
      surveyId,
      variable,
      top: Math.min(UNIVERSE_PAGE, cap - rows.length),
      skip: rows.length,
    });
    total = res.total;
    rows.push(...res.results);
    opts.onPage?.(rows.length, Math.min(total, cap));
    if (opts.signal?.aborted) throw new DOMException("Aborted", "AbortError");
    if (res.results.length === 0 || rows.length >= Math.min(total, cap)) break;
  }

  return { rows, total, truncated: total > cap };
}

/**
 * Tire un échantillon de réponses NON VIDES pour le scanner.
 *
 * Même principe que le tirage de la carte d'annotation (`sampleRandom` dans
 * VerbatimsPage) : on prend une fenêtre au hasard dans toute la question puis on
 * pioche dedans, plutôt que de balayer les premières réponses de l'index — un
 * tranche arbitraire du fichier, où l'on proposerait une grille biaisée sur un
 * coin du corpus. Les réponses vides sont écartées : elles n'apprennent rien au
 * scan et gaspillent son budget.
 */
export async function fetchScanSample(
  surveyId: string,
  variable: string,
  questionTotal: number,
  n: number,
  opts: { signal?: AbortSignal } = {},
): Promise<Verbatim[]> {
  if (questionTotal === 0) return [];
  const windowSize = Math.min(UNIVERSE_PAGE, questionTotal);
  const skip = Math.floor(Math.random() * (questionTotal - windowSize + 1));
  const res = await fetchVerbatims({ surveyId, variable, top: windowSize, skip });
  if (opts.signal?.aborted) throw new DOMException("Aborted", "AbortError");

  const pool = res.results.filter((v) => v.text.trim().length > 0);
  const picked: Verbatim[] = [];
  while (picked.length < Math.min(n, pool.length)) {
    picked.push(...pool.splice(Math.floor(Math.random() * pool.length), 1));
  }
  return picked;
}

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

/**
 * Annote une liste de réponses déjà connues (l'univers, ou la sélection en mode
 * test). Les annotations remontent AU FIL DE L'EAU via `onAnnotations` : une
 * annotation acquise ne doit jamais être perdue parce que le paquet suivant a
 * échoué — c'est tout l'intérêt du découpage.
 */
export async function runAnnotation(opts: {
  items: Verbatim[];
  spec: AnnotationSpec;
  withReason?: boolean;
  signal?: AbortSignal;
  onAnnotations: (batch: Record<string, Annotation>) => void;
  onProgress?: (p: RunProgress) => void;
}): Promise<RunOutcome> {
  const { items, spec, signal } = opts;
  const total = items.length;
  let done = 0;
  let failed = 0;

  // Paquets plus petits en mode justifié : le modèle rédige, et un lot plein
  // dépasse le budget de temps de la fonction (cf. MAX_ITEMS_WITH_REASON).
  const chunkSize = opts.withReason ? MAX_ITEMS_WITH_REASON : MAX_ITEMS_PER_CALL;
  const queue = chunk(items, chunkSize).map((c) => ({ items: c, attempts: 0 }));
  /** Pas de départ avant cette date — avancée à chaque dispatch, et repoussée sur 429. */
  let nextSlot = 0;

  const report = (phase: RunPhase, waitUntil?: number) =>
    opts.onProgress?.({ phase, done, total, failed, waitUntil });

  report("annotating");

  const worker = async () => {
    for (;;) {
      if (signal?.aborted) return;
      const job = queue.shift();
      if (!job) return;

      // Créneau de départ : garde le débit global sous le quota, quel que soit
      // le nombre de workers.
      const wait = nextSlot - Date.now();
      if (wait > 0) {
        report(wait > 3000 ? "waiting" : "annotating", nextSlot);
        await sleep(wait, signal);
      }
      nextSlot = Math.max(Date.now(), nextSlot) + MIN_DISPATCH_INTERVAL_MS;

      try {
        const res = await annotateChunk({
          spec,
          items: job.items.map((v) => ({ id: v.id, text: v.text })),
          withReason: opts.withReason,
          signal,
        });
        const count = Object.keys(res.annotations).length;
        if (count > 0) {
          done += count;
          opts.onAnnotations(res.annotations);
        }
        // Réponses que le modèle a sautées : on les remet en file une fois,
        // puis on les compte en échec. Jamais de réalignement positionnel —
        // une annotation décalée d'un cran fausserait le croisement de jsu.7
        // sans que rien ne le signale.
        if (res.missing.length > 0) {
          const missingRows = job.items.filter((v) => res.missing.includes(v.id));
          if (job.attempts + 1 < MAX_ATTEMPTS) {
            queue.push({ items: missingRows, attempts: job.attempts + 1 });
          } else {
            failed += missingRows.length;
          }
        }
        report("annotating");
      } catch (err) {
        if (isAbort(err) || signal?.aborted) return;
        if (err instanceof AnnotateRateLimitError) {
          // Le quota est une fenêtre : on retarde TOUTE la file, pas seulement
          // ce paquet, sinon les workers suivants repartent dans le mur.
          nextSlot = Math.max(nextSlot, Date.now() + err.retryAfterMs);
          queue.unshift(job); // pas une tentative ratée : rien n'a été tenté
          report("waiting", nextSlot);
          continue;
        }
        if (job.attempts + 1 < MAX_ATTEMPTS) {
          queue.push({ items: job.items, attempts: job.attempts + 1 });
        } else {
          failed += job.items.length;
          report("annotating");
        }
      }
    }
  };

  try {
    await Promise.all(Array.from({ length: Math.min(MAX_IN_FLIGHT, queue.length) }, worker));
  } catch (err) {
    if (!isAbort(err)) throw err;
  }

  const aborted = Boolean(signal?.aborted);
  report(aborted ? "aborted" : "done");
  return { total, annotated: done, failed, aborted };
}
