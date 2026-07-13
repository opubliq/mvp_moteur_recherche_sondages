import * as fs from 'fs';
import * as path from 'path';
import { retrieve, RetrieveEnv } from '../src/logic/retrieve';
import { decomposeQuery, DecomposeEnv } from '../src/logic/decompose';

/**
 * Charge les variables d'environnement depuis .env si présent.
 */
function loadEnv() {
  if (fs.existsSync('.env')) {
    const content = fs.readFileSync('.env', 'utf-8');
    content.split('\n').forEach(line => {
      const trimmedLine = line.trim();
      if (!trimmedLine || trimmedLine.startsWith('#')) return;
      const [key, ...valueParts] = trimmedLine.split('=');
      const value = valueParts.join('=').trim().replace(/^"(.*)"$/, '$1');
      process.env[key.trim()] = value;
    });
  }
}

loadEnv();

const env: RetrieveEnv = {
  SEARCH_ENDPOINT: process.env.SEARCH_ENDPOINT || '',
  SEARCH_QUERY_KEY: process.env.SEARCH_QUERY_KEY || '',
  AOAI_ENDPOINT: process.env.AOAI_ENDPOINT || '',
  AOAI_KEY: process.env.AOAI_KEY || '',
  AOAI_EMBED_DEPLOYMENT: process.env.AOAI_EMBED_DEPLOYMENT || '',
};

// La décomposition passe par le module partagé src/logic/decompose.ts (le MÊME
// que la prod /decompose), pour capturer une expansion prod-fidèle — prompt +
// reasoning_effort "minimal" + response_format json_object inclus.
const decomposeEnv: DecomposeEnv = {
  AOAI_ENDPOINT: process.env.AOAI_ENDPOINT || '',
  AOAI_KEY: process.env.AOAI_KEY || '',
  AOAI_CHAT_DEPLOYMENT: process.env.AOAI_CHAT_DEPLOYMENT || '',
};

async function main() {
  const goldenPath = path.join(process.cwd(), 'eval/golden.jsonl');
  const fixturesDir = path.join(process.cwd(), 'eval/fixtures');

  if (!fs.existsSync(fixturesDir)) {
    fs.mkdirSync(fixturesDir, { recursive: true });
  }

  const lines = fs.readFileSync(goldenPath, 'utf-8').split('\n').filter(Boolean);

  for (const line of lines) {
    const item = JSON.parse(line);
    console.log(`Processing ${item.id}: "${item.query}"`);

    try {
      const concepts = await decomposeQuery(item.query, decomposeEnv);
      console.log(`  Concepts: ${concepts.map(c => c.orig).join(', ')}`);

      const { candidates } = await retrieve(item.query, concepts, env);
      console.log(`  Candidates: ${candidates.length}`);

      const fixture = {
        id: item.id,
        query: item.query,
        concepts,
        candidates
      };

      fs.writeFileSync(
        path.join(fixturesDir, `${item.id}.json`),
        JSON.stringify(fixture, null, 2)
      );
    } catch (err) {
      console.error(`  Failed to process ${item.id}:`, err);
    }
  }
}

main().catch(console.error);
