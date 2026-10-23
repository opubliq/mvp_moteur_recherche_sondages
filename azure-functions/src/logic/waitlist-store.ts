/**
 * Liste d'attente de la page « en pause » (VITE_MAINTENANCE), table `Waitlist`.
 *
 * PartitionKey fixe, RowKey = courriel normalisé : une réinscription écrase
 * l'entrée au lieu de la dupliquer.
 */

import { TableClient, AzureNamedKeyCredential, RestError } from "@azure/data-tables";

const TABLE = "Waitlist";
const PARTITION = "waitlist";
const AZURITE_ACCOUNT = "devstoreaccount1";
const AZURITE_TABLE_ENDPOINT = "http://127.0.0.1:10002/devstoreaccount1";

export const EMAIL_RE = /^[^\s@/\\#?]+@[^\s@/\\#?]+\.[^\s@/\\#?]+$/;
export const EMAIL_MAX = 254;

export interface WaitlistStoreEnv {
  account: string;
  key: string;
}

function makeTableClient(env: WaitlistStoreEnv): TableClient {
  const isAzurite = env.account === AZURITE_ACCOUNT;
  const url = isAzurite ? AZURITE_TABLE_ENDPOINT : `https://${env.account}.table.core.windows.net`;
  return new TableClient(url, TABLE, new AzureNamedKeyCredential(env.account, env.key), isAzurite ? { allowInsecureConnection: true } : undefined);
}

const ensuredAccounts = new Set<string>();

async function getTable(env: WaitlistStoreEnv): Promise<TableClient> {
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

export function normalizeEmail(raw: string): string | null {
  const email = raw.trim().toLowerCase();
  if (email.length === 0 || email.length > EMAIL_MAX || !EMAIL_RE.test(email)) return null;
  return email;
}

export async function addToWaitlist(env: WaitlistStoreEnv, email: string): Promise<void> {
  const table = await getTable(env);
  await table.upsertEntity({ partitionKey: PARTITION, rowKey: email, signedUpAt: new Date().toISOString() }, "Replace");
}
