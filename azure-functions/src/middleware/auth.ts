/**
 * Point d'entrée d'autorisation unique des Azure Functions (f3i.19.2/.3,
 * fallback Basic Auth retiré en f3i.20). Toute requête doit porter une session
 * valide (`Authorization: Bearer <token>`, cf. `./session.ts`) — il n'existe
 * plus de repli sur un Basic Auth global.
 *
 * Le tenant (le cas échéant) est déjà porté par la session elle-même
 * (`AuthContext.tenant`, résolu à la création du compte — cf.
 * `../logic/auth-store.ts`) : ce fichier n'a plus besoin de résoudre de tenant
 * lui-même, contrairement à l'ancienne branche Basic Auth qui appelait
 * `resolveAuthorizedTenant` (`src/logic/tenancy.ts`).
 */

import type { HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { checkSession, type AuthContext } from "./session";
import type { AuthStoreEnv } from "../logic/auth-store";

function storageEnv(context: InvocationContext): AuthStoreEnv | undefined {
  const account = process.env.AZURE_STORAGE_ACCOUNT;
  const key = process.env.AZURE_STORAGE_KEY;
  if (!account || !key) return undefined;
  return { account, key, passwordPepper: process.env.PASSWORD_PEPPER };
}

/**
 * Résout l'identité de la requête, ou renvoie directement une `HttpResponseInit`
 * 401 à retourner telle quelle. Les env vars manquantes pour la résolution de
 * session (Table Storage) font échouer la requête (401) — il n'y a plus de
 * repli qui pourrait absorber cette absence.
 */
export async function checkAuth(request: HttpRequest, context: InvocationContext): Promise<AuthContext | HttpResponseInit> {
  const storage = storageEnv(context);
  if (storage) {
    const sessionIdentity = await checkSession(request, storage);
    if (sessionIdentity) return sessionIdentity;
  } else {
    context.warn("[auth] AZURE_STORAGE_ACCOUNT/KEY absents : vérification de session sautée.");
  }

  return {
    status: 401,
    headers: { "Access-Control-Allow-Origin": "*" },
    body: "Session invalide ou absente.",
  };
}
