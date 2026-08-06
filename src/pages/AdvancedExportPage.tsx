import { Fragment, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { X, Tag, Plus, ChevronDown, ChevronRight } from "lucide-react";
import { cartKey, useCart, type CartItem } from "../context/CartContext";
import { useConcepts, type ConceptGroup } from "../context/ConceptContext";
import { DEMO_TYPES } from "../lib/exportExcel";

/** Pseudo-variable de croisement dérivée des métadonnées, pas une colonne de réponse. */
const YEAR_CROSSING = { key: "__year__", label: "Année du sondage" };
const CROSSING_OPTIONS = [YEAR_CROSSING, ...DEMO_TYPES];
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
          {item.survey_name} · {item.survey_year ?? "n.d."}
        </div>
        <div className="text-sm font-semibold leading-snug">{item.display_label || item.question_text}</div>
        {item.display_label && item.display_label !== item.question_text && (
          <div className="mt-0.5 text-xs leading-snug text-base-content/55">{item.question_text}</div>
        )}
      </div>
      {onRemove && (
        <button className="btn btn-ghost btn-xs shrink-0" onClick={onRemove} aria-label="Retirer">
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
        Catégories de sortie
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
              aria-label="Retirer la catégorie"
            >
              <X size={11} strokeWidth={2} />
            </button>
          </span>
        ))}
        <span className="flex items-center gap-1">
          <input
            className="input input-bordered input-xs w-40"
            placeholder="Nouvelle catégorie"
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && confirmAddCategory()}
          />
          <button className="btn btn-ghost btn-xs btn-circle" onClick={confirmAddCategory} aria-label="Ajouter">
            <Plus size={13} strokeWidth={2} />
          </button>
        </span>
      </div>

      {group.categories.length === 0 ? (
        <p className="text-xs text-base-content/50">Ajoute au moins une catégorie de sortie pour mapper.</p>
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
 * Onglet "Exportation avancée" — point d'entrée pour regrouper des questions
 * équivalentes en concept (tjf.2), mapper leurs catégories de réponse (tjf.3)
 * et croiser sur plusieurs variables (tjf.4). Pas de sélection propre : le
 * panier existant (CartContext) reste l'unique source des questions.
 */
export default function AdvancedExportPage() {
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

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [naming, setNaming] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [crossing, setCrossing] = useState<Set<string>>(loadInitialCrossing);

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
        <h1 className="text-xl font-semibold">Exportation avancée</h1>
        <p className="text-sm text-base-content/60">
          Regroupe des questions équivalentes en concept, harmonise leurs catégories de réponse et croise sur
          plusieurs variables à la fois — pour comparer une même tendance à travers des sondages qui posent la
          question différemment.
        </p>
      </div>

      {size === 0 ? (
        <div className="op-card max-w-2xl">
          <h2 className="mb-2 text-lg font-semibold">Panier vide</h2>
          <p className="mb-3 text-sm text-base-content/60">
            Coche des questions dans la recherche ou un sondage, puis reviens ici pour les regrouper en concept.
          </p>
          <Link to="/recherche" className="btn btn-primary btn-sm">
            Aller à la recherche
          </Link>
        </div>
      ) : (
        <>
          {groups.length > 0 && (
            <div className="mb-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-base-content/55">
                Concepts ({groups.length})
              </p>
              {groups.map((g) => {
                const isCollapsed = collapsed.has(g.id);
                return (
                  <div key={g.id} className="op-card mb-3">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-1.5">
                        <button
                          className="btn btn-ghost btn-xs btn-circle shrink-0"
                          onClick={() => toggleCollapsed(g.id)}
                          aria-label={isCollapsed ? "Déplier le concept" : "Replier le concept"}
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
                              · {g.itemKeys.length} question{g.itemKeys.length > 1 ? "s" : ""}
                            </span>
                          </button>
                        ) : (
                          <input
                            className="input input-bordered input-sm max-w-xs font-semibold"
                            value={g.label}
                            onChange={(e) => renameGroup(g.id, e.target.value)}
                            aria-label="Nom du concept"
                          />
                        )}
                      </div>
                      <button className="btn btn-ghost btn-xs shrink-0" onClick={() => deleteGroup(g.id)}>
                        Supprimer le concept
                      </button>
                    </div>
                    {!isCollapsed && (
                      <>
                        {g.itemKeys.map((k) => {
                          const it = itemByKey.get(k);
                          if (!it) return null;
                          return <QuestionMiniCard key={k} item={it} onRemove={() => removeFromGroup(g.id, k)} />;
                        })}
                        <CategoryMapping
                          group={g}
                          items={g.itemKeys.map((k) => itemByKey.get(k)).filter((it): it is CartItem => !!it)}
                          addCategory={addCategory}
                          renameCategory={renameCategory}
                          removeCategory={removeCategory}
                          setMapping={setMapping}
                        />
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
                {ungrouped.length} question{ungrouped.length > 1 ? "s" : ""} non regroupée
                {ungrouped.length > 1 ? "s" : ""}
              </b>
              {!naming && selected.size >= 2 && (
                <button className="btn btn-primary btn-xs gap-1" onClick={() => setNaming(true)}>
                  <Tag size={13} strokeWidth={1.75} />
                  Regrouper en concept ({selected.size})
                </button>
              )}
            </div>

            {naming && (
              <div className="mb-3 flex items-center gap-2">
                <input
                  className="input input-bordered input-sm flex-1"
                  placeholder="Nom du concept (ex: Souveraineté du Québec)"
                  value={newLabel}
                  autoFocus
                  onChange={(e) => setNewLabel(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") confirmGroup();
                    if (e.key === "Escape") cancelGroup();
                  }}
                />
                <button className="btn btn-primary btn-sm" onClick={confirmGroup} disabled={!newLabel.trim()}>
                  Créer
                </button>
                <button className="btn btn-ghost btn-sm" onClick={cancelGroup}>
                  Annuler
                </button>
              </div>
            )}

            {ungrouped.length === 0 ? (
              <p className="text-sm text-base-content/60">Toutes les questions du panier sont regroupées.</p>
            ) : (
              <>
                <p className="mb-2 text-xs text-base-content/50">
                  Coche au moins deux questions équivalentes pour les regrouper en concept.
                </p>
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

          <div className="op-card mt-4">
            <p className="mb-1 text-sm font-semibold">Croiser avec</p>
            <p className="mb-2 text-xs text-base-content/50">
              Choisis une ou plusieurs variables à croiser simultanément. La variable technique correspondante est
              résolue séparément pour chaque sondage du concept.
            </p>
            <div className="flex flex-wrap gap-1.5">
              {CROSSING_OPTIONS.map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  className={`btn btn-xs ${crossing.has(opt.key) ? "btn-primary" : "btn-outline"}`}
                  onClick={() => toggleCrossing(opt.key)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
