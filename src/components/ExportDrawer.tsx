import { useMemo, useState } from "react";
import { X, Download } from "lucide-react";
import { useCart, cartKey, type CartItem } from "../context/CartContext";
import { exportCart, type ExportFormat } from "../lib/exportCart";
import { exportCartXlsx } from "../lib/exportExcel";

type FullExportFormat = ExportFormat | "xlsx";

/** Slide-over du panier d'export : liste groupée par sondage + download réel. */
export default function ExportDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { items, size, remove, clear } = useCart();
  const [format, setFormat] = useState<FullExportFormat>("xlsx");
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleExport() {
    setError(null);
    if (format === "xlsx") {
      setExporting(true);
      try {
        await exportCartXlsx(items);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Échec de l'export Excel");
      } finally {
        setExporting(false);
      }
    } else {
      exportCart(items, format);
    }
  }

  // Regroupe par sondage pour l'affichage.
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

  if (!open) return null;

  return (
    <>
      <div className="overlay-bg" onClick={onClose} />
      <aside className="slideover" role="dialog" aria-label="Panier d'export">
        <div className="flex items-center justify-between border-b border-base-content/10 p-4">
          <b>
            Panier d'export · {size} question{size > 1 ? "s" : ""}
          </b>
          <button className="btn btn-ghost btn-sm" onClick={onClose} aria-label="Fermer">
            <X size={18} strokeWidth={1.75} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {groups.length === 0 ? (
            <p className="text-sm text-base-content/60">
              Aucune question sélectionnée. Coche des questions dans la recherche ou un sondage.
            </p>
          ) : (
            groups.map((g) => (
              <div key={g.name} className="mb-4">
                <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-base-content/55">
                  {g.name} · {g.year ?? "n.d."}
                </div>
                {g.items.map((it) => (
                  <div key={cartKey(it.survey_id, it.variable)} className="mb-2 flex items-start gap-2">
                    <span className="flex-1 text-sm leading-snug">{it.question_text}</span>
                    <button
                      className="btn btn-ghost btn-xs"
                      onClick={() => remove(cartKey(it.survey_id, it.variable))}
                      aria-label="Retirer"
                    >
                      <X size={15} strokeWidth={1.75} />
                    </button>
                  </div>
                ))}
              </div>
            ))
          )}
        </div>

        {size > 0 && (
          <div className="border-t border-base-content/10 p-4">
            <select
              className="select select-bordered select-sm mb-2 w-full"
              value={format}
              onChange={(e) => setFormat(e.target.value as FullExportFormat)}
            >
              <option value="xlsx">Format : Excel (.xlsx, distributions pondérées)</option>
              <option value="csv-large">Format : CSV (codebook)</option>
              <option value="json">Format : JSON (codebook)</option>
            </select>
            {error && <p className="mb-2 text-xs text-error">{error}</p>}
            <button className="btn btn-primary w-full gap-1.5" onClick={handleExport} disabled={exporting}>
              {exporting ? (
                <span className="loading loading-spinner loading-xs" />
              ) : (
                <Download size={16} strokeWidth={1.75} />
              )}
              {exporting ? "Génération en cours…" : `Exporter ${size} question${size > 1 ? "s" : ""}`}
            </button>
            <button className="btn btn-ghost btn-sm mt-2 w-full" onClick={clear}>
              Vider le panier
            </button>
          </div>
        )}
      </aside>
    </>
  );
}
