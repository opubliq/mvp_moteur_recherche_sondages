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
 *  - COLONNE DROITE = rendu Markdown, et rien d'autre. C'est le livrable de
 *    l'agent : il se lit comme un document, sans bulle ni chrome de chat.
 *    Elle affiche par défaut la DERNIÈRE réponse ; cliquer une entrée à gauche
 *    y épingle ce tour-là (le fil peut être long, on veut pouvoir relire un
 *    résultat intermédiaire sans perdre la suite).
 *
 * La persistance des conversations est déléguée à `logic/conversations.ts`
 * (localStorage aujourd'hui, backend le jour où il y a un `client_id`).
 *
 * HORS SCOPE ICI (délégué) : garde-fous structurés / parsing fin de la trace
 * (raw_n, écart significatif vs bruit en badges) (aat.5) — la trace est affichée
 * simplement : liste des outils appelés avec leurs arguments-clé.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Send,
  AlertTriangle,
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

/** Un tour affichable (les messages `tool`/assistant-sans-texte ne le sont pas). */
interface DisplayTurn {
  /** Index dans `thread` — sert de clé stable et de repère pour la trace. */
  index: number;
  role: "user" | "assistant";
  content: string;
  trace?: AgentToolTrace[];
}

/** Outil en cours de streaming (bead aat.4) : `ok === null` = pas encore terminé. */
interface LiveTool {
  tool: string;
  args: unknown;
  ok: boolean | null;
  error?: string;
}

const EXAMPLES = [
  "Les 18-34 ans au Québec, qu'est-ce qui les distingue sur l'immigration ?",
  "Qu'est-ce qu'on a comme questions sur les réfugiés climatiques ?",
  "Qui appuie le plus la réforme du mode de scrutin ?",
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

/** Résumé court des arguments d'un appel d'outil : la traçabilité vers la
 *  question source (survey_id/variable) sans reproduire tout le JSON. */
function summarizeArgs(tool: string, args: unknown): string | null {
  if (!args || typeof args !== "object") return null;
  const a = args as Record<string, unknown>;
  const parts: string[] = [];
  if (typeof a.survey_id === "string") parts.push(a.survey_id);
  if (typeof a.target === "string") parts.push(`cible: ${a.target}`);
  if (typeof a.dim === "string") parts.push(`× ${a.dim}`);
  if (typeof a.query === "string") parts.push(`« ${a.query} »`);
  if (parts.length === 0 && tool === "list_surveys") return null;
  return parts.length > 0 ? parts.join(" · ") : null;
}

/** Un appel d'outil, rendu en pastille discrète. `ok === null` = en cours (spinner). */
function ToolPill({ t }: { t: { tool: string; args: unknown; ok: boolean | null; error?: string } }) {
  const summary = summarizeArgs(t.tool, t.args);
  const pending = t.ok === null;
  return (
    <span
      className={`op-badge op-badge-plain ${t.ok === false ? "border-error/40 text-error" : ""} ${pending ? "opacity-70" : ""}`}
      title={t.ok === false ? t.error : undefined}
    >
      {toolIcon(t.tool)}
      {t.tool}
      {summary ? <span className="opacity-70">· {summary}</span> : null}
      {pending && <span className="loading loading-spinner loading-xs" />}
      {t.ok === false && <AlertTriangle className="h-3 w-3" />}
    </span>
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
function excerpt(md: string): string {
  const line = md
    .split("\n")
    .map((l) => l.replace(/^[#>*\-\s]+/, "").trim())
    .find((l) => l.length > 0);
  if (!line) return "Réponse";
  return line.length > 90 ? `${line.slice(0, 89)}…` : line;
}

export default function AgentPage() {
  const [convId, setConvId] = useState<string>(() => newConversationId());
  const [metas, setMetas] = useState<ConversationMeta[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [thread, setThread] = useState<AgentMessage[]>([]);
  const [traceByIndex, setTraceByIndex] = useState<Record<number, AgentToolTrace[]>>({});
  // Tour épinglé à droite. `null` = suivre la dernière réponse (comportement par défaut).
  const [pinnedIndex, setPinnedIndex] = useState<number | null>(null);
  // Outils du tour EN COURS, streamés au fil de l'eau (bead aat.4). Vidé une fois
  // le tour terminé : la trace définitive vit alors dans `traceByIndex`.
  const [liveTools, setLiveTools] = useState<LiveTool[]>([]);
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

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [thread, loading, liveTools]);

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
    setLiveTools([]);
    setStreamedAnswer(null);
    setPinnedIndex(null); // une nouvelle question ramène le document sur la réponse à venir
    setLoading(true);
    try {
      // Streaming (bead aat.4) : les pastilles d'outils apparaissent en direct via
      // `liveTools` (colonne gauche) ; la réponse rédigée arrive d'un bloc à la fin
      // et s'affiche à droite dès l'event `message`, sans attendre le `done`.
      const result = await agentChatStream(requestMessages, (ev) => {
        if (ev.type === "tool_start") {
          setLiveTools((prev) => [...prev, { tool: ev.tool, args: ev.args, ok: null }]);
        } else if (ev.type === "tool_end") {
          // Marque la dernière pastille EN COURS du même outil comme terminée.
          setLiveTools((prev) => {
            const next = [...prev];
            for (let i = next.length - 1; i >= 0; i--) {
              if (next[i].ok === null && next[i].tool === ev.trace.tool) {
                next[i] = { tool: ev.trace.tool, args: ev.trace.args, ok: ev.trace.ok, error: ev.trace.error };
                break;
              }
            }
            return next;
          });
        } else if (ev.type === "message") {
          setStreamedAnswer(ev.content);
        }
      });
      setThread(result.messages);
      if (result.trace.length > 0) {
        setTraceByIndex((prev) => ({ ...prev, [result.messages.length - 1]: result.trace }));
      }
    } catch (err) {
      if (err instanceof AgentRateLimitError) {
        setRetryAfterMs(err.retryAfterMs);
        setError(`Quota du modèle atteint — réessaie dans ${Math.ceil(err.retryAfterMs / 1000)} s.`);
      } else {
        setError(err instanceof Error ? err.message : String(err));
      }
      // On garde le message user affiché (requestMessages) : rien n'est perdu,
      // l'utilisateur peut relancer le même tour une fois l'erreur passée.
    } finally {
      setLoading(false);
      setLiveTools([]);
      setStreamedAnswer(null);
    }
  }

  const canSend = input.trim().length > 0 && !loading && retryAfterMs == null;

  return (
    <>
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <div>
          <p className="op-kicker">Agent analytique</p>
          <h2 className="text-xl font-semibold tracking-tight">Pose une question en langage naturel</h2>
        </div>
        <p className="max-w-xl text-sm text-base-content/60">
          L'agent cherche les questions pertinentes, croise les micro-données pondérées et rédige une réponse. Il pose
          des questions de clarification quand la demande est trop large.
        </p>
      </div>

      <div className="agent-layout">
        {/* ── COLONNE GAUCHE : conversations + fil + saisie ─────────────── */}
        <section className="agent-col">
          <div className="flex items-center gap-1 border-b border-base-content/10 px-2 py-2">
            <button type="button" className="btn btn-primary btn-sm gap-1.5" onClick={newChat} disabled={loading}>
              <Plus className="h-4 w-4" /> Nouveau chat
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-sm ml-auto gap-1.5"
              onClick={() => setHistoryOpen((v) => !v)}
              aria-expanded={historyOpen}
            >
              <History className="h-4 w-4" />
              Historique
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
              <p className="text-sm text-base-content/50">
                Nouvelle conversation — pose ta question ci-dessous, ou pars d'un exemple à droite.
              </p>
            )}

            {turns.map((turn) =>
              turn.role === "user" ? (
                <div key={turn.index} className="chat-bubble chat-user whitespace-pre-wrap">
                  {turn.content}
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
                  title="Afficher cette réponse dans le document"
                >
                  <span className="mb-1 flex items-center gap-1.5 text-[0.68rem] font-semibold uppercase tracking-wide text-base-content/45">
                    <FileText className="h-3 w-3" /> Réponse
                  </span>
                  <span className="block text-sm text-base-content/70">{excerpt(turn.content)}</span>
                  {turn.trace && turn.trace.length > 0 && (
                    <span className="mt-2 flex flex-wrap gap-1.5 border-t border-base-content/10 pt-2">
                      {turn.trace.map((t, i) => (
                        <ToolPill key={i} t={t} />
                      ))}
                    </span>
                  )}
                </button>
              ),
            )}

            {loading && (
              <div className="rounded-xl border border-base-content/10 px-3 py-2">
                {liveTools.length > 0 && (
                  <div className="mb-2 flex flex-wrap gap-1.5">
                    {liveTools.map((t, i) => (
                      <ToolPill key={i} t={t} />
                    ))}
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm text-base-content/60">
                  <span className="loading loading-dots loading-sm" />
                  {liveTools.some((t) => t.ok === null) ? "L'agent consulte les données…" : "L'agent rédige…"}
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
              placeholder="Écris ta question…"
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
                ? "Réponse de l'agent"
                : isPinnedStale
                  ? `Réponse ${answers.findIndex((a) => a.index === pinned!.index) + 1} sur ${answers.length}`
                  : "Dernière réponse"}
            </span>
            {isPinnedStale && (
              <button
                type="button"
                className="btn btn-ghost btn-xs ml-auto gap-1"
                onClick={() => setPinnedIndex(null)}
              >
                <ArrowDownToLine className="h-3.5 w-3.5" /> Revenir à la dernière
              </button>
            )}
          </div>

          <div ref={docRef} className="agent-scroll px-5 py-5 md:px-8 md:py-7">
            {docContent != null ? (
              <div className="mx-auto max-w-3xl">
                <AssistantMarkdown content={docContent} />
              </div>
            ) : loading ? (
              <div className="mx-auto flex max-w-3xl items-center gap-2 text-sm text-base-content/50">
                <span className="loading loading-dots loading-sm" />
                L'agent travaille — la réponse s'affichera ici.
              </div>
            ) : (
              <div className="mx-auto max-w-3xl">
                <p className="mb-3 text-sm text-base-content/60">
                  La réponse rédigée de l'agent s'affiche ici, en pleine largeur. Quelques exemples pour démarrer :
                </p>
                <div className="flex flex-col gap-2">
                  {EXAMPLES.map((ex) => (
                    <button
                      key={ex}
                      type="button"
                      className="op-card-hover rounded-lg border border-base-content/10 px-3 py-2 text-left text-sm hover:border-primary/40"
                      onClick={() => send(ex)}
                      disabled={loading}
                    >
                      {ex}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </>
  );
}
