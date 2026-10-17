# Outil agent `geo_profile` / `geo_lookup` — geo-marketing-api (bead 9ou.5)

Vision : `docs/vision_plateforme.md`, chantier 2 (géo). Code : `src/logic/geoTool.ts`
(+ tests `src/logic/geoTool.test.ts`, `src/logic/agentGeoTool.test.ts`). État : **code
branché et testé (vitest + run réel contre l'API géo en local), geo-marketing-api PAS
déployée sur Azure** (aucun Container App dans l'abonnement au 2026-10-17) — les
commandes `az` ci-dessous sont donc pour **après** ce déploiement, pas pour aujourd'hui.

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
| `GEO_API_BASE_URL` | URL de base de geo-marketing-api (ex. `http://localhost:8000` en dev, l'URL Container Apps une fois déployée). Absente = outil non branché. |
| `GEO_API_TOKEN` | **Dev local / premier déploiement seulement** : jeton fixe. Si présent, pris en priorité sur la managed identity. |
| `GEO_API_TOKEN_AUDIENCE` | Audience AAD de l'app registration geo-marketing-api (ex. `api://<client-id-geo>`) — utilisée pour obtenir un jeton par **identité managée système** (comme `pythonSandbox.ts` pour les dynamic sessions). |
| `IDENTITY_ENDPOINT`, `IDENTITY_HEADER` | Déjà injectées par Azure Functions, réutilisées telles quelles. |

Si `GEO_API_BASE_URL` est configuré sans `GEO_API_TOKEN` ni `GEO_API_TOKEN_AUDIENCE`,
`buildGeoTool` logge un avertissement et appelle l'API **sans** jeton — correct seulement
si l'API géo tourne en dev local (`ENVIRONNEMENT=dev`, bypass Easy Auth côté API géo).

## Authentification — comment geo-marketing-api est protégée (une fois déployée)

Lu dans `geo-marketing-api/app/core/auth.py` + `config.py` + README (API pas déployée,
donc rien à vérifier côté `az containerapp` aujourd'hui — pas de ressource existante) :

- **Production (Container Apps)** : Easy Auth, fournisseur Entra ID (AAD), *require
  authentication*. L'app lit les en-têtes `X-MS-CLIENT-PRINCIPAL(-NAME)` injectés par la
  plateforme (fiables seulement derrière Easy Auth) et n'accepte que les **courriels**
  listés dans `ACCES_UTILISATEURS` (`utilisateurs_autorises`, politique de gouvernance
  §3) ; sinon 403.
- **Dev local** : `AUTH_DEV_UTILISATEUR` bypass tout, mais seulement si
  `ENVIRONNEMENT=dev` (défaut `prod`).

### Écart important pour un appel service-à-service (Function App → geo-marketing-api)

`utilisateurs_autorises` ne regarde que des claims de type courriel
(`preferred_username`, `email`, `upn`, …). Un jeton obtenu par l'**identité managée
système** de la Function App (flux *client credentials*, app-only) **n'a pas** de claim
courriel — Easy Auth validera l'audience/l'émetteur du jeton (donc la requête passe Easy
Auth), mais `utilisateur_courant()` lèvera quand même un **403** (« utilisateur absent de
la liste d'accès ») faute de courriel exploitable.

**Donc : tel quel, le câblage managed-identity ci-dessous ne suffira PAS à passer
l'auth applicative de geo-marketing-api.** Deux options, à trancher par le propriétaire
de geo-marketing-api (hors scope de ce bead — ne pas modifier ce dépôt frère) :

1. **Recommandé** : dans `geo-marketing-api/app/core/auth.py`, accepter aussi un jeton
   app-only dont le claim `appid`/`azp` correspond à une liste blanche de service
   principals autorisés (ex. le MI de `opubliq-sondages-functions`), en plus du chemin
   courriel existant.
2. Alternative plus lourde : exposer un App Role (`Application`-type) sur l'app
   registration geo-marketing-api, l'assigner au MI de la Function App, et faire
   vérifier ce rôle (claim `roles`) côté API au lieu du courriel — nécessite aussi un
   changement de code côté geo-marketing-api.

Tant que ce changement n'est pas fait côté geo-marketing-api, `GEO_API_TOKEN` (jeton
statique, ex. celui d'un compte de service avec courriel dans `ACCES_UTILISATEURS`) est
la seule voie qui fonctionnera en prod sans toucher à geo-marketing-api — à n'utiliser
qu'en attendant l'option 1.

### Commandes `az` à exécuter (toi, pas moi) une fois geo-marketing-api déployée sur Container Apps

```bash
SUB=a54061e5-b5f7-49c0-94f0-d2e7b95de4a4
RG=rg-opubliq-sondages              # ou le groupe choisi pour geo-marketing-api
CAPP=<nom-container-app-geo>        # à définir au déploiement
FUNC_MI=791ed199-6c60-49b4-af54-308f622d4577   # vérifié : principalId du MI système de opubliq-sondages-functions

# 1. Activer Easy Auth (AAD) sur le Container App, API → 401 si non authentifié
#    (pas de redirection login, c'est une API) :
az containerapp auth microsoft update \
  --subscription $SUB -g $RG -n $CAPP \
  --client-id <client-id-app-registration-geo> \
  --client-secret-setting-name geo-auth-client-secret \
  --issuer "https://login.microsoftonline.com/<tenant-id>/v2.0" \
  --yes
az containerapp auth update --subscription $SUB -g $RG -n $CAPP \
  --unauthenticated-client-action Return401

# 2. (Si l'option 2 ci-dessus est retenue côté geo-marketing-api) exposer un App Role
#    "Application" sur l'app registration geo-marketing-api et l'assigner au MI :
GEO_APP_ID=<client-id-app-registration-geo>
GEO_SP_ID=$(az ad sp show --id $GEO_APP_ID --query id -o tsv)
az ad app update --id $GEO_APP_ID --app-roles '[{
  "allowedMemberTypes": ["Application"],
  "displayName": "Geo Reader (service)",
  "id": "<nouveau-guid, ex. uuidgen>",
  "isEnabled": true,
  "description": "Lecture census/geo depuis la Function App sondages (pas dons).",
  "value": "Geo.Read"
}]'
az rest --method POST \
  --uri "https://graph.microsoft.com/v1.0/servicePrincipals/$FUNC_MI/appRoleAssignments" \
  --body "{\"principalId\": \"$FUNC_MI\", \"resourceId\": \"$GEO_SP_ID\", \"appRoleId\": \"<id-du-role-ci-dessus>\"}"

# 3. App settings de opubliq-sondages-functions :
az functionapp config appsettings set --subscription $SUB -g $RG -n opubliq-sondages-functions --settings \
  GEO_API_BASE_URL="https://<fqdn-container-app-geo>" \
  GEO_API_TOKEN_AUDIENCE="api://$GEO_APP_ID"
# (ne PAS définir GEO_API_TOKEN en prod une fois l'option 1/2 en place côté geo-marketing-api)
```

Ce que chaque étape fait :
1. Force Easy Auth AAD sur le Container App, renvoie 401 (pas une redirection) à toute
   requête non authentifiée — nécessaire pour une API.
2. (Optionnel, option 2) déclare un rôle applicatif « lecture seule census/geo » sur
   l'app registration geo-marketing-api et l'assigne au service principal du MI de la
   Function App — c'est ce qui permettrait à l'API géo de vérifier un claim `roles`
   plutôt qu'un courriel.
3. Donne à la Function App l'URL de base et l'audience à utiliser pour obtenir un jeton
   par MI (`geoManagedIdentityTokenProvider`, `src/logic/geoTool.ts`).

Toutes ces commandes sont des lectures/écritures Azure AD + Container App standards ;
aucune n'a été exécutée par ce travail (seules des commandes `az` **en lecture** ont
servi à vérifier qu'aucun Container App n'existe encore et à confirmer le `principalId`
du MI ci-dessus).

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

## Risques ouverts

- **Auth prod non résolue** : voir « Écart important » ci-dessus — geo-marketing-api doit
  changer son code d'auth (appid/rôle app) avant qu'un MI pur fonctionne sans jeton
  statique. À suivre comme un bead côté geo-marketing-api (pas créé ici, dépôt frère).
  C'est pourquoi 9ou.5 reste **in_progress** plutôt que fermé.
- **geo-marketing-api non déployée** : tout ce document au-delà de la section « dev
  local » est préparatoire.
- **Script `venv/bin/uvicorn`** cassé (shebang pointant vers `electoral-atlas-api`) — pas
  corrigé ici (dépôt frère, hors scope) ; contourné avec `python -m uvicorn`.
