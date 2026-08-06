/**
 * Vérification de session (f3i.19.2) — lit `Authorization: Bearer <token>` et
 * résout l'identité via `../logic/auth-store`. Ne gère PAS le repli sur Basic
 * Auth (cf. `auth-transitional.ts`, qui compose les deux pendant la fenêtre de
 * coexistence).
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

/** `undefined` si aucun Bearer token valide (pas une erreur : peut retomber sur Basic Auth). */
export async function checkSession(request: HttpRequest, env: AuthStoreEnv): Promise<AuthContext | undefined> {
  const token = bearerToken(request);
  if (!token) return undefined;
  return verifySession(token, env);
}
