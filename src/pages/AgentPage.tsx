/**
 * Agent analytique conversationnel (bead aat.3) — mode SYNCHRONE.
 *
 * Câble le chat sur `/agent` (aat.1) : un état local du fil, un POST par tour,
 * réinjection du `messages` renvoyé par le serveur pour poursuivre la
 * conversation (le serveur ne connaît que ce qu'on lui repasse — il n'y a pas
 * de session côté back). Les questions de clarification de l'agent n'ont pas
 * de traitement spécial : ce sont des tours d'assistant normaux, la réponse de
 * l'utilisateur les poursuit comme n'importe quel message.
 *
 * HORS SCOPE ICI (délégué) :
 *  - streaming de la réponse (aat.4) — on affiche la réponse d'un bloc après
 *    le POST, avec un indicateur de chargement pendant l'attente ;
 *  - garde-fous structurés / parsing fin de la trace (raw_n, écart significatif
 *    vs bruit en badges) (aat.5) — la trace est affichée simplement : liste des
 *    outils appelés avec leurs arguments-clé (survey_id/variable), en prose.
 */

import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Send, AlertTriangle, Search, ListTree, BookOpenCheck, Table2, Wrench } from "lucide-react";
import { agentChatStream, AgentRateLimitError, type AgentMessage, type AgentToolTrace } from "../api";

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
 *  `remark-gfm` active les tableaux (inventaires de questions) + autolinks. */
function AssistantMarkdown({ content }: { content: string }) {
  return (
    <div className="space-y-2 text-sm leading-relaxed [&_strong]:font-semibold">
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
          h1: ({ children }) => <h3 className="mt-1 text-base font-semibold">{children}</h3>,
          h2: ({ children }) => <h4 className="mt-3 text-sm font-semibold">{children}</h4>,
          h3: ({ children }) => <h5 className="mt-2 text-sm font-semibold text-base-content/80">{children}</h5>,
          // Tableaux GFM : défilement horizontal si large, bordures discrètes.
          table: ({ children }) => (
            <div className="overflow-x-auto">
              <table className="my-1 w-full border-collapse text-xs">{children}</table>
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

export default function AgentPage() {
  const [thread, setThread] = useState<AgentMessage[]>([]);
  const [traceByIndex, setTraceByIndex] = useState<Record<number, AgentToolTrace[]>>({});
  // Outils du tour EN COURS, streamés au fil de l'eau (bead aat.4). Vidé une fois
  // le tour terminé : la trace définitive vit alors dans `traceByIndex`.
  const [liveTools, setLiveTools] = useState<LiveTool[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryAfterMs, setRetryAfterMs] = useState<number | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

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

  async function send(text: string) {
    const userTurn: AgentMessage = { role: "user", content: text };
    const requestMessages = [...thread, userTurn];
    // Affiche le message user tout de suite, avant la réponse du serveur.
    setThread(requestMessages);
    setInput("");
    setError(null);
    setLiveTools([]);
    setLoading(true);
    try {
      // Streaming (bead aat.4) : les pastilles d'outils apparaissent en direct via
      // `liveTools` ; la réponse rédigée arrive d'un bloc à la fin (Niveau A).
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
        }
      });
      setThread(result.messages);
      if (result.trace.length > 0) {
        setTraceByIndex((prev) => ({ ...prev, [result.messages.length - 1]: result.trace }));
      }
    } catch (err) {
      if (err instanceof AgentRateLimitError) {
        setRetryAfterMs(err.retryAfterMs);
        setError(`Quota du modèle atteint — réessaie dans ${Math.ceil(err.retryAfterMs / 1000)} s.`);
      } else {
        setError(err instanceof Error ? err.message : String(err));
      }
      // On garde le message user affiché (requestMessages) : rien n'est perdu,
      // l'utilisateur peut relancer le même tour une fois l'erreur passée.
    } finally {
      setLoading(false);
      setLiveTools([]);
    }
  }

  const canSend = input.trim().length > 0 && !loading && retryAfterMs == null;

  return (
    <>
      <p className="op-kicker mb-3">Agent analytique</p>
      <h2 className="text-xl font-semibold tracking-tight">Pose une question en langage naturel</h2>
      <p className="mt-1 mb-5 max-w-2xl text-sm text-base-content/60">
        L'agent cherche les questions pertinentes dans le corpus, croise les micro-données pondérées et rédige une
        réponse. Il pose des questions de clarification quand la demande est trop large — réponds-lui simplement dans
        le fil.
      </p>

      <div className="mb-5 flex max-w-3xl flex-col gap-3">
        {turns.length === 0 && (
          <div className="op-card">
            <p className="mb-2 text-sm text-base-content/60">Quelques exemples pour démarrer :</p>
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

        {turns.map((turn) =>
          turn.role === "user" ? (
            <div key={turn.index} className="chat-bubble chat-user whitespace-pre-wrap">
              {turn.content}
            </div>
          ) : (
            <div key={turn.index} className="chat-bubble chat-bot">
              <AssistantMarkdown content={turn.content} />
              {turn.trace && turn.trace.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5 border-t border-base-content/10 pt-2">
                  {turn.trace.map((t, i) => (
                    <ToolPill key={i} t={t} />
                  ))}
                </div>
              )}
            </div>
          ),
        )}

        {loading && (
          <div className="chat-bubble chat-bot flex flex-col gap-2">
            {liveTools.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {liveTools.map((t, i) => (
                  <ToolPill key={i} t={t} />
                ))}
              </div>
            )}
            <div className="flex items-center gap-2 text-base-content/60">
              <span className="loading loading-dots loading-sm" />
              {liveTools.some((t) => t.ok === null) ? "L'agent consulte les données…" : "L'agent rédige…"}
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {error && (
        <div className="alert alert-error mb-4 max-w-3xl text-sm">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="op-card max-w-3xl">
        <form
          className="flex items-center gap-2"
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
      </div>
    </>
  );
}
