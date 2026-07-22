import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Check, ChevronDown, Copy, Download, MessageSquare, Search, X } from "lucide-react";
import { fetchOpenQuestions, fetchSurvey, fetchVerbatims } from "../api";
import type { SearchResult, SurveyParent, Verbatim, VerbatimsResponse } from "../types";
import { isVerbatim } from "../lib/verbatims";
import { exportVerbatims } from "../lib/exportVerbatims";
import type { ExportFormat } from "../lib/exportCart";

/**
 * Espace de travail des questions ouvertes — UNE question à la fois.
 *
 * Ce n'est pas une page de browse du corpus : on y entre depuis la recherche ou
 * depuis le dashboard d'une question (bead jsu.2). Le layout est celui défini
 * par jsu.4 et partagé avec jsu.6/jsu.7 : la liste des réponses à gauche
 * (large, scrollable), le rail d'outils à droite (étroit, sticky), le
 * croisement en bas plus tard. Une seule liste sert les deux features.
 *
 * Le sélecteur de l'en-tête permet de sauter d'une question ouverte à l'autre
 * sans repasser par la recherche — la contrainte « une à la fois » porte sur
 * l'affichage, pas sur la navigation.
 */
export default function VerbatimsPage() {
  const { surveyId, variable } = useParams<{ surveyId: string; variable: string }>();

  const [survey, setSurvey] = useState<SurveyParent | null>(null);
  const [questions, setQuestions] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!surveyId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchSurvey(surveyId)
      .then((res) => {
        if (cancelled) return;
        setSurvey(res.survey);
        setQuestions(res.questions);
      })
      .catch((err: unknown) => !cancelled && setError(err instanceof Error ? err.message : "Erreur inconnue"))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [surveyId]);

  const q = useMemo(() => questions.find((x) => x.variable === variable), [questions, variable]);

  if (!surveyId || !variable) return <NoQuestion />;
  if (loading) return <div className="py-20 text-center"><span className="loading loading-spinner loading-lg" /></div>;
  if (error) return <div className="alert alert-error"><span>{error}</span></div>;
  if (!q) return <p>Question introuvable.</p>;

  // Une question fermée n'a rien à faire ici : on renvoie vers son dashboard.
  if (!isVerbatim(q)) {
    return (
      <div className="op-card max-w-2xl">
        <h2 className="mb-2 text-lg font-semibold">Pas une question ouverte</h2>
        <p className="mb-3 text-sm text-base-content/60">
          <code className="font-mono">{q.variable}</code> n'a pas de réponses en texte libre.
        </p>
        <Link to={`/sondage/${q.survey_id}/q/${encodeURIComponent(q.variable)}`} className="btn btn-primary btn-sm">
          Voir le dashboard de la question
        </Link>
      </div>
    );
  }

  // `key` : changer de question remet l'espace à zéro (recherche, sélection,
  // pagination) plutôt que de traîner l'état de la question précédente.
  return <Workspace key={`${q.survey_id}/${q.variable}`} q={q} surveyName={survey?.survey_name ?? surveyId} />;
}

/* --------------------------------------------------------------------------
 * L'espace lui-même — une question, ses réponses
 * ------------------------------------------------------------------------ */

