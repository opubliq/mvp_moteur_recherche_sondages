/**
 * Agent analytique conversationnel — chat multi-conversations, fil UNIQUE
 * (colonne pleine largeur).
 *
 * Câble le chat sur `/agent` (aat.1) en STREAMING (aat.4) : un POST par tour,
 * réinjection du `messages` renvoyé par le serveur pour poursuivre la
 * conversation (le serveur ne connaît que ce qu'on lui repasse — il n'y a pas de
 * session côté back). Les questions de clarification de l'agent n'ont pas de
 * traitement spécial : ce sont des tours d'assistant normaux.
 *
 * LAYOUT (bead agy, révisé) : plus de panneau "document" séparé — chaque
 * réponse d'assistant se rend EN LIGNE dans le fil, juste sous la question qui
 * l'a produite :
 *  - réponse de RECHERCHE/inventaire (pas de marqueur `<!--DETAIL-->`,
 *    `splitAnswerSections` renvoie `detail: null`) : rendue telle quelle
 *    (`AssistantMarkdown`), comme avant dans le panneau document.
 *  - réponse d'ANALYSE (marqueur présent) : d'abord les puces "constat"
 *    (citables, chiffrées), repliées sur le détail complet (méthode, nombres,
 *    mises en garde) qui ne s'affiche qu'au clic — l'utilisateur voit le
 *    résultat sans creuser, et peut vérifier la preuve en un clic.
 *  - les figures/tableaux `run_python` (bead UI figures) et les étapes de
 *    l'agent (`StepList`) restent attachés à LEUR tour, pas à un panneau
 *    global.
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
 * humain, repliables, plus les figures/tableaux attachés au tour.
 */

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
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
  MapPin,
  Compass,
  ALargeSmall,
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
import { splitAnswerSections, type AnswerSection } from "../logic/agentAnswerSections";
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

interface AgentUsecase {
  icon: typeof Search;
  titleKey: TranslationKey;
  subtitleKey: TranslationKey;
  exampleKey: TranslationKey;
}

const AGENT_USECASES: AgentUsecase[] = [
  {
    icon: Search,
    titleKey: "agent.usecase.search.title",
    subtitleKey: "agent.usecase.search.subtitle",
    exampleKey: "agent.usecase.search.example",
  },
  {
    icon: Table2,
    titleKey: "agent.usecase.finding.title",
    subtitleKey: "agent.usecase.finding.subtitle",
    exampleKey: "agent.usecase.finding.example",
  },
  {
    icon: MapPin,
    titleKey: "agent.usecase.geoProfile.title",
    subtitleKey: "agent.usecase.geoProfile.subtitle",
    exampleKey: "agent.usecase.geoProfile.example",
  },
  {
    icon: Compass,
    titleKey: "agent.usecase.geoCross.title",
    subtitleKey: "agent.usecase.geoCross.subtitle",
    exampleKey: "agent.usecase.geoCross.example",
  },
];

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
    <div
      className="space-y-3 leading-relaxed [&_strong]:font-semibold"
      style={{ fontSize: "var(--agent-text-size, 0.95rem)" }}
    >
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

/** Rendu Markdown INLINE (pas de `<p>` bloc) pour une puce de constat : le
 *  `**gras**`/les liens doivent marcher sans réintroduire la marge/typo de
 *  paragraphe d'`AssistantMarkdown` sur une simple ligne de liste. */
