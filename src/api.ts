import type { SearchFilters, SearchResponse } from "./types";
import { MOCK_RESPONSE } from "./mock";

/**
 * Flag dev : si VITE_USE_MOCK=true, on renvoie une réponse mock au lieu
 * d'appeler la Netlify Function. Sert à valider le rendu quand l'index
 * Azure est vide. Désactivé par défaut.
 */
const USE_MOCK = import.meta.env.VITE_USE_MOCK === "true";

/** Appelle la Netlify Function `/search`. */
export async function search(
  query: string,
  filters: SearchFilters,
  top = 30,
): Promise<SearchResponse> {
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 300));
    return MOCK_RESPONSE;
  }

  const res = await fetch("/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, filters, top }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Recherche échouée (${res.status}): ${body || res.statusText}`);
  }

  return (await res.json()) as SearchResponse;
}
