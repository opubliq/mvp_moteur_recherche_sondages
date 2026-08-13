import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { X, Download, FileSpreadsheet } from "lucide-react";
import { useCart, cartKey, type CartItem } from "../context/CartContext";
import { exportCart, type ExportFormat } from "../lib/exportCart";
import { exportCartXlsx, DEMO_TYPES } from "../lib/exportExcel";
import { useLanguage } from "../context/LanguageContext";
import type { TranslationKey } from "../i18n/fr";

type FullExportFormat = ExportFormat | "xlsx";

/** Slide-over du panier d'export : liste groupée par sondage + download réel. */
export default function ExportDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { items, size, remove, clear } = useCart();
  const [format, setFormat] = useState<FullExportFormat>("xlsx");
  const [demoTypes, setDemoTypes] = useState<string[]>(["age", "gender", "region"]);
  const [filename, setFilename] = useState("");
  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const ext = format === "xlsx" ? "xlsx" : format === "json" ? "json" : "csv";
  const defaultName = `opubliq-export-${new Date().toISOString().slice(0, 10)}`;

  function toggleDemo(key: string) {
    setDemoTypes((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  }

  function resolvedFilename(): string {
    const base = filename.trim() || defaultName;
    return base.toLowerCase().endsWith(`.${ext}`) ? base : `${base}.${ext}`;
  }

  async function handleExport() {
    setError(null);
    if (format === "xlsx") {
      setExporting(true);
      setProgress({ done: 0, total: 0 });
      try {
        await exportCartXlsx(items, demoTypes, (done, total) => setProgress({ done, total }), resolvedFilename());
      } catch (err) {
        setError(err instanceof Error ? err.message : t("exportDrawer.exportFailed"));
      } finally {
        setExporting(false);
        setProgress(null);
      }
    } else {
      await exportCart(items, format, resolvedFilename());
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
      <aside className="slideover" role="dialog" aria-label={t("exportDrawer.aria")}>
        <div className="flex items-center justify-between border-b border-base-content/10 p-4">
          <b>{t("exportDrawer.titleWithCount", { count: size, plural: size > 1 ? "s" : "" })}</b>
          <button className="btn btn-ghost btn-sm" onClick={onClose} aria-label={t("exportDrawer.close")}>
            <X size={18} strokeWidth={1.75} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {groups.length === 0 ? (
            <p className="text-sm text-base-content/60">{t("exportDrawer.emptyCart")}</p>
          ) : (
            groups.map((g) => (
              <div key={g.name} className="mb-4">
                <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-base-content/55">
                  {g.name} · {g.year ?? t("timeline.undated")}
                </div>
                {g.items.map((it) => (
                  <div key={cartKey(it.survey_id, it.variable)} className="mb-2 flex items-start gap-2">
                    <span className="flex-1 text-sm leading-snug">{it.question_text}</span>
                    <button
                      className="btn btn-ghost btn-xs"
                      onClick={() => remove(cartKey(it.survey_id, it.variable))}
                      aria-label={t("exportDrawer.remove")}
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
              <option value="xlsx">{t("exportDrawer.formatXlsx")}</option>
              <option value="csv-large">{t("exportDrawer.formatCsv")}</option>
              <option value="json">{t("exportDrawer.formatJson")}</option>
            </select>

            {format === "xlsx" && (
              <div className="mb-2">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-base-content/55">
                  {t("exportDrawer.crossWith")}
                </p>
                <div className="flex flex-wrap gap-x-3 gap-y-1">
                  {DEMO_TYPES.map((dt) => (
                    <label key={dt.key} className="flex items-center gap-1.5 text-xs">
                      <input
                        type="checkbox"
                        className="checkbox checkbox-xs"
                        checked={demoTypes.includes(dt.key)}
                        onChange={() => toggleDemo(dt.key)}
                      />
                      {t(`demoType.${dt.key}` as TranslationKey)}
                    </label>
                  ))}
                </div>
                <p className="mt-1 text-[11px] text-base-content/50">{t("exportDrawer.crossWithHint")}</p>
              </div>
            )}

            <input
              type="text"
              className="input input-bordered input-sm mb-2 w-full"
              placeholder={defaultName}
              value={filename}
              onChange={(e) => setFilename(e.target.value)}
              aria-label={t("exportDrawer.filenameAria")}
            />

            {error && <p className="mb-2 text-xs text-error">{error}</p>}
            <button className="btn btn-primary w-full gap-1.5" onClick={handleExport} disabled={exporting}>
              {exporting ? (
                <span className="loading loading-spinner loading-xs" />
              ) : (
                <Download size={16} strokeWidth={1.75} />
              )}
              {exporting
                ? progress && progress.total > 0
                  ? t("exportDrawer.generatingProgress", { done: progress.done, total: progress.total })
                  : t("exportDrawer.generating")
                : t("exportDrawer.exportButton", { count: size, plural: size > 1 ? "s" : "" })}
            </button>
            <button
              className="btn btn-ghost btn-sm mt-2 w-full gap-1.5"
              onClick={() => {
                onClose();
                navigate("/exportation-avancee");
              }}
            >
              <FileSpreadsheet size={15} strokeWidth={1.75} />
              {t("exportDrawer.advancedExport")}
            </button>
            <button className="btn btn-ghost btn-sm mt-2 w-full" onClick={clear}>
              {t("exportDrawer.clearCart")}
            </button>
          </div>
        )}
      </aside>
    </>
  );
}
