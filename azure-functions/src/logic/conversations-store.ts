/**
 * Historique de chat persistant côté serveur (f3i.19.5).
 *
 * Métadonnées (id, title, createdAt, updatedAt, turns) dans une table
 * `Conversations` (`PartitionKey=userId`, `RowKey=conversationId`) — lister N
 * conversations ne doit pas désérialiser N fils entiers, même schéma
 * index/corps que l'ancienne version localStorage (`src/logic/conversations.ts`).
 * Corps complet (fil + traces d'outils, potentiellement volumineux) dans un
 * blob JSON du container `chat-bodies`, chemin `{userId}/{conversationId}.json`.
 *
 * Toujours scopé à `auth.userId` — appelant responsable de ne jamais résoudre
 * ce store pour une identité non authentifiée (`checkAuth` ne renvoie jamais
 * de mode anonyme silencieux ici, contrairement au repli Basic Auth legacy).
 */

import { TableClient, AzureNamedKeyCredential, RestError } from "@azure/data-tables";
import { BlobServiceClient, StorageSharedKeyCredential } from "@azure/storage-blob";

const CONVERSATIONS_TABLE = "Conversations";
const CHAT_BODIES_CONTAINER = "chat-bodies";

export interface ConversationStoreEnv {
  account: string;
  key: string;
}

export interface ConversationMeta {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  turns: number;
}

export interface ConversationBody {
  messages: unknown[];
  traceByIndex: Record<number, unknown[]>;
}

export type Conversation = ConversationMeta & ConversationBody;

interface ConversationEntity {
  partitionKey: string;
  rowKey: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  turns: number;
}

// Cf. `auth-store.ts` : même émulateur, mêmes conventions d'endpoint local.
const AZURITE_ACCOUNT = "devstoreaccount1";
const AZURITE_TABLE_ENDPOINT = "http://127.0.0.1:10002/devstoreaccount1";
const AZURITE_BLOB_ENDPOINT = "http://127.0.0.1:10000/devstoreaccount1";

function isAzurite(env: ConversationStoreEnv): boolean {
  return env.account === AZURITE_ACCOUNT;
}

function makeTableClient(env: ConversationStoreEnv): TableClient {
  const url = isAzurite(env) ? AZURITE_TABLE_ENDPOINT : `https://${env.account}.table.core.windows.net`;
  const credential = new AzureNamedKeyCredential(env.account, env.key);
  return new TableClient(url, CONVERSATIONS_TABLE, credential, isAzurite(env) ? { allowInsecureConnection: true } : undefined);
}

function makeBlobServiceClient(env: ConversationStoreEnv): BlobServiceClient {
  const url = isAzurite(env) ? AZURITE_BLOB_ENDPOINT : `https://${env.account}.blob.core.windows.net`;
  const credential = new StorageSharedKeyCredential(env.account, env.key);
  return new BlobServiceClient(url, credential);
}

// Une table/un container créés une fois par process (cold start) n'ont pas
// besoin d'être re-vérifiés à chaque requête — cf. `ensuredTables` dans
// `auth-store.ts` pour le même raisonnement sur le 409 "already exists".
const ensuredTables = new Set<string>();
const ensuredContainers = new Set<string>();

async function getConversationsTable(env: ConversationStoreEnv): Promise<TableClient> {
  const client = makeTableClient(env);
  if (!ensuredTables.has(env.account)) {
    try {
      await client.createTable();
    } catch (err) {
      if (!(err instanceof RestError && err.statusCode === 409)) throw err;
    }
    ensuredTables.add(env.account);
  }
  return client;
}

async function getChatBodiesContainer(env: ConversationStoreEnv) {
  const container = makeBlobServiceClient(env).getContainerClient(CHAT_BODIES_CONTAINER);
  const key = `${env.account}/${CHAT_BODIES_CONTAINER}`;
  if (!ensuredContainers.has(key)) {
    await container.createIfNotExists();
    ensuredContainers.add(key);
  }
  return container;
}

function blobName(userId: string, conversationId: string): string {
  return `${userId}/${conversationId}.json`;
}

