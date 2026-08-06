/**
 * Validation pure pour les comptes utilisateurs (f3i.19).
 *
 * Zéro dépendance externe, comme `costlog.ts`/`tenancy.ts` — ce fichier est
 * type-checké à la fois côté frontend (`tsconfig.app.json` inclut tout `src/`)
 * et côté backend (Azure Functions), donc aucune lib ne doit y transiter. Le
 * hash de mot de passe et le stockage de session (dépendants de `bcryptjs` et
 * `@azure/data-tables`) vivent dans `azure-functions/src/logic/auth-store.ts`,
 * scope propre à ce runtime.
 */

export const MIN_PASSWORD_LENGTH = 8;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Normalise un email pour en faire une clé stable (RowKey Table Storage). */
export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

export function isValidEmail(email: string): boolean {
  return email.length > 0 && email.length <= 254 && EMAIL_RE.test(email);
}

/** Message d'erreur si le mot de passe est invalide, sinon `undefined`. */
export function validatePassword(password: string): string | undefined {
  if (typeof password !== "string" || password.length < MIN_PASSWORD_LENGTH) {
    return `Le mot de passe doit contenir au moins ${MIN_PASSWORD_LENGTH} caractères.`;
  }
  return undefined;
}
