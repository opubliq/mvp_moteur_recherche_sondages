# Migration Netlify Functions → Azure Functions (f3i.1)

Scaffold posé le 2026-08-05. `/search` porté comme référence du pattern ;
les 10 autres endpoints + `microdata-core` restent à porter en suivant le
même moule.

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

## Checklist des endpoints restants

- [x] `search.ts` (référence)
- [ ] `decompose.ts`
- [ ] `survey.ts`
- [ ] `surveys.ts`
- [ ] `themes.ts`
- [ ] `open-questions.ts`
- [ ] `verbatims.ts`
- [ ] `annotate.ts`
- [ ] `scan.ts`
- [ ] `microdata.ts` + `microdata-manifest.ts` (dépendent de `microdata-core/`, DuckDB natif — cf. point d'attention ci-dessous)
- [ ] `agent.ts` (streaming — cf. point d'attention ci-dessous)

## Points d'attention non résolus (hors scope du scaffold initial)

- **DuckDB natif** (`microdata-core`) : Netlify a un réglage spécial dans
  `netlify.toml` (`external_node_modules`, `included_files`) pour empaqueter
  le binding `.node`. Azure Functions Flex Consumption doit supporter un
  équivalent (dépendance native dans le zip de déploiement) — à valider
  concrètement avec `func pack`/`func start` avant de porter `microdata.ts`.
  Azure Functions Core Tools (`func`) n'était pas installé sur cette machine
  au moment du scaffold — à installer avant de continuer.
- **Streaming** (`agent.ts`) : la boucle tool-use de l'agent streame la
  réponse (SSE ou équivalent côté Netlify). Le modèle Node v4 d'Azure
  Functions supporte les réponses en flux via un `Readable`/`ReadableStream`
  en retour — le mapping exact reste à valider en portant ce fichier
  spécifiquement (le plus complexe du lot, à faire en dernier).
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
