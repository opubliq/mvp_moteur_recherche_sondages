import {
  CORPUS, THEMES, SURVEYS, DEMO_QUERY, DEMO_CONCEPTS,
  surveyById, questionByVar, relevanceCounts,
} from "./data.js";

// ---------------- État global (mockup) ----------------
const state = {
  cart: new Set(),          // clés "surveyId::variable"
  cartOpen: false,
  expanded: new Set(),      // sondages dépliés dans la recherche
  concepts: DEMO_CONCEPTS.map((c) => ({ ...c })),
  query: DEMO_QUERY,
  xtab: {},                 // variable de question -> variable croisée
};

const cartKey = (sid, v) => `${sid}::${v}`;
const inCart = (sid, v) => state.cart.has(cartKey(sid, v));

const MODES = [
  { key: "recherche", ico: "🔍", label: "Recherche", route: "#/recherche" },
  { key: "corpus", ico: "▤", label: "Exploration corpus", route: "#/corpus" },
  { key: "agent", ico: "✦", label: "Agent analytique", route: "#/agent", soon: true },
  { key: "verbatims", ico: "💬", label: "Verbatims", route: "#/verbatims", soon: true },
];

// ---------------- Helpers de rendu ----------------
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

function relevanceBadges(counts) {
  const parts = [];
  if (counts.Exact) parts.push(`<span class="op-badge op-badge-exact">${counts.Exact} Exact</span>`);
  if (counts.Partiel) parts.push(`<span class="op-badge op-badge-partiel">${counts.Partiel} Partiel</span>`);
  if (counts.Faible) parts.push(`<span class="op-badge op-badge-faible">${counts.Faible} Faible</span>`);
  return parts.join(" ");
}

function pertBadge(p) {
  const cls = { Exact: "op-badge-exact", Partiel: "op-badge-partiel", Faible: "op-badge-faible" }[p] || "op-badge-plain";
  return `<span class="op-badge ${cls}">${p}</span>`;
}
function pertBar(p) {
  const lvl = { Exact: "exact", Partiel: "partiel", Faible: "faible" }[p];
  return lvl ? `<div class="op-bar ${lvl}"><i></i></div>` : "";
}

function cartCheckbox(sid, v) {
  return `<input type="checkbox" class="cart-check" data-cart="${sid}::${v}" ${inCart(sid, v) ? "checked" : ""} title="Ajouter à l'export" onclick="event.stopPropagation()">`;
}

// ---------------- Coquille ----------------
function shell(activeMode, contentHtml) {
  const nav = MODES.map((m) => `
    <a class="rail-item ${m.key === activeMode ? "active" : ""} ${m.soon ? "soon" : ""}" href="${m.route}">
      <span class="ico">${m.ico}</span>
      <span>${m.label}</span>
      ${m.soon ? '<span class="soon-tag">bientôt</span>' : ""}
    </a>`).join("");

  return `
  <div class="app-shell">
    <aside class="rail">
      <div class="rail-brand">
        <div class="rail-logo"></div>
        <div><b>Opubliq</b><span>Moteur de sondages</span></div>
      </div>
      <nav class="rail-nav">${nav}</nav>
      <div class="rail-foot">
        <div class="rail-stat"><span>Sondages</span><b>${CORPUS.n_surveys}</b></div>
        <div class="rail-stat"><span>Questions</span><b>${CORPUS.n_questions.toLocaleString("fr-CA")}</b></div>
      </div>
    </aside>
    <div class="main-col">
      <header class="topbar">
        <div class="gsearch"><span>🔍</span><span>Recherche rapide dans le corpus…</span></div>
        <div class="spacer"></div>
        <button class="btn btn-ghost btn-sm" data-cart-toggle>
          🛒 Export ${state.cart.size ? `<span class="cart-count">${state.cart.size}</span>` : ""}
        </button>
        <button class="btn btn-ghost btn-sm" title="Réglages">⚙︎</button>
      </header>
      <main class="content">${contentHtml}</main>
    </div>
  </div>
  ${state.cartOpen ? cartOverlay() : ""}`;
}

