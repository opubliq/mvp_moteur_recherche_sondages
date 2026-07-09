import * as fs from 'fs';
import * as path from 'path';
import { retrieve, RetrieveEnv } from '../src/logic/retrieve';
import { Concept } from '../src/types';

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

const AOAI_CHAT_DEPLOYMENT = process.env.AOAI_CHAT_DEPLOYMENT || '';
const AOAI_API_VERSION = "2024-02-01";

const SYSTEM_PROMPT = `Tu élargis une requête de recherche dans des questions de sondages citoyens québécois. DÉCOMPOSE la requête en ses CONCEPTS distincts (typiquement une action + un objet, ou un objet + un public cible ; parfois un seul concept).

CORPUS BILINGUE : les questions sont en français ET en anglais, et un terme n'est trouvé que s'il apparaît LITTÉRALEMENT (sous-chaîne, sans lemmatisation) dans la question. Donc pour CHAQUE concept :
- Donne ses synonymes DANS LES DEUX LANGUES (français québécois ET anglais). Ex. concept 'changement climatique' -> syns incluant 'climat', 'climate', 'réchauffement', 'warming', 'changement climatique', 'climate change'.
- PRIVILÉGIE des ANCRES COURTES d'un seul mot (ex. 'climat', 'climate', 'environnement', 'environment') EN PLUS des expressions de 2-3 mots : une expression composée ('changement climatique') rate les variantes réelles ('changements climatiques' au pluriel, 'climate change'), alors qu'une ancre courte les attrape toutes.
- Inclus les variantes morphologiques (singulier/pluriel, formes verbales : poteau ET poteaux) et les termes que les citoyens emploient couramment, même techniquement distincts (ex. 'librairie' pour 'bibliothèque', 'gazon' pour 'pelouse').

Chaque synonyme est un terme COURT (1 à 3 mots) cherché comme sous-chaîne littérale dans un texte réel — jamais une paraphrase de plusieurs mots de la requête (mauvais : 'accessibilité des arrêts de bus' ; bon : 'arrêt de bus', 'bus stop', 'sans obstacle'). MAXIMUM 10 synonymes par concept (les deux langues comptent dans ce total).

RÈGLE CLÉ : un concept distinct doit ouvrir un AXE DE RECHERCHE VRAIMENT INDÉPENDANT — pas juste redire le concept principal autrement. Si un complément (lieu, contexte, ou proposition relative) ne fait que QUALIFIER/REDÉCRIRE l'objet principal sans ajouter d'information cherchable distincte, fusionne-le comme synonyme court du concept principal au lieu d'en faire un concept séparé. Ex. : 'amuseurs dans la rue' -> UN concept {orig:'amuseurs', syns:[...,'artistes de rue']}, PAS un concept 'rue' séparé.

STRUCTURE À 2 NIVEAUX : si un concept a un NOM DE BASE générique (ex. 'eau') qui peut être précisé par un ADJECTIF/QUALIFICATIF (ex. 'potable', 'à boire', 'buvable'), sépare les deux : 'syns' = variantes du nom de base SEUL (toujours valide tout seul) ; 'qualifiers' = les précisions/adjectifs (liste optionnelle, omets-la si non applicable). NE FUSIONNE PAS le nom de base et l'adjectif en un seul synonyme composé ('eau potable') — le nom de base doit rester cherchable seul, une question qui ne dit que 'eau' reste pertinente (juste moins précise).

Si un mot évaluatif concret (ex. 'qualité', 'état', 'niveau', 'satisfaction', 'accès') précède 'de'/'envers'/'à' + un objet, c'est en général un CONCEPT À PART ENTIÈRE (souvent littéralement présent dans la question) — PAS un qualificatif à fusionner avec l'objet qui suit. Ex. : 'qualité de l'eau qu'on peut boire' -> DEUX concepts : {orig:'qualité', syns:['qualité'], weight:0.3} ET {orig:'eau', syns:['eau'], qualifiers:['potable','à boire','buvable'], weight:0.7}. PAS un seul concept 'qualité de l'eau potable' répété pour chaque synonyme.

POIDS (weight) : assigne à chaque concept son importance relative (0.0-1.0, tous les poids somment à 1). Concept évaluatif générique (qualité, état, niveau, satisfaction, accès) -> poids faible ; concept-objet principal -> fort. Ex. : 'état des trottoirs' -> {orig:'état',...,weight:0.2} ET {orig:'trottoir',...,weight:0.8}. Requête à concept unique -> weight:1.

Réponds UNIQUEMENT en JSON : {"concepts":[{"orig":"...","syns":["...","..."],"qualifiers":["...","..."],"weight":0.5}, ...]}. "qualifiers" est optionnel (liste vide si non applicable). "weight" est obligatoire (somme = 1).`;

function normalizeConcepts(concepts: Concept[]): Concept[] {
  if (!concepts || concepts.length === 0) return [];
  const cleaned = concepts.map((c) => {
    const orig = c.orig.trim();
    const syns = Array.from(new Set((c.syns || []).map((s) => s.trim()).filter((s) => s.toLowerCase() !== orig.toLowerCase())));
    const qualifiers = Array.from(new Set((c.qualifiers || []).map((q) => q.trim()).filter((q) => q.toLowerCase() !== orig.toLowerCase())));
    return {
      orig,
      syns,
      qualifiers: qualifiers.length > 0 ? qualifiers : undefined,
      weight: Math.max(0, c.weight || 0),
    };
  });
  const totalWeight = cleaned.reduce((acc, c) => acc + c.weight, 0);
  if (totalWeight === 0) {
    const equalWeight = 1 / cleaned.length;
    cleaned.forEach((c) => (c.weight = equalWeight));
  } else if (Math.abs(totalWeight - 1.0) > 0.001) {
    cleaned.forEach((c) => (c.weight = c.weight / totalWeight));
  }
  return cleaned;
}

async function decompose(query: string): Promise<Concept[]> {
  const endpoint = (process.env.AOAI_ENDPOINT ?? "").replace(/\/$/, "");
  const deployment = AOAI_CHAT_DEPLOYMENT;
  const key = process.env.AOAI_KEY ?? "";
  const url = `${endpoint}/openai/deployments/${deployment}/chat/completions?api-version=${AOAI_API_VERSION}`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "api-key": key,
    },
    body: JSON.stringify({
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: query.trim() },
      ],
      response_format: { type: "json_object" },
    }),
  });

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`AOAI chat error ${res.status}: ${errBody}`);
  }

  const json = (await res.json()) as any;
  const content = json.choices[0]?.message?.content;
  if (!content) throw new Error("Empty response from AOAI");

  const parsed = JSON.parse(content);
  return normalizeConcepts(parsed.concepts);
}

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
      const concepts = await decompose(item.query);
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
