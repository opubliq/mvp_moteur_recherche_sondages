/**
 * Comptes utilisateurs, sessions et hash de mot de passe (f3i.19.1).
 *
 * Stockage : Azure Table Storage, même compte que les Parquet micro-données
 * (`AZURE_STORAGE_ACCOUNT`/`AZURE_STORAGE_KEY`, déjà en App Settings) — pas de
 * nouvelle ressource, juste deux tables (`Users`, `Sessions`) dans le service
 * Table du compte existant (distinct du service Blob).
 *
 * Session = token opaque (32 octets aléatoires, jamais un JWT — pas de clé de
 * signature à gérer) envoyé en `Authorization: Bearer <token>`. Seul son hash
 * SHA-256 est stocké (`Sessions.rowKey`) : une fuite de la table ne donne pas
 * de session utilisable.
 *
 * Ce fichier est scopé à `azure-functions/` (dépend de `@azure/data-tables` et
 * `bcryptjs`) — la validation pure (email, politique de mot de passe) vit dans
 * `src/logic/auth.ts`, zéro dépendance, réutilisable/testable sans Azurite.
 */

import { randomBytes, randomUUID, createHash } from "node:crypto";
import { TableClient, AzureNamedKeyCredential, RestError } from "@azure/data-tables";
import bcrypt from "bcryptjs";
import { isValidEmail, normalizeEmail, validatePassword } from "../../../src/logic/auth";

const USERS_TABLE = "Users";
const SESSIONS_TABLE = "Sessions";
const USERS_PARTITION = "user";
const SESSIONS_PARTITION = "session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30 jours
const BCRYPT_ROUNDS = 10;

export interface AuthStoreEnv {
  account: string;
  key: string;
  /** Défense en profondeur optionnelle sur le hash bcrypt — cf. §3 du plan f3i.19. */
  passwordPepper?: string;
}

export interface AuthSession {
  userId: string;
  email: string;
  tenant?: string;
  /** Epoch ms : au-delà, le compte (essai P2, cf. f3i.7) cesse de fonctionner. */
  trialExpiresAt?: number;
  token: string;
}

export interface SessionIdentity {
  userId: string;
  email: string;
  tenant?: string;
  trialExpiresAt?: number;
}

export type AuthFailure = { error: string };

interface UserEntity {
  userId: string;
  passwordHash: string;
  tenant?: string;
  trialExpiresAt?: number;
  createdAt: number;
  lastLoginAt: number;
}

interface SessionEntity {
  userId: string;
  email: string;
  tenant?: string;
  trialExpiresAt?: number;
  createdAt: number;
  expiresAt: number;
}

// Nom de compte conventionnel d'Azurite (émulateur local) — permet de tester
// signup/login en dev sans jamais toucher au compte Storage de prod, en
// pointant simplement AZURE_STORAGE_ACCOUNT dessus dans local.settings.json.
const AZURITE_ACCOUNT = "devstoreaccount1";
const AZURITE_TABLE_ENDPOINT = "http://127.0.0.1:10002/devstoreaccount1";

function makeTableClient(env: AuthStoreEnv, table: string): TableClient {
  const isAzurite = env.account === AZURITE_ACCOUNT;
  const url = isAzurite ? AZURITE_TABLE_ENDPOINT : `https://${env.account}.table.core.windows.net`;
  const credential = new AzureNamedKeyCredential(env.account, env.key);
  return new TableClient(url, table, credential, isAzurite ? { allowInsecureConnection: true } : undefined);
}

// Une table créée une fois par process (cold start) n'a pas besoin d'être
// re-vérifiée à chaque requête — le 409 "already exists" est le cas normal
// après le premier appel, pas la peine de le refaire à chaque invocation.
const ensuredTables = new Set<string>();

async function ensureTable(client: TableClient, table: string): Promise<void> {
  if (ensuredTables.has(table)) return;
  try {
    await client.createTable();
  } catch (err) {
    if (!(err instanceof RestError && err.statusCode === 409)) throw err;
  }
  ensuredTables.add(table);
}

