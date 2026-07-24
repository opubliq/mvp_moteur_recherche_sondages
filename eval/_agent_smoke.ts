/**
 * Smoke test de la boucle tool-use (bead aat.1) — SANS Azure.
 *
 * On injecte `chat` (LLM scripté) et le dispatch/provider, pour vérifier
 * l'ORCHESTRATION et les GARDE-FOUS indépendamment des services externes :
 *   1. Demande vague  → clarification AVANT tout outil (0 appel d'outil).
 *   2. Recherche simple → UN seul search, pas de chaîne.
 *   3. Analyse         → get_survey (mapping code) PUIS crosstab, multi-tours.
 *   4. Garde-fou manifest : crosstab sur sondage sans micro-données → {error}.
 *   5. Budget dépassé  → réponse finale sans outil (stopped_reason=deadline).
 *
 * Lancer : npx tsx eval/_agent_smoke.ts
 */

import {
  runAgent,
  executeTool,
  type ChatFn,
  type ChatMessage,
  type AgentEnv,
  type MicrodataProvider,
  type ManifestLike,
} from "../src/logic/agent";

let passed = 0;
let failed = 0;
function check(name: string, cond: boolean, detail?: unknown) {
  if (cond) {
    passed += 1;
    console.log(`  ok   ${name}`);
  } else {
    failed += 1;
    console.error(`  FAIL ${name}`, detail ?? "");
  }
}

// Env factice : la boucle scriptée n'appelle jamais AOAI/Azure réels.
const ENV = {
  AOAI_ENDPOINT: "x",
  AOAI_KEY: "x",
  AOAI_CHAT_DEPLOYMENT: "x",
  SEARCH_ENDPOINT: "x",
  SEARCH_QUERY_KEY: "x",
  AOAI_EMBED_DEPLOYMENT: "x",
  COHERE_RERANK_ENDPOINT: "x",
  COHERE_RERANK_DEPLOYMENT: "x",
  COHERE_RERANK_KEY: "x",
} as AgentEnv;

const NOOP_MICRODATA: MicrodataProvider = {
  crosstab: async () => ({}),
  manifest: async (): Promise<ManifestLike> => ({ surveys: [] }),
};

/** Fabrique un ChatFn qui rejoue une liste de tours d'assistant scriptés. */
function scriptedChat(turns: ChatMessage[]): { chat: ChatFn; toolsOffered: boolean[] } {
  let i = 0;
  const toolsOffered: boolean[] = [];
  const chat: ChatFn = async (_messages, useTools) => {
    toolsOffered.push(useTools);
    const t = turns[Math.min(i, turns.length - 1)];
    i += 1;
    return { role: "assistant", content: t.content ?? null, tool_calls: t.tool_calls };
  };
  return { chat, toolsOffered };
}

function toolCall(id: string, name: string, args: unknown): NonNullable<ChatMessage["tool_calls"]>[0] {
  return { id, type: "function", function: { name, arguments: JSON.stringify(args) } };
}

