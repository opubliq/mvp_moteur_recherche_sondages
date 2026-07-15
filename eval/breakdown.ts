// Additive companion to run.ts: per-query Precision/Recall breakdown + q01 bug dump.
// Non-destructive: does not modify run.ts. Emits JSON to stdout for report building.
import * as fs from 'fs';
import * as path from 'path';
import { scoreResult, type Pertinence } from './_baseline_scoring';
import { Concept } from '../src/types';

interface GoldenItem { survey_id: string; variable: string; grade: string; question_text: string; }
interface GoldenQuery { id: string; query: string; relevant: GoldenItem[]; }
interface Fixture { id: string; query: string; concepts: Concept[]; candidates: any[]; }

const g = (s: string) => s.toLowerCase();

function main() {
  const goldenPath = path.join(process.cwd(), 'eval/golden.jsonl');
  const fixturesDir = path.join(process.cwd(), 'eval/fixtures');
  const golden: Record<string, GoldenQuery> = {};
  for (const line of fs.readFileSync(goldenPath, 'utf-8').split('\n').filter(Boolean)) {
    const q = JSON.parse(line) as GoldenQuery;
    golden[q.id] = q;
  }
  const files = fs.readdirSync(fixturesDir).filter(f => f.endsWith('.json')).sort();

  const perQuery: any[] = [];
  const q01fp: any[] = [];

  for (const file of files) {
    const fx = JSON.parse(fs.readFileSync(path.join(fixturesDir, file), 'utf-8')) as Fixture;
    const gold = golden[fx.id];
    if (!gold) continue;
    const relKey = new Set(gold.relevant.map(r => `${r.survey_id}/${r.variable}`));
    const foundRel = new Set<string>();

    let exactPred = 0, exactCorrect = 0;
    for (const c of fx.candidates) {
      const { pertinence, score } = scoreResult(fx.concepts, c);
      const assigned = (pertinence as Pertinence).toLowerCase();
      const key = `${c.survey_id}/${c.variable}`;
      const gm = gold.relevant.find(r => r.survey_id === c.survey_id && r.variable === c.variable);
      const expected = gm ? g(gm.grade) : 'hors-sujet';
      if (relKey.has(key)) foundRel.add(key);
      if (assigned === 'exact') {
        exactPred++;
        if (expected === 'exact') exactCorrect++;
        else if (fx.id === 'q01') {
          q01fp.push({ key, expected, score: +score.toFixed(1), survey: c.survey_id, variable: c.variable, text: c.question_text, survey_name: c.survey_name });
        }
      }
    }
    // recall: relevant items assigned non-hors-sujet
    let relNonHS = 0;
    for (const r of gold.relevant) {
      const c = fx.candidates.find((x: any) => x.survey_id === r.survey_id && x.variable === r.variable);
      if (!c) continue; // not retrieved -> counts as HS
      const { pertinence } = scoreResult(fx.concepts, c);
      if ((pertinence as string).toLowerCase() !== 'hors-sujet') relNonHS++;
    }
    perQuery.push({
      id: fx.id,
      query: fx.query,
      nRelevant: gold.relevant.length,
      nCandidates: fx.candidates.length,
      exactPred,
      exactCorrect,
      precisionExact: exactPred ? +(exactCorrect / exactPred * 100).toFixed(1) : 0,
      recall: gold.relevant.length ? +(relNonHS / gold.relevant.length * 100).toFixed(1) : 0,
      relFound: relNonHS,
    });
  }

  q01fp.sort((a, b) => b.score - a.score);
  console.log(JSON.stringify({ perQuery, q01fp }, null, 2));
}
main();
