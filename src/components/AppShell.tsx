import { useEffect, useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { fetchAllSurveys } from "../api";
import { useCart } from "../context/CartContext";
import ExportDrawer from "./ExportDrawer";

interface ModeDef {
  key: string;
  ico: string;
  label: string;
  to: string;
  soon?: boolean;
}

const MODES: ModeDef[] = [
  { key: "recherche", ico: "🔍", label: "Recherche", to: "/recherche" },
  { key: "corpus", ico: "▤", label: "Exploration corpus", to: "/corpus" },
  { key: "agent", ico: "✦", label: "Agent analytique", to: "/agent", soon: true },
  { key: "verbatims", ico: "💬", label: "Verbatims", to: "/verbatims", soon: true },
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
          <div className="rail-logo" />
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
              <span className="ico">{m.ico}</span>
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
          <div className="gsearch">
            <span>🔍</span>
            <span>Recherche rapide dans le corpus…</span>
          </div>
          <div className="flex-1" />
          <button className="btn btn-ghost btn-sm" onClick={() => setDrawerOpen(true)}>
            🛒 Export {size > 0 && <span className="cart-count">{size}</span>}
          </button>
          <button className="btn btn-ghost btn-sm" title="Réglages" aria-label="Réglages">
            ⚙︎
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