function Workspace({ q, surveyName }: { q: SearchResult; surveyName: string }) {
  // Requête SOUMISE (pas la frappe en cours) : c'est elle qui pilote le fetch.
  const [query, setQuery] = useState("");
  const [data, setData] = useState<VerbatimsResponse | null>(null);
  const [more, setMore] = useState<Verbatim[]>([]); // pages de parcours suivantes
  const [state, setState] = useState<"loading" | "ok" | "error">("loading");
  const [loadingMore, setLoadingMore] = useState(false);
  /**
   * Sélection = la CITATION entière, pas seulement son id.
   *
   * Une sélection faite en parcours doit survivre à une recherche (et
   * inversement) : les listes affichées changent, la sélection non. Garder les
   * ids seuls obligerait à retrouver le texte dans `rows`, et une citation
   * sortie de la vue courante disparaîtrait silencieusement de l'export.
   * C'est aussi la sélection qui alimentera la boucle de test de jsu.6.
   */
  const [selected, setSelected] = useState<Map<string, Verbatim>>(new Map());

  useEffect(() => {
    let cancelled = false;
    setState("loading");
    setData(null);
    setMore([]);
    fetchVerbatims({ surveyId: q.survey_id, variable: q.variable, query })
      .then((res) => {
        if (cancelled) return;
        setData(res);
        setState("ok");
      })
      .catch(() => !cancelled && setState("error"));
    return () => {
      cancelled = true;
    };
  }, [q.survey_id, q.variable, query]);

  const rows = useMemo(() => [...(data?.results ?? []), ...more], [data, more]);
  const searching = query.trim().length > 0;
  // En parcours, `total` est le nombre de réponses de la question ; en
  // recherche, c'est le nombre d'ayant matché BM25 — deux choses différentes,
  // jamais présentées avec les mêmes mots.
  const total = data?.total ?? 0;

  const selectedRows = useMemo(() => [...selected.values()], [selected]);

  const loadMore = () => {
    setLoadingMore(true);
    fetchVerbatims({ surveyId: q.survey_id, variable: q.variable, skip: rows.length })
      .then((res) => setMore((m) => [...m, ...res.results]))
      .catch(() => {
        /* le bouton reste disponible : un échec de page n'invalide pas la liste */
      })
      .finally(() => setLoadingMore(false));
  };

  return (
    <div className="space-y-4">
      <div className="crumbs">
        <Link to="/recherche">Recherche</Link>
        <span className="sep">/</span>
        <Link to={`/sondage/${q.survey_id}`}>{surveyName}</Link>
        <span className="sep">/</span>
        <span className="text-base-content/60">{q.variable}</span>
      </div>

      <header className="op-card">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl">
            <div className="mb-2 flex items-center gap-2">
              <span className="op-badge op-badge-plain font-mono">{q.variable}</span>
              <span className="badge badge-secondary badge-sm gap-1">
                <MessageSquare size={12} strokeWidth={2} /> question ouverte
              </span>
              {!searching && state === "ok" && (
                <span className="text-xs text-base-content/50">{total.toLocaleString("fr-CA")} réponses</span>
              )}
            </div>
            <h1 className="text-xl font-semibold leading-snug">{q.display_label || q.question_text}</h1>
            {q.display_label && q.display_label !== q.question_text && (
              <p className="mt-1 text-sm leading-snug text-base-content/55">{q.question_text}</p>
            )}
          </div>
          <OpenQuestionPicker current={q} />
        </div>
      </header>

      <div className="grid-dash">
        <VerbatimList
          rows={rows}
          state={state}
          searching={searching}
          query={query}
          total={total}
          poolSize={data?.pool_size}
          selected={selected}
          onToggle={(v) =>
            setSelected((s) => {
              const next = new Map(s);
              if (next.has(v.id)) next.delete(v.id);
              else next.set(v.id, v);
              return next;
            })
          }
          canLoadMore={!searching && state === "ok" && rows.length < total}
          loadingMore={loadingMore}
          onLoadMore={loadMore}
        />

        {/* Rail d'outils : recherche (jsu.4) au-dessus, annotation (jsu.6) plus tard. */}
        <div className="op-tool-rail space-y-4">
          <QuoteSearchCard query={query} onSubmit={setQuery} busy={state === "loading"} />
          <SelectionCard
            q={q}
            selected={selectedRows}
            onRemove={(id) =>
              setSelected((s) => {
                const next = new Map(s);
                next.delete(id);
                return next;
              })
            }
            onClear={() => setSelected(new Map())}
          />
        </div>
      </div>
    </div>
  );
}

/* --------------------------------------------------------------------------
 * Colonne gauche — la liste des réponses
 * ------------------------------------------------------------------------ */

