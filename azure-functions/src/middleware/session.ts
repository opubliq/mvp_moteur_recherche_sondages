/**
 * Vérification de session (f3i.19.2) — lit `Authorization: Bearer <token>` et
 * résout l'identité via `../logic/auth-store`. Point d'entrée unique appelant
 * `checkSession` : `./auth.ts` (`checkAuth`), qui renvoie 401 si aucune
 * session valide n'est trouvée — plus de repli sur un Basic Auth global
 * depuis f3i.20.
 */

import type { HttpRequest } from "@azure/functions";
import { verifySession, type AuthStoreEnv } from "../logic/auth-store";

export interface AuthContext {
  userId: string;
  email: string;
  tenant?: string;
}

export function bearerToken(request: HttpRequest): string | undefined {
  const header = request.headers.get("authorization") || "";
  const [scheme, token] = header.split(" ");
  return scheme === "Bearer" && token ? token : undefined;
}

/** `undefined` si aucun Bearer token valide (pas une erreur : `checkAuth` renvoie alors 401). */
export async function checkSession(request: HttpRequest, env: AuthStoreEnv): Promise<AuthContext | undefined> {
  const token = bearerToken(request);
  if (!token) return undefined;
  return verifySession(token, env);
}
