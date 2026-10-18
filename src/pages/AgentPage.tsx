/**
 * Agent analytique conversationnel — chat multi-conversations, layout 2 colonnes.
 *
 * Câble le chat sur `/agent` (aat.1) en STREAMING (aat.4) : un POST par tour,
 * réinjection du `messages` renvoyé par le serveur pour poursuivre la
 * conversation (le serveur ne connaît que ce qu'on lui repasse — il n'y a pas de
 * session côté back). Les questions de clarification de l'agent n'ont pas de
 * traitement spécial : ce sont des tours d'assistant normaux.
 *
 * LAYOUT (bead agy) :
 *  - COLONNE GAUCHE = navigation + fil. Liste des conversations (nouveau chat,
 *    reprise, renommage, suppression), messages utilisateur, pastilles d'outils,
 *    saisie. Les réponses de l'agent n'y figurent qu'en ENTRÉES CLIQUABLES.
 *  - COLONNE DROITE = le livrable de l'agent : rendu Markdown, qui se lit
 *    comme un document, sans bulle ni chrome de chat — PLUS les figures/
 *    tableaux `run_python` (bead UI figures) de la réponse affichée, puisque
 *    c'est elle qui les a produits. Elle affiche par défaut la DERNIÈRE
 *    réponse (et ses figures en direct dès qu'elles arrivent, avant même le
 *    texte final) ; cliquer une entrée à gauche y épingle ce tour-là (le fil
 *    peut être long, on veut pouvoir relire un résultat intermédiaire sans
 *    perdre la suite).
 *
 * La persistance des conversations est déléguée à `logic/conversations.ts`
 * (backend `/conversations`, scopé par utilisateur — f3i.19.6) : le corps
 * complet (fil + `traceByIndex`, figures base64 incluses) part dans un blob
 * JSON (pas de limite 1 Mo comme une entité Table) — rien à élider ici ; un
 * tour sans trace persistée (vieille conversation) retombe simplement sur
 * `stepsFromTrace(undefined) === []`, sans figure ni plantage au rechargement.
 *
 * HORS SCOPE ICI (délégué) : garde-fous structurés / parsing fin de la trace
 * (raw_n, écart significatif vs bruit en badges) (aat.5) — la trace est affichée
 * simplement : étapes (`logic/agentSteps.ts`, pure et testée) avec leur libellé
 * humain, repliables, plus les figures/tableaux dans le panneau Réponse.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Send,
  AlertTriangle,
  CheckCircle2,
  Search,
  ListTree,
  BookOpenCheck,
  Table2,
  Wrench,
  Plus,
  History,
  ChevronDown,
  ArrowDownToLine,
  FileText,
} from "lucide-react";
import { agentChatStream, AgentRateLimitError, type AgentMessage, type AgentToolTrace } from "../api";
import ConversationList from "../components/ConversationList";
import {
  deleteConversation,
  listConversations,
  loadConversation,
  newConversationId,
  renameConversation,
  saveConversation,
  type ConversationMeta,
} from "../logic/conversations";
import {
  collectStepResults,
  collectTraceResults,
  foldAgentSteps,
  stepLabel,
  stepsFromTrace,
  type AgentStep,
  type AgentToolEvent,
} from "../logic/agentSteps";
import type { SandboxFigure, SandboxTable } from "../logic/pythonSandbox";
import { useLanguage } from "../context/LanguageContext";
import type { TranslationKey } from "../i18n/fr";

/** Un tour affichable (les messages `tool`/assistant-sans-texte ne le sont pas). */
interface DisplayTurn {
  /** Index dans `thread` — sert de clé stable et de repère pour la trace. */
  index: number;
  role: "user" | "assistant";
  content: string;
  trace?: AgentToolTrace[];
}

const EXAMPLE_KEYS: TranslationKey[] = ["agent.example1", "agent.example2", "agent.example3"];

