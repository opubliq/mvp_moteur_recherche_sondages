/**
 * Demandes d'arrêt d'un tour agent (bouton Arrêter), table `AgentCancels`.
 *
 * L'hôte Azure Functions ne propage pas la déconnexion du navigateur au flux
 * SSE (vérifié en prod 2026-10-22) : le client écrit donc explicitement une
 * demande d'arrêt, que le handler /agent relit périodiquement.
 * PartitionKey = utilisateur (on ne peut arrêter que ses propres tours),
 * RowKey = run_id généré par le client.
 */

import { TableClient, AzureNamedKeyCredential, RestError } from "@azure/data-tables";

const TABLE = "AgentCancels";
const AZURITE_ACCOUNT = "devstoreaccount1";
const AZURITE_TABLE_ENDPOINT = "http://127.0.0.1:10002/devstoreaccount1";

export const RUN_ID_RE = /^[A-Za-z0-9_-]{8,64}$/;

export interface CancelStoreEnv {
  account: string;
  key: string;
}

function makeTableClient(env: CancelStoreEnv): TableClient {
  const isAzurite = env.account === AZURITE_ACCOUNT;
  const url = isAzurite ? AZURITE_TABLE_ENDPOINT : `https://${env.account}.table.core.windows.net`;
  return new TableClient(url, TABLE, new AzureNamedKeyCredential(env.account, env.key), isAzurite ? { allowInsecureConnection: true } : undefined);
}

const ensuredAccounts = new Set<string>();

async function getTable(env: CancelStoreEnv): Promise<TableClient> {
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

// Caractères interdits dans les clés Table Storage : / \ # ? et caractères de contrôle.
function partitionKey(userId: string): string {
  return userId.replace(/[/\\#?\u0000-\u001f\u007f-\u009f]/g, "_");
}

export async function requestCancel(env: CancelStoreEnv, userId: string, runId: string): Promise<void> {
  const table = await getTable(env);
  await table.upsertEntity({ partitionKey: partitionKey(userId), rowKey: runId, requestedAt: Date.now() }, "Replace");
}

export async function isCancelRequested(env: CancelStoreEnv, userId: string, runId: string): Promise<boolean> {
  const table = await getTable(env);
  try {
    await table.getEntity(partitionKey(userId), runId);
    return true;
  } catch (err) {
    if (err instanceof RestError && err.statusCode === 404) return false;
    throw err;
  }
}

export async function clearCancel(env: CancelStoreEnv, userId: string, runId: string): Promise<void> {
  const table = await getTable(env);
  try {
    await table.deleteEntity(partitionKey(userId), runId);
  } catch (err) {
    if (!(err instanceof RestError && err.statusCode === 404)) throw err;
  }
}
