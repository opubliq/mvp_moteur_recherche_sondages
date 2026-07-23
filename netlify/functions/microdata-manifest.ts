/**
 * Netlify Function — /microdata-manifest (bead aat.1)
 *
 * GET  /microdata-manifest
 *   → { surveys: ManifestEntry[] }
 *
 * Expose le `_manifest.json` du Blob : la liste des sondages dont le Parquet
 * répondant existe, donc dont les distributions/crosstabs de /microdata sont
 * calculables. Comble le manque de plomberie du bead : sans lui, l'agent (ou le
 * UI) ne peut pas savoir à l'avance quels sondages sont croisables et risque de
 * proposer un croisement voué au 404.
 *
 * Ne réimplémente rien : simple GET HTTP sur l'URL signée, via `fetchManifest`
 * du cœur portable. La clé de stockage ne quitte jamais le serveur (SAS signé).
 *
 * Env (serveur only) : AZURE_STORAGE_ACCOUNT, AZURE_STORAGE_KEY, AZURE_STORAGE_CONTAINER
 */

import type { Handler } from "@netlify/functions";
import { fetchManifest, MicrodataError } from "./microdata-core/core.js";

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/json",
};

export const handler: Handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers: CORS_HEADERS, body: "" };
  if (event.httpMethod !== "GET") {
    return { statusCode: 405, headers: CORS_HEADERS, body: JSON.stringify({ error: "Method Not Allowed" }) };
  }

  for (const key of ["AZURE_STORAGE_ACCOUNT", "AZURE_STORAGE_KEY", "AZURE_STORAGE_CONTAINER"] as const) {
    if (!process.env[key]) {
      console.error(`[microdata-manifest] Missing env var: ${key}`);
      return { statusCode: 500, headers: CORS_HEADERS, body: JSON.stringify({ error: `Server configuration error: missing ${key}` }) };
    }
  }

  const config = {
    storage: {
      account: process.env.AZURE_STORAGE_ACCOUNT!,
      key: process.env.AZURE_STORAGE_KEY!,
      container: process.env.AZURE_STORAGE_CONTAINER!,
    },
  };

  try {
    const manifest = await fetchManifest(config);
    return { statusCode: 200, headers: CORS_HEADERS, body: JSON.stringify(manifest) };
  } catch (err) {
    if (err instanceof MicrodataError) {
      return { statusCode: err.status, headers: CORS_HEADERS, body: JSON.stringify({ error: err.message }) };
    }
    console.error("[microdata-manifest] failed:", err);
    return { statusCode: 502, headers: CORS_HEADERS, body: JSON.stringify({ error: "Manifest fetch failed" }) };
  }
};