async function getUsersTable(env: AuthStoreEnv): Promise<TableClient> {
  const client = makeTableClient(env, USERS_TABLE);
  await ensureTable(client, USERS_TABLE);
  return client;
}

async function getSessionsTable(env: AuthStoreEnv): Promise<TableClient> {
  const client = makeTableClient(env, SESSIONS_TABLE);
  await ensureTable(client, SESSIONS_TABLE);
  return client;
}

function generateToken(): string {
  return randomBytes(32).toString("hex");
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function hashPassword(password: string, pepper?: string): Promise<string> {
  return bcrypt.hash(password + (pepper ?? ""), BCRYPT_ROUNDS);
}

function verifyPassword(password: string, hash: string, pepper?: string): Promise<boolean> {
  return bcrypt.compare(password + (pepper ?? ""), hash);
}

async function createSession(
  userId: string,
  email: string,
  tenant: string | undefined,
  trialExpiresAt: number | undefined,
  env: AuthStoreEnv,
): Promise<string> {
  const token = generateToken();
  const sessions = await getSessionsTable(env);
  const now = Date.now();
  const entity: SessionEntity & { partitionKey: string; rowKey: string } = {
    partitionKey: SESSIONS_PARTITION,
    rowKey: hashToken(token),
    userId,
    email,
    createdAt: now,
    expiresAt: now + SESSION_TTL_MS,
    ...(tenant ? { tenant } : {}),
    ...(trialExpiresAt ? { trialExpiresAt } : {}),
  };
  await sessions.createEntity(entity);
  return token;
}

/**
 * Crée un compte auto-service (P1, `tenant` et `trialExpiresAt` toujours
 * absents). Les comptes P2 permanents et les essais P2 temporaires (f3i.7)
 * sont créés hors flow HTTP par un script d'admin ponctuel
 * (`scripts/create-trial-account.ts`, f3i.19.4+/f3i.7) — jamais via cet
 * endpoint.
 */
export async function signup(email: string, password: string, env: AuthStoreEnv): Promise<AuthSession | AuthFailure> {
  const normalized = normalizeEmail(email);
  if (!isValidEmail(normalized)) return { error: "invalid_email" };
  const passwordError = validatePassword(password);
  if (passwordError) return { error: passwordError };

  const users = await getUsersTable(env);

  try {
    await users.getEntity(USERS_PARTITION, normalized);
    return { error: "email_taken" };
  } catch (err) {
    if (!(err instanceof RestError && err.statusCode === 404)) throw err;
  }

  const userId = randomUUID();
  const passwordHash = await hashPassword(password, env.passwordPepper);
  const now = Date.now();
  const entity: UserEntity & { partitionKey: string; rowKey: string } = {
    partitionKey: USERS_PARTITION,
    rowKey: normalized,
    userId,
    passwordHash,
    createdAt: now,
    lastLoginAt: now,
  };
  await users.createEntity(entity);

  const token = await createSession(userId, normalized, undefined, undefined, env);
  return { userId, email: normalized, token };
}

/**
 * Crée un compte admin (script uniquement, jamais exposé en HTTP) : essai P2
 * temporaire (`trialExpiresAt` fixé, `tenant` absent → corpus public
 * seulement, cf. `src/logic/tenancy.ts`) ou compte client P2 permanent
 * (`tenant` fixé, `trialExpiresAt` absent). Erreur si l'email existe déjà —
 * pas d'écrasement silencieux d'un compte existant par ce script.
 */
export async function createAccount(
  email: string,
  password: string,
  opts: { tenant?: string; trialExpiresAt?: number },
  env: AuthStoreEnv,
): Promise<AuthSession | AuthFailure> {
  const normalized = normalizeEmail(email);
  if (!isValidEmail(normalized)) return { error: "invalid_email" };
  const passwordError = validatePassword(password);
  if (passwordError) return { error: passwordError };

  const users = await getUsersTable(env);

  try {
    await users.getEntity(USERS_PARTITION, normalized);
    return { error: "email_taken" };
  } catch (err) {
    if (!(err instanceof RestError && err.statusCode === 404)) throw err;
  }

  const userId = randomUUID();
  const passwordHash = await hashPassword(password, env.passwordPepper);
  const now = Date.now();
  const entity: UserEntity & { partitionKey: string; rowKey: string } = {
    partitionKey: USERS_PARTITION,
    rowKey: normalized,
    userId,
    passwordHash,
    createdAt: now,
    lastLoginAt: now,
    ...(opts.tenant ? { tenant: opts.tenant } : {}),
    ...(opts.trialExpiresAt ? { trialExpiresAt: opts.trialExpiresAt } : {}),
  };
  await users.createEntity(entity);

  const token = await createSession(userId, normalized, opts.tenant, opts.trialExpiresAt, env);
  return { userId, email: normalized, tenant: opts.tenant, trialExpiresAt: opts.trialExpiresAt, token };
}

export async function login(email: string, password: string, env: AuthStoreEnv): Promise<AuthSession | AuthFailure> {
  const normalized = normalizeEmail(email);
  const users = await getUsersTable(env);

  let entity: (UserEntity & { partitionKey: string; rowKey: string }) | undefined;
  try {
    entity = (await users.getEntity<UserEntity>(USERS_PARTITION, normalized)) as UserEntity & {
      partitionKey: string;
      rowKey: string;
    };
  } catch (err) {
    if (err instanceof RestError && err.statusCode === 404) return { error: "invalid_credentials" };
    throw err;
  }

  if (entity.trialExpiresAt && entity.trialExpiresAt < Date.now()) return { error: "trial_expired" };

  const ok = await verifyPassword(password, entity.passwordHash, env.passwordPepper);
  if (!ok) return { error: "invalid_credentials" };

  const token = await createSession(entity.userId, normalized, entity.tenant, entity.trialExpiresAt, env);

  // Best-effort : un échec de mise à jour de lastLoginAt ne doit jamais faire
  // échouer une connexion par ailleurs valide.
  try {
    await users.updateEntity(
      { partitionKey: USERS_PARTITION, rowKey: normalized, lastLoginAt: Date.now() },
      "Merge",
    );
  } catch {
    /* absorbé */
  }

  return { userId: entity.userId, email: normalized, tenant: entity.tenant, trialExpiresAt: entity.trialExpiresAt, token };
}

export async function logout(token: string, env: AuthStoreEnv): Promise<void> {
  const sessions = await getSessionsTable(env);
  try {
    await sessions.deleteEntity(SESSIONS_PARTITION, hashToken(token));
  } catch (err) {
    if (!(err instanceof RestError && err.statusCode === 404)) throw err;
  }
}

/**
 * `undefined` si le token est absent/inconnu, si la session a expiré (TTL
 * fixe 30 jours), OU si le compte est un essai P2 (f3i.7) dont
 * `trialExpiresAt` est dépassé — un essai expiré ne doit plus jamais pouvoir
 * interroger l'API, peu importe combien il reste de TTL de session. Le
 * traiter comme "aucune session valide" réutilise le 401 déjà en place dans
 * `checkAuth` sans logique de plan/feature-gating séparée.
 */
export async function verifySession(token: string, env: AuthStoreEnv): Promise<SessionIdentity | undefined> {
  const sessions = await getSessionsTable(env);
  try {
    const entity = (await sessions.getEntity<SessionEntity>(SESSIONS_PARTITION, hashToken(token))) as SessionEntity;
    if (entity.expiresAt < Date.now()) return undefined;
    if (entity.trialExpiresAt && entity.trialExpiresAt < Date.now()) return undefined;
    return { userId: entity.userId, email: entity.email, tenant: entity.tenant, trialExpiresAt: entity.trialExpiresAt };
  } catch (err) {
    if (err instanceof RestError && err.statusCode === 404) return undefined;
    throw err;
  }
}
