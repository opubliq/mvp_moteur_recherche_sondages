import { Fragment, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { X, Tag, Plus, ChevronDown, ChevronRight, Download } from "lucide-react";
import { cartKey, useCart, type CartItem } from "../context/CartContext";
import { useConcepts, type ConceptGroup } from "../context/ConceptContext";
import { useSociodemoMapping } from "../context/SociodemoMappingContext";
import type { DistributionRow, ResponseOption, SearchResult } from "../types";
import { DEMO_TYPES } from "../lib/exportExcel";
import { computeConceptTotals, exportAdvancedXlsx, YEAR_CROSSING_KEY } from "../logic/conceptAggregate";
import { resolveDemoVarsForSurveys } from "../logic/sociodemoResolve";
import DistributionBars from "../components/microdata/DistributionBars";
import { useLanguage } from "../context/LanguageContext";
import type { TranslationKey } from "../i18n/fr";

/** Pseudo-variable de croisement dérivée des métadonnées, pas une colonne de réponse. */
const CROSSING_OPTIONS = [{ key: YEAR_CROSSING_KEY }, ...DEMO_TYPES];

function crossingLabelKey(key: string): TranslationKey {
  return key === YEAR_CROSSING_KEY ? "advExport.yearCrossing" : (`demoType.${key}` as TranslationKey);
}
const CROSSING_STORAGE_KEY = "opubliq.crossing.v1";

function loadInitialCrossing(): Set<string> {
  try {
    const raw = localStorage.getItem(CROSSING_STORAGE_KEY);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw) as string[]);
  } catch {
    return new Set();
  }
}

/** Carte d'une question : sondage · année en tête, libellé propre en gras, texte brut en repli. */
function QuestionMiniCard({
  item,
  checkbox,
  onRemove,
}: {
  item: CartItem;
  checkbox?: { checked: boolean; onChange: () => void };
  onRemove?: () => void;
}) {
  const { t } = useLanguage();
  const content = (
    <>
      {checkbox && (
        <input
          type="checkbox"
          className="checkbox checkbox-sm mt-0.5 shrink-0"
          checked={checkbox.checked}
          onChange={checkbox.onChange}
        />
      )}
      <div className="min-w-0 flex-1">
        <div className="mb-1 text-xs text-base-content/50">
          {item.survey_name} · {item.survey_year ?? t("timeline.undated")}
        </div>
        <div className="text-sm font-semibold leading-snug">{item.display_label || item.question_text}</div>
        {item.display_label && item.display_label !== item.question_text && (
          <div className="mt-0.5 text-xs leading-snug text-base-content/55">{item.question_text}</div>
        )}
      </div>
      {onRemove && (
        <button className="btn btn-ghost btn-xs shrink-0" onClick={onRemove} aria-label={t("advExport.remove")}>
          <X size={14} strokeWidth={1.75} />
        </button>
      )}
    </>
  );
  const cls = "mb-2 flex items-start gap-2.5 rounded-lg border border-base-content/10 p-2.5";
  return checkbox ? <label className={cls}>{content}</label> : <div className={cls}>{content}</div>;
}

/**
 * Mapping des catégories de réponse d'un concept : les catégories de sortie
 * sont propres au concept (partagées entre ses questions), le mapping lui est
 * propre à chaque question (chacune garde ses catégories natives : binaire,
 * Likert 4/5/7 points...).
 */
