import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Check, ChevronDown, ChevronRight, Copy, Download, GitCompare, MessageSquare, Search, X } from "lucide-react";
import { fetchOpenQuestions, fetchSurvey, fetchVerbatims } from "../api";
import type { SearchResult, SurveyParent, Verbatim, VerbatimsResponse } from "../types";
import { isVerbatim } from "../lib/verbatims";
import { exportVerbatims } from "../lib/exportVerbatims";
import type { ExportFormat } from "../lib/exportCart";
import AnnotateCard from "../components/AnnotateCard";
import AnnotationCrosstab from "../components/AnnotationCrosstab";
import VerbatimRow, { labelBadgeClass } from "../components/VerbatimRow";
import { annotationKey, useAnnotations } from "../context/AnnotationContext";
import { effectiveLabels, type Annotation } from "../logic/annotate";

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
  return (
    <Workspace
      key={`${q.survey_id}/${q.variable}`}
      q={q}
      questions={questions}
      surveyName={survey?.survey_name ?? surveyId}
    />
  );
}

/* --------------------------------------------------------------------------
 * L'espace lui-même — une question, ses réponses
 * ------------------------------------------------------------------------ */

/** Fenêtre dans laquelle on pioche l'échantillon aléatoire — le max de `/verbatims`. */
const UNIVERSE_SAMPLE_WINDOW = 200;