/** Icône par outil — repère visuel rapide, pas une taxonomie à maintenir. */
function toolIcon(tool: string) {
  switch (tool) {
    case "search_questions":
      return <Search className="h-3 w-3" />;
    case "list_surveys":
      return <ListTree className="h-3 w-3" />;
    case "list_themes":
      return <ListTree className="h-3 w-3" />;
    case "get_survey":
      return <BookOpenCheck className="h-3 w-3" />;
    case "crosstab":
      return <Table2 className="h-3 w-3" />;
    default:
      return <Wrench className="h-3 w-3" />;
  }
}

/**
 * Une étape de la boucle agent, rendue en ligne compacte (bead « étapes en
 * direct ») : icône d'outil, libellé humain FR/EN (`stepLabel`), spinner
 * pendant l'exécution, ✓/⚠ une fois connue. Le détail (outil technique +
 * erreur complète) reste au survol — la ligne elle-même se lit d'un coup d'œil.
 */
function StepRow({ step }: { step: AgentStep }) {
  const { t } = useLanguage();
  const label = stepLabel(step.tool, step.args, t);
  return (
    <div
      className={`flex items-center gap-1.5 text-xs ${step.status === "error" ? "text-error" : "text-base-content/70"}`}
      title={step.status === "error" ? step.error : step.tool}
    >
      {toolIcon(step.tool)}
      <span className={step.status === "running" ? "opacity-80" : ""}>{label}</span>
      {step.status === "running" && <span className="loading loading-spinner loading-xs" />}
      {step.status === "done" && <CheckCircle2 className="h-3 w-3 text-success" />}
      {step.status === "error" && (
        <span className="flex items-center gap-1 truncate">
          <AlertTriangle className="h-3 w-3 shrink-0" />
          {step.error ? <span className="max-w-[12rem] truncate">{step.error}</span> : null}
        </span>
      )}
    </div>
  );
}

/** Indicateur compact "📊 N graphique(s)" / "📋 N tableau(x)" — le fil reste
 *  dense ; le rendu complet vit dans le panneau Réponse (`ResultGallery`). */
function ResultIndicator({ figures, tables }: { figures: SandboxFigure[]; tables: SandboxTable[] }) {
  const { t } = useLanguage();
  if (figures.length === 0 && tables.length === 0) return null;
  return (
    <span className="flex items-center gap-2 text-[0.7rem] text-base-content/50">
      {figures.length > 0 && (
        <span>{t(figures.length > 1 ? "agent.figures.indicatorPlural" : "agent.figures.indicator", { n: figures.length })}</span>
      )}
      {tables.length > 0 && (
        <span>{t(tables.length > 1 ? "agent.tables.indicatorPlural" : "agent.tables.indicator", { n: tables.length })}</span>
      )}
    </span>
  );
}

/**
 * Liste d'étapes compacte et REPLIABLE (fil de gauche) : un bouton résumé
 * ("N étapes ✓" + indicateur figures/tableaux) ; déplié, le détail ligne par
 * ligne (`StepRow`). Repliée par défaut une fois le tour terminé — dépliée
 * d'office pendant que l'agent travaille (`forceOpen`).
 */
