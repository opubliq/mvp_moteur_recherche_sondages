/**
 * Basic Auth applicative — remplace `netlify/edge-functions/auth.ts` (f3i.1).
 *
 * Azure Functions n'a pas d'équivalent direct aux Netlify Edge Functions (pas
 * de hook "avant toute route" configurable par un simple `path: "/*"`). On
 * réplique donc la vérification en middleware appelé en tête de chaque
 * handler HTTP, plutôt que de dépendre d'une feature de plateforme (Easy
 * Auth) qui changerait le modèle d'auth (SSO/Entra ID) au lieu de porter le
 * Basic Auth existant à l'identique.
 *
 * Comptes configurés via les mêmes variables d'env que côté Netlify :
 *   - BASIC_AUTH_USER / BASIC_AUTH_PASSWORD — le compte partagé historique.
 *   - BASIC_AUTH_EXTRA_ACCOUNTS — JSON `{"user": "password", ...}`, un
 *     username double comme identifiant de tenant côté `src/logic/tenancy.ts`.
 */

import type { HttpRequest, HttpResponseInit } from "@azure/functions";

const REALM = "Opubliq restricted access";

function loadAccounts(): Record<string, string> {
  const accounts: Record<string, string> = {};

  const user = process.env.BASIC_AUTH_USER;
  const password = process.env.BASIC_AUTH_PASSWORD;
  if (user && password) accounts[user] = password;

  const extraRaw = process.env.BASIC_AUTH_EXTRA_ACCOUNTS;
  if (extraRaw) {
    try {
      const extra = JSON.parse(extraRaw) as Record<string, string>;
      for (const [u, p] of Object.entries(extra)) {
        if (typeof p === "string" && p) accounts[u] = p;
      }
    } catch (err) {
      console.error("[auth] BASIC_AUTH_EXTRA_ACCOUNTS invalide (JSON attendu) :", err);
    }
  }

  return accounts;
}

/**
 * Vérifie le Basic Auth de la requête. Retourne `undefined` si l'accès est
 * autorisé (le handler appelant doit continuer), ou une `HttpResponseInit`
 * 401 à renvoyer telle quelle sinon.
 *
 * Comme côté Netlify : si aucun compte n'est configuré, on ne bloque rien
 * (évite de se verrouiller dehors en environnement mal configuré).
 */
export function checkBasicAuth(request: HttpRequest): HttpResponseInit | undefined {
  const accounts = loadAccounts();
  if (Object.keys(accounts).length === 0) return undefined;

  const header = request.headers.get("authorization") || "";
  const [scheme, encoded] = header.split(" ");

  if (scheme === "Basic" && encoded) {
    let decoded = "";
    try {
      decoded = Buffer.from(encoded, "base64").toString("utf-8");
    } catch {
      decoded = "";
    }
    const sep = decoded.indexOf(":");
    const user = decoded.slice(0, sep);
    const password = decoded.slice(sep + 1);

    if (Object.prototype.hasOwnProperty.call(accounts, user) && accounts[user] === password) {
      return undefined;
    }
  }

  return {
    status: 401,
    headers: { "WWW-Authenticate": `Basic realm="${REALM}", charset="UTF-8"` },
    body: "Accès restreint. Identifiants requis.",
  };
}