function Workspace({
  q,
  questions,
  surveyName,
}: {
  q: SearchResult;
  /** Toutes les questions du sondage — vivier des dimensions de croisement (jsu.7). */
  questions: SearchResult[];
  surveyName: string;
}) {
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

  /**
   * Nombre de réponses de la QUESTION — figé au premier chargement (toujours en
   * parcours, la requête part vide). En mode recherche, `data.total` devient le
   * nombre de réponses ayant matché BM25 : le batch d'annotation ne doit jamais
   * s'appuyer dessus, sinon il annonce 40 réponses et en annote 1 600.
   */
  const [questionTotal, setQuestionTotal] = useState(0);

  // Les annotations vivent AU-DESSUS du `key` de la page (contexte racine) :
  // changer de question ou passer par la recherche ne détruit plus un run.
  const annotations = useAnnotations();
  const aKey = annotationKey(q.survey_id, q.variable);
  const session = annotations.get(aKey);

  useEffect(() => {
    let cancelled = false;
    setState("loading");
    setData(null);
    setMore([]);
    fetchVerbatims({ surveyId: q.survey_id, variable: q.variable, query })
      .then((res) => {
        if (cancelled) return;
        setData(res);
        if (!query.trim()) setQuestionTotal(res.total);
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

  /** Y a-t-il de quoi croiser ? Même condition que `AnnotationCrosstab`. */
  const hasCrosstab = session.batch != null && session.batch.annotations.size > 0;

  /**
   * Repli de la liste des réponses.
   *
   * La page raconte trois phases — explorer, annoter, croiser — mais les
   * affiche toutes en même temps. Une fois le batch passé, la liste (des
   * centaines de réponses, désormais dans le flux de la page) n'est plus
   * l'objet du travail : elle n'est qu'un mur entre l'annotation et le
   * croisement, qui vit en dessous.
   *
   * On la replie donc au moment où un batch apparaît. Le repli est réversible
   * d'un clic — relire des verbatims après coup est légitime — et une nouvelle
   * recherche la rouvre d'office : chercher, c'est demander à voir la liste.
   */
  const [listOpen, setListOpen] = useState(true);
  useEffect(() => {
    if (hasCrosstab) setListOpen(false);
  }, [hasCrosstab]);

  /**
   * Verdicts affichables sur une réponse. Quand l'essai et le batch ont tous
   * deux annoté la même réponse, c'est le run le plus RÉCENT qui gagne : on
   * relance un essai précisément pour voir l'effet d'une consigne modifiée, et
   * lui opposer le batch précédent revient à masquer ce qu'on vient de demander.
   */
  const shownAnnotations = useMemo(() => {
    const slices = [session.batch, session.test]
      .filter((s): s is NonNullable<typeof s> => s != null)
      .sort((a, b) => a.ranAt - b.ranAt);
    const map = new Map<string, Annotation>();
    for (const s of slices) for (const [id, a] of s.annotations) map.set(id, a);
    return map;
  }, [session.test, session.batch]);

  const labels = useMemo(
    () => effectiveLabels(session.optionsText.split("\n").map((l) => l.trim()).filter(Boolean)),
    [session.optionsText],
  );

  /**
   * « Partir de cette réponse » — le pont entre exploration et formalisation :
   * une citation qui interpelle devient le point de départ d'une propriété à
   * annoter, sans repartir d'une page blanche.
   */
  const seedFromVerbatim = (v: Verbatim) => {
    annotations.update(aKey, (s) => ({
      ...s,
      property: `Est-ce que la réponse exprime la même idée que celle-ci : « ${v.text.trim()} » ?`,
    }));
    document.getElementById("op-annotate-card")?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  };

  /**
   * Tire N réponses au hasard pour régler la consigne.
   *
   * L'échantillon est pris dans TOUTE la question, pas dans les lignes déjà
   * chargées : les premières réponses de l'index sont un tranche arbitraire du
   * fichier, et y régler un prompt revient à le régler sur un coin du corpus.
   *
   * Au-delà d'une page, on tire une fenêtre au hasard puis on pioche dedans —
   * un vrai tirage uniforme demanderait N appels, pour une variété qu'on
   * n'obtiendrait pas mieux. La sélection est REMPLACÉE : on tire pour repartir
   * d'un échantillon frais, pas pour empiler.
   */
  const [sampling, setSampling] = useState(false);
  const sampleRandom = (n = 10) => {
    if (questionTotal === 0) return;
    setSampling(true);
    const windowSize = Math.min(UNIVERSE_SAMPLE_WINDOW, questionTotal);
    const skip = Math.floor(Math.random() * (questionTotal - windowSize + 1));
    fetchVerbatims({ surveyId: q.survey_id, variable: q.variable, top: windowSize, skip })
      .then((res) => {
        const pool = [...res.results];
        const picked: Verbatim[] = [];
        while (picked.length < Math.min(n, pool.length)) {
          picked.push(...pool.splice(Math.floor(Math.random() * pool.length), 1));
        }
        setSelected(new Map(picked.map((v) => [v.id, v])));
      })
      .catch(() => {
        /* échec du tirage : la sélection en cours reste intacte */
      })
      .finally(() => setSampling(false));
  };

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
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {/* Le croisement est en bas d'une page qui fait plusieurs écrans :
                sans ce lien, rien ne dit qu'il existe une fois l'annotation
                passée. Il n'apparaît que quand il y a de quoi croiser — même
                condition que le composant lui-même. */}
            {hasCrosstab && (
              <button
                type="button"
                className="btn btn-outline btn-sm gap-1.5"
                onClick={() =>
                  document.getElementById("op-crosstab")?.scrollIntoView({ behavior: "smooth", block: "start" })
                }
              >
                <GitCompare size={15} strokeWidth={1.75} /> Croisement
              </button>
            )}
            <OpenQuestionPicker current={q} />
          </div>
        </div>
      </header>

      <div className="grid-verbatims">
        {/* Colonne de gauche : chercher DANS les réponses, puis les lire. La
            recherche vit au-dessus de la liste qu'elle filtre, pas dans le rail
            d'outils — c'est le même objet. */}
        <div className="min-w-0 space-y-4">
          <QuoteSearchCard
            query={query}
            onSubmit={(v) => {
              setQuery(v);
              setListOpen(true);
            }}
            busy={state === "loading"}
          />
          <VerbatimList
            open={listOpen}
            onToggleOpen={() => setListOpen((o) => !o)}
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
            onSeed={seedFromVerbatim}
          />

          {/* Le croisement vit DANS la colonne de gauche, pas sous la grille.
              Sous la grille, il commençait après la plus haute des deux colonnes
              — c'est-à-dire après le rail, volontairement long — ce qui creusait
              un vide sous la liste repliée et l'éloignait de la carte
              d'annotation qui vient de le produire. Ici il occupe exactement la
              place que le repli libère, à hauteur d'yeux de cette carte.
              Il s'efface tout seul tant qu'il n'y a rien à croiser. */}
          <AnnotationCrosstab q={q} questions={questions} session={session} />
        </div>

        {/* Rail d'outils : annoter, puis emporter. Bloc de flux normal — il
            défile avec la page, il n'a pas d'ascenseur à lui. */}
        <div className="min-w-0 space-y-4">
          <AnnotateCard
            q={q}
            session={session}
            update={(updater) => annotations.update(aKey, updater)}
            reset={() => annotations.reset(aKey)}
            selection={selectedRows}
            questionTotal={questionTotal}
            onSampleRandom={sampleRandom}
            sampling={sampling}
          />
          <SelectionCard
            q={q}
            selected={selectedRows}
            annotations={shownAnnotations}
            labels={labels}
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

function VerbatimList({
  open,
  onToggleOpen,
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
  onSeed,
}: {
  /** Liste dépliée ? Repliée automatiquement une fois un batch annoté. */
  open: boolean;
  onToggleOpen: () => void;
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
  onSeed: (v: Verbatim) => void;
}) {
  return (
    <div className="op-card">
      {/* L'en-tête reste toujours visible et sert de poignée de repli : replié,
          il dit ce qu'il cache et comment le rouvrir. */}
      <div className={`flex flex-wrap items-baseline justify-between gap-2 ${open ? "mb-3" : ""}`}>
        <button
          type="button"
          className="flex items-center gap-1.5 font-semibold hover:text-primary"
          onClick={onToggleOpen}
          aria-expanded={open}
        >
          {open ? <ChevronDown size={16} strokeWidth={2} /> : <ChevronRight size={16} strokeWidth={2} />}
          {searching ? "Citations trouvées" : "Réponses"}
        </button>
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

      {!open && (
        <p className="mt-1 text-xs text-base-content/45">
          Liste repliée pour laisser la place au croisement — clique le titre pour la rouvrir.
        </p>
      )}

      {open && state === "loading" && <div className="py-12 text-center"><span className="loading loading-spinner" /></div>}
      {open && state === "error" && <p className="text-sm text-error">Échec du chargement des réponses.</p>}

      {open && state === "ok" && rows.length === 0 && (
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

      {open && state === "ok" && rows.length > 0 && (
        <>
          {/* La liste s'étire dans la page : elle ne scrolle plus pour
              elle-même (voir la note « un seul ascenseur » dans App.css). Sa
              longueur reste commandée par « Charger plus de réponses ». */}
          <ul className="space-y-2">
            {rows.map((v) => (
              <VerbatimRow
                key={v.id}
                v={v}
                selected={selected.has(v.id)}
                onToggle={() => onToggle(v)}
                onSeed={onSeed}
              />
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
 *
 * Disposée en BARRE horizontale au-dessus de la liste : elle vit dans la
 * colonne large, au contact de ce qu'elle filtre. En rail étroit, elle
 * empilait champ, bouton et retour sur trois lignes tout en éloignant la
 * recherche de son résultat.
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
      <div className="flex flex-wrap items-center gap-2">
        <Search size={16} strokeWidth={1.75} className="shrink-0 text-base-content/45" />
        <input
          type="search"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Chercher des citations — ex. panneaux solaires"
          className="input input-sm input-bordered min-w-48 flex-1 text-sm"
        />
        <button type="submit" className="btn btn-primary btn-sm" disabled={busy}>
          {busy ? <span className="loading loading-spinner loading-xs" /> : "Chercher"}
        </button>
        {query && (
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => {
              setDraft("");
              onSubmit("");
            }}
          >
            Toutes les réponses
          </button>
        )}
      </div>
      <p className="mt-1.5 text-xs text-base-content/45">
        Recherche par mots dans les réponses, reclassées par pertinence sémantique.
      </p>
    </form>
  );
}

/**
 * Ce qu'on emporte, et ce que le modèle en a dit.
 *
 * Double rôle assumé : c'est le panier de citations (copie/téléchargement) ET
 * la vue de contrôle de l'essai d'annotation. Les deux regardent le même objet
 * — les réponses cochées — et l'essai porte justement sur cette sélection. Les
 * séparer aurait obligé à chercher ailleurs le verdict de ce qu'on a sous les
 * yeux.
 */
function SelectionCard({
  q,
  selected,
  annotations,
  labels,
  onRemove,
  onClear,
}: {
  q: SearchResult;
  selected: Verbatim[];
  /** Verdicts du run le plus récent, s'il y en a. */
  annotations: Map<string, Annotation>;
  labels: string[];
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
          citations anonymes n'est pas vérifiable avant téléchargement. Et quand
          un essai est passé, l'étiquette et sa justification se lisent JUSTE
          SOUS le texte qui les a produites — c'est là qu'on juge la consigne. */}
      <ul className="mb-2 space-y-1.5">
        {selected.map((v) => {
          const a = annotations.get(v.id);
          return (
            <li key={v.id} className="flex items-start gap-1.5 rounded-lg bg-base-200/60 p-1.5">
              <div className="min-w-0 flex-1">
                <span className="block text-xs leading-snug">
                  {v.text.length > 220 ? v.text.slice(0, 220) + "…" : v.text}
                </span>
                {a && (
                  <div className="mt-1 flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
                    <span className={`badge badge-xs ${labelBadgeClass(a.label, labels)}`}>{a.label}</span>
                    {a.reason && (
                      <span className="text-[11px] italic leading-snug text-base-content/45">{a.reason}</span>
                    )}
                  </div>
                )}
              </div>
              <button
                type="button"
                className="btn btn-ghost btn-xs shrink-0 px-1"
                onClick={() => onRemove(v.id)}
                aria-label="Retirer de la sélection"
              >
                <X size={13} strokeWidth={1.75} />
              </button>
            </li>
          );
        })}
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
