import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// Chemins servis par les Azure Functions (azure-functions/src/functions/*.ts).
// Le proxy dev vise `func start` (localhost:7071) plutôt que `netlify dev` :
// c'est la cible de la migration hosting (bead b1d), et c'est la seule des
// deux implémentations à porter le système de comptes (f3i.19) — les
// fonctions Netlify legacy n'ont jamais été branchées sur `checkAuth`.
const AZURE_FUNCTIONS_TARGET = "http://localhost:7071";
const API_PATHS = [
  "auth",
  "conversations",
  "search",
  "survey",
  "surveys",
  "decompose",
  "themes",
  "open-questions",
  "verbatims",
  "annotate",
  "scan",
  "microdata",
  "microdata-raw",
  "microdata-manifest",
  "agent",
];

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      [`^/(${API_PATHS.join("|")})\\b`]: {
        target: AZURE_FUNCTIONS_TARGET,
        changeOrigin: true,
      },
    },
  },
});
