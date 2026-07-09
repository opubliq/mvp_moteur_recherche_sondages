import * as fs from 'fs';
import * as path from 'path';
import { scoreResult } from '../src/logic/scoring';
import { Concept, Pertinence } from '../src/types';

interface GoldenItem {
  survey_id: string;
  variable: string;
  grade: string;
  question_text: string;
}

interface GoldenQuery {
  id: string;
  query: string;
  relevant: GoldenItem[];
}

interface Fixture {
  id: string;
  query: string;
  concepts: Concept[];
  candidates: any[];
}

function normalizeGrade(grade: string): string {
  return grade.toLowerCase();
}

function normalizePertinence(pertinence: Pertinence): string {
  return pertinence.toLowerCase();
}

async function main() {
  const goldenPath = path.join(process.cwd(), 'eval/golden.jsonl');
  const fixturesDir = path.join(process.cwd(), 'eval/fixtures');

  if (!fs.existsSync(goldenPath)) {
    console.error("Golden file not found");
    return;
  }

  const goldenLines = fs.readFileSync(goldenPath, 'utf-8').split('\n').filter(Boolean);
  const goldenQueries: Record<string, GoldenQuery> = {};
  for (const line of goldenLines) {
    const q = JSON.parse(line) as GoldenQuery;
    goldenQueries[q.id] = q;
  }

  const fixtureFiles = fs.readdirSync(fixturesDir).filter(f => f.endsWith('.json'));

  const confusionMatrix: Record<string, Record<string, number>> = {
    'exact': { 'exact': 0, 'partiel': 0, 'faible': 0, 'hors-sujet': 0 },
    'partiel': { 'exact': 0, 'partiel': 0, 'faible': 0, 'hors-sujet': 0 },
    'faible': { 'exact': 0, 'partiel': 0, 'faible': 0, 'hors-sujet': 0 },
    'hors-sujet': { 'exact': 0, 'partiel': 0, 'faible': 0, 'hors-sujet': 0 },
  };

  const topFalsePositivesExact: Array<{ queryId: string, query: string, variable: string, text: string, score: number }> = [];

  let totalRelevantCount = 0;
  let totalRelevantFoundAsHorsSujet = 0;

  let totalExactPredicted = 0;
  let totalExactCorrect = 0;

  for (const file of fixtureFiles) {
    const fixturePath = path.join(fixturesDir, file);
    const fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf-8')) as Fixture;
    const golden = goldenQueries[fixture.id];

    if (!golden) continue;

    const concepts = fixture.concepts;
    const candidates = fixture.candidates;

    // Track which relevant items were actually found in candidates
    const relevantFoundInCandidates = new Set<string>();

    for (const candidate of candidates) {
      const { pertinence, score } = scoreResult(concepts, candidate);
      const assignedGrade = normalizePertinence(pertinence);

      const goldenMatch = golden.relevant.find(r => r.survey_id === candidate.survey_id && r.variable === candidate.variable);
      const expectedGrade = goldenMatch ? normalizeGrade(goldenMatch.grade) : 'hors-sujet';

      confusionMatrix[expectedGrade][assignedGrade]++;

      if (assignedGrade === 'exact') {
        totalExactPredicted++;
        if (expectedGrade === 'exact') {
          totalExactCorrect++;
        } else {
          topFalsePositivesExact.push({
            queryId: fixture.id,
            query: fixture.query,
            variable: `${candidate.survey_id}/${candidate.variable}`,
            text: candidate.question_text,
            score: score
          });
        }
      }

      if (goldenMatch) {
        relevantFoundInCandidates.add(`${candidate.survey_id}/${candidate.variable}`);
        if (assignedGrade === 'hors-sujet') {
          totalRelevantFoundAsHorsSujet++;
        }
      }
    }

    totalRelevantCount += golden.relevant.length;
    // Relevant items NOT in candidates are implicitly Hors-sujet by the engine (or just not retrieved)
    const notRetrievedCount = golden.relevant.filter(r => !relevantFoundInCandidates.has(`${r.survey_id}/${r.variable}`)).length;
    totalRelevantFoundAsHorsSujet += notRetrievedCount;
  }

  // Report
  console.log("=== EVALUATION REPORT ===");
  console.log(`Queries processed: ${fixtureFiles.length}`);
  console.log(`Total Relevant items in Golden Set: ${totalRelevantCount}`);
  console.log("");

  console.log("--- Metrics ---");
  const precisionExact = totalExactPredicted > 0 ? (totalExactCorrect / totalExactPredicted) * 100 : 0;
  console.log(`Precision @ Exact: ${precisionExact.toFixed(1)}% (${totalExactCorrect}/${totalExactPredicted})`);

  const recallRelevant = totalRelevantCount > 0 ? ((totalRelevantCount - totalRelevantFoundAsHorsSujet) / totalRelevantCount) * 100 : 0;
  console.log(`Recall of relevant items (non Hors-sujet): ${recallRelevant.toFixed(1)}% (${totalRelevantCount - totalRelevantFoundAsHorsSujet}/${totalRelevantCount})`);
  console.log(`Items marked as Hors-sujet (or not retrieved): ${totalRelevantFoundAsHorsSujet}`);
  console.log("");

  console.log("--- Confusion Matrix (Expected \\ Assigned) ---");
  const headers = ['exact', 'partiel', 'faible', 'hors-sujet'];
  console.log("\t" + headers.join("\t"));
  for (const expected of headers) {
    const row = headers.map(assigned => confusionMatrix[expected][assigned]);
    console.log(`${expected}\t${row.join("\t")}`);
  }
  console.log("");

  console.log("--- Top False Positives for 'Exact' ---");
  topFalsePositivesExact.sort((a, b) => b.score - a.score);
  topFalsePositivesExact.slice(0, 10).forEach(fp => {
    console.log(`[${fp.queryId}] "${fp.query}" -> ${fp.variable}`);
    console.log(`      Text: ${fp.text.slice(0, 100)}${fp.text.length > 100 ? '...' : ''}`);
    console.log(`      Local Score: ${fp.score.toFixed(1)}`);
  });
}

main().catch(console.error);
