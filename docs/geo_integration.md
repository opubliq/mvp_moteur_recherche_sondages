# Outil agent `geo_profile` / `geo_lookup` — geo-marketing-api (bead 9ou.5)

Vision : `docs/vision_plateforme.md`, chantier 2 (géo). Code : `src/logic/geoTool.ts`
(+ tests `src/logic/geoTool.test.ts`, `src/logic/agentGeoTool.test.ts`). État : **déployé
et validé de bout en bout en production le 2026-10-18** : agent de la Function App →
identité managée → Easy Auth → `geo-marketing-api` sur Container Apps.

Scope dur : **recensement seulement**. `assertAllowedPath` (liste blanche de regex,
`src/logic/geoTool.ts`) bloque toute route `/dons/*`, même déguisée — c'est un garde-fou
technique, pas une consigne de prompt. Le module `dons` de geo-marketing-api (indice de
contributions DGEQ) reste hors de portée tant que la revue Loi 25
(`geo-marketing-api/docs/loi25/`) n'est pas faite.

## Câblage (fait)

- `src/logic/geoTool.ts` : liste blanche, client HTTP, compaction des réponses, défs
  d'outils (`GEO_PROFILE_TOOL_DEF`, `GEO_LOOKUP_TOOL_DEF`), ajout de prompt système
  (`GEO_PROMPT_ADDITION` — cite toujours « Recensement 2021, StatCan » et distingue
  données de sondage vs profil de territoire).
