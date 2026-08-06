import { useMemo } from "react";
import { Link } from "react-router-dom";
import { cartKey, useCart, type CartItem } from "../context/CartContext";

/**
 * Onglet "Exportation avancée" — point d'entrée pour regrouper des questions
 * équivalentes en concept (tjf.2), mapper leurs catégories de réponse (tjf.3)
 * et croiser sur plusieurs variables (tjf.4). Pas de sélection propre : le
 * panier existant (CartContext) reste l'unique source des questions.
 */
export default function AdvancedExportPage() {
  const { items, size } = useCart();

  const groups = useMemo(() => {
    const m = new Map<string, { name: string; year: number | null; items: CartItem[] }>();
    for (const it of items) {
      let g = m.get(it.survey_id);
      if (!g) {
        g = { name: it.survey_name, year: it.survey_year, items: [] };
        m.set(it.survey_id, g);
      }
      g.items.push(it);
    }
    return [...m.values()];
  }, [items]);

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
        <div className="op-card">
          <div className="mb-3 flex items-center justify-between">
            <b>
              {size} question{size > 1 ? "s" : ""} dans le panier
            </b>
          </div>
          {groups.map((g) => (
            <div key={g.name} className="mb-4">
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-base-content/55">
                {g.name} · {g.year ?? "n.d."}
              </div>
              {g.items.map((it) => (
                <div key={cartKey(it.survey_id, it.variable)} className="mb-1.5 text-sm leading-snug">
                  {it.question_text}
                </div>
              ))}
            </div>
          ))}
          <p className="mt-4 text-xs text-base-content/50">
            Regroupement en concept, mapping des catégories et croisement multi-variables arrivent bientôt.
          </p>
        </div>
      )}
    </div>
  );
}
