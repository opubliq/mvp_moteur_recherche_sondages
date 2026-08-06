/**
 * Point d'entrée d'autorisation unique pendant la migration Basic Auth → comptes
 * réels (f3i.19.2/.3). Nom volontairement explicite : ce fichier est destiné à
 * disparaître (bead de suivi mvp_moteur_recherche_sondages-f3i.20) une fois
 * `ALLOW_BASIC_AUTH_FALLBACK=false` confirmé stable en prod.
 *
 * Ordre de résolution :
 *   1. Session valide (`Authorization: Bearer <token>`, cf. `./session.ts`).
 *   2. Sinon, repli sur le Basic Auth global existant (`./auth.ts`) — SEULEMENT
 *      si `ALLOW_BASIC_AUTH_FALLBACK` n'est pas explicitement `"false"`. Le
 *      défaut est donc "replié activé" : merger ce fichier ne change PAS le
 *      comportement de périmètre actuel tant que personne n'a de compte —
 *      seul un flip explicite de l'App Setting coupe le filet.
 *
 * Le verrou de périmètre (bloquer tout accès sans identité) reste inchangé
 * dans les deux branches — ce fichier ne fait QUE changer la SOURCE de
 * l'identité, jamais le principe "pas d'identité valide = 401" tant que le
 * fallback est actif. Retirer ce verrou est le sujet de l'étape B (f3i.20),
 * pas de ce ticket.
 */

import type { HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { checkBasicAuth } from "./auth";
import { checkSession, type AuthContext } from "./session";
import type { AuthStoreEnv } from "../logic/auth-store";
import { resolveAuthorizedTenant } from "../../../src/logic/tenancy";
import { basicAuthUser, readHeader } from "../../../src/logic/costlog";

function fallbackEnabled(): boolean {
  return process.env.ALLOW_BASIC_AUTH_FALLBACK !== "false";
}

function storageEnv(context: InvocationContext): AuthStoreEnv | undefined {
  const account = process.env.AZURE_STORAGE_ACCOUNT;
  const key = process.env.AZURE_STORAGE_KEY;
  if (!account || !key) return undefined;
  return { account, key, passwordPepper: process.env.PASSWORD_PEPPER };
}

/**
 * Résout l'identité de la requête, ou renvoie directement une `HttpResponseInit`
 * 401 à retourner telle quelle. Les env vars manquantes pour la résolution de
 * session (Table Storage) ne bloquent PAS la requête si le fallback Basic Auth
 * est actif — elles font juste sauter la branche 1 silencieusement (loggé).
 */
export async function checkAuth(request: HttpRequest, context: InvocationContext): Promise<AuthContext | HttpResponseInit> {
  const storage = storageEnv(context);
  if (storage) {
    const sessionIdentity = await checkSession(request, storage);
    if (sessionIdentity) return sessionIdentity;
  } else {
    context.warn("[auth-transitional] AZURE_STORAGE_ACCOUNT/KEY absents : vérification de session sautée.");
  }

  if (!fallbackEnabled()) {
    return {
      status: 401,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: "Session invalide ou absente.",
    };
  }

  const basicAuthFailure = checkBasicAuth(request);
  if (basicAuthFailure) return basicAuthFailure;

  // checkBasicAuth n'a rien renvoyé : soit des identifiants valides, soit
  // aucun compte configuré (comportement historique "rien bloqué" en dev).
  const username = basicAuthUser(readHeader(request.headers, "authorization"));
  const tenant = resolveAuthorizedTenant(request.headers);
  return { userId: `basic:${username ?? "anonymous"}`, email: username ?? "anonymous", tenant };
}
