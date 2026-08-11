# Migration Netlify Functions → Azure Functions (f3i.1)

Scaffold posé le 2026-08-05. **Les 11 endpoints sont portés, déployés et
validés en production** sur `opubliq-sondages-functions.azurewebsites.net`
(Function App Flex Consumption, `rg-opubliq-sondages`/canadaeast) — testés
d'abord en local (Azure Functions Core Tools), puis en déploiement cloud réel
contre les vraies ressources Azure (AI Search, AOAI, Foundry, Cohere, Blob
Storage).

## Ressources créées (2026-08-05)

- Storage account `opubliqsondagesfunc` (canadaeast, Standard_LRS) — storage
  interne requis par Flex Consumption (AzureWebJobsStorage/déploiement),
  distinct de `opubliqsondagesdata` (données micro-données).
- Function App `opubliq-sondages-functions` (Flex Consumption, Node.js 20,
  Functions v4, 2048 Mo/instance, canadaeast) —
  `https://opubliq-sondages-functions.azurewebsites.net`.
- App settings = mêmes clés que `.env`/Netlify (`SEARCH_*`, `AOAI_*`,
  `COHERE_RERANK_*`, `FOUNDRY_CHAT_*`, `AZURE_STORAGE_*`) + `BASIC_AUTH_USER`/
  `BASIC_AUTH_PASSWORD`/`BASIC_AUTH_EXTRA_ACCOUNTS` (mêmes valeurs que
  Netlify, récupérées via `netlify env:get`).
- **Piège rencontré** : le premier déploiement est parti SANS les variables
  `BASIC_AUTH_*` — les 11 endpoints ont été exposés publiquement (avec de
  vraies clés Azure derrière) pendant la fenêtre entre déploiement et
  correction. Corrigé dans la foulée + `az functionapp restart` (les
  `appsettings set` ne sont pas pris en compte à chaud sans redémarrage).
  **Sur un prochain déploiement propre, configurer `BASIC_AUTH_*` AVANT tout
  test public.**

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
- [x] `microdata.ts` + `microdata-manifest.ts` — DuckDB natif + httpfs + Blob SAS validés (distribution, crosstab pondéré, t-test de Welch), isolation multi-tenant re-testée (404 sur sondage privé) — **y compris en déploiement cloud réel**
- [x] `agent.ts` — streaming SSE réel avec tool-calling (`list_themes`) et réponse LLM, testé via `curl -sN` — **y compris en déploiement cloud réel**

## Points résolus pendant le portage

- **DuckDB natif** (`microdata-core`) : fonctionne tel quel — local (Azure
  Functions Core Tools) ET en déploiement cloud réel (Flex Consumption).
  `@duckdb/node-api` + binding natif se chargent et s'exécutent sans
  configuration spéciale côté `host.json`/`package.json` (contrairement à
  Netlify qui exige `external_node_modules`/`included_files` dans
  `netlify.toml`) : `func azure functionapp publish` fait un déploiement zip
  simple (`remotebuild = false` dans les logs Kudu — pas de build Oryx, le
  `node_modules` local avec le binding déjà résolu part tel quel dans le
  zip), et le binding linux-x64 fonctionne directement sur l'hôte Flex
  Consumption (même OS cible). Validé avec un vrai crosstab pondéré contre
  le Blob de prod.
- **Streaming** (`agent.ts`) : le fichier Netlify source était déjà écrit en
  anticipant cette migration (format v2 `Request`/`Response` Fetch standard,
  `ReadableStream` Web). `HttpResponseBodyInit` d'`@azure/functions` accepte
  ce même `ReadableStream` natif (cf.
  `node_modules/@azure/functions/types/http.d.ts`) — portage sans changement
  de mécanisme, seule la coquille handler change. Testé en direct, local ET
  cloud : les frames SSE (`tool_start`, `tool_end`, `message`, `done`)
  arrivent correctement via `curl -sN`.
- Azure Functions Core Tools (`func`) installé (`npm install -g
  azure-functions-core-tools@4`, v4.12.1) — utilisé pour le déploiement et
  tous les tests locaux.

## ⚠️ Piège sécurité rencontré au déploiement

