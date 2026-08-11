/**
 * Compteurs de rate limiting sur Azure Table Storage (epic z0v).
 *
 * Adaptateur mince : toute la logique de décision vit dans
 * `src/logic/ratelimit.ts` (zéro dépendance, testable sans émulateur). Ici, on
 * ne fait que traduire les opérations du store en appels Table + mapper les
 * codes REST de conflit sur le `false` attendu par l'incrément optimiste.
 *
 * Stockage : table `RateLimits` du compte déjà en App Settings
 * (`AZURE_STORAGE_ACCOUNT`/`AZURE_STORAGE_KEY`), même convention que
 * `auth-store.ts` / `conversations-store.ts` — PartitionKey = client,
 * RowKey = `{bucket}-{fenêtre}`. Deux lignes par client au total, réécrites à
 * chaque rotation de fenêtre : la table ne grossit pas avec le temps (Table
 * Storage n'a pas de TTL, une ligne par fenêtre écoulée demanderait une purge).
 */

import { TableClient, AzureNamedKeyCredential, RestError } from "@azure/data-tables";
import type { RateLimitCounter, RateLimitCounterStore } from "../../../src/logic/ratelimit";

const RATE_LIMITS_TABLE = "RateLimits";

export interface RateLimitStoreEnv {
  account: string;
  key: string;
}

interface CounterEntity {
  partitionKey: string;
  rowKey: string;
  count: number;
  windowStart: number;
}

// Cf. `auth-store.ts` : mêmes conventions d'émulateur local.
const AZURITE_ACCOUNT = "devstoreaccount1";
const AZURITE_TABLE_ENDPOINT = "http://127.0.0.1:10002/devstoreaccount1";

function makeTableClient(env: RateLimitStoreEnv): TableClient {
  const isAzurite = env.account === AZURITE_ACCOUNT;
  const url = isAzurite ? AZURITE_TABLE_ENDPOINT : `https://${env.account}.table.core.windows.net`;
  const credential = new AzureNamedKeyCredential(env.account, env.key);
  return new TableClient(url, RATE_LIMITS_TABLE, credential, isAzurite ? { allowInsecureConnection: true } : undefined);
}

// Table créée une fois par process (cold start), cf. `auth-store.ts`.
const ensuredAccounts = new Set<string>();

async function getTable(env: RateLimitStoreEnv): Promise<TableClient> {
  const client = makeTableClient(env);
  if (!ensuredAccounts.has(env.account)) {
    try {
      await client.createTable();
    } catch (err) {
      if (!(err instanceof RestError && err.statusCode === 409)) throw err;
    }
    ensuredAccounts.add(env.account);
  }
  return client;
}

function isStatus(err: unknown, ...codes: number[]): boolean {
  return err instanceof RestError && err.statusCode !== undefined && codes.includes(err.statusCode);
}

export function createTableCounterStore(env: RateLimitStoreEnv): RateLimitCounterStore {
  return {
    async read(subject, key): Promise<RateLimitCounter | undefined> {
      const table = await getTable(env);
      try {
        const entity = await table.getEntity<CounterEntity>(subject, key);
        return { count: entity.count, windowStart: entity.windowStart, etag: entity.etag };
      } catch (err) {
        if (isStatus(err, 404)) return undefined;
        throw err;
      }
    },

    async create(subject, key, windowStart, count): Promise<boolean> {
      const table = await getTable(env);
      try {
        await table.createEntity<CounterEntity>({ partitionKey: subject, rowKey: key, count, windowStart });
        return true;
      } catch (err) {
        // 409 : une requête concurrente du même client a créé la ligne d'abord.
        if (isStatus(err, 409)) return false;
        throw err;
      }
    },

    async update(subject, key, windowStart, count, etag): Promise<boolean> {
      const table = await getTable(env);
      try {
        await table.updateEntity<CounterEntity>(
          { partitionKey: subject, rowKey: key, count, windowStart },
          "Replace",
          { etag },
        );
        return true;
      } catch (err) {
        // 412 : etag périmé (incrément concurrent). 404 : ligne supprimée
        // entre-temps. Les deux se rejouent par une nouvelle lecture.
        if (isStatus(err, 412, 404)) return false;
        throw err;
      }
    },
  };
}