// ---------------- Vue : Recherche ----------------
function viewSearch() {
  const conceptChips = state.concepts.map((c, i) => `
    <span class="concept-chip">
      <b>${esc(c.orig)}</b>
      ${c.qualifiers && c.qualifiers.length ? `<span class="q">·${esc(c.qualifiers.join(" / "))}</span>` : ""}
      <span class="w">${c.weight.toFixed(1)}</span>
      <input type="range" min="0" max="1" step="0.1" value="${c.weight}" data-weight="${i}">
    </span>`).join("");

  // Résultats : sondages triés, chacun avec ses questions non-sociodémo pertinentes
  const groups = SURVEYS.map((s) => {
    const qs = s.questions.filter((q) => q.pertinence !== "Hors-sujet" && !q.is_sociodemo);
    return { s, qs, counts: relevanceCounts(qs) };
  }).filter((g) => g.qs.length);

  const totalQ = groups.reduce((n, g) => n + g.qs.length, 0);
  const totalCounts = groups.reduce((acc, g) => {
    for (const k of ["Exact", "Partiel", "Faible"]) acc[k] += g.counts[k];
    return acc;
  }, { Exact: 0, Partiel: 0, Faible: 0 });

  const facets = `
    <div>
      <div class="facet-group">
        <div class="facet-h">Année</div>
        ${[2024, 2023, 2022].map((y) => `<label class="facet-item"><input type="checkbox"> ${y} <span class="cnt">${SURVEYS.filter((s) => s.survey_year === y).length}</span></label>`).join("")}
      </div>
      <div class="facet-group">
        <div class="facet-h">Sondeur</div>
        ${["Léger", "SOM", "Pallas Data"].map((p) => `<label class="facet-item"><input type="checkbox"> ${p} <span class="cnt">${SURVEYS.filter((s) => s.pollster === p).length}</span></label>`).join("")}
      </div>
      <div class="facet-group">
        <div class="facet-h">Thème</div>
        ${THEMES.slice(0, 5).map((t) => `<label class="facet-item"><input type="checkbox"> ${t.value} <span class="cnt">${t.count}</span></label>`).join("")}
      </div>
      <div class="facet-group">
        <div class="facet-h">Sondage</div>
        ${SURVEYS.map((s) => `<label class="facet-item"><input type="checkbox"> <span style="max-width:11rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(s.survey_name)}</span></label>`).join("")}
      </div>
    </div>`;

  const resultCards = groups.map(({ s, qs, counts }) => {
    const open = state.expanded.has(s.id);
    const rows = qs.map((q) => `
      <div class="q-row">
        ${cartCheckbox(s.id, q.variable)}
        <div style="width:4.5rem" class="flex-none">${pertBar(q.pertinence)}<div class="text-xs muted mt-1">${q.pertinence}</div></div>
        <a class="flex-1 leading-snug" href="#/sondage/${s.id}/q/${q.variable}">
          ${esc(q.question_text)}
          ${q.is_open ? ' <span class="op-badge op-badge-plain">ouverte</span>' : ""}
        </a>
      </div>`).join("");
    return `
      <div class="op-card op-card-hover" style="padding:0">
        <button class="survey-head" aria-expanded="${open}" data-toggle="${s.id}">
          <span class="chev">▸</span>
          <span class="flex-1">
            <span class="font-semibold">${esc(s.survey_name)}</span>
            <span class="flex gap-2 text-xs muted mt-1 wrap">
              <span>${s.survey_year} · ${esc(s.pollster)}</span>
              <span>· ${qs.length} question${qs.length > 1 ? "s" : ""}</span>
            </span>
          </span>
          <span class="flex gap-1 items-center flex-none">${relevanceBadges(counts)}</span>
        </button>
        ${open ? `<div>${rows}</div>` : ""}
      </div>`;
  }).join("");

  const content = `
    <div class="mb-2"><p class="op-kicker mb-3">Recherche de questions</p></div>
    <div class="op-card mb-3" style="padding:0.6rem">
      <div class="flex gap-2 items-center">
        <input class="input" value="${esc(state.query)}" placeholder="Rechercher un concept…" style="border:none;background:transparent" data-query>
        <button class="btn btn-primary">Rechercher</button>
      </div>
    </div>
    <div class="concept-row mb-5">
      <span class="text-xs muted-2 font-semibold" style="text-transform:uppercase;letter-spacing:.06em">Concepts</span>
      ${conceptChips}
      <button class="btn btn-ghost btn-xs">＋ concept</button>
    </div>

    <div class="grid-facets">
      ${facets}
      <div>
        <div class="flex items-center gap-3 mb-4 wrap">
          <span class="text-sm muted">${totalQ} questions · ${groups.length} sondages</span>
          <span class="flex gap-1">${relevanceBadges(totalCounts)}</span>
        </div>
        <div class="flex col gap-3">${resultCards}</div>
      </div>
    </div>`;
  return content;
}

// ---------------- Vue : Détail sondage ----------------
function viewSurvey(id) {
  const s = surveyById(id);
  if (!s) return `<p>Sondage introuvable.</p>`;
  const qs = s.questions;
  const rows = qs.map((q) => `
    <div class="q-row">
      ${cartCheckbox(s.id, q.variable)}
      <div style="width:3.5rem" class="flex-none text-xs muted tabular">${esc(q.variable)}</div>
      <a class="flex-1 leading-snug" href="#/sondage/${s.id}/q/${q.variable}">
        ${esc(q.question_text)}
        ${q.is_open ? ' <span class="op-badge op-badge-plain">ouverte</span>' : ""}
        ${q.is_sociodemo ? ' <span class="op-badge op-badge-plain">sociodémo</span>' : ""}
      </a>
      <span class="flex-none">${q.pertinence !== "Hors-sujet" ? pertBadge(q.pertinence) : ""}</span>
    </div>`).join("");

  return `
    <div class="crumbs">
      <a href="#/recherche">Recherche</a><span class="sep">/</span>
      <span class="muted">${esc(s.survey_name)}</span>
    </div>
    <div class="op-card mb-4">
      <div class="flex justify-between items-start gap-4 wrap">
        <div style="max-width:46rem">
          <h1 class="text-2xl font-semibold leading-snug">${esc(s.survey_name)}</h1>
          <div class="flex gap-2 muted text-sm mt-2 wrap">
            <span>${s.survey_year}</span><span>·</span><span>${esc(s.pollster)}</span><span>·</span>
            <span>${s.language}</span><span>·</span><span>N = ${s.n_respondents.toLocaleString("fr-CA")}</span>
          </div>
          <p class="mt-3 leading-snug muted">${esc(s.survey_description)}</p>
          <div class="flex gap-1 mt-3 wrap">
            ${s.top_concepts.map((c) => `<span class="op-badge op-badge-plain">${esc(c.value)} <span class="muted-2">${c.count}</span></span>`).join("")}
          </div>
        </div>
        <div class="flex col gap-2 flex-none">
          <button class="btn btn-primary btn-sm" data-add-survey="${s.id}">＋ Tout ajouter à l'export</button>
          <button class="btn btn-outline btn-sm">⬇ Télécharger le sondage</button>
        </div>
      </div>
    </div>
    <h2 class="section-title mb-3">${qs.length} questions</h2>
    <div class="op-card" style="padding:0">${rows}</div>`;
}

// ---------------- Vue : Dashboard de question (drill-down) ----------------
function viewQuestion(id, variable) {
  const s = surveyById(id);
  const q = questionByVar(id, variable);
  if (!s || !q) return `<p>Question introuvable.</p>`;

  const crumbs = `
    <div class="crumbs">
      <a href="#/recherche">Recherche</a><span class="sep">/</span>
      <a href="#/sondage/${s.id}">${esc(s.survey_name)}</a><span class="sep">/</span>
      <span class="muted">${esc(q.variable)}</span>
    </div>`;

  const header = `
    <div class="op-card mb-4">
      <div class="flex justify-between items-start gap-4 wrap">
        <div style="max-width:46rem">
          <div class="flex gap-2 items-center mb-2">
            <span class="op-badge op-badge-plain tabular">${esc(q.variable)}</span>
            ${q.pertinence !== "Hors-sujet" ? pertBadge(q.pertinence) : ""}
            ${q.is_open ? '<span class="op-badge op-badge-plain">question ouverte</span>' : ""}
          </div>
          <h1 class="text-xl font-semibold leading-snug">${esc(q.question_text)}</h1>
        </div>
        <div class="flex col gap-2 flex-none">
          <button class="btn ${inCart(s.id, q.variable) ? "btn-outline" : "btn-primary"} btn-sm" data-cart="${s.id}::${q.variable}">
            ${inCart(s.id, q.variable) ? "✓ Dans l'export" : "＋ Ajouter à l'export"}
          </button>
          <button class="btn btn-outline btn-sm">⬇ Données brutes</button>
        </div>
      </div>
    </div>`;

  // Panneau principal : soit distribution (fermée) soit verbatims (ouverte)
  let mainPanel;
  if (q.is_open) {
    mainPanel = `
      <div class="op-card mb-4">
        <h3 class="font-semibold mb-3">Analyse des verbatims <span class="op-badge op-badge-plain">EPIC Verbatims</span></h3>
        <div class="flex gap-2 wrap mb-3">
          ${["eau (42)", "déchets (31)", "circulation (28)", "espaces verts (19)", "bruit (12)"].map((t) => `<span class="op-badge op-badge-plain">${t}</span>`).join("")}
        </div>
        <div class="flex col gap-2">
          ${["« La qualité de l'eau du fleuve devrait être une priorité. »", "« Trop de déchets qui traînent dans les parcs. »", "« La circulation et le smog au centre-ville. »"].map((v) => `<div class="chat-bubble chat-bot text-sm">${esc(v)}</div>`).join("")}
        </div>
      </div>`;
  } else {
    const maxPct = Math.max(...q.dist);
    const distRows = q.response_options.map((o, i) => {
      const pct = q.dist[i] ?? 0;
      return `<div class="dist-row"><span class="leading-snug">${esc(o.label)}</span><div class="dist-track"><div class="dist-fill" style="width:${(pct / maxPct) * 100}%"></div></div><span class="dist-pct">${pct}%</span></div>`;
    }).join("");
    mainPanel = `
      <div class="op-card mb-4">
        <h3 class="font-semibold mb-3">Distribution des réponses</h3>
        ${distRows}
        <p class="text-xs muted-2 mt-3">Base : ${s.n_respondents.toLocaleString("fr-CA")} répondants · pondéré</p>
      </div>
      ${crossTabPanel(s, q)}`;
  }

  const sidebar = `
    <div class="op-card mb-4">
      <h3 class="font-semibold mb-3 text-sm" style="text-transform:uppercase;letter-spacing:.05em;opacity:.6">Filtres sociodémo</h3>
      ${["Âge", "Genre", "Région", "Revenu", "Scolarité"].map((f) => `
        <div class="facet-group" style="margin-bottom:.7rem">
          <div class="facet-h">${f}</div>
          <div class="flex gap-1 wrap">${filterChips(f)}</div>
        </div>`).join("")}
      <button class="btn btn-primary btn-sm w-full mt-2">Appliquer les filtres</button>
    </div>
    <div class="op-card">
      <h3 class="font-semibold mb-2 text-sm">Autres questions du sondage</h3>
      ${s.questions.filter((x) => x.variable !== q.variable).slice(0, 4).map((x) => `<a class="facet-item leading-snug" href="#/sondage/${s.id}/q/${x.variable}" style="display:block;padding:.35rem 0">${esc(x.question_text.slice(0, 60))}…</a>`).join("")}
    </div>`;

  return `${crumbs}${header}<div class="grid-dash"><div>${mainPanel}</div><div>${sidebar}</div></div>`;
}

function filterChips(f) {
  const opts = {
    "Âge": ["18-34", "35-54", "55+"], "Genre": ["Femme", "Homme"],
    "Région": ["Centre", "Banlieue", "Rural"], "Revenu": ["< 50k", "50-100k", "100k+"],
    "Scolarité": ["Sec.", "Collég.", "Univ."],
  }[f] || [];
  return opts.map((o) => `<span class="op-badge op-badge-plain" style="cursor:pointer">${o}</span>`).join("");
}

function crossTabPanel(s, q) {
  const others = s.questions.filter((x) => x.variable !== q.variable && !x.is_open && x.response_options.length);
  const selected = state.xtab[q.variable] || (others[0] && others[0].variable);
  const other = others.find((x) => x.variable === selected);

  const selectHtml = `
    <select class="input select" data-xtab="${q.variable}" style="max-width:26rem">
      ${others.map((x) => `<option value="${x.variable}" ${x.variable === selected ? "selected" : ""}>${esc(x.question_text.slice(0, 70))}</option>`).join("")}
    </select>`;

  if (!other) return `<div class="op-card"><h3 class="font-semibold mb-2">Croiser avec une autre question</h3><p class="muted text-sm">Aucune question croisable dans ce sondage.</p></div>`;

  // Heatmap inventée : rows = options de q, cols = options de other
  const rows = q.response_options;
  const cols = other.response_options;
  const head = `<tr><th></th>${cols.map((c) => `<th>${esc(c.label)}</th>`).join("")}</tr>`;
  const body = rows.map((r, ri) => {
    const cells = cols.map((c, ci) => {
      const v = ((ri * 7 + ci * 13 + 11) % 40) + 3; // pseudo-valeurs stables
      const alpha = v / 45;
      return `<td class="cell" style="background:color-mix(in oklch, var(--color-primary) ${Math.round(alpha * 55)}%, white)">${v}%</td>`;
    }).join("");
    return `<tr><td class="rowh">${esc(r.label)}</td>${cells}</tr>`;
  }).join("");

  return `
    <div class="op-card">
      <h3 class="font-semibold mb-2">Croiser avec une autre question</h3>
      <div class="mb-3">${selectHtml}</div>
      <div style="overflow-x:auto"><table class="xtab">${head}${body}</table></div>
      <p class="text-xs muted-2 mt-2">Répartition en ligne (%) · valeurs illustratives</p>
    </div>`;
}

// ---------------- Vue : Exploration corpus ----------------
function viewCorpus() {
  const years = [2020, 2021, 2022, 2023, 2024];
  const byYear = years.map((y) => ({ y, n: SURVEYS.filter((s) => s.survey_year === y).length + (y < 2022 ? y % 3 : 0) }));
  const maxN = Math.max(...byYear.map((b) => b.n), 1);
  const bars = byYear.map((b) => `
    <div class="tl-col">
      <div class="tl-cnt">${b.n || ""}</div>
      <div class="tl-bar" style="height:${b.n ? (b.n / maxN) * 120 + 8 : 3}px;${b.n ? "" : "opacity:.3"}"></div>
      <div class="tl-year">${b.y}</div>
    </div>`).join("");

  const maxTheme = Math.max(...THEMES.map((t) => t.count));
  const themeBars = THEMES.map((t) => `
    <div class="dist-row"><span class="leading-snug">${esc(t.value)}</span><div class="dist-track"><div class="dist-fill" style="width:${(t.count / maxTheme) * 100}%"></div></div><span class="dist-pct">${t.count}</span></div>`).join("");

  return `
    <p class="op-kicker mb-3">Vue d'ensemble du corpus</p>
    <div class="flex gap-4 mb-6 wrap">
      <div class="op-card flex-1"><div class="text-sm muted">Sondages</div><div class="text-2xl font-bold op-primary">${CORPUS.n_surveys}</div></div>
      <div class="op-card flex-1"><div class="text-sm muted">Questions indexées</div><div class="text-2xl font-bold" style="color:var(--color-secondary)">${CORPUS.n_questions.toLocaleString("fr-CA")}</div></div>
      <div class="op-card flex-1"><div class="text-sm muted">Sondeurs</div><div class="text-2xl font-bold op-primary">3</div></div>
    </div>
    <h2 class="section-title mb-1">Chronologie du corpus</h2>
    <p class="muted text-sm mb-4">Nombre de sondages par année. Clique une année pour voir ses sondages.</p>
    <div class="op-card mb-6" style="overflow-x:auto"><div class="tl">${bars}</div></div>
    <h2 class="section-title mb-1">Répartition thématique</h2>
    <p class="muted text-sm mb-4">Part des questions par thème (tout le corpus).</p>
    <div class="op-card">${themeBars}</div>`;
}

// ---------------- Vue : Agent (placeholder) ----------------
function viewAgent() {
  return `
    <p class="op-kicker mb-3">Agent analytique · à venir</p>
    <h2 class="section-title mb-1">Pose une question en langage naturel</h2>
    <p class="muted text-sm mb-5" style="max-width:44rem">L'agent trouve les questions pertinentes, exécute du code sur les données brutes et te retourne un court rapport structuré. (Maquette)</p>
    <div class="flex col gap-3 mb-5" style="max-width:46rem">
      <div class="chat-bubble chat-user">Montre l'évolution des attitudes envers l'environnement chez les 55 ans et plus.</div>
      <div class="chat-bubble chat-bot">
        J'ai trouvé <b>3 questions comparables</b> (2022, 2023, 2024). Chez les 55+, la satisfaction envers la qualité de l'eau passe de 61 % à 75 %…
        <div class="mt-2 flex gap-2"><span class="op-badge op-badge-exact">3 questions</span><span class="op-badge op-badge-plain">rapport md</span></div>
      </div>
    </div>
    <div class="op-card" style="max-width:46rem"><div class="flex gap-2 items-center"><input class="input" placeholder="Écris ta question…" style="border:none"><button class="btn btn-primary">Envoyer</button></div></div>`;
}

function viewVerbatims() {
  const openQs = SURVEYS.flatMap((s) => s.questions.filter((q) => q.is_open).map((q) => ({ s, q })));
  return `
    <p class="op-kicker mb-3">Analyse qualitative · à venir</p>
    <h2 class="section-title mb-1">Questions ouvertes du corpus</h2>
    <p class="muted text-sm mb-5">Explore les réponses libres par thématique émergente. Chaque question ouvre son dashboard de verbatims.</p>
    <div class="op-card" style="padding:0">
      ${openQs.map(({ s, q }) => `<a class="q-row" href="#/sondage/${s.id}/q/${q.variable}"><span class="flex-1 leading-snug">${esc(q.question_text)}</span><span class="text-xs muted">${esc(s.survey_name)} · ${s.survey_year}</span></a>`).join("")}
    </div>`;
}

// ---------------- Panier (slide-over) ----------------
function cartOverlay() {
  const items = [...state.cart].map((k) => {
    const [sid, v] = k.split("::");
    const s = surveyById(sid); const q = questionByVar(sid, v);
    return { k, s, q };
  }).filter((x) => x.q);

  const bySurvey = {};
  for (const it of items) (bySurvey[it.s.id] ??= { s: it.s, items: [] }).items.push(it);

  const body = Object.values(bySurvey).map(({ s, items }) => `
    <div class="mb-4">
      <div class="text-xs font-semibold muted mb-2" style="text-transform:uppercase;letter-spacing:.05em">${esc(s.survey_name)} · ${s.survey_year}</div>
      ${items.map(({ k, q }) => `<div class="flex gap-2 items-start mb-2"><span class="flex-1 text-sm leading-snug">${esc(q.question_text)}</span><button class="btn btn-ghost btn-xs" data-cart-remove="${k}">✕</button></div>`).join("")}
    </div>`).join("");

  return `
    <div class="overlay-bg" data-cart-toggle></div>
    <aside class="slideover">
      <div class="flex items-center justify-between p-4 border-t" style="border-top:none;border-bottom:1px solid color-mix(in oklch, var(--color-base-content) 8%, transparent)">
        <b>Panier d'export · ${state.cart.size} question${state.cart.size > 1 ? "s" : ""}</b>
        <button class="btn btn-ghost btn-sm" data-cart-toggle>✕</button>
      </div>
      <div class="p-4" style="flex:1;overflow-y:auto">
        ${items.length ? body : '<p class="muted text-sm">Aucune question sélectionnée. Coche des questions dans la recherche ou un sondage.</p>'}
      </div>
      ${items.length ? `
      <div class="p-4" style="border-top:1px solid color-mix(in oklch, var(--color-base-content) 8%, transparent)">
        <div class="flex gap-2 mb-2">
          <select class="input select"><option>Format : CSV (large)</option><option>Format : CSV (long)</option><option>JSON</option><option>Excel (.xlsx)</option></select>
        </div>
        <button class="btn btn-primary w-full">⬇ Exporter ${state.cart.size} question${state.cart.size > 1 ? "s" : ""}</button>
        <button class="btn btn-ghost btn-sm w-full mt-2" data-cart-clear>Vider le panier</button>
      </div>` : ""}
    </aside>`;
}

// ---------------- Router ----------------
function currentMode(hash) {
  if (hash.startsWith("#/corpus")) return "corpus";
  if (hash.startsWith("#/agent")) return "agent";
  if (hash.startsWith("#/verbatims")) return "verbatims";
  return "recherche"; // recherche + sondage/question restent dans le mode Recherche
}

function render() {
  const hash = location.hash || "#/recherche";
  const mode = currentMode(hash);
  let content;

  const mQ = hash.match(/^#\/sondage\/([^/]+)\/q\/([^/]+)/);
  const mS = hash.match(/^#\/sondage\/([^/]+)$/);
  if (mQ) content = viewQuestion(mQ[1], mQ[2]);
  else if (mS) content = viewSurvey(mS[1]);
  else if (hash.startsWith("#/corpus")) content = viewCorpus();
  else if (hash.startsWith("#/agent")) content = viewAgent();
  else if (hash.startsWith("#/verbatims")) content = viewVerbatims();
  else content = viewSearch();

  document.getElementById("app").innerHTML = shell(mode, content);
}

// ---------------- Interactions (délégation) ----------------
document.addEventListener("click", (e) => {
  const t = e.target.closest("[data-toggle],[data-cart],[data-cart-toggle],[data-cart-remove],[data-cart-clear],[data-add-survey]");
  if (!t) return;

  if (t.dataset.toggle != null) {
    const id = t.dataset.toggle;
    state.expanded.has(id) ? state.expanded.delete(id) : state.expanded.add(id);
    render();
  } else if (t.dataset.cart != null && t.tagName !== "INPUT") {
    // bouton "ajouter à l'export" (dashboard)
    const k = t.dataset.cart;
    state.cart.has(k) ? state.cart.delete(k) : state.cart.add(k);
    render();
  } else if (t.dataset.cartToggle != null) {
    state.cartOpen = !state.cartOpen;
    render();
  } else if (t.dataset.cartRemove != null) {
    state.cart.delete(t.dataset.cartRemove);
    render();
  } else if (t.dataset.cartClear != null) {
    state.cart.clear();
    render();
  } else if (t.dataset.addSurvey != null) {
    const s = surveyById(t.dataset.addSurvey);
    for (const q of s.questions) if (!q.is_sociodemo) state.cart.add(cartKey(s.id, q.variable));
    state.cartOpen = true;
    render();
  }
});

// checkbox panier (change)
document.addEventListener("change", (e) => {
  const cb = e.target.closest("input.cart-check");
  if (cb) {
    const k = cb.dataset.cart;
    cb.checked ? state.cart.add(k) : state.cart.delete(k);
    render();
    return;
  }
  const w = e.target.closest("input[data-weight]");
  if (w) {
    state.concepts[+w.dataset.weight].weight = parseFloat(w.value);
    render();
    return;
  }
  const xt = e.target.closest("select[data-xtab]");
  if (xt) {
    state.xtab[xt.dataset.xtab] = xt.value;
    render();
  }
});

window.addEventListener("hashchange", render);
render();