function CategoryMapping({
  group,
  items,
  addCategory,
  renameCategory,
  removeCategory,
  setMapping,
}: {
  group: ConceptGroup;
  items: CartItem[];
  addCategory: (groupId: string, label: string) => void;
  renameCategory: (groupId: string, categoryId: string, label: string) => void;
  removeCategory: (groupId: string, categoryId: string) => void;
  setMapping: (groupId: string, itemKey: string, responseCode: string, categoryId: string | null) => void;
}) {
  const { t } = useLanguage();
  const [newCategory, setNewCategory] = useState("");

  function confirmAddCategory() {
    const label = newCategory.trim();
    if (!label) return;
    addCategory(group.id, label);
    setNewCategory("");
  }

  // Propage le mapping quand deux questions du concept partagent une option de
  // réponse au libellé identique (repli du même instrument d'une année à
  // l'autre) — évite de remapper la même échelle Likert à chaque question.
  useEffect(() => {
    const labelToCategory = new Map<string, string>();
    for (const it of items) {
      const k = cartKey(it.survey_id, it.variable);
      const itemMapping = group.mapping[k] ?? {};
      for (const opt of it.response_options) {
        const catId = itemMapping[opt.code];
        const norm = opt.label.trim().toLowerCase();
        if (catId && !labelToCategory.has(norm)) labelToCategory.set(norm, catId);
      }
    }
    for (const it of items) {
      const k = cartKey(it.survey_id, it.variable);
      const itemMapping = group.mapping[k] ?? {};
      for (const opt of it.response_options) {
        if (itemMapping[opt.code]) continue;
        const suggestion = labelToCategory.get(opt.label.trim().toLowerCase());
        if (suggestion) setMapping(group.id, k, opt.code, suggestion);
      }
    }
  }, [group.id, group.mapping, items, setMapping]);

  return (
    <div className="mt-2 border-t border-base-content/10 pt-3">
      <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-base-content/55">
        {t("advExport.outputCategories")}
      </p>
      <div className="mb-2 flex flex-wrap items-center gap-1.5">
        {group.categories.map((c) => (
          <span key={c.id} className="flex items-center gap-1 rounded-full bg-base-content/5 py-0.5 pl-2.5 pr-1">
            <input
              className="w-auto min-w-0 border-none bg-transparent p-0 text-xs focus:outline-none"
              style={{ width: `${Math.max(c.label.length, 3)}ch` }}
              value={c.label}
              onChange={(e) => renameCategory(group.id, c.id, e.target.value)}
            />
            <button
              className="btn btn-ghost btn-xs btn-circle"
              onClick={() => removeCategory(group.id, c.id)}
              aria-label={t("advExport.removeCategoryAria")}
            >
              <X size={11} strokeWidth={2} />
            </button>
          </span>
        ))}
        <span className="flex items-center gap-1">
          <input
            className="input input-bordered input-xs w-40"
            placeholder={t("advExport.newCategory")}
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && confirmAddCategory()}
          />
          <button className="btn btn-ghost btn-xs btn-circle" onClick={confirmAddCategory} aria-label={t("advExport.add")}>
            <Plus size={13} strokeWidth={2} />
          </button>
        </span>
      </div>

      {group.categories.length === 0 ? (
        <p className="text-xs text-base-content/50">{t("advExport.addAtLeastOne")}</p>
      ) : (
        items.map((it) => {
          const k = cartKey(it.survey_id, it.variable);
          const itemMapping = group.mapping[k] ?? {};
          return (
            <div key={k} className="mb-2">
              <p className="mb-1 text-xs text-base-content/50">{it.display_label || it.question_text}</p>
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1.5">
                {it.response_options.map((opt) => {
                  const current = itemMapping[opt.code];
                  return (
                    <Fragment key={opt.code}>
                      <span className="truncate text-xs">{opt.label}</span>
                      <div className="flex flex-wrap gap-1">
                        {group.categories.map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            className={`btn btn-xs ${current === c.id ? "btn-primary" : "btn-outline"}`}
                            onClick={() => setMapping(group.id, k, opt.code, current === c.id ? null : c.id)}
                          >
                            {c.label}
                          </button>
                        ))}
                      </div>
                    </Fragment>
                  );
                })}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

/**
 * Vérification rapide du mapping (tjf.3) : total pondéré par catégorie de
 * sortie, tous sondages du concept confondus, recalculé automatiquement à
 * chaque changement de mapping (debounce) — pas d'export à attendre pour voir
 * si la répartition a du sens. Le vrai croisement (par sondage/année/socio-
 * démo) vit dans l'export Excel (tjf.6), pas dans une table en page.
 */
function ConceptQuickCheck({ group, items }: { group: ConceptGroup; items: CartItem[] }) {
  const { t } = useLanguage();
  const [state, setState] = useState<
    "idle" | "loading" | { rows: DistributionRow[]; warnings: string[] } | Error
  >("idle");

  useEffect(() => {
    if (group.categories.length === 0) {
      setState("idle");
      return;
    }
    let cancelled = false;
    setState("loading");
    const timer = setTimeout(async () => {
      try {
        const res = await computeConceptTotals(group, items);
        if (!cancelled) setState(res);
      } catch (err) {
        if (!cancelled) setState(err instanceof Error ? err : new Error(t("advExport.computeFailed")));
      }
    }, 500);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [group, items]);

  if (group.categories.length === 0 || state === "idle") return null;
  if (state === "loading") return <p className="mt-2 text-xs text-base-content/40">{t("advExport.computing")}</p>;
  if (state instanceof Error) return <p className="mt-2 text-xs text-error">{state.message}</p>;

  const hasData = state.rows.some((r) => r.weighted_n > 0);
  const options: ResponseOption[] = group.categories.map((c) => ({ code: c.id, label: c.label }));

  return (
    <div className="mt-2 border-t border-base-content/10 pt-2">
      {hasData ? (
        <DistributionBars rows={state.rows} options={options} />
      ) : (
        <p className="text-xs text-base-content/40">{t("advExport.noMappedResponses")}</p>
      )}
      {state.warnings.length > 0 && (
        <ul className="mt-1 list-disc pl-4 text-[11px] text-base-content/50">
          {state.warnings.map((w, i) => (
            <li key={i}>{w}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * Mapping des catégories natives d'un type socio-démo (âge, genre...) vers des
 * catégories de sortie communes (tjf.8) — même mécanique que `CategoryMapping`
 * mais global à l'app (par `demoKey`, pas par concept) et keyé par sondage
 * plutôt que par item : la variable socio-démo est résolue une fois par
 * sondage (`pickSociodemoVar`), pas par question.
 */
function SociodemoMappingPanel({ demoKey, surveyIds, surveyNames }: { demoKey: string; surveyIds: string[]; surveyNames: Map<string, string> }) {
  const { t } = useLanguage();
  const { getMapping, addCategory, renameCategory, removeCategory, setMapping } = useSociodemoMapping();
  const [newCategory, setNewCategory] = useState("");
  const [demoVars, setDemoVars] = useState<Map<string, SearchResult | undefined> | null>(null);

  useEffect(() => {
    let cancelled = false;
    setDemoVars(null);
    resolveDemoVarsForSurveys(surveyIds, demoKey).then((m) => {
      if (!cancelled) setDemoVars(m);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [surveyIds.join(","), demoKey]);

  const dt = getMapping(demoKey);
  const demoLabel = t(`demoType.${demoKey}` as TranslationKey);

  // Propage le mapping quand deux sondages partagent une catégorie native au
  // libellé identique — évite de remapper la même tranche d'une année à l'autre.
  useEffect(() => {
    if (!demoVars) return;
    const labelToCategory = new Map<string, string>();
    for (const sid of surveyIds) {
      const v = demoVars.get(sid);
      if (!v) continue;
      const itemMapping = dt.mapping[sid] ?? {};
      for (const opt of v.response_options) {
        const catId = itemMapping[String(opt.code)];
        const norm = opt.label.trim().toLowerCase();
        if (catId && !labelToCategory.has(norm)) labelToCategory.set(norm, catId);
      }
    }
    for (const sid of surveyIds) {
      const v = demoVars.get(sid);
      if (!v) continue;
      const itemMapping = dt.mapping[sid] ?? {};
      for (const opt of v.response_options) {
        if (itemMapping[String(opt.code)]) continue;
        const suggestion = labelToCategory.get(opt.label.trim().toLowerCase());
        if (suggestion) setMapping(demoKey, sid, String(opt.code), suggestion);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demoKey, demoVars, dt.mapping, surveyIds]);

  function confirmAddCategory() {
    const label = newCategory.trim();
    if (!label) return;
    addCategory(demoKey, label);
    setNewCategory("");
  }

  const bySurvey = surveyIds.map((sid) => ({ sid, v: demoVars?.get(sid) })).filter((x): x is { sid: string; v: SearchResult } => !!x.v);

  return (
    <div className="op-card mb-3">
      <p className="mb-1 text-sm font-semibold">{t("advExport.sociodemoMappingTitle", { demo: demoLabel })}</p>
      <p className="mb-2 text-xs text-base-content/50">{t("advExport.sociodemoMappingHint")}</p>

      <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-base-content/55">
        {t("advExport.outputCategories")}
      </p>
      <div className="mb-2 flex flex-wrap items-center gap-1.5">
        {dt.categories.map((c) => (
          <span key={c.id} className="flex items-center gap-1 rounded-full bg-base-content/5 py-0.5 pl-2.5 pr-1">
            <input
              className="w-auto min-w-0 border-none bg-transparent p-0 text-xs focus:outline-none"
              style={{ width: `${Math.max(c.label.length, 3)}ch` }}
              value={c.label}
              onChange={(e) => renameCategory(demoKey, c.id, e.target.value)}
            />
            <button
              className="btn btn-ghost btn-xs btn-circle"
              onClick={() => removeCategory(demoKey, c.id)}
              aria-label={t("advExport.removeCategoryAria")}
            >
              <X size={11} strokeWidth={2} />
            </button>
          </span>
        ))}
        <span className="flex items-center gap-1">
          <input
            className="input input-bordered input-xs w-40"
            placeholder={t("advExport.newCategory")}
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && confirmAddCategory()}
          />
          <button className="btn btn-ghost btn-xs btn-circle" onClick={confirmAddCategory} aria-label={t("advExport.add")}>
            <Plus size={13} strokeWidth={2} />
          </button>
        </span>
      </div>

      {!demoVars ? (
        <p className="text-xs text-base-content/40">{t("advExport.sociodemoResolving")}</p>
      ) : bySurvey.length === 0 ? (
        <p className="text-xs text-base-content/50">{t("advExport.sociodemoUnavailable", { demo: demoLabel })}</p>
      ) : dt.categories.length === 0 ? (
        <p className="text-xs text-base-content/50">{t("advExport.addAtLeastOne")}</p>
      ) : (
        bySurvey.map(({ sid, v }) => {
          const itemMapping = dt.mapping[sid] ?? {};
          return (
            <div key={sid} className="mb-2">
              <p className="mb-1 text-xs text-base-content/50">{surveyNames.get(sid) ?? sid}</p>
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1.5">
                {v.response_options.map((opt) => {
                  const current = itemMapping[String(opt.code)];
                  return (
                    <Fragment key={opt.code}>
                      <span className="truncate text-xs">{opt.label}</span>
                      <div className="flex flex-wrap gap-1">
                        {dt.categories.map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            className={`btn btn-xs ${current === c.id ? "btn-primary" : "btn-outline"}`}
                            onClick={() => setMapping(demoKey, sid, String(opt.code), current === c.id ? null : c.id)}
                          >
                            {c.label}
                          </button>
                        ))}
                      </div>
                    </Fragment>
                  );
                })}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

/**
 * Onglet "Exportation avancée" — point d'entrée pour regrouper des questions
 * équivalentes en concept (tjf.2), mapper leurs catégories de réponse (tjf.3)
 * et croiser sur plusieurs variables (tjf.4). Pas de sélection propre : le
 * panier existant (CartContext) reste l'unique source des questions.
 */
export default function AdvancedExportPage() {
  const { t } = useLanguage();
  const { items, size } = useCart();
  const {
    groups,
    groupByItemKey,
    createGroup,
    renameGroup,
    removeFromGroup,
    deleteGroup,
    pruneItemKey,
    addCategory,
    renameCategory,
    removeCategory,
    setMapping,
  } = useConcepts();
  const { mappings: sociodemoMappings } = useSociodemoMapping();

  const itemByKey = useMemo(() => {
    const m = new Map<string, CartItem>();
    for (const it of items) m.set(cartKey(it.survey_id, it.variable), it);
    return m;
  }, [items]);

  // Un item peut être retiré du panier ailleurs (drawer) sans passer par ici :
  // on nettoie les groupes des clés qui n'existent plus dans le panier.
  useEffect(() => {
    for (const g of groups) {
      for (const k of g.itemKeys) {
        if (!itemByKey.has(k)) pruneItemKey(k);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemByKey]);

  const ungrouped = useMemo(() => items.filter((it) => !groupByItemKey.has(cartKey(it.survey_id, it.variable))), [
    items,
    groupByItemKey,
  ]);

  // Items résolus par concept, mémoïsés pour ne recalculer (et redéclencher la
  // vérification rapide de mapping) que quand un groupe ou le panier change réellement.
  const groupItems = useMemo(() => {
    const m = new Map<string, CartItem[]>();
    for (const g of groups) {
      m.set(g.id, g.itemKeys.map((k) => itemByKey.get(k)).filter((it): it is CartItem => !!it));
    }
    return m;
  }, [groups, itemByKey]);

  // Sondages du panier entier (pas juste d'un concept) : l'harmonisation
  // socio-démo (tjf.8) est globale, indépendante des regroupements en concept.
  const cartSurveyIds = useMemo(() => [...new Set(items.map((it) => it.survey_id))], [items]);
  const surveyNames = useMemo(() => {
    const m = new Map<string, string>();
    for (const it of items) if (!m.has(it.survey_id)) m.set(it.survey_id, `${it.survey_name} (${it.survey_year ?? "n.d."})`);
    return m;
  }, [items]);

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [naming, setNaming] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [crossing, setCrossing] = useState<Set<string>>(loadInitialCrossing);
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState<{ done: number; total: number } | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [exportWarnings, setExportWarnings] = useState<string[]>([]);

  const exportableGroups = useMemo(
    () => groups.filter((g) => g.categories.length > 0 && (groupItems.get(g.id)?.length ?? 0) >= 2),
    [groups, groupItems],
  );

  async function handleExport() {
    setExportError(null);
    setExportWarnings([]);
    setExporting(true);
    setExportProgress({ done: 0, total: 0 });
    try {
      const { warnings } = await exportAdvancedXlsx(
        exportableGroups,
        groupItems,
        crossing,
        sociodemoMappings,
        (done, total) => setExportProgress({ done, total }),
      );
      setExportWarnings(warnings);
    } catch (err) {
      setExportError(err instanceof Error ? err.message : t("advExport.exportFailed"));
    } finally {
      setExporting(false);
      setExportProgress(null);
    }
  }

  useEffect(() => {
    try {
      localStorage.setItem(CROSSING_STORAGE_KEY, JSON.stringify([...crossing]));
    } catch {
      /* quota / mode privé : on ignore */
    }
  }, [crossing]);

  function toggleCrossing(key: string) {
    setCrossing((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function toggleCollapsed(id: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelected(key: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function confirmGroup() {
    const label = newLabel.trim();
    if (!label || selected.size < 2) return;
    createGroup(label, [...selected]);
    setSelected(new Set());
    setNewLabel("");
    setNaming(false);
  }

  function cancelGroup() {
    setNaming(false);
    setNewLabel("");
  }

  return (
    <div className="op-page">
      <div className="op-hero">
        <h1 className="text-xl font-semibold">{t("advExport.title")}</h1>
        <p className="text-sm text-base-content/60">{t("advExport.subtitle")}</p>
      </div>

      {size === 0 ? (
        <div className="op-card max-w-2xl">
          <h2 className="mb-2 text-lg font-semibold">{t("advExport.emptyCartTitle")}</h2>
          <p className="mb-3 text-sm text-base-content/60">{t("advExport.emptyCartBody")}</p>
          <Link to="/recherche" className="btn btn-primary btn-sm">
            {t("advExport.goToSearch")}
          </Link>
        </div>
      ) : (
        <div className="grid-verbatims">
          {/* Colonne de gauche : le travail (concepts, mapping, questions non
              regroupées) — large, défile avec la page. */}
          <div className="min-w-0">
            {groups.length > 0 && (
              <div className="mb-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-base-content/55">
                  {t("advExport.concepts")} ({groups.length})
                </p>
                {groups.map((g) => {
                  const isCollapsed = collapsed.has(g.id);
                  const items = groupItems.get(g.id) ?? [];
                  return (
                    <div key={g.id} className="op-card mb-3">
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <div className="flex min-w-0 items-center gap-1.5">
                          <button
                            className="btn btn-ghost btn-xs btn-circle shrink-0"
                            onClick={() => toggleCollapsed(g.id)}
                            aria-label={isCollapsed ? t("advExport.expandConcept") : t("advExport.collapseConcept")}
                          >
                            {isCollapsed ? (
                              <ChevronRight size={15} strokeWidth={1.75} />
                            ) : (
                              <ChevronDown size={15} strokeWidth={1.75} />
                            )}
                          </button>
                          {isCollapsed ? (
                            <button
                              className="truncate text-left text-sm font-semibold"
                              onClick={() => toggleCollapsed(g.id)}
                            >
                              {g.label}{" "}
                              <span className="font-normal text-base-content/50">
                                · {g.itemKeys.length} {t(g.itemKeys.length > 1 ? "advExport.questions" : "advExport.question")}
                              </span>
                            </button>
                          ) : (
                            <input
                              className="input input-bordered input-sm max-w-xs font-semibold"
                              value={g.label}
                              onChange={(e) => renameGroup(g.id, e.target.value)}
                              aria-label={t("advExport.conceptNameAria")}
                            />
                          )}
                        </div>
                        <button className="btn btn-ghost btn-xs shrink-0" onClick={() => deleteGroup(g.id)}>
                          {t("advExport.deleteConcept")}
                        </button>
                      </div>
                      {!isCollapsed && (
                        <>
                          {items.map((it) => (
                            <QuestionMiniCard
                              key={cartKey(it.survey_id, it.variable)}
                              item={it}
                              onRemove={() => removeFromGroup(g.id, cartKey(it.survey_id, it.variable))}
                            />
                          ))}
                          <CategoryMapping
                            group={g}
                            items={items}
                            addCategory={addCategory}
                            renameCategory={renameCategory}
                            removeCategory={removeCategory}
                            setMapping={setMapping}
                          />
                          <ConceptQuickCheck group={g} items={items} />
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            <div className="op-card">
              <div className="mb-3 flex items-center justify-between gap-2">
                <b>
                  {ungrouped.length} {t(ungrouped.length > 1 ? "advExport.ungroupedQuestions" : "advExport.ungroupedQuestion")}
                </b>
                {!naming && selected.size >= 2 && (
                  <button className="btn btn-primary btn-xs gap-1" onClick={() => setNaming(true)}>
                    <Tag size={13} strokeWidth={1.75} />
                    {t("advExport.groupIntoConcept", { count: selected.size })}
                  </button>
                )}
              </div>

              {naming && (
                <div className="mb-3 flex items-center gap-2">
                  <input
                    className="input input-bordered input-sm flex-1"
                    placeholder={t("advExport.conceptNamePlaceholder")}
                    value={newLabel}
                    autoFocus
                    onChange={(e) => setNewLabel(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") confirmGroup();
                      if (e.key === "Escape") cancelGroup();
                    }}
                  />
                  <button className="btn btn-primary btn-sm" onClick={confirmGroup} disabled={!newLabel.trim()}>
                    {t("advExport.create")}
                  </button>
                  <button className="btn btn-ghost btn-sm" onClick={cancelGroup}>
                    {t("advExport.cancel")}
                  </button>
                </div>
              )}

              {ungrouped.length === 0 ? (
                <p className="text-sm text-base-content/60">{t("advExport.allGrouped")}</p>
              ) : (
                <>
                  <p className="mb-2 text-xs text-base-content/50">{t("advExport.checkTwoHint")}</p>
                  {ungrouped.map((it) => {
                    const k = cartKey(it.survey_id, it.variable);
                    return (
                      <QuestionMiniCard
                        key={k}
                        item={it}
                        checkbox={{ checked: selected.has(k), onChange: () => toggleSelected(k) }}
                      />
                    );
                  })}
                </>
              )}
            </div>
          </div>

          {/* Rail de droite : croisement + export — outils qui agissent sur
              l'ensemble des concepts, pas le travail lui-même. */}
          <div className="space-y-4">
            <div className="op-card">
              <p className="mb-1 text-sm font-semibold">{t("advExport.crossWith")}</p>
              <p className="mb-2 text-xs text-base-content/50">{t("advExport.crossWithHint")}</p>
              <div className="flex flex-wrap gap-1.5">
                {CROSSING_OPTIONS.map((opt) => (
                  <button
                    key={opt.key}
                    type="button"
                    className={`btn btn-xs ${crossing.has(opt.key) ? "btn-primary" : "btn-outline"}`}
                    onClick={() => toggleCrossing(opt.key)}
                  >
                    {t(crossingLabelKey(opt.key))}
                  </button>
                ))}
              </div>
            </div>

            {[...crossing]
              .filter((k) => k !== YEAR_CROSSING_KEY)
              .map((demoKey) => (
                <SociodemoMappingPanel key={demoKey} demoKey={demoKey} surveyIds={cartSurveyIds} surveyNames={surveyNames} />
              ))}

            <div className="op-card">
              <p className="mb-1 text-sm font-semibold">{t("advExport.export")}</p>
              <p className="mb-3 text-xs text-base-content/50">{t("advExport.exportHint")}</p>
              {exportError && <p className="mb-2 text-xs text-error">{exportError}</p>}
              {exportWarnings.length > 0 && (
                <ul className="mb-2 list-disc pl-4 text-[11px] text-base-content/50">
                  {exportWarnings.map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              )}
              <button
                className="btn btn-primary btn-sm w-full gap-1.5"
                onClick={handleExport}
                disabled={exporting || exportableGroups.length === 0}
              >
                {exporting ? (
                  <span className="loading loading-spinner loading-xs" />
                ) : (
                  <Download size={15} strokeWidth={1.75} />
                )}
                {exporting
                  ? exportProgress && exportProgress.total > 0
                    ? t("advExport.exportGeneratingProgress", { done: exportProgress.done, total: exportProgress.total })
                    : t("advExport.exportGenerating")
                  : exportableGroups.length === 0
                    ? t("advExport.exportNeedsConcept")
                    : t("advExport.exportButton")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
