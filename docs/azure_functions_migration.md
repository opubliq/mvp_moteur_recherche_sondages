# Migration Netlify Functions → Azure Functions (f3i.1)

Scaffold posé le 2026-08-05. **Les 11 endpoints sont portés et testés en
direct** (Azure Functions Core Tools local, contre les vraies ressources
Azure — AI Search, AOAI, Foundry, Cohere, Blob Storage). Reste hors scope de
ce ticket : le déploiement réel sur une ressource Azure Functions (le
portage a été validé en local uniquement, cf. §Restant ci-dessous).

## Décisions

- **Hosting** : Azure Functions Node.js v4 (programming model le plus
  récent), plan **Flex Consumption** — serverless comme aujourd'hui, mais
  sans les limites du plan Consumption classique sur les dépendances
  natives (pertinent pour DuckDB, cf. `microdata-core`).
- **Auth** : pas d'équivalent Azure aux Netlify Edge Functions (pas de hook
  générique `path: "/*"`). Remplacé par un **middleware applicatif**
  (`azure-functions/src/middleware/auth.ts`) répliquant à l'identique la
  logique Basic Auth de `netlify/edge-functions/auth.ts` (mêmes variables
  d'env `BASIC_AUTH_USER`/`PASSWORD`/`BASIC_AUTH_EXTRA_ACCOUNTS`), appelé en
  tête de chaque handler plutôt que de dépendre d'Easy Auth (qui changerait
  le modèle vers SSO/Entra ID au lieu de porter le Basic Auth existant).

## Structure

```
azure-functions/
  host.json                        # config runtime Functions
  package.json                     # main: glob vers dist/azure-functions/src/functions/*.js
  tsconfig.json                    # rootDir ".." pour englober src/logic/ et src/types.ts partagés
  local.settings.json.example      # squelette env vars locales (jamais le vrai fichier, gitignored)
  src/
    functions/
      search.ts                   # référence portée — un fichier par endpoint, app.http(...) en bas
    middleware/
      auth.ts                     # Basic Auth, remplace l'edge function
```

**Important** : `src/logic/*` (retrieve, rerank, costlog, tenancy, corpus,
agent, decompose, annotate, scan, conversations) est réutilisé **sans
modification** — ces modules sont déjà agnostiques du framework HTTP.
`HeaderSource` (`src/logic/costlog.ts`) accepte un `Headers` Fetch natif,
exactement ce que fournit `request.headers` côté Azure Functions v4 — aucun
adaptateur nécessaire pour `resolveClientId`/`resolveAuthorizedTenant`/etc.

## Pattern de portage (par endpoint)

1. Copier la logique métier du fichier `netlify/functions/X.ts` telle
   quelle — elle ne change pas.
2. Remplacer la coquille :
   - `Handler` (type Netlify) → `(request: HttpRequest, context: InvocationContext) => Promise<HttpResponseInit>`
   - `event.httpMethod` → `request.method`
   - `event.headers` → `request.headers` (déjà compatible `HeaderSource`)
   - `JSON.parse(event.body ?? "{}")` → `await request.json()`
   - `{ statusCode, headers, body: JSON.stringify(...) }` → `{ status, headers, jsonBody: ... }`
3. Ajouter `const authFailure = checkBasicAuth(request); if (authFailure) return authFailure;`
   en tête (après le court-circuit CORS OPTIONS).
4. Enregistrer la route en bas du fichier : `app.http("nom", { methods: [...], route: "nom", handler })`.
5. Vérifier avec `npx tsc -p tsconfig.json --noEmit` **depuis
   `azure-functions/`** (le tsconfig racine du repo est un fichier de
   références vide — un `tsc -p tsconfig.json` lancé depuis la racine ne
   vérifie RIEN de ce dossier, piège rencontré pendant le scaffold).

## Checklist des endpoints — tous portés et testés en direct (func start + curl)

- [x] `search.ts` (référence) — recherche hybride + rerank Cohere, vraie citation vérifiée
- [x] `decompose.ts` — décomposition Mistral-Large-3
- [x] `survey.ts` — GET+POST, query params
- [x] `surveys.ts` — GET, facettes concepts
- [x] `themes.ts` — facettes + browse
- [x] `open-questions.ts` — catalogue
- [x] `verbatims.ts` — parcours ET recherche (BM25 + rerank Cohere, scores vérifiés)
- [x] `annotate.ts` — classification testée avec une grille réelle
- [x] `scan.ts` — proposition de grille testée avec un échantillon réel
- [x] `microdata.ts` + `microdata-manifest.ts` — DuckDB natif + httpfs + Blob SAS validés (distribution, crosstab pondéré, t-test de Welch), isolation multi-tenant re-testée (404 sur sondage privé)
- [x] `agent.ts` — streaming SSE réel avec tool-calling (`list_themes`) et réponse LLM, testé via `curl -sN`

## Points résolus pendant le portage

- **DuckDB natif** (`microdata-core`) : fonctionne tel quel sous Azure
  Functions Core Tools local — `@duckdb/node-api` + binding natif
  (`node_modules/@duckdb/node-bindings-linux-x64/`) se chargent et
  s'exécutent sans configuration spéciale côté `host.json`/`package.json`
  (contrairement à Netlify qui exige `external_node_modules`/`included_files`
  dans `netlify.toml`). **Non validé pour autant en déploiement réel Flex
  Consumption** — le comportement de packaging d'un binding natif dans le zip
  de déploiement Azure reste à vérifier au premier déploiement.
- **Streaming** (`agent.ts`) : le fichier Netlify source était déjà écrit en
  anticipant cette migration (format v2 `Request`/`Response` Fetch standard,
  `ReadableStream` Web). `HttpResponseBodyInit` d'`@azure/functions` accepte
  ce même `ReadableStream` natif (cf.
  `node_modules/@azure/functions/types/http.d.ts`) — portage sans changement
  de mécanisme, seule la coquille handler change. Testé en direct : les
  frames SSE (`tool_start`, `tool_end`, `message`, `done`) arrivent
  correctement via `curl -sN`.
- Azure Functions Core Tools (`func`) installé (`npm install -g
  azure-functions-core-tools@4`, v4.12.1) — utilisé pour tous les tests ci-dessus.

## Restant (hors scope de ce ticket)

- **Déploiement réel** sur une ressource Azure Functions (Flex Consumption) —
  tout ce qui précède est validé en local uniquement (`func start`), jamais
  déployé. Packaging du binding DuckDB natif à re-vérifier au premier
  déploiement (cf. ci-dessus).
- **Redirects** (`netlify.toml` `[[redirects]]`) : chaque route est
  actuellement exposée sans le préfixe `/.netlify/functions/`. Le `route:`
  d'`app.http` reproduit ça (`route: "search"` → `/api/search` par défaut,
  **le préfixe `/api` par défaut d'Azure Functions doit être neutralisé**
  — fait dans le scaffold via `extensions.http.routePrefix: ""` dans
  `host.json` — pour préserver le contrat `/search`, `/agent`, etc. attendu
  par le frontend.
- **CORS** : géré ici par des headers en dur par fonction (comme côté
  Netlify). À terme, envisager `host.json` → `CORS` au niveau plateforme
  pour éviter la duplication sur 11 fichiers.