Le premier `func azure functionapp publish` est parti avec les clés
AI Search/AOAI/Cohere/Storage configurées, mais **sans** `BASIC_AUTH_USER`/
`BASIC_AUTH_PASSWORD` — `checkBasicAuth` ne bloque rien quand aucun compte
n'est configuré (même comportement que l'edge function Netlify, voulu pour
ne pas se verrouiller dehors en dev). Concrètement : les 11 endpoints ont
répondu publiquement, sans authentification, avec de vraies clés Azure
derrière, le temps entre le déploiement et la correction. Corrigé en
configurant `BASIC_AUTH_*` (mêmes valeurs que Netlify, récupérées via
`netlify env:get`) + `az functionapp restart` (**`appsettings set` n'est PAS
pris en compte à chaud** — un restart est nécessaire). Reconfirmé : 401 sans
credentials, 200 avec les bons.

**Pour tout futur déploiement d'une nouvelle ressource** : configurer
`BASIC_AUTH_*` AVANT le premier déploiement, ou au minimum avant tout test
public.

## Chemin relatif → same-origin cassé (résolu côté frontend, pas côté hosting)

Le frontend appelle les endpoints en chemin relatif (`fetch("/search")`,
etc., cf. `src/api.ts`) — sans risque quand frontend et functions partagent
un domaine (Netlify), mais ça casse dès que les deux sont hébergés
séparément (Azure Functions déployé sur son propre domaine
`*.azurewebsites.net`, frontend pas encore migré).

Fix appliqué : `apiUrl()` dans `src/api.ts`, préfixe optionnel via
`VITE_API_BASE_URL` (vide par défaut = chemin relatif inchangé). Ne résout
PAS le routage same-origin définitif (ça reste `b1d`/`f3i.2` — Static Web
Apps lié, proxy, Front Door…), mais découple les deux migrations : le
frontend peut pointer vers `https://opubliq-sondages-functions.azurewebsites.net`
dès maintenant sans attendre la décision d'architecture finale.

## Restant (hors scope de ce ticket)

- **Node 20 → 24** : la Function App tourne sur Node 20, dont l'avertissement
  de dépréciation (EOL 2026-04-29) est apparu au déploiement. Non bloquant
  aujourd'hui, mais à planifier avant l'échéance.
- **CORS** : géré ici par des headers en dur par fonction (comme côté
  Netlify), origine `*`. À resserrer à l'origine réelle du frontend une fois
  celui-ci hébergé (et envisager `host.json` → `CORS` au niveau plateforme
  pour éviter la duplication sur 11 fichiers).
- **Routage same-origin définitif** entre frontend et Functions — décision
  d'architecture qui appartient à `b1d`/`f3i.2`, pas à ce ticket.
- **Basic Auth des pages statiques** : le middleware ici ne protège que les
  endpoints API, pas des pages frontend (contrairement à l'edge function
  Netlify qui bloque `path: "/*"`). Une fois le frontend hébergé ailleurs, il
  faudra un mécanisme équivalent pour les pages (`b1d`).

---

# Hosting frontend Azure (b1d) — 2026-08-05

Décision : **Static Web Apps autonome + appel cross-origin vers les
Functions**, plutôt qu'un backend lié (SWA impose `/api/*`, aurait exigé de
renommer les 11 routes) ou App Service (plus de config, coût fixe).

## Ressource créée

- Static Web App `opubliq-sondages-web` (Free, East US 2 — SWA n'est pas
  disponible en canadaeast/canadacentral, régions limitées à Central US/East
  US 2/West US 2/West Europe/East Asia).
- URL : `https://nice-sea-019d41e0f.7.azurestaticapps.net`
- Build : `VITE_API_BASE_URL=https://opubliq-sondages-functions.azurewebsites.net npm run build`
  puis `swa deploy ./dist --deployment-token <token> --env production`
  (`az staticwebapp secrets list` pour le token).

## Bug corrigé pendant le déploiement

Réponse 401 de `checkBasicAuth` sans header CORS → erreur CORS opaque côté
navigateur au lieu d'un 401 lisible. Corrigé dans
`azure-functions/src/middleware/auth.ts` (commit 3c4620a).

## Trou fonctionnel connu, NON corrigé — bloquant pour un usage réel

Le Basic Auth natif du navigateur (prompt automatique + credentials
réattachés à chaque requête) fonctionnait sur Netlify parce que l'edge
function protégeait TOUT le domaine dès la navigation — le navigateur
propose son prompt natif au chargement de la page, avant même le premier
`fetch()`. Ici, la page statique (SWA) n'est PAS protégée ; seule l'API
(domaine différent) l'est. Un `fetch()` cross-origin vers un endpoint qui
répond 401 ne déclenche PAS de façon fiable le prompt natif du navigateur —
en pratique, l'app chargée sur `nice-sea-019d41e0f.7.azurestaticapps.net` ne
peut aujourd'hui récupérer AUCUNE donnée sans qu'un mécanisme fournisse
l'en-tête `Authorization` explicitement.

