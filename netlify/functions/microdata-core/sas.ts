/**
 * Génération d'un Account SAS (read-only, courte durée) — CŒUR PORTABLE.
 *
 * Signe côté serveur avec la clé du compte de stockage ; la clé n'est JAMAIS
 * exposée. On émet une URL Blob signée à durée de vie courte que DuckDB/httpfs
 * lit via des requêtes HTTP RANGE. Pure fonction crypto : aucune dépendance au
 * runtime Netlify — réutilisable tel quel sur Azure Functions / Container Apps.
 */

import crypto from "node:crypto";

export interface StorageConfig {
  account: string;
  key: string; // clé de compte base64 — SERVEUR uniquement
  container: string;
}

/** ISO 8601 sans millisecondes (format attendu par la signature Azure). */
function isoNoMs(d: Date): string {
  return d.toISOString().replace(/\.\d{3}Z$/, "Z");
}

/**
 * Account SAS lecture seule sur les blobs du compte.
 * signedversion 2022-11-02 → StringToSign inclut le champ EncryptionScope final.
 */
export function buildAccountSas(cfg: StorageConfig, ttlMinutes = 10): string {
  const now = new Date(Date.now() - 5 * 60 * 1000); // 5 min de dérive d'horloge
  const exp = new Date(Date.now() + ttlMinutes * 60 * 1000);

  const sv = "2022-11-02";
  const ss = "b"; // service: blob
  const srt = "co"; // resource types: container + object
  const sp = "r"; // permission: read
  const st = isoNoMs(now);
  const se = isoNoMs(exp);
  const spr = "https";

  const stringToSign = [cfg.account, sp, ss, srt, st, se, "", spr, sv, ""].join("\n") + "\n";
  const sig = crypto
    .createHmac("sha256", Buffer.from(cfg.key, "base64"))
    .update(stringToSign, "utf8")
    .digest("base64");

  return new URLSearchParams({ sv, ss, srt, sp, se, st, spr, sig }).toString();
}

/** URL signée d'un blob du container (ex. `eeq_2014.parquet`, `_manifest.json`). */
export function signedBlobUrl(cfg: StorageConfig, blobName: string, ttlMinutes = 10): string {
  const sas = buildAccountSas(cfg, ttlMinutes);
  return `https://${cfg.account}.blob.core.windows.net/${cfg.container}/${blobName}?${sas}`;
}
