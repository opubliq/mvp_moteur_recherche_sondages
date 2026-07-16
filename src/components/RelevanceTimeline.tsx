import { Fragment, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { SearchResult } from "../types";
import QuestionCard from "./QuestionCard";
import { scoreToColor, scoreToInkColor } from "../lib/scoreColor";
import { packSwarm, tokenDiameter, TOKEN_QUANTUM } from "../lib/beeswarm";
import { N_SCORE_BANDS, scoreBandIndex } from "../lib/scoreBins";

interface RelevanceTimelineProps {
  results: SearchResult[];
}

interface YearBucket {
  key: string;
  label: string;
  items: SearchResult[];
  /** Scores des questions de l'année (0-100), pour le nuage de points. */
  scores: number[];
}

const AXIS_TICKS = [100, 75, 50, 25, 0];

/** Diamètre du disque coloré, en px. */
const DOT = 7;
/** Épaisseur de la bordure autour du disque, en px. Doit rester synchro avec la
 * classe `ring-` du rendu. */
const RING = 1;
/** Blanc voulu entre deux disques voisins, en px. */
const DOT_GAP = 1;
/**
 * Distance minimale entre deux centres, en px — ce que `packSwarm` appelle son
 * `diameter`.
 *
 * LA BORDURE COMPTE DANS L'EMPREINTE DU POINT. Elle est peinte À L'EXTÉRIEUR du
 * disque (`ring-` = un box-shadow), donc l'empreinte d'un point vaut DOT + 2×RING,
 * pas DOT. Espacer les centres de DOT seulement laissait la bordure d'un point
 * recouvrir le disque coloré de son voisin — et comme les points se peignent
 * dans l'ordre du DOM, le dernier effaçait la couleur du précédent. Il faut
 * donc DOT/2 (le disque à protéger) + DOT/2 + RING (le rayon extérieur du
 * voisin), plus le blanc voulu.
 */
const SPACING = DOT + RING + DOT_GAP;

/** Taille du chiffre dans le jeton, en px. Doit rester synchro avec la classe
 * `text-[Npx]` du rendu — c'est elle qui dimensionne le jeton. */
const TOKEN_FONT = 9;
/** Diamètre du jeton qui remplace une rangée trop serrée, en px. DÉRIVÉ de ce
 * qu'il doit porter, pas choisi : voir `tokenDiameter`. */
const TOKEN = tokenDiameter(2, TOKEN_FONT);
/** Place qu'un jeton occupe sur l'axe vertical, bordure et blanc compris — ce
 * qui décide des rangées voisines qu'il avale. */
const TOKEN_SPACING = TOKEN + RING + DOT_GAP;

/**
 * Hauteur de la zone de tracé, en px. DÉRIVÉE, pas choisie : une bande de score
 * doit valoir au moins une empreinte de point, sinon deux bandes voisines se
 * chevauchent à l'écran et `packSwarm` les fusionne. À 20 bandes de SPACING,
 * l'écart entre deux centres de bande vaut exactement SPACING — le minimum qui
 * garde les bandes distinctes. Poser une hauteur ronde à la place (144px)
 * rendrait la grille plus serrée que les points.
 */
const PLOT_H = N_SCORE_BANDS * SPACING;

/**
 * Score → position verticale du CENTRE de sa bande, en px depuis le haut.
 * Échelle fixe 0-100, jamais cadrée sur les scores de la recherche : la bande la
 * plus haute (95-100) est toujours en haut, qu'elle soit peuplée ou non.
 *
 * Le CENTRE, pas le bord : une rangée représente toute sa bande, donc la poser
 * sur son bord haut surestimerait les questions qu'elle porte — un jeton « 11 »
 * ancré à 90 alors qu'il couvre 85-90 se lirait comme onze questions à 90. Le
 * score exact reste dans la couleur de chaque point et dans le tooltip.
 *
 * Calcul par index de bande, sans repasser par les points de score : voir
 * `scoreBandIndex` pour ce que l'arrondi cassait.
 *
 * Conséquence à connaître : un point ne touche jamais tout à fait la hairline de
 * son score (un score de 100 se pose à SPACING/2 sous la ligne 100, au centre de
 * la bande 95-100). C'est le propre d'un dot plot — la ligne repère l'axe, le
 * point repère sa bande — et ça garde le disque entier dans le cadre aux deux
 * extrémités.
 */
const toMain = (score: number) =>
  (N_SCORE_BANDS - 1 - scoreBandIndex(score)) * SPACING + SPACING / 2;

/** Réciproque de `toMain` : quel score une position verticale représente-t-elle.
 * Sert au jeton, qui prend sa couleur de LA BANDE qu'il occupe plutôt que d'une
 * des questions qu'il replie — aucune d'elles ne la représente mieux qu'une
 * autre, et une rangée fusionnée en couvre même plusieurs. */
const mainToScore = (main: number) => 100 - (main / PLOT_H) * 100;

function emptyBucket(key: string, label: string): YearBucket {
  return { key, label, items: [], scores: [] };
}

/**
 * Chronologie de la pertinence — bead 9gf.18.
 *
 * FORME : un BEESWARM (x = année, y = score de pertinence, un point par
 * question), et non plus un histogramme.
 *
 * POURQUOI CE CHANGEMENT. La version d'avant empilait des barres PAR PALIER
 * (exact/partiel/faible). Les paliers ayant été abandonnés (bead 9gf.12) au
 * profit d'un score continu, l'empilement a perdu son référent et la timeline
 * avait été dégradée à « une barre par année, hauteur = nombre de questions » —
 * ce qui ne disait plus rien de la QUALITÉ des résultats d'une année.
 *
 * PIÈGE ÉVITÉ : ne PAS re-découper le score 0-100 en tranches pour retrouver des
 * barres empilées. Ça réintroduirait les paliers par la porte d'en arrière —
 * exactement ce que l'éval golden a écarté (aucun score dérivé de Cohere ne
 * sépare proprement exact de partiel, 6/14 requêtes au mieux). Un point par
 * question ne binne rien du tout.
 *
 * Le nuage porte les deux informations d'un coup : la HAUTEUR des points = la
 * qualité, leur NOMBRE = le volume de l'année.
 *
 * Le décalage horizontal vient de `packSwarm` : les questions au score voisin
 * forment une rangée symétrique autour de l'axe de l'année, dont la largeur se
 * lit comme une densité. Ni jitter aléatoire, ni jitter dérivé de l'index —
 * voir `src/lib/beeswarm.ts` pour ce que ça corrige. Déterministe : aucun point
 * ne bouge tant que les scores ne bougent pas.
 *
 * AXE Y FIXE 0-100, jamais cadré sur les scores présents — deux recherches
 * doivent rester comparables à l'œil, comme dans ScoreDistribution (bead 9gf.16).
 * La couleur vient de `scoreToColor` (bead 9gf.15) : redondante avec la position
 * verticale, à dessein — c'est le canal de secours si la position est ambiguë, et
 * ça relie la chronologie aux cartes de résultat, qui parlent la même langue.
 */
export default function RelevanceTimeline({ results }: RelevanceTimelineProps) {
  const [selected, setSelected] = useState<string | null>(null);
  // Index de la colonne survolée/focus — pilote le tooltip applicatif.
  const [hovered, setHovered] = useState<number | null>(null);
  // Largeur mesurée de la zone de tracé : le packing borne chaque nuage à sa
  // colonne, et une colonne est une fraction d'une largeur en flex — donc
  // inconnue tant que le layout n'a pas eu lieu.
  const plotRef = useRef<HTMLDivElement>(null);
  const [plotW, setPlotW] = useState(0);

  // Les résultats changent (nouvelle recherche / filtre) → on referme le drill-down.
  useEffect(() => setSelected(null), [results]);

  useLayoutEffect(() => {
    const el = plotRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setPlotW(entry.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const buckets = useMemo<YearBucket[]>(() => {
    const byYear = new Map<number, YearBucket>();
    const undated = emptyBucket("nd", "n.d.");
    let hasUndated = false;

    for (const r of results) {
      let b: YearBucket;
      if (r.survey_year == null) {
        b = undated;
        hasUndated = true;
      } else {
        const y = r.survey_year;
        b = byYear.get(y) ?? emptyBucket(String(y), String(y));
        byYear.set(y, b);
      }
      b.items.push(r);
      if (r.score_pertinence !== undefined) b.scores.push(r.score_pertinence);
    }

    const cols: YearBucket[] = [];
    const years = [...byYear.keys()];
    if (years.length > 0) {
      const min = Math.min(...years);
      const max = Math.max(...years);
      for (let y = min; y <= max; y++) {
        cols.push(byYear.get(y) ?? emptyBucket(String(y), String(y)));
      }
    }
    if (hasUndated) cols.push(undated);
    return cols;
  }, [results]);

  const selection = useMemo(
    () => (selected ? buckets.find((b) => b.key === selected) ?? null : null),
    [selected, buckets],
  );

  // Un nuage par colonne, packé indépendamment : deux années voisines ne
  // doivent pas se pousser l'une l'autre, sinon un point sortirait de l'année
  // qu'il documente.
  const swarms = useMemo(() => {
    const colW = buckets.length > 0 ? plotW / buckets.length : 0;
    // Le point doit tenir entier dans sa colonne, bordure comprise (rayon
    // extérieur = DOT/2 + RING), avec 1px de marge. Tant que la mesure n'a pas
    // eu lieu (plotW = 0), tout reste centré — le premier passage du
    // ResizeObserver corrige aussitôt.
    const maxOffset = Math.max(0, colW / 2 - DOT / 2 - RING - 1);
    return buckets.map((b) =>
      packSwarm(
        b.items.filter((q) => q.score_pertinence !== undefined),
        // Axe principal = la verticale, en px depuis le haut, snappé au centre
        // de la bande de 5. Les scores d'une bande arrivent donc à `packSwarm`
        // avec un `main` IDENTIQUE : son découpage adaptatif retombe exactement
        // sur la grille fixe, sans qu'il ait à la connaître. Deux bandes
        // voisines sont à SPACING l'une de l'autre, et son test de fusion est
        // strict (`< diameter`), donc elles restent distinctes.
        (q) => toMain(q.score_pertinence!),
        { diameter: SPACING, maxOffset, collapsedSize: TOKEN_SPACING, quantum: TOKEN_QUANTUM },
      ),
    );
  }, [buckets, plotW]);

  // Tout l'axe doit tenir sans scroll horizontal : les colonnes se partagent la
  // largeur. Au-delà d'une douzaine d'années, les étiquettes ne rentrent plus —
  // on n'en affiche qu'une sur deux plutôt que de les laisser se chevaucher.
  const labelStride = buckets.length > 12 ? 2 : 1;

  if (buckets.length === 0) return null;

  return (
    <div className="rounded-2xl border border-base-content/10 bg-base-100 p-4 shadow-sm">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold tracking-tight">Chronologie de la pertinence</h3>
        <p className="text-xs text-base-content/60">
          Un point = une question, un jeton chiffré = plusieurs · hauteur = score (0-100) ·
          cliquer une année pour la déplier
        </p>
      </div>

      <div className="flex gap-2">
        {/* Axe Y : l'échelle absolue, pour que la hauteur soit lisible sans survol. */}
        <div className="relative w-6 shrink-0" style={{ height: PLOT_H }}>
          {AXIS_TICKS.map((t) => (
            <span
              key={t}
              className="absolute right-0 -translate-y-1/2 text-[10px] tabular-nums text-base-content/35"
              style={{ top: `${100 - t}%` }}
            >
              {t}
            </span>
          ))}
        </div>

        <div className="min-w-0 flex-1">
          <div ref={plotRef} className="relative" style={{ height: PLOT_H }}>
            {/* Grille : hairlines solides, une teinte au-dessus du fond (jamais de pointillés). */}
            {AXIS_TICKS.map((t) => (
              <div
                key={t}
                className="absolute inset-x-0 h-px bg-base-content/8"
                style={{ top: `${100 - t}%` }}
              />
            ))}

            <div className="relative flex h-full items-stretch">
              {buckets.map((b, idx) => {
                const isSel = selected === b.key;
                const isEmpty = b.items.length === 0;
                const isHot = hovered === idx;
                return (
                  <button
                    key={b.key}
                    type="button"
                    disabled={isEmpty}
                    onClick={() => setSelected((prev) => (prev === b.key ? null : b.key))}
                    onPointerEnter={() => setHovered(idx)}
                    onPointerLeave={() => setHovered((h) => (h === idx ? null : h))}
                    // Mêmes détails au clavier qu'au survol.
                    onFocus={() => setHovered(idx)}
                    onBlur={() => setHovered((h) => (h === idx ? null : h))}
                    // La cible est TOUTE la colonne, pas les points : viser un point
                    // de 7px serait une cible-épingle (et impossible au doigt).
                    className={`relative min-w-0 flex-1 rounded transition ${
                      isEmpty ? "cursor-default" : "cursor-pointer"
                    } ${isSel ? "bg-base-content/8 ring-1 ring-inset ring-base-content/20" : isHot && !isEmpty ? "bg-base-content/5" : ""}`}
                  >
                    {swarms[idx].map((row) => (
                      <Fragment key={row.main}>
                        {/* Trop de questions dans cette bande de score pour les
                            dessiner sans les écraser : le jeton en écrit le
                            compte plutôt que de l'encoder dans une largeur qu'on
                            vient justement de comprimer. Il ne porte qu'un
                            multiple de 5, le reste est dessiné autour de lui. */}
                        {row.token && (
                          <span
                            className={`absolute flex items-center justify-center rounded-full font-semibold leading-none tabular-nums ring-1 transition-[box-shadow] ${
                              isHot ? "ring-base-content/25" : "ring-base-100"
                            }`}
                            style={{
                              height: TOKEN,
                              width: TOKEN,
                              fontSize: TOKEN_FONT,
                              top: row.main - TOKEN / 2,
                              left: `calc(50% + ${row.token.offset}px - ${TOKEN / 2}px)`,
                              background: scoreToColor(mainToScore(row.main)),
                              // L'encre suit la bande, en plus foncé — elle
                              // rattache le chiffre à son point.
                              color: scoreToInkColor(mainToScore(row.main)),
                            }}
                          >
                            {row.token.count}
                          </span>
                        )}
                        {row.points.map(({ item: q, offset }) => (
                          <span
                            key={q.id}
                            className={`absolute rounded-full ring-1 transition-[box-shadow] ${
                              isHot ? "ring-base-content/25" : "ring-base-100"
                            }`}
                            style={{
                              height: DOT,
                              width: DOT,
                              top: row.main - DOT / 2,
                              left: `calc(50% + ${offset}px - ${DOT / 2}px)`,
                              background: scoreToColor(q.score_pertinence!),
                            }}
                          />
                        ))}
                      </Fragment>
                    ))}
                  </button>
                );
              })}
            </div>

            {/* Tooltip applicatif (pas le `title` natif du navigateur, qui traîne
                ~1s avant d'apparaître et ne se met pas en forme). La valeur mène,
                le libellé suit. `pointer-events-none` : il ne doit jamais voler le
                survol de la colonne qui l'a déclenché. */}
            {hovered !== null && buckets[hovered] && buckets[hovered].items.length > 0 && (
              <div
                className="pointer-events-none absolute -top-1 z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-lg border border-base-content/10 bg-base-100 px-2 py-1 text-xs shadow-md"
                style={{
                  // Centré sur la colonne, mais borné à 6-94 % pour ne pas déborder
                  // du cadre aux extrémités de l'axe.
                  left: `${Math.min(94, Math.max(6, ((hovered + 0.5) / buckets.length) * 100))}%`,
                }}
              >
                <span className="font-semibold tabular-nums">{buckets[hovered].items.length}</span>{" "}
                <span className="text-base-content/60">
                  question{buckets[hovered].items.length > 1 ? "s" : ""} en {buckets[hovered].label}
                </span>
                {buckets[hovered].scores.length > 0 && (
                  <>
                    <span className="mx-1 text-base-content/25">·</span>
                    <span className="text-base-content/60">score </span>
                    <span className="font-semibold tabular-nums">
                      {Math.min(...buckets[hovered].scores)}-{Math.max(...buckets[hovered].scores)}
                    </span>
                  </>
                )}
              </div>
            )}
          </div>

          <div className="mt-1 flex border-t border-base-content/15 pt-1">
            {buckets.map((b, i) => (
              <span
                key={b.key}
                className="min-w-0 flex-1 truncate text-center text-[10px] tabular-nums text-base-content/45"
              >
                {i % labelStride === 0 ? b.label : ""}
              </span>
            ))}
          </div>
        </div>
      </div>

      {selection && (
        <div className="mt-4 border-t border-base-content/10 pt-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="flex items-center gap-2 text-sm font-medium">
              {selection.label}
              <span className="opacity-50">({selection.items.length})</span>
            </p>
            <button type="button" className="btn btn-ghost btn-xs" onClick={() => setSelected(null)}>
              Fermer
            </button>
          </div>
          <div className="overflow-hidden rounded-xl border border-base-content/10">
            {selection.items.map((q) => (
              <QuestionCard key={q.id} q={q} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