**Décision (2026-08-05, avec l'utilisateur)** : ne PAS patcher (ex. prompt()
+ header manuel) — `f3i.19` (vrai système de comptes, en cours par un autre
agent en parallèle) remplace explicitement le Basic Auth comme mécanisme de
périmètre selon sa propre description. Un patch intermédiaire serait jeté
et risquerait d'entrer en conflit. Ce trou reste donc ouvert et documenté
jusqu'à ce que f3i.19 fournisse le vrai mécanisme de session.

**Implication concrète** : `b1d` techniquement "fait" (le frontend sert
depuis Azure, Netlify plus dans le chemin pour cette partie), mais l'app
déployée n'est PAS utilisable de bout en bout tant que f3i.19 (ou un
remplacement du Basic Auth) n'est pas livré.

---

# Bascule DNS/domaine vers Azure (f3i.2) — 2026-08-11

Objectif : donner au Static Web App `opubliq-sondages-web` un sous-domaine
lisible (`app.opubliq.com`) au lieu de l'URL générée
`nice-sea-019d41e0f.7.azurestaticapps.net`, sans toucher à `opubliq.com`
(occupé par un site GitHub Pages existant, `opubliq.github.io`) ni à sa
zone DNS racine.

## Sous-domaine choisi

`app.opubliq.com` → CNAME vers le hostname par défaut du Static Web App.

## Enregistrement DNS requis (Namecheap, à ajouter par l'utilisateur)

Le DNS est géré par l'utilisateur chez Namecheap ; cet agent n'y a pas
accès. Enregistrement exact à ajouter dans la zone `opubliq.com` :

| Type  | Host  | Value                                      | TTL          |
|-------|-------|---------------------------------------------|--------------|
| CNAME | `app` | `nice-sea-019d41e0f.7.azurestaticapps.net`  | Automatic (ou 300–3600) |

Aucun enregistrement TXT n'est requis : la méthode de validation par
défaut d'Azure Static Web Apps pour un **sous-domaine** (par opposition à
un domaine apex) est `cname-delegation` — un simple CNAME suffit, Azure
valide la propriété du domaine via la résolution du CNAME lui-même. (La
méthode `dns-txt-token`, qui exige un TXT séparé, ne s'applique qu'aux
domaines racine/apex — non pertinent ici, `opubliq.com` racine n'est pas
touché.)

Ne rien changer à l'enregistrement `opubliq.com` (racine) existant.

## Commande Azure utilisée

```
az staticwebapp hostname set \
  --name opubliq-sondages-web \
  --resource-group rg-opubliq-sondages \
  --hostname app.opubliq.com
```

Premier essai (2026-08-11, avant que le CNAME existe côté Namecheap) :

```
ERROR: (BadRequest) CNAME Record is invalid.  Please ensure the CNAME record has been created.
```

Attendu — confirme juste qu'Azure attend le CNAME `app` → hostname par
défaut avant de pouvoir valider le domaine custom. Aucune commande n'a été
bloquée par le classificateur de permission ; l'échec est uniquement dû à
l'absence du CNAME côté DNS à ce stade.

## État au 2026-08-11

**En attente** : CNAME pas encore ajouté côté Namecheap (hors de portée de
cet agent). Une fois ajouté par l'utilisateur et propagé, relancer la même
commande `az staticwebapp hostname set` (ou la laisser réessayer via le
portail/CLI) pour compléter la validation. Azure provisionne ensuite
automatiquement le certificat TLS pour `app.opubliq.com` (comportement
standard SWA, aucune action manuelle attendue). Vérification finale à
faire après propagation : `curl -I https://app.opubliq.com` doit répondre
200 avec un certificat valide, et `az staticwebapp hostname list --name
opubliq-sondages-web --resource-group rg-opubliq-sondages` doit lister
`app.opubliq.com` avec le statut `Ready`.

`.env.example` et `netlify.toml` ne référencent pas l'URL du Static Web
App (Free tier générée) ni de domaine custom — aucun changement requis
côté config pour ce ticket.