- `src/logic/agent.ts` : `executeTool` dispatche `geo_profile`/`geo_lookup` vers
  `geoTool?.profile`/`.lookup` (`undefined` → `{ error: "... pas disponible" }`, jamais
  d'exception) ; `runAgentStream` ajoute les défs d'outil + la ligne de prompt
  **seulement** si `opts.geoTool` est fourni (même mécanique que `opts.runPython`, 9ou.12).
- `azure-functions/src/functions/agent.ts` : `buildGeoTool(context)` — kill-switch par
  app setting : `undefined` si `GEO_API_BASE_URL` absent (pas dans `REQUIRED_ENV`, une
  Function App sans cette variable continue de fonctionner à l'identique).

## Variables d'environnement (Function App)

| Variable | Rôle |
| --- | --- |
| `GEO_API_BASE_URL` | URL de base de geo-marketing-api (`https://opubliq-geo-api.purpleforest-7fa51f82.canadaeast.azurecontainerapps.io` en prod). Absente = outil non branché. |
| `GEO_API_TOKEN` | **Dev local / premier déploiement seulement** : jeton fixe. Si présent, pris en priorité sur la managed identity. |
| `GEO_API_TOKEN_AUDIENCE` | Audience AAD de l'app registration geo-marketing-api (ex. `api://<client-id-geo>`) — utilisée pour obtenir un jeton par **identité managée système** (comme `pythonSandbox.ts` pour les dynamic sessions). |
| `IDENTITY_ENDPOINT`, `IDENTITY_HEADER` | Déjà injectées par Azure Functions, réutilisées telles quelles. |

Si `GEO_API_BASE_URL` est configuré sans `GEO_API_TOKEN` ni `GEO_API_TOKEN_AUDIENCE`,
`buildGeoTool` logge un avertissement et appelle l'API **sans** jeton — correct seulement
si l'API géo tourne en dev local (`ENVIRONNEMENT=dev`, bypass Easy Auth côté API géo).

## Authentification — comment geo-marketing-api est protégée

Configuration déployée sur le Container App `opubliq-geo-api` :

- **Production (Container Apps)** : Easy Auth, fournisseur Entra ID (AAD), *require
  authentication*. L'app lit les en-têtes `X-MS-CLIENT-PRINCIPAL(-NAME)` injectés par la
  plateforme (fiables seulement derrière Easy Auth) et accepte les **courriels** listés
  dans `ACCES_UTILISATEURS` ou les applications listées dans `ACCES_APPLICATIONS` ;
  sinon 403.
- **Dev local** : `AUTH_DEV_UTILISATEUR` bypass tout, mais seulement si
  `ENVIRONNEMENT=dev` (défaut `prod`).

### Appel service-à-service (Function App → geo-marketing-api)

Un jeton obtenu par l'**identité managée système** de la Function App (flux *client
credentials*, app-only) n'a pas de claim courriel. `geo-marketing-api` accepte maintenant
les claims `appid`/`azp` app-only dont le **client ID** figure dans la variable
`ACCES_APPLICATIONS`, en plus des courriels humains de `ACCES_UTILISATEURS`. Un jeton
délégué avec courriel reste soumis à `ACCES_UTILISATEURS` et ne peut pas hériter de
l'accès de son application cliente.

Pour `opubliq-sondages-functions` :

- principal/object ID de l'identité managée : `791ed199-6c60-49b4-af54-308f622d4577` ;
- client/application ID à mettre dans `ACCES_APPLICATIONS` :
  `63cba2eb-0325-4b41-a0d2-895c23ffa143`.

Le correctif est dans `geo-marketing-api` (commit `87e39cc`) et ses tests couvrent
`appid`, `azp`, le refus d'une application inconnue et le non-contournement des accès
utilisateurs.

### Commandes `az` de référence

```bash
SUB=a54061e5-b5f7-49c0-94f0-d2e7b95de4a4
GEO_RG=rg-opubliq-geo-marketing
FUNC_RG=rg-opubliq-sondages
CAPP=opubliq-geo-api
GEO_APP_ID=62fd5eb3-0bee-4166-97ab-32dd1805a092
FUNC_MI=791ed199-6c60-49b4-af54-308f622d4577   # vérifié : principalId du MI système de opubliq-sondages-functions

# 1. Activer Easy Auth (AAD) sur le Container App, API → 401 si non authentifié
#    (pas de redirection login, c'est une API) :
az containerapp auth microsoft update \
  --subscription $SUB -g $GEO_RG -n $CAPP \
  --client-id $GEO_APP_ID \
  --client-secret-setting-name geo-auth-client-secret \
  --issuer "https://login.microsoftonline.com/c52ff7ea-8f71-42f2-8417-2ac2d2a1295d/v2.0" \
  --yes
az containerapp auth update --subscription $SUB -g $GEO_RG -n $CAPP \
  --unauthenticated-client-action Return401

# 2. Autoriser le client ID de l'identité managée dans le Container App :
az containerapp update --subscription $SUB -g $GEO_RG -n $CAPP \
  --set-env-vars ACCES_APPLICATIONS=63cba2eb-0325-4b41-a0d2-895c23ffa143

# Référence : retrouver le client ID (appid) à partir du principal/object ID du MI :
az ad sp show --id $FUNC_MI --query appId -o tsv

# 3. App settings de opubliq-sondages-functions :
az functionapp config appsettings set --subscription $SUB -g $FUNC_RG -n opubliq-sondages-functions --settings \
  GEO_API_BASE_URL="https://opubliq-geo-api.purpleforest-7fa51f82.canadaeast.azurecontainerapps.io" \
  GEO_API_TOKEN_AUDIENCE="api://$GEO_APP_ID"
# (ne PAS définir GEO_API_TOKEN en prod)
```

Ce que chaque étape fait :
1. Force Easy Auth AAD sur le Container App, renvoie 401 (pas une redirection) à toute
   requête non authentifiée — nécessaire pour une API.
2. Place le client ID (`appid`/`azp`), et non le principal ID (`oid`), du MI dans la
   liste blanche applicative de `geo-marketing-api`.
3. Donne à la Function App l'URL de base et l'audience à utiliser pour obtenir un jeton
   par MI (`geoManagedIdentityTokenProvider`, `src/logic/geoTool.ts`).

Ces réglages sont appliqués en production depuis le 2026-10-18. La Function App utilise
l'audience `api://62fd5eb3-0bee-4166-97ab-32dd1805a092`; `GEO_API_TOKEN` est absent, donc
le trajet utilise obligatoirement l'identité managée.

## Dev local (fait, vérifié de bout en bout)

1. geo-marketing-api : `.env` avec `ENVIRONNEMENT=dev`, `AUTH_DEV_UTILISATEUR=<ton
   courriel>` — bypass Easy Auth, aucun jeton requis.
2. Lancer l'API (le script `venv/bin/uvicorn` du dépôt a un shebang cassé qui pointe vers
   un autre dépôt — `electoral-atlas-api/venv` — probablement un renommage ; passer par
   `venv/bin/python -m uvicorn app.main:app --host 127.0.0.1 --port 8000` à la place) :
   ```bash
   cd geo-marketing-api
   venv/bin/python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
   ```
   Premier appel census ~20-25 s (chargement en mémoire des Parquet depuis Blob via
   `az login`), puis quelques ms. Nécessite *Storage Blob Data Reader* sur
   `opubliqgeomarketing` pour le compte `az login` courant.