function InlineMarkdown({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        p: ({ children }) => <>{children}</>,
        a: ({ children, href }) => (
          <a href={href} target="_blank" rel="noreferrer" className="text-primary underline underline-offset-2">
            {children}
          </a>
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  );
}

/**
 * Une ligne "constat" repliable INDÉPENDANTE : son propre `detail` s'affiche
 * sous ELLE (pas dans un panneau partagé) au clic — chaque constat a son
 * bascule propre, cf. nouveau contrat de `splitAnswerSections` (un `detail`
 * par constat, plus un seul détail pour tout le tour).
 */
function ConstatRow({ section }: { section: AnswerSection }) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  return (
    <li>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="op-card-hover flex w-full items-center justify-between gap-2 rounded-lg border border-base-content/10 bg-base-200/40 px-3 py-2 text-left text-sm"
      >
        <span className="flex-1">
          <InlineMarkdown content={section.summary} />
        </span>
        <ChevronDown className={`h-3 w-3 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="border-t border-base-content/10 pl-3 pt-2">
          {section.detail ? <AssistantMarkdown content={section.detail} /> : (
            <p className="text-xs text-base-content/50">{t("agent.noDetail")}</p>
          )}
        </div>
      )}
    </li>
  );
}

/**
 * Réponse d'assistant rendue EN LIGNE dans le fil (remplace l'ancienne carte
 * cliquable + panneau document séparé, bead agy révisé) : figures/tableaux
 * attachés à CE tour, puis soit le Markdown brut (réponse RECHERCHE, pas de
 * marqueur), soit une liste de constats (réponse ANALYSE) — CHAQUE constat a
 * désormais son propre bascule indépendant (`ConstatRow`), plus de panneau de
 * détail partagé pour tout le tour (cf. contrat de `splitAnswerSections`).
 */
function AssistantAnswer({ turn }: { turn: DisplayTurn }) {
  const { figures, tables } = collectTraceResults(turn.trace);
  const sections = splitAnswerSections(turn.content);
  const steps = turn.trace && turn.trace.length > 0 ? stepsFromTrace(turn.trace) : [];

  return (
    <div className="rounded-xl border border-base-content/10 px-3.5 py-3">
      <ResultGallery figures={figures} tables={tables} />
      {sections == null ? (
        <AssistantMarkdown content={turn.content} />
      ) : (
        <ul className="space-y-1.5">
          {sections.map((section, i) => (
            <ConstatRow key={i} section={section} />
          ))}
        </ul>
      )}
      {steps.length > 0 && (
        <div className="mt-2 border-t border-base-content/10 pt-2">
          <StepList steps={steps} />
        </div>
      )}
    </div>
  );
}

/** Clé localStorage du confort de lecture choisi — préférence par appareil,
 *  pas une donnée de conversation : jamais dans `conversations.ts`. */
const TEXT_SIZE_KEY = "opubliq_agent_text_scale";
const TEXT_SCALE_MIN = 80;
const TEXT_SCALE_MAX = 120;
const TEXT_SCALE_DEFAULT = 100;

function readStoredTextScale(): number {
  try {
    const raw = Number(localStorage.getItem(TEXT_SIZE_KEY));
    if (Number.isFinite(raw) && raw >= TEXT_SCALE_MIN && raw <= TEXT_SCALE_MAX) return raw;
  } catch {
    // stockage indisponible (navigation privée, etc.)
  }
  return TEXT_SCALE_DEFAULT;
}

export default function AgentPage() {
  const { t } = useLanguage();
  const [convId, setConvId] = useState<string>(() => newConversationId());
  // Taille de texte du fil (confort de lecture, bead UI compacité) : curseur
  // continu %, persisté côté navigateur, jamais envoyé au serveur ni mêlé à
  // une conversation. Le bouton "Aa" ouvre/ferme le curseur plutôt que de
  // basculer directement une valeur — réglage fin, pas un simple on/off.
  const [textScale, setTextScale] = useState<number>(readStoredTextScale);
  const [textSizeOpen, setTextSizeOpen] = useState(false);
  function setAndStoreTextScale(next: number) {
    setTextScale(next);
    try {
      localStorage.setItem(TEXT_SIZE_KEY, String(next));
    } catch {
      // stockage indisponible : on continue sans persister
    }
  }
  const [metas, setMetas] = useState<ConversationMeta[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [thread, setThread] = useState<AgentMessage[]>([]);
  const [traceByIndex, setTraceByIndex] = useState<Record<number, AgentToolTrace[]>>({});
  // Events tool_start/tool_end du tour EN COURS, streamés au fil de l'eau (bead
  // aat.4). Vidé une fois le tour terminé : la trace définitive vit alors dans
  // `traceByIndex`. Repliés en étapes affichables par `foldAgentSteps` (pure,
  // testée dans agentSteps.test.ts) plutôt que mutés à la main ici.
  const [liveEvents, setLiveEvents] = useState<AgentToolEvent[]>([]);
  const liveSteps = useMemo(() => foldAgentSteps(liveEvents), [liveEvents]);
  const liveResults = useMemo(() => collectStepResults(liveSteps), [liveSteps]);
  // Réponse reçue via l'event `message`, avant le `done` qui clôt le tour : permet
  // d'afficher le Markdown du tour en vol dès qu'elle existe, inline dans le fil.
  const [streamedAnswer, setStreamedAnswer] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryAfterMs, setRetryAfterMs] = useState<number | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
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

  function openConversation(id: string) {
    if (loading) return; // un tour est en vol : on ne change pas de fil sous ses pieds
    loadConversation(id).then((conv) => {
      if (!conv) return;
      skipSaveRef.current = true;
      setConvId(conv.id);
      setThread(conv.messages);
      setTraceByIndex(conv.traceByIndex);
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
    setLoading(true);
    try {
      // Streaming (bead aat.4) : les events tool_start/tool_end s'accumulent dans
      // `liveEvents`, repliés en étapes affichables par `foldAgentSteps`, rendues
      // inline sous la question pendant que le tour est en vol ; la réponse
      // rédigée arrive d'un bloc à la fin et s'affiche dès l'event `message`,
      // sans attendre le `done`. Les figures/tableaux produits en cours de route
      // s'affichent déjà (via `liveResults`) avant même que le texte final arrive.
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

      <div className="agent-layout" style={{ "--agent-text-size": `${(0.95 * textScale) / 100}rem` } as CSSProperties}>
        {/* ── En-tête : conversations + saisie, pleine largeur ──────────── */}
        <div className="relative flex items-center gap-1 border-b border-base-content/10 px-2 py-2">
          <button type="button" className="btn btn-primary btn-sm gap-1.5" onClick={newChat} disabled={loading}>
            <Plus className="h-4 w-4" /> {t("agent.newChat")}
          </button>
          <button
            type="button"
            className={`btn btn-ghost btn-sm ml-auto gap-1.5 ${textSizeOpen ? "text-primary" : ""}`}
            onClick={() => setTextSizeOpen((v) => !v)}
            aria-expanded={textSizeOpen}
            title={t("agent.textSize.label")}
          >
            <ALargeSmall className="h-4 w-4" />
          </button>
          {textSizeOpen && (
            <div className="absolute right-0 top-full z-10 mt-1 flex items-center gap-2 rounded-lg border border-base-content/10 bg-base-100 px-3 py-2 shadow-lg">
              <span className="text-xs text-base-content/50">A</span>
              <input
                type="range"
                min={TEXT_SCALE_MIN}
                max={TEXT_SCALE_MAX}
                step={5}
                value={textScale}
                onChange={(e) => setAndStoreTextScale(Number(e.target.value))}
                className="range range-xs range-primary w-28"
              />
              <span className="text-base text-base-content/50">A</span>
              <span className="w-10 text-right text-xs text-base-content/50">{textScale}%</span>
            </div>
          )}
          <button
            type="button"
            className="btn btn-ghost btn-sm gap-1.5"
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

        {/* ── Fil unique : questions (bulles) + réponses (inline) ───────── */}
        <div className="agent-scroll flex flex-col gap-3 px-3 py-3 md:px-6">
          {turns.length === 0 && !loading && (
            <div className="mx-auto w-full max-w-3xl py-4">
              <p className="mb-3 text-sm text-base-content/60">{t("agent.emptyDocIntro")}</p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {AGENT_USECASES.map((usecase) => {
                  const Icon = usecase.icon;
                  const example = t(usecase.exampleKey);
                  return (
                    <div
                      key={usecase.titleKey}
                      className="op-card-hover flex flex-col gap-2 rounded-xl border border-base-content/10 p-3"
                    >
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4 text-primary" />
                        <span className="text-sm font-semibold">{t(usecase.titleKey)}</span>
                      </div>
                      <p className="text-xs text-base-content/60">{t(usecase.subtitleKey)}</p>
                      <button
                        type="button"
                        className="mt-auto rounded-lg border border-base-content/10 px-3 py-2 text-left text-sm hover:border-primary/40"
                        onClick={() => send(example)}
                        disabled={loading}
                      >
                        {example}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
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
                <div
                  className="chat-bubble chat-user whitespace-pre-wrap"
                  style={{ fontSize: "var(--agent-text-size, 0.95rem)" }}
                >
                  {turn.content}
                </div>
              </div>
            ) : (
              <AssistantAnswer key={turn.index} turn={turn} />
            ),
          )}

          {/* Tour en vol : étapes + spinner, puis le texte dès qu'il arrive (event
              `message`) et les figures dès qu'elles sont produites — même bloc
              inline que les réponses passées, pas un panneau à part. */}
          {loading && (
            <div className="rounded-xl border border-base-content/10 px-3.5 py-3">
              <ResultGallery figures={liveResults.figures} tables={liveResults.tables} />
              {liveSteps.length > 0 && (
                <div className="mb-2 flex flex-col gap-1">
                  {liveSteps.map((s) => (
                    <StepRow key={s.key} step={s} />
                  ))}
                </div>
              )}
              {streamedAnswer != null ? (
                <AssistantMarkdown content={streamedAnswer} />
              ) : (
                <div className="flex items-center gap-2 text-sm text-base-content/60">
                  <span className="loading loading-dots loading-sm" />
                  {liveSteps.some((s) => s.status === "running") ? t("agent.consultingData") : t("agent.writing")}
                </div>
              )}
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
      </div>
    </>
  );
}
