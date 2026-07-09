import { useEffect, useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { Search, LayoutGrid, Sparkles, MessageSquare, ShoppingCart, Settings } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { fetchAllSurveys } from "../api";
import { useCart } from "../context/CartContext";
import ExportDrawer from "./ExportDrawer";

interface ModeDef {
  key: string;
  Ico: LucideIcon;
  label: string;
  to: string;
  soon?: boolean;
}

const MODES: ModeDef[] = [
  { key: "recherche", Ico: Search, label: "Recherche", to: "/recherche" },
  { key: "corpus", Ico: LayoutGrid, label: "Exploration corpus", to: "/corpus" },
  { key: "agent", Ico: Sparkles, label: "Agent analytique", to: "/agent", soon: true },
  { key: "verbatims", Ico: MessageSquare, label: "Verbatims", to: "/verbatims", soon: true },
];

export default function AppShell() {
  const { size } = useCart();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [stats, setStats] = useState<{ surveys: number; questions: number } | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchAllSurveys()
      .then((d) => {
        if (!cancelled) setStats({ surveys: d.surveys.length, questions: d.total_questions || 0 });
      })
      .catch(() => {
        /* corpus indisponible : on masque les stats */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="app-shell">
      <aside className="rail">
        <div className="rail-brand">
          <img className="rail-logo" src="/opubliq-symbole.png" alt="Opubliq" />
          <div>
            <b>Opubliq</b>
            <span>Moteur de sondages</span>
          </div>
        </div>

        <nav className="rail-nav">
          {MODES.map((m) => (
            <NavLink
              key={m.key}
              to={m.to}
              className={({ isActive }) => `rail-item ${isActive ? "active" : ""} ${m.soon ? "soon" : ""}`}
            >
              <span className="ico"><m.Ico size={18} strokeWidth={1.75} /></span>
              <span>{m.label}</span>
              {m.soon && <span className="soon-tag">bientôt</span>}
            </NavLink>
          ))}
        </nav>

        {stats && (
          <div className="rail-foot">
            <div className="rail-stat">
              <span>Sondages</span>
              <b>{stats.surveys}</b>
            </div>
            <div className="rail-stat">
              <span>Questions</span>
              <b>{stats.questions.toLocaleString("fr-CA")}</b>
            </div>
          </div>
        )}
      </aside>

      <div className="main-col">
        <header className="topbar">
          <div className="flex-1" />
          <button className="btn btn-ghost btn-sm gap-1.5" onClick={() => setDrawerOpen(true)}>
            <ShoppingCart size={16} strokeWidth={1.75} /> Export {size > 0 && <span className="cart-count">{size}</span>}
          </button>
          <button className="btn btn-ghost btn-sm" title="Réglages" aria-label="Réglages">
            <Settings size={16} strokeWidth={1.75} />
          </button>
        </header>

        <main className="content">
          <Outlet />
        </main>
      </div>

      <ExportDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </div>
  );
}