function toMeta(entity: ConversationEntity): ConversationMeta {
  return { id: entity.rowKey, title: entity.title, createdAt: entity.createdAt, updatedAt: entity.updatedAt, turns: entity.turns };
}

async function streamToString(readable: NodeJS.ReadableStream): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of readable) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks).toString("utf-8");
}

export async function listConversations(userId: string, env: ConversationStoreEnv): Promise<ConversationMeta[]> {
  const table = await getConversationsTable(env);
  const metas: ConversationMeta[] = [];
  for await (const entity of table.listEntities<ConversationEntity>({ queryOptions: { filter: `PartitionKey eq '${userId}'` } })) {
    metas.push(toMeta(entity as ConversationEntity));
  }
  return metas.sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function loadConversation(userId: string, id: string, env: ConversationStoreEnv): Promise<Conversation | null> {
  const table = await getConversationsTable(env);
  let entity: ConversationEntity;
  try {
    entity = (await table.getEntity<ConversationEntity>(userId, id)) as ConversationEntity;
  } catch (err) {
    if (err instanceof RestError && err.statusCode === 404) return null;
    throw err;
  }

  const container = await getChatBodiesContainer(env);
  const blob = container.getBlockBlobClient(blobName(userId, id));
  try {
    const download = await blob.download();
    if (!download.readableStreamBody) return null;
    const raw = await streamToString(download.readableStreamBody);
    const body = JSON.parse(raw) as ConversationBody;
    return { ...toMeta(entity), messages: body.messages ?? [], traceByIndex: body.traceByIndex ?? {} };
  } catch (err) {
    if (err instanceof Error && "statusCode" in err && (err as { statusCode?: number }).statusCode === 404) return null;
    throw err;
  }
}

/**
 * Écrit (ou met à jour) une conversation. Le titre n'est dérivé du fil que si
 * `opts.title` est absent ET qu'aucune entrée n'existe déjà — un renommage
 * manuel tient donc face à des sauvegardes automatiques ultérieures, même
 * logique que la version localStorage.
 */
export async function saveConversation(
  userId: string,
  id: string,
  body: ConversationBody,
  opts: { title?: string; deriveTitle: (body: ConversationBody) => string },
  env: ConversationStoreEnv,
): Promise<ConversationMeta> {
  const table = await getConversationsTable(env);

  let existing: ConversationEntity | undefined;
  try {
    existing = (await table.getEntity<ConversationEntity>(userId, id)) as ConversationEntity;
  } catch (err) {
    if (!(err instanceof RestError && err.statusCode === 404)) throw err;
  }

  const now = Date.now();
  const turns = (body.messages as Array<{ role?: string; content?: unknown }>).filter(
    (m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string" && m.content.length > 0,
  ).length;
  const entity: ConversationEntity = {
    partitionKey: userId,
    rowKey: id,
    title: opts.title ?? existing?.title ?? opts.deriveTitle(body),
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    turns,
  };

  const container = await getChatBodiesContainer(env);
  const blob = container.getBlockBlobClient(blobName(userId, id));
  const payload = JSON.stringify({ messages: body.messages, traceByIndex: body.traceByIndex });
  await blob.upload(payload, Buffer.byteLength(payload), { blobHTTPHeaders: { blobContentType: "application/json" } });

  await table.upsertEntity(entity, "Replace");
  return toMeta(entity);
}

export async function renameConversation(userId: string, id: string, title: string, env: ConversationStoreEnv): Promise<boolean> {
  const table = await getConversationsTable(env);
  try {
    await table.updateEntity({ partitionKey: userId, rowKey: id, title }, "Merge");
    return true;
  } catch (err) {
    if (err instanceof RestError && err.statusCode === 404) return false;
    throw err;
  }
}

export async function deleteConversation(userId: string, id: string, env: ConversationStoreEnv): Promise<void> {
  const table = await getConversationsTable(env);
  try {
    await table.deleteEntity(userId, id);
  } catch (err) {
    if (!(err instanceof RestError && err.statusCode === 404)) throw err;
  }

  const container = await getChatBodiesContainer(env);
  const blob = container.getBlockBlobClient(blobName(userId, id));
  await blob.deleteIfExists();
}
