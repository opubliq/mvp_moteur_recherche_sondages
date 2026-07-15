/**
 * Rerank sémantique Cohere Rerank v4.0 — module partagé.
 *
 * Prend le pool de candidats bruts renvoyés par `retrieve()` (Azure AI Search,
 * triés par `@search.score`), les formate en documents YAML, et les fait
 * reranker par Cohere Rerank (via Azure AI Foundry). Chaque candidat ressort
 * avec un `relevance_score` sémantique 0-1, et le pool est trié par ce score
 * décroissant.
 *
 * Pipeline cible (bead 9gf.11) :
 *   retrieve (Azure vector k=200, top-150 par @search.score)
 *     → rerankCandidates (documents YAML → Cohere rerank → relevance_score 0-1)
 *
 * Décisions figées :
 *   - Query passée à Cohere = la query utilisateur BRUTE (pas de reformulation NL).
 *   - Documents en YAML : `question:` en premier, puis (si présent)
 *     `options_de_reponse:` = les labels de response_options joints par " | ".
 *
 * Ce module est SÉPARÉ de `retrieve()` pour que le harness offline puisse
 * continuer d'appeler `retrieve()` sans forcer un appel Cohere.
 *
 * Les clés/endpoint Cohere sont injectés via le paramètre `env` (jamais lus
 * globalement) pour rester cohérent avec `retrieve()`.
 */

import type { ResponseOption } from "../types";
import type { RawCandidate } from "./retrieve";

// ---------------------------------------------------------------------------
// Constantes
// ---------------------------------------------------------------------------

/**
 * Fenêtre de rerank : on ne reranke que les N meilleurs candidats Azure
 * (par `@search.score` décroissant). Aligné sur le spike validé.
 */
const RERANK_WINDOW = 150;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Endpoint + clé + déploiement Cohere Rerank, injectés explicitement. */
export interface RerankEnv {
  COHERE_RERANK_ENDPOINT: string;
  COHERE_RERANK_DEPLOYMENT: string;
  COHERE_RERANK_KEY: string;
}

/**
 * Erreur de rerank porteuse du contexte, pour que l'appelant (ex. la fonction
 * `/search`) puisse renvoyer le bon message HTTP.
 */
export class RerankError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RerankError";
  }
}

interface CohereRerankResponse {
  results: Array<{ index: number; relevance_score: number }>;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Formate un document en YAML pour Cohere : le champ le plus important d'abord
 * (la question), puis l'échelle de réponse si elle existe.
 */
function yamlDoc(question: string, opts: ResponseOption[]): string {
  const labels = (opts || []).map((o) => o?.label).filter(Boolean);
  let s = `question: ${question ?? ""}`;
  if (labels.length) s += `\noptions_de_reponse: ${labels.join(" | ")}`;
  return s;
}

/**
 * Appelle l'endpoint Cohere Rerank et renvoie un tableau de scores aligné sur
 * l'ordre des `documents` d'entrée (score par index).
 */
async function cohereRerank(
  query: string,
  documents: string[],
  env: RerankEnv,
): Promise<number[]> {
  const endpoint = (env.COHERE_RERANK_ENDPOINT ?? "").replace(/\/$/, "");
  const url = `${endpoint}/providers/cohere/v2/rerank`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.COHERE_RERANK_KEY ?? ""}`,
    },
    body: JSON.stringify({
      model: env.COHERE_RERANK_DEPLOYMENT,
      query,
      documents,
      top_n: documents.length,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new RerankError(`Cohere rerank error ${res.status}: ${body}`);
  }

  const json = (await res.json()) as CohereRerankResponse;
  const scores = new Array<number>(documents.length).fill(0);
  for (const r of json.results ?? []) {
    if (r.index >= 0 && r.index < scores.length) {
      scores[r.index] = r.relevance_score;
    }
  }
  return scores;
}

// ---------------------------------------------------------------------------
// Rerank
// ---------------------------------------------------------------------------

/**
 * Reranke un pool de candidats Azure via Cohere Rerank.
 *
 * 1. Trie les candidats par `@search.score` décroissant et garde les top-N
 *    (fenêtre de rerank = {@link RERANK_WINDOW}).
 * 2. Formate chaque candidat en document YAML (question + options de réponse).
 * 3. Appelle Cohere avec la query utilisateur BRUTE.
 * 4. Attache `relevance_score` à chaque candidat et trie par score décroissant.
 *
 * @param query      Query utilisateur brute (déjà trim() côté appelant).
 * @param candidates Candidats bruts renvoyés par `retrieve()`.
 * @param env        Endpoint/clé/déploiement Cohere (voir {@link RerankEnv}).
 * @returns          Les candidats de la fenêtre, chacun avec son
 *                   `relevance_score`, triés par pertinence décroissante.
 * @throws {RerankError} Si l'appel Cohere échoue.
 */
export async function rerankCandidates(
  query: string,
  candidates: RawCandidate[],
  env: RerankEnv,
): Promise<RawCandidate[]> {
  if (!candidates || candidates.length === 0) return [];

  // 1. Fenêtre de rerank : top-N par @search.score desc.
  const window = [...candidates]
    .sort((a, b) => (b["@search.score"] || 0) - (a["@search.score"] || 0))
    .slice(0, RERANK_WINDOW);

  // 2. Documents YAML.
  const documents = window.map((c) => yamlDoc(c.question_text, c.response_options));

  // 3. Appel Cohere (query brute).
  const scores = await cohereRerank(query, documents, env);

  // 4. Attache relevance_score + tri desc.
  const reranked = window.map((c, i) => ({ ...c, relevance_score: scores[i] }));
  reranked.sort((a, b) => (b.relevance_score || 0) - (a.relevance_score || 0));

  return reranked;
}