3. Côté sondages : `GEO_API_BASE_URL=http://localhost:8000`, ni `GEO_API_TOKEN` ni
   `GEO_API_TOKEN_AUDIENCE` → `createGeoTool({ baseUrl: "http://localhost:8000" })` sans
   `getToken`, aucun header `Authorization` envoyé — accepté par le bypass dev de l'API
   géo.

### Vérification réelle effectuée (2026-10-17)

Boucle agent réelle (`runAgentStream`, `AGENT_CHAT_DEPLOYMENT=gpt-5.5`, microdata réelle,
geoTool pointé sur `http://localhost:8000`), question : « Fais-moi le portrait
socio-démographique de la circonscription de Rosemont (ou du code postal H2G). »

Trace d'outils (`done.result.trace`) :
```json
[
  {"tool": "geo_profile", "args": {"niveau": "circonscription_2026", "code": "Rosemont"}, "ok": true},
  {"tool": "geo_profile", "args": {"niveau": "rta", "code": "H2G"}, "ok": true}
]
```
Réponse finale : tableau comparatif Rosemont (circonscription 2026, population 76 849)
vs H2G (RTA, population 22 413) par âge/langue/scolarité/logement/transport, source citée
en tête (« Recensement 2021, StatCan, via API géo ») et distinction territoire/unité
explicite pour chaque colonne. L'agent note lui-même l'hypothèse de lecture (Rosemont =
circonscription, H2G = RTA) et propose de reciblier si ce n'est pas ce qui était voulu.
Confirme : feature flag OK, dispatch OK, compaction OK, prompt système respecté par le
modèle.

### Vérification réelle en production (2026-10-18)

Requête envoyée au `/agent` de `opubliq-sondages-functions` : comparer le portrait de la
circonscription de Rosemont et de la RTA H2G, sans données de sondage.

- HTTP 200 et flux SSE complet, sans événement d'erreur ;
- deux appels `geo_profile` réussis (`circonscription_2026/Rosemont`, puis `rta/H2G`) ;
- réponse finale chiffrée citant « Recensement 2021, StatCan, via API géo » ;
- logs du Container App : les deux requêtes retournent 200 avec
  `utilisateur: application:63cba2eb-0325-4b41-a0d2-895c23ffa143`, ce qui confirme
  l'identité managée de la Function App ;
- appel anonyme direct à l'API géo : 401 ;
- compte et session temporaires du smoke test supprimés après validation.

## Risques ouverts

- L'outil de l'agent conserve sa liste blanche technique qui interdit toutes les routes
  `/dons/*`; leur exposition dans l'app reste bloquée sur la revue Loi 25 (9ou.17).
- **Script `venv/bin/uvicorn`** cassé (shebang pointant vers `electoral-atlas-api`) — pas
  corrigé ici (dépôt frère, hors scope) ; contourné avec `python -m uvicorn`.
