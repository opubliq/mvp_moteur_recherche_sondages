import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { X, Tag } from "lucide-react";
import { cartKey, useCart, type CartItem } from "../context/CartContext";
import { useConcepts } from "../context/ConceptContext";

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
 * Onglet "Exportation avancée" — point d'entrée pour regrouper des questions
 * équivalentes en concept (tjf.2), mapper leurs catégories de réponse (tjf.3)
 * et croiser sur plusieurs variables (tjf.4). Pas de sélection propre : le
 * panier existant (CartContext) reste l'unique source des questions.
 */
export default function AdvancedExportPage() {
  const { items, size } = useCart();
  const { groups, groupByItemKey, createGroup, renameGroup, removeFromGroup, deleteGroup, pruneItemKey } =
    useConcepts();

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
              {groups.map((g) => (
                <div key={g.id} className="op-card mb-3">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <input
                      className="input input-bordered input-sm max-w-xs font-semibold"
                      value={g.label}
                      onChange={(e) => renameGroup(g.id, e.target.value)}
                      aria-label="Nom du concept"
                    />
                    <button className="btn btn-ghost btn-xs" onClick={() => deleteGroup(g.id)}>
                      Supprimer le concept
                    </button>
                  </div>
                  {g.itemKeys.map((k) => {
                    const it = itemByKey.get(k);
                    if (!it) return null;
                    return <QuestionMiniCard key={k} item={it} onRemove={() => removeFromGroup(g.id, k)} />;
                  })}
                </div>
              ))}
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

          <p className="mt-4 text-xs text-base-content/50">
            Mapping des catégories et croisement multi-variables arrivent bientôt.
          </p>
        </>
      )}
    </div>
  );
}
