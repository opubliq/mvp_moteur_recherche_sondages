import { useCallback, useState, type ReactNode } from "react";

/**
 * Tooltip in-app réutilisable (remplace les `title=` navigateur, dont le délai
 * d'apparition et le style ne sont pas contrôlables). Générique sur le type de
 * données affichées : chaque graphe fournit sa propre forme de payload et son
 * propre rendu via `render`.
 *
 * Usage :
 *   const { tip, showTip, hideTip } = useHoverTip<{ label: string; pct: string }>();
 *   <div onMouseMove={(e) => showTip(e, { label, pct })} onMouseLeave={hideTip} />
 *   <HoverTip tip={tip} render={(d) => <>{d.label} — {d.pct}</>} />
 */
export interface HoverTipState<T> {
  x: number;
  y: number;
  data: T;
}

export function useHoverTip<T>() {
  const [tip, setTip] = useState<HoverTipState<T> | null>(null);

  const showTip = useCallback((e: { clientX: number; clientY: number }, data: T) => {
    setTip({ x: e.clientX, y: e.clientY, data });
  }, []);
  const hideTip = useCallback(() => setTip(null), []);

  return { tip, showTip, hideTip };
}

export function HoverTip<T>({
  tip,
  render,
}: {
  tip: HoverTipState<T> | null;
  render: (data: T) => ReactNode;
}) {
  if (!tip) return null;
  return (
    <div
      className="pointer-events-none fixed z-50 rounded-md border border-base-content/10 bg-base-100 px-2.5 py-1.5 text-xs shadow-lg"
      style={{ left: tip.x + 12, top: tip.y + 12 }}
    >
      {render(tip.data)}
    </div>
  );
}