function StepList({ steps, forceOpen }: { steps: AgentStep[]; forceOpen?: boolean }) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(Boolean(forceOpen));
  if (steps.length === 0) return null;
  const { figures, tables } = collectStepResults(steps);
  const allDone = steps.every((s) => s.status !== "running");
  const hasError = steps.some((s) => s.status === "error");
  const expanded = forceOpen || open;
  return (
    <div className="mt-1">
      {!forceOpen && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setOpen((v) => !v);
          }}
          className={`flex items-center gap-1.5 text-[0.7rem] font-medium ${hasError ? "text-error" : "text-base-content/50"} hover:text-base-content/80`}
        >
          <ChevronDown className={`h-3 w-3 transition-transform ${expanded ? "rotate-180" : ""}`} />
          {expanded ? t("agent.steps.hide") : t("agent.steps.show", { n: steps.length })}
          {allDone && !hasError && <CheckCircle2 className="h-3 w-3 text-success" />}
          {hasError && <AlertTriangle className="h-3 w-3" />}
          <ResultIndicator figures={figures} tables={tables} />
        </button>
      )}
      {expanded && (
        <div className="mt-1.5 flex flex-col gap-1 border-l border-base-content/10 pl-2">
          {steps.map((s) => (
            <StepRow key={s.key} step={s} />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Figures + tableaux `run_python` (bead 9ou.12), rendus dans le PANNEAU
 * RÉPONSE (plus dans le fil, bead UI figures) : attachés à la réponse qui les
 * a produits (dernière réponse en direct pendant le streaming, ou le tour
 * épinglé en relecture). Grille simple, cohérente avec `.op-*`/DaisyUI.
 */
function ResultGallery({ figures, tables }: { figures: SandboxFigure[]; tables: SandboxTable[] }) {
  if (figures.length === 0 && tables.length === 0) return null;
  return (
    <div className="mb-5 flex flex-col gap-4">
      {figures.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {figures.map((f) => (
            <img
              key={f.id}
              src={`data:${f.mime};base64,${f.base64}`}
              alt={f.id}
              className="max-h-80 rounded-lg border border-base-content/10 bg-white"
            />
          ))}
        </div>
      )}
      {tables.map((tb, i) => (
        <div key={i} className="overflow-x-auto">
          {tb.title && <div className="mb-1 text-xs font-semibold text-base-content/60">{tb.title}</div>}
          <table className="w-full border-collapse text-xs">
            <thead className="border-b border-base-content/20">
              <tr>
                {tb.columns.map((c, ci) => (
                  <th key={ci} className="px-2 py-1 text-left font-semibold">
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tb.rows.map((row, ri) => (
                <tr key={ri}>
                  {row.map((cell, ci) => (
                    <td key={ci} className="border-b border-base-content/10 px-2 py-1 align-top">
                      {String(cell ?? "")}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {tb.truncated && <div className="mt-1 text-[0.7rem] text-base-content/50">…</div>}
        </div>
      ))}
    </div>
  );
}

/** Rendu Markdown d'une réponse d'assistant, stylé cohérent avec `.op-*`.
 *  `remark-gfm` active les tableaux (inventaires de questions) + autolinks.
 *  Occupe la colonne de droite : typo de document, pas de bulle. */
function AssistantMarkdown({ content }: { content: string }) {
  return (
    <div className="space-y-3 text-[0.95rem] leading-relaxed [&_strong]:font-semibold">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => <p>{children}</p>,
          ul: ({ children }) => <ul className="list-disc space-y-1 pl-5">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal space-y-1 pl-5">{children}</ol>,
          li: ({ children }) => <li>{children}</li>,
          a: ({ children, href }) => (
            <a href={href} target="_blank" rel="noreferrer" className="text-primary underline underline-offset-2">
              {children}
            </a>
          ),
          code: ({ children }) => (
            <code className="rounded bg-base-content/10 px-1 py-0.5 text-[0.85em]">{children}</code>
          ),
          // Hiérarchie de titres visible (avant : tout aplati en gras identique).
          h1: ({ children }) => <h3 className="mt-1 text-lg font-semibold tracking-tight">{children}</h3>,
          h2: ({ children }) => <h4 className="mt-4 text-base font-semibold">{children}</h4>,
          h3: ({ children }) => <h5 className="mt-3 text-sm font-semibold text-base-content/80">{children}</h5>,
          // Tableaux GFM : défilement horizontal si large, bordures discrètes.
          table: ({ children }) => (
            <div className="overflow-x-auto">
              <table className="my-2 w-full border-collapse text-xs">{children}</table>
            </div>
          ),
          thead: ({ children }) => <thead className="border-b border-base-content/20">{children}</thead>,
          th: ({ children }) => <th className="px-2 py-1 text-left font-semibold">{children}</th>,
          td: ({ children }) => (
            <td className="border-b border-base-content/10 px-2 py-1 align-top">{children}</td>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-base-content/20 pl-3 text-base-content/70">
              {children}
            </blockquote>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

/** Première ligne utile d'une réponse — sert d'étiquette dans le fil de gauche. */
function excerpt(md: string, t: (key: TranslationKey) => string): string {
  const line = md
    .split("\n")
    .map((l) => l.replace(/^[#>*\-\s]+/, "").trim())
    .find((l) => l.length > 0);
  if (!line) return t("agent.excerptFallback");
  return line.length > 90 ? `${line.slice(0, 89)}…` : line;
}

export default function AgentPage() {
  const { t } = useLanguage();
  const [convId, setConvId] = useState<string>(() => newConversationId());
  const [metas, setMetas] = useState<ConversationMeta[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [thread, setThread] = useState<AgentMessage[]>([]);
  const [traceByIndex, setTraceByIndex] = useState<Record<number, AgentToolTrace[]>>({});
  // Tour épinglé à droite. `null` = suivre la dernière réponse (comportement par défaut).
  const [pinnedIndex, setPinnedIndex] = useState<number | null>(null);
  // Events tool_start/tool_end du tour EN COURS, streamés au fil de l'eau (bead
  // aat.4). Vidé une fois le tour terminé : la trace définitive vit alors dans
  // `traceByIndex`. Repliés en étapes affichables par `foldAgentSteps` (pure,
  // testée dans agentSteps.test.ts) plutôt que mutés à la main ici.
  const [liveEvents, setLiveEvents] = useState<AgentToolEvent[]>([]);
  const liveSteps = useMemo(() => foldAgentSteps(liveEvents), [liveEvents]);
  const liveResults = useMemo(() => collectStepResults(liveSteps), [liveSteps]);
  // Réponse reçue via l'event `message`, avant le `done` qui clôt le tour : permet
  // d'afficher le Markdown à droite dès qu'il existe.
  const [streamedAnswer, setStreamedAnswer] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryAfterMs, setRetryAfterMs] = useState<number | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const docRef = useRef<HTMLDivElement>(null);
  // Empêche l'effet de sauvegarde de ré-écrire (et donc de remonter `updatedAt`)
  // une conversation qu'on vient juste de CHARGER : ouvrir n'est pas modifier.
  const skipSaveRef = useRef(false);

  const refreshMetas = useCallback(() => {
    listConversations().then(setMetas);
  }, []);

  // Au montage : restaure la conversation la plus récente. Un rechargement de
  // page reprend donc là où on était, au lieu de repartir d'un fil vide.
  useEffect(() => {
    let cancelled = false;
    listConversations().then(async (list) => {
      if (cancelled) return;
      setMetas(list);
      if (list.length === 0) return;
      const conv = await loadConversation(list[0].id);
      if (cancelled || !conv) return;
      skipSaveRef.current = true;
      setConvId(conv.id);
      setThread(conv.messages);
      setTraceByIndex(conv.traceByIndex);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Sauvegarde à chaque évolution du fil (y compris le message utilisateur seul,
  // avant la réponse : un rechargement en cours de route ne perd pas la question).
  useEffect(() => {
    if (thread.length === 0) return; // un chat vierge n'encombre pas la liste
    if (skipSaveRef.current) {
      skipSaveRef.current = false;
      return;
    }
    saveConversation(convId, { messages: thread, traceByIndex }).then(refreshMetas);
  }, [thread, traceByIndex, convId, refreshMetas]);

  // Défilement instantané tant qu'un tour est en vol (liveEvents change à
  // chaque tool_start/tool_end pendant le streaming) : évite d'empiler des
  // animations de scroll interrompues les unes par les autres. Smooth
  // seulement à la fin, pour l'agrément visuel.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: loading ? "auto" : "smooth", block: "end" });
  }, [thread, loading, liveEvents]);

  // Compte à rebours du délai de quota relayé par le serveur (429) : le champ
  // reste désactivé jusqu'à expiration plutôt que de laisser réessayer à l'aveugle.
  useEffect(() => {
    if (retryAfterMs == null) return;
    const t = setTimeout(() => setRetryAfterMs(null), retryAfterMs);
    return () => clearTimeout(t);
  }, [retryAfterMs]);

  const turns: DisplayTurn[] = thread
    .map((m, index) => ({ m, index }))
    .filter(({ m }) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string" && m.content.length > 0)
    .map(({ m, index }) => ({
      index,
      role: m.role as "user" | "assistant",
      content: m.content as string,
      trace: traceByIndex[index],
    }));

  const answers = turns.filter((t) => t.role === "assistant");
  const lastAnswer = answers.length > 0 ? answers[answers.length - 1] : null;
  const pinned = pinnedIndex != null ? (answers.find((t) => t.index === pinnedIndex) ?? null) : null;
  // Ce qu'affiche la colonne de droite : le tour épinglé, sinon la réponse en
  // cours de streaming, sinon la dernière réponse du fil.
  const docTurn = pinned ?? (streamedAnswer != null ? null : lastAnswer);
  const docContent = pinned ? pinned.content : (streamedAnswer ?? lastAnswer?.content ?? null);
  const isPinnedStale = pinned != null && lastAnswer != null && pinned.index !== lastAnswer.index;
  // Figures/tableaux attachés à CETTE réponse : le tour épinglé en relecture,
  // sinon le tour en cours de streaming (ses figures peuvent arriver avant le
  // texte final), sinon la dernière réponse persistée.
  const docResults = pinned
    ? collectTraceResults(pinned.trace)
    : loading
      ? liveResults
      : collectTraceResults(lastAnswer?.trace);

  // Une nouvelle réponse ramène la lecture en haut du document.
  useEffect(() => {
    docRef.current?.scrollTo({ top: 0 });
  }, [docTurn?.index, pinnedIndex]);

  function openConversation(id: string) {
    if (loading) return; // un tour est en vol : on ne change pas de fil sous ses pieds
    loadConversation(id).then((conv) => {
      if (!conv) return;
      skipSaveRef.current = true;
      setConvId(conv.id);
      setThread(conv.messages);
      setTraceByIndex(conv.traceByIndex);
      setPinnedIndex(null);
      setStreamedAnswer(null);
      setError(null);
      setHistoryOpen(false);
    });
  }

  function newChat() {
    if (loading) return;
    setConvId(newConversationId());
    setThread([]);
    setTraceByIndex({});
    setPinnedIndex(null);
    setStreamedAnswer(null);
    setError(null);
    setInput("");
    setHistoryOpen(false);
  }

  function handleDelete(id: string) {
    deleteConversation(id).then(() => {
      refreshMetas();
      if (id === convId) newChat();
    });
  }

  function handleRename(id: string, title: string) {
    renameConversation(id, title).then(refreshMetas);
  }

  async function send(text: string) {
    const userTurn: AgentMessage = { role: "user", content: text };
    const requestMessages = [...thread, userTurn];
    // Affiche le message user tout de suite, avant la réponse du serveur.
    setThread(requestMessages);
    setInput("");
    setError(null);
    setLiveEvents([]);
    setStreamedAnswer(null);
    setPinnedIndex(null); // une nouvelle question ramène le document sur la réponse à venir
    setLoading(true);
    try {
      // Streaming (bead aat.4) : les events tool_start/tool_end s'accumulent dans
      // `liveEvents`, repliés en étapes affichables par `foldAgentSteps` (colonne
      // gauche, compact) ; la réponse rédigée arrive d'un bloc à la fin et
      // s'affiche à droite dès l'event `message`, sans attendre le `done`. Les
      // figures/tableaux produits en cours de route s'affichent déjà à droite
      // (via `liveResults`) avant même que le texte final arrive.
      const result = await agentChatStream(
        requestMessages,
        (ev) => {
          if (ev.type === "tool_start" || ev.type === "tool_end") {
            setLiveEvents((prev) => [...prev, ev]);
          } else if (ev.type === "message") {
            setStreamedAnswer(ev.content);
          }
        },
        convId,
      );
      setThread(result.messages);
      if (result.trace.length > 0) {
        setTraceByIndex((prev) => ({ ...prev, [result.messages.length - 1]: result.trace }));
      }
    } catch (err) {
      if (err instanceof AgentRateLimitError) {
        setRetryAfterMs(err.retryAfterMs);
        setError(t("agent.quotaError", { seconds: Math.ceil(err.retryAfterMs / 1000) }));
      } else {
        setError(err instanceof Error ? err.message : String(err));
      }
      // On garde le message user affiché (requestMessages) : rien n'est perdu,
      // l'utilisateur peut relancer le même tour une fois l'erreur passée.
    } finally {
      setLoading(false);
      setLiveEvents([]);
      setStreamedAnswer(null);
    }
  }

  const canSend = input.trim().length > 0 && !loading && retryAfterMs == null;

  return (
    <>
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">{t("agent.title")}</h2>
        </div>
        <p className="max-w-xl text-sm text-base-content/60">{t("agent.subtitle")}</p>
      </div>

      <div className="agent-layout">
        {/* ── COLONNE GAUCHE : conversations + fil + saisie ─────────────── */}
        <section className="agent-col">
          <div className="flex items-center gap-1 border-b border-base-content/10 px-2 py-2">
            <button type="button" className="btn btn-primary btn-sm gap-1.5" onClick={newChat} disabled={loading}>
              <Plus className="h-4 w-4" /> {t("agent.newChat")}
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-sm ml-auto gap-1.5"
              onClick={() => setHistoryOpen((v) => !v)}
              aria-expanded={historyOpen}
            >
              <History className="h-4 w-4" />
              {t("agent.history")}
              {metas.length > 0 && <span className="opacity-60">({metas.length})</span>}
              <ChevronDown className={`h-3.5 w-3.5 transition-transform ${historyOpen ? "rotate-180" : ""}`} />
            </button>
          </div>

          {historyOpen && (
            <div className="agent-history border-b border-base-content/10 px-1.5 py-1.5">
              <ConversationList
                items={metas}
                activeId={convId}
                onOpen={openConversation}
                onRename={handleRename}
                onDelete={handleDelete}
              />
            </div>
          )}

          <div className="agent-scroll flex flex-col gap-2.5 px-3 py-3">
            {turns.length === 0 && !loading && (
              <p className="text-sm text-base-content/50">{t("agent.emptyThread")}</p>
            )}

            {turns.map((turn) =>
              turn.role === "user" ? (
                // Enveloppe dédiée pour l'alignement à droite : la bulle elle-même
                // ne doit PAS être un item flex direct de `.agent-scroll`. En item
                // flex, `width: fit-content` combiné à du texte qui wrap (pre-wrap)
                // ne fait pas grandir sa hauteur avec le texte dès qu'il dépasse une
                // ligne — le texte déborde de la boîte (bead aat.8, reproductible
                // partout, pas lié au moniteur). Hors du flex direct, c'est un bloc
                // normal en shrink-to-fit — code path plus robuste.
                <div key={turn.index} className="flex justify-end">
                  <div className="chat-bubble chat-user whitespace-pre-wrap">{turn.content}</div>
                </div>
              ) : (
                <button
                  key={turn.index}
                  type="button"
                  onClick={() => setPinnedIndex(turn.index)}
                  className={`op-card-hover rounded-xl border px-3 py-2 text-left ${
                    (pinnedIndex ?? lastAnswer?.index) === turn.index
                      ? "border-primary/40 bg-primary/5"
                      : "border-base-content/10"
                  }`}
                  title={t("agent.showInDoc")}
                >
                  <span className="mb-1 flex items-center gap-1.5 text-[0.68rem] font-semibold uppercase tracking-wide text-base-content/45">
                    <FileText className="h-3 w-3" /> {t("agent.response")}
                  </span>
                  <span className="block text-sm text-base-content/70">{excerpt(turn.content, t)}</span>
                  {turn.trace && turn.trace.length > 0 && (
                    <div className="mt-2 border-t border-base-content/10 pt-2">
                      <StepList steps={stepsFromTrace(turn.trace)} />
                    </div>
                  )}
                </button>
              ),
            )}

            {loading && (
              <div className="rounded-xl border border-base-content/10 px-3 py-2">
                {liveSteps.length > 0 && (
                  <div className="mb-2 flex flex-col gap-1">
                    {liveSteps.map((s) => (
                      <StepRow key={s.key} step={s} />
                    ))}
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm text-base-content/60">
                  <span className="loading loading-dots loading-sm" />
                  {liveSteps.some((s) => s.status === "running") ? t("agent.consultingData") : t("agent.writing")}
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {error && (
            <div className="alert alert-error mx-3 mb-2 py-2 text-sm">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form
            className="flex items-center gap-2 border-t border-base-content/10 px-3 py-2.5"
            onSubmit={(e) => {
              e.preventDefault();
              if (canSend) send(input.trim());
            }}
          >
            <input
              className="input input-bordered flex-1"
              placeholder={t("agent.inputPlaceholder")}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={loading || retryAfterMs != null}
            />
            <button type="submit" className="btn btn-primary" disabled={!canSend}>
              {loading ? <span className="loading loading-spinner loading-sm" /> : <Send className="h-4 w-4" />}
            </button>
          </form>
        </section>

        {/* ── COLONNE DROITE : Markdown, et rien d'autre ────────────────── */}
        <section className="agent-col">
          <div className="flex items-center gap-2 border-b border-base-content/10 px-4 py-2 text-xs text-base-content/50">
            <FileText className="h-3.5 w-3.5" />
            <span>
              {docContent == null
                ? t("agent.docHeader.default")
                : isPinnedStale
                  ? t("agent.docHeader.pinned", { n: answers.findIndex((a) => a.index === pinned!.index) + 1, total: answers.length })
                  : t("agent.docHeader.latest")}
            </span>
            {isPinnedStale && (
              <button
                type="button"
                className="btn btn-ghost btn-xs ml-auto gap-1"
                onClick={() => setPinnedIndex(null)}
              >
                <ArrowDownToLine className="h-3.5 w-3.5" /> {t("agent.backToLatest")}
              </button>
            )}
          </div>

          <div ref={docRef} className="agent-scroll px-5 py-5 md:px-8 md:py-7">
            {docContent != null ? (
              <div className="mx-auto max-w-3xl">
                <ResultGallery figures={docResults.figures} tables={docResults.tables} />
                <AssistantMarkdown content={docContent} />
              </div>
            ) : loading ? (
              <div className="mx-auto max-w-3xl">
                <ResultGallery figures={docResults.figures} tables={docResults.tables} />
                <div className="flex items-center gap-2 text-sm text-base-content/50">
                  <span className="loading loading-dots loading-sm" />
                  {t("agent.working")}
                </div>
              </div>
            ) : (
              <div className="mx-auto max-w-3xl">
                <p className="mb-3 text-sm text-base-content/60">{t("agent.emptyDocIntro")}</p>
                <div className="flex flex-col gap-2">
                  {EXAMPLE_KEYS.map((exKey) => {
                    const ex = t(exKey);
                    return (
                      <button
                        key={exKey}
                        type="button"
                        className="op-card-hover rounded-lg border border-base-content/10 px-3 py-2 text-left text-sm hover:border-primary/40"
                        onClick={() => send(ex)}
                        disabled={loading}
                      >
                        {ex}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </>
  );
}