/**
 * Les 3 repères sociodémo affichés sous chaque réponse : genre, âge, région.
 *
 * Une citation sans son locuteur n'est pas utilisable en rapport — mais le doc
 * en porte 7, et les afficher tous noierait le texte de la réponse. Ce trio est
 * le plus court et le plus lu ; le reste part quand même dans l'export.
 * `income`, `education` et `occupation` ont en prime des libellés à rallonge
 * (« College or CEGEP certificate or diploma ») qui casseraient la ligne.
 */
function shortSociodemo(v: Verbatim): string[] {
  const s = v.sociodemo;
  if (!s) return [];
  return [s.gender, s.age, s.region].filter((x): x is string => Boolean(x && x.trim()));
}

function VerbatimList({
  rows,
  state,
  searching,
  query,
  total,
  poolSize,
  selected,
  onToggle,
  canLoadMore,
  loadingMore,
  onLoadMore,
}: {
  rows: Verbatim[];
  state: "loading" | "ok" | "error";
  searching: boolean;
  query: string;
  total: number;
  poolSize?: number;
  selected: Map<string, Verbatim>;
  onToggle: (v: Verbatim) => void;
  canLoadMore: boolean;
  loadingMore: boolean;
  onLoadMore: () => void;
}) {
  const [copied, setCopied] = useState<string | null>(null);

  const copy = async (v: Verbatim) => {
    try {
      await navigator.clipboard.writeText(v.text);
      setCopied(v.id);
      setTimeout(() => setCopied((c) => (c === v.id ? null : c)), 1500);
    } catch {
      /* presse-papiers refusé (contexte non sécurisé) : on ne casse rien */
    }
  };

  return (
    <div className="op-card">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-semibold">{searching ? "Citations trouvées" : "Réponses"}</h3>
        {state === "ok" && (
          <span className="text-xs text-base-content/45">
            {searching
              ? `${rows.length} classées par pertinence · ${total.toLocaleString("fr-CA")} réponses contenaient les mots cherchés${
                  poolSize != null && poolSize < total ? ` (${poolSize} reclassées)` : ""
                }`
              : `${rows.length.toLocaleString("fr-CA")} sur ${total.toLocaleString("fr-CA")}`}
          </span>
        )}
      </div>

      {state === "loading" && <div className="py-12 text-center"><span className="loading loading-spinner" /></div>}
      {state === "error" && <p className="text-sm text-error">Échec du chargement des réponses.</p>}

      {state === "ok" && rows.length === 0 && (
        <p className="text-sm text-base-content/55">
          {searching ? (
            <>
              Aucune réponse ne contient les mots de « {query} ». La recherche est lexicale : essaie
              les mots que les répondants auraient employés eux-mêmes.
            </>
          ) : (
            "Aucune réponse pour cette question."
          )}
        </p>
      )}

      {state === "ok" && rows.length > 0 && (
        <>
          <ul className="space-y-2">
            {rows.map((v) => (
              <li
                key={v.id}
                className={`flex gap-2 rounded-lg border p-2.5 ${
                  selected.has(v.id) ? "border-primary/40 bg-primary/5" : "border-base-300"
                }`}
              >
                <input
                  type="checkbox"
                  className="checkbox checkbox-sm mt-0.5 shrink-0"
                  checked={selected.has(v.id)}
                  onChange={() => onToggle(v)}
                  aria-label="Sélectionner cette citation"
                />
                <div className="min-w-0 flex-1">
                  <p className="whitespace-pre-wrap text-sm leading-snug">{v.text}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-base-content/40">
                    <span className="font-mono">répondant {v.respondent_id}</span>
                    {shortSociodemo(v).map((s) => (
                      <span key={s} className="badge badge-ghost badge-xs whitespace-nowrap">
                        {s}
                      </span>
                    ))}
                    {v.score_pertinence != null && (
                      <span className="tabular-nums" title="Score de pertinence Cohere (0-100, absolu)">
                        · {v.score_pertinence}
                      </span>
                    )}
                    <button
                      type="button"
                      className="ml-auto flex items-center gap-1 hover:text-primary"
                      onClick={() => copy(v)}
                    >
                      {copied === v.id ? <Check size={13} /> : <Copy size={13} />}
                      {copied === v.id ? "copié" : "copier"}
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>

          {canLoadMore && (
            <button className="btn btn-ghost btn-sm mt-3 w-full" onClick={onLoadMore} disabled={loadingMore}>
              {loadingMore ? <span className="loading loading-spinner loading-xs" /> : "Charger plus de réponses"}
            </button>
          )}
        </>
      )}
    </div>
  );
}

/* --------------------------------------------------------------------------
 * Rail droit — recherche de citations et sélection
 * ------------------------------------------------------------------------ */

/**
 * Recherche lexicale dans les réponses (BM25) puis rerank Cohere. Pas de
 * synthèse LLM : on renvoie les citations telles quelles.
 */
function QuoteSearchCard({
  query,
  onSubmit,
  busy,
}: {
  query: string;
  onSubmit: (q: string) => void;
  busy: boolean;
}) {
  const [draft, setDraft] = useState(query);

  return (
    <form
      className="op-card"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(draft.trim());
      }}
    >
      <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
        <Search size={15} strokeWidth={1.75} /> Chercher des citations
      </h3>
      <input
        type="search"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder="ex. panneaux solaires"
        className="input input-sm input-bordered mb-2 w-full text-sm"
      />
      <button type="submit" className="btn btn-primary btn-sm w-full" disabled={busy}>
        {busy ? <span className="loading loading-spinner loading-xs" /> : "Chercher"}
      </button>
      {query && (
        <button
          type="button"
          className="btn btn-ghost btn-xs mt-1 w-full"
          onClick={() => {
            setDraft("");
            onSubmit("");
          }}
        >
          Revenir à toutes les réponses
        </button>
      )}
      <p className="mt-2 text-xs text-base-content/45">
        Recherche par mots dans les réponses, reclassées par pertinence sémantique.
      </p>
    </form>
  );
}

/** Ce qu'on emporte : copie en bloc ou téléchargement des citations cochées. */
function SelectionCard({
  q,
  selected,
  onRemove,
  onClear,
}: {
  q: SearchResult;
  selected: Verbatim[];
  onRemove: (id: string) => void;
  onClear: () => void;
}) {
  const [format, setFormat] = useState<ExportFormat>("csv-large");
  const [copied, setCopied] = useState(false);

  if (selected.length === 0) {
    return (
      <div className="op-card">
        <h3 className="mb-1 text-sm font-semibold">Sélection</h3>
        <p className="text-xs text-base-content/45">
          Coche des réponses pour les copier ou les télécharger comme exemples.
        </p>
      </div>
    );
  }

  const copyAll = async () => {
    try {
      await navigator.clipboard.writeText(selected.map((v) => v.text).join("\n\n"));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* presse-papiers refusé : on ne casse rien */
    }
  };

  return (
    <div className="op-card">
      <h3 className="mb-2 text-sm font-semibold">
        Sélection · {selected.length} citation{selected.length > 1 ? "s" : ""}
      </h3>

      {/* Voir CE qu'on emporte, pas seulement combien : une sélection de 6
          citations anonymes n'est pas vérifiable avant téléchargement. */}
      <ul className="mb-2 max-h-64 space-y-1 overflow-y-auto pr-1">
        {selected.map((v) => (
          <li key={v.id} className="flex items-start gap-1.5 rounded-lg bg-base-200/60 p-1.5">
            <span className="min-w-0 flex-1 text-xs leading-snug">
              {v.text.length > 140 ? v.text.slice(0, 140) + "…" : v.text}
            </span>
            <button
              type="button"
              className="btn btn-ghost btn-xs shrink-0 px-1"
              onClick={() => onRemove(v.id)}
              aria-label="Retirer de la sélection"
            >
              <X size={13} strokeWidth={1.75} />
            </button>
          </li>
        ))}
      </ul>

      <button className="btn btn-outline btn-sm mb-2 w-full gap-1.5" onClick={copyAll}>
        {copied ? <Check size={15} /> : <Copy size={15} />} {copied ? "Copié" : "Copier"}
      </button>
      <select
        className="select select-bordered select-sm mb-2 w-full"
        value={format}
        onChange={(e) => setFormat(e.target.value as ExportFormat)}
      >
        <option value="csv-large">Format : CSV</option>
        <option value="json">Format : JSON</option>
      </select>
      <button className="btn btn-primary btn-sm w-full gap-1.5" onClick={() => exportVerbatims(selected, q, format)}>
        <Download size={15} strokeWidth={1.75} /> Télécharger
      </button>
      <button className="btn btn-ghost btn-xs mt-1 w-full" onClick={onClear}>
        Vider la sélection
      </button>
    </div>
  );
}

/* --------------------------------------------------------------------------
 * Sélecteur de question ouverte — corpus entier, groupé par sondage
 * ------------------------------------------------------------------------ */

/**
 * Dropdown de choix d'une question ouverte. Le corpus n'en compte qu'une
 * centaine : on charge tout d'un coup et on filtre en mémoire, pas besoin de
 * pagination ni de recherche serveur.
 *
 * `current` est optionnel : le même sélecteur sert à SAUTER d'une question à
 * l'autre depuis l'en-tête, et à EN CHOISIR une depuis l'état vide — la
 * recherche n'est pas le seul chemin d'entrée dans l'espace.
 *
 * Filtre en regex (même convention que le filtre de `SurveyQuestionsNav`) :
 * repli sur une recherche de sous-chaîne tant que la regex est invalide, pour
 * ne pas vider la liste pendant la frappe de `(a|`.
 */
function OpenQuestionPicker({
  current,
  label = "Changer de question",
  btnClass = "btn-outline",
  align = "right",
}: {
  current?: SearchResult;
  label?: string;
  btnClass?: string;
  align?: "left" | "right";
}) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [all, setAll] = useState<SearchResult[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [filter, setFilter] = useState("");
  const boxRef = useRef<HTMLDivElement>(null);

  // Chargé à la première ouverture seulement : inutile sur une page qu'on
  // consulte sans jamais changer de question.
  useEffect(() => {
    if (!open || all || failed) return;
    let cancelled = false;
    fetchOpenQuestions()
      .then((res) => !cancelled && setAll(res))
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
    };
  }, [open, all, failed]);

  // Fermeture au clic extérieur / Échap.
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const { groups, total, invalidRegex } = useMemo(() => {
    const list = all ?? [];
    const raw = filter.trim();
    let re: RegExp | null = null;
    if (raw) {
      try {
        re = new RegExp(raw, "i");
      } catch {
        re = null;
      }
    }
    const test = !raw
      ? () => true
      : re
        ? (s: string) => re!.test(s)
        : (s: string) => s.toLowerCase().includes(raw.toLowerCase());
    const shown = list.filter(
      (x) =>
        test(x.variable) ||
        test(x.display_label || "") ||
        test(x.question_text || "") ||
        test(x.survey_name || ""),
    );

    // Groupé par sondage, le sondage courant en tête puis par année décroissante.
    const bySurvey = new Map<string, SearchResult[]>();
    for (const x of shown) {
      const arr = bySurvey.get(x.survey_id);
      if (arr) arr.push(x);
      else bySurvey.set(x.survey_id, [x]);
    }
    const groups = [...bySurvey.entries()]
      .map(([survey_id, items]) => ({
        survey_id,
        survey_name: items[0].survey_name || survey_id,
        survey_year: items[0].survey_year,
        items: [...items].sort((a, b) => a.variable.localeCompare(b.variable)),
      }))
      .sort((a, b) => {
        if (current) {
          if (a.survey_id === current.survey_id) return -1;
          if (b.survey_id === current.survey_id) return 1;
        }
        return (b.survey_year ?? 0) - (a.survey_year ?? 0) || a.survey_name.localeCompare(b.survey_name);
      });

    return { groups, total: shown.length, invalidRegex: Boolean(raw) && re === null };
  }, [all, filter, current]);

  return (
    <div className="relative shrink-0" ref={boxRef}>
      <button type="button" className={`btn btn-sm gap-1.5 ${btnClass}`} onClick={() => setOpen((o) => !o)}>
        {label}
        <ChevronDown size={15} strokeWidth={1.75} />
      </button>

      {open && (
        <div
          className={`absolute z-30 mt-1 w-[26rem] max-w-[85vw] rounded-xl border border-base-300 bg-base-100 p-2 shadow-xl ${
            align === "right" ? "right-0" : "left-0"
          }`}
        >
          <input
            type="search"
            autoFocus
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filtrer (regex)…"
            className={`input input-sm input-bordered mb-2 w-full text-sm ${invalidRegex ? "input-error" : ""}`}
          />

          {failed && <p className="px-2 py-3 text-sm text-error">Chargement des questions ouvertes échoué.</p>}
          {!failed && !all && (
            <div className="py-6 text-center"><span className="loading loading-spinner loading-sm" /></div>
          )}
          {all && total === 0 && (
            <p className="px-2 py-3 text-sm text-base-content/50">Aucune question ne correspond.</p>
          )}

          {all && total > 0 && (
            <div className="max-h-[26rem] overflow-y-auto pr-1">
              {groups.map((g) => (
                <div key={g.survey_id} className="mb-2 last:mb-0">
                  <div className="sticky top-0 bg-base-100 px-2 py-1 text-xs font-semibold text-base-content/45">
                    {g.survey_name}
                    {g.survey_year != null && <span className="font-normal"> · {g.survey_year}</span>}
                    <span className="font-normal"> · {g.items.length}</span>
                  </div>
                  {g.items.map((x) => {
                    const active =
                      current != null && x.survey_id === current.survey_id && x.variable === current.variable;
                    const label = x.display_label || x.question_text;
                    return (
                      <button
                        key={`${x.survey_id}/${x.variable}`}
                        type="button"
                        className={`block w-full rounded-lg px-2 py-1.5 text-left text-sm leading-snug ${
                          active ? "bg-primary/10 font-medium text-primary" : "hover:bg-base-200 hover:text-primary"
                        }`}
                        onClick={() => {
                          setOpen(false);
                          setFilter("");
                          navigate(`/questions-ouvertes/${x.survey_id}/${encodeURIComponent(x.variable)}`);
                        }}
                      >
                        <span className="mr-1.5 font-mono text-xs text-base-content/40">{x.variable}</span>
                        {label.slice(0, 80)}
                        {label.length > 80 ? "…" : ""}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Sans question choisie, l'espace ne montre pas de contenu — mais il doit
 * rester utilisable : on entre ici directement par la nav, sans être passé par
 * la recherche. Le sélecteur est donc le geste principal, la recherche le
 * chemin secondaire (elle, elle classe par pertinence).
 */
function NoQuestion() {
  return (
    <>
      <p className="op-kicker mb-3">Analyse qualitative</p>
      <h2 className="text-xl font-semibold tracking-tight">Réponses libres</h2>
      <p className="mt-1 mb-5 max-w-2xl text-sm text-base-content/60">
        Cet espace travaille une question ouverte à la fois. Choisis-en une dans la liste, ou
        trouve-la par la recherche — les questions à réponses libres y portent le badge{" "}
        <em>question ouverte</em>.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <OpenQuestionPicker label="Choisir une question ouverte" btnClass="btn-primary" align="left" />
        <Link to="/recherche" className="btn btn-ghost btn-sm">
          Aller à la recherche
        </Link>
      </div>
    </>
  );
}