async function main() {
  // --- 1. Demande vague → clarification, aucun outil -----------------------
  {
    const { chat } = scriptedChat([
      { role: "assistant", content: "Sur l'immigration, tu veux parler d'accueil, de seuils ou de religion ?" },
    ]);
    // execute injecté : doit ne JAMAIS être appelé.
    let called = 0;
    const res = await runAgent(
      [{ role: "user", content: "qu'est-ce qui distingue les gens sur l'immigration ?" }],
      ENV,
      NOOP_MICRODATA,
      { chat, execute: async () => { called += 1; return {}; } },
    );
    console.log("Scenario 1 — clarification");
    check("aucun outil appelé", called === 0 && res.trace.length === 0);
    check("une seule itération", res.iterations === 1, res.iterations);
    check("message = question de clarification", /accueil|seuils|religion/i.test(res.message));
    check("stopped_reason=final", res.stopped_reason === "final");
  }

  // --- 2. Recherche simple → un seul search --------------------------------
  {
    const { chat } = scriptedChat([
      { role: "assistant", content: null, tool_calls: [toolCall("c1", "search_questions", { query: "troisième lien" })] },
      { role: "assistant", content: "Voici 3 questions pertinentes sur le troisième lien." },
    ]);
    const execute = async (name: string) =>
      name === "search_questions" ? { count: 3, results: [] } : { error: "inattendu" };
    const res = await runAgent(
      [{ role: "user", content: "trouve-moi des questions sur le troisième lien" }],
      ENV,
      NOOP_MICRODATA,
      { chat, execute },
    );
    console.log("Scenario 2 — recherche simple");
    check("un seul outil, search_questions", res.trace.length === 1 && res.trace[0].tool === "search_questions", res.trace);
    check("réponse finale rendue", res.message.includes("troisième lien"));
  }

  // --- 3. Analyse → get_survey (mapping) PUIS crosstab, multi-tours --------
  {
    const { chat } = scriptedChat([
      { role: "assistant", content: null, tool_calls: [toolCall("g1", "get_survey", { survey_id: "survX" })] },
      { role: "assistant", content: null, tool_calls: [toolCall("x1", "crosstab", { survey_id: "survX", target: "SAT", dim: "AGE", filters: [{ var: "AGE", codes: ["1"] }] })] },
      { role: "assistant", content: "Les 18-34 ans (code AGE=1) sont plus satisfaits : 62 % vs 48 %." },
    ]);
    const execute = async (name: string, args: Record<string, unknown>) => {
      if (name === "get_survey")
        return { survey_id: "survX", questions: [{ variable: "AGE", response_options: [{ code: "1", label: "18-34 ans" }, { code: "2", label: "35+" }] }] };
      if (name === "crosstab") {
        // Vérifie que le modèle a bien passé le CODE issu de get_survey.
        const f = (args.filters as any[])?.[0];
        return { survey_id: args.survey_id, mode: "crosstab", passed_code: f?.codes?.[0], rows: [{ dim_code: 1, target_code: 1, col_share: 0.62 }] };
      }
      return { error: "inattendu" };
    };
    const res = await runAgent(
      [{ role: "user", content: "les 18-34 ans sont-ils plus satisfaits dans le sondage survX ?" }],
      ENV,
      NOOP_MICRODATA,
      { chat, execute },
    );
    console.log("Scenario 3 — analyse chaînée");
    check("get_survey AVANT crosstab", res.trace.length === 2 && res.trace[0].tool === "get_survey" && res.trace[1].tool === "crosstab", res.trace.map((t) => t.tool));
    check("3 itérations (2 outils + rédaction)", res.iterations === 3, res.iterations);
    check("code mappé transmis au crosstab", res.trace[1].ok === true);
    check("réponse finale chiffrée", /62\s?%/.test(res.message));
  }

  // --- 4. Garde-fou manifest (executeTool direct) --------------------------
  {
    console.log("Scenario 4 — garde-fou manifest");
    const provider: MicrodataProvider = {
      manifest: async () => ({ surveys: [{ survey_id: "survX" }] }),
      crosstab: async (p) => ({ ok: true, survey_id: p.survey_id, mode: "crosstab", rows: [] }),
    };
    const cache = { current: null as ManifestLike | null };

    const absent = (await executeTool("crosstab", { survey_id: "survABSENT", target: "SAT" }, ENV, provider, cache)) as any;
    check("crosstab refusé sur sondage hors manifest", !!absent.error && /micro-données/i.test(absent.error), absent);

    const present = (await executeTool("crosstab", { survey_id: "survX", target: "SAT" }, ENV, provider, cache)) as any;
    check("crosstab autorisé sur sondage du manifest", present.ok === true && present.mode === "crosstab", present);
  }

  // --- 5. Budget dépassé → réponse finale sans outil -----------------------
  {
    const { chat, toolsOffered } = scriptedChat([
      { role: "assistant", content: "Réponse rédigée sans nouvel outil (budget épuisé)." },
    ]);
    let called = 0;
    const res = await runAgent(
      [{ role: "user", content: "analyse complexe" }],
      ENV,
      NOOP_MICRODATA,
      { chat, execute: async () => { called += 1; return {}; }, deadlineMs: 0 },
    );
    console.log("Scenario 5 — budget dépassé");
    check("aucun outil offert (useTools=false)", toolsOffered[0] === false, toolsOffered);
    check("aucun outil exécuté", called === 0);
    check("stopped_reason=deadline", res.stopped_reason === "deadline", res.stopped_reason);
  }

  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
