# Outil agent `run_python` — bac à sable Python (bead 9ou.4)

Vision : `docs/vision_plateforme.md`, chantier 1 (« Il fait des analyses complexes »).
Code : `src/logic/pythonSandbox.ts` (+ tests `src/logic/pythonSandbox.test.ts`).
État : **code prêt, non branché, infra non provisionnée.**

## Design

- **Bac à sable** : Azure Container Apps dynamic sessions, pool `PythonLTS` (code interpreter,
  isolation Hyper-V, pandas/numpy/statsmodels/scipy/sklearn/matplotlib/plotnine préinstallés),
  **canadaeast**, egress réseau désactivé.
- **Appel** : API REST du pool (`poolManagementEndpoint`), jeton Entra audience
  `https://dynamicsessions.io` obtenu par l'**identité managée système** de la Function App.
- **Données** : le backend lit le Parquet du Blob (SAS serveur, contrôle tenant) et le
  **téléverse** dans la session → `/mnt/data/<survey_id>.parquet`. La session n'a **aucun**
  identifiant de stockage. Un Parquet déjà présent dans la session n'est pas re-téléversé.
- **Session par conversation** : `sessionIdentifier(secret, userId, conversationId)` =
  HMAC-SHA256 hex (64 car.). Lié à l'usager authentifié : un `conversation_id` forgé
  par un autre usager tombe sur une autre session. Les variables Python persistent
  entre appels de la même conversation jusqu'au cooldown du pool.
- **Enrobage** (`wrapCode`) : code de l'agent passé en base64, exécuté dans `globals()`,
  stdout/stderr **capturés en mémoire** (traceback inclus). Dernière instruction évaluée
  comme dans un notebook (un ggplot est dessiné, sinon `repr` affiché). Épilogue : figures
  matplotlib ouvertes + ggplot plotnine dessinés (`p.show()`, `p.draw()` ou dernière
  expression ; `ggplot.draw` est patché pour les capter) → PNG 150 dpi, puis **tout**
  (stdout, stderr, erreur, figures, tableaux `show_table(df, title)`) est renvoyé en JSON
  comme **dernière expression** → champ `result` de la réponse.
  Helper `load(survey_id)` → DataFrame.
- **Pourquoi `result` et pas stdout** (bead 9ou.11, mesuré sur le pool) : `stdout` et
  `stderr` de la réponse sont tronqués par la plateforme à **~4 095 caractères** chacun
  (tête gardée) ; une figure base64 sur stdout faisait disparaître la charge utile →
  « exécution interrompue (statut Success) ». `result` passe intact (2 Mo testés).
  Sans charge utile valide (timeout, noyau mort), l'outil renvoie l'erreur + stdout/stderr bruts.
- **Style des figures** (prélude) : matplotlib (rcParams : fond blanc, police 11, titres
  gras à gauche, sans bordures haut/droite, grille y légère, cycle `OPQ_PALETTE`) et
  plotnine (`theme_minimal(base_size=11)`, 7×4,2 po, 150 dpi, remplissage par défaut teal,
  échelle discrète par défaut = `OPQ_PALETTE` jusqu'à 6 modalités puis hue). Palette
  (`FIGURE_PALETTE`) : teal primaire `#008c8e` (= `--color-primary`), corail `#f0695a`,
  teal foncé, teal clair, gris, ocre.
- **Limites** (`DEFAULT_RUN_PYTHON_LIMITS`) : 6 appels/requête, timeout 90 s (plafond
  plateforme 220 s), code ≤ 20 000 car., ≤ 5 sondages/appel, Parquet ≤ 100 Mo
  (plateforme 128 Mo), stdout 8 000 car. (tête), stderr 4 000 car. (queue),
  4 figures ≤ 1,5 Mo b64, 5 tableaux ≤ 50 × 30.
- **Interface** `SandboxExecutor` (`listFiles` / `uploadFile` / `execute`) :
  `AcaSessionsExecutor` en prod, faux exécuteur en mémoire dans les tests.
- **Version d'API** : `2024-02-02-preview` par défaut (`code/execute`, `files/upload` —
  celle des intégrations LangChain/Semantic Kernel). `2025-10-02-preview` (`executions`,
  `files`, doc actuelle) sélectionnable par `ACA_SESSIONS_API_VERSION` ; le parseur
  accepte les deux formes de réponse.

## Variables d'environnement (Function App)

| Variable | Rôle |
| --- | --- |
| `RUN_PYTHON_ENABLED` | `true` pour exposer l'outil à l'agent (kill-switch). |
| `ACA_SESSIONS_POOL_ENDPOINT` | `https://canadaeast.dynamicsessions.io/subscriptions/<sub>/resourceGroups/rg-opubliq-sondages/sessionPools/<pool>` |
| `RUN_PYTHON_POOL_KIND` | `pythonlts` (défaut) ou `custom` (pool CustomContainer avec MRP bayésienne, voir plus bas). |
| `ACA_SESSIONS_CUSTOM_POOL_ENDPOINT` | Endpoint du pool custom, lu seulement si `RUN_PYTHON_POOL_KIND=custom`. |
| `ACA_SESSIONS_API_VERSION` | `2024-02-02-preview` (défaut) ou `2025-10-02-preview`. |
| `ACA_SESSIONS_ID_SECRET` | Secret HMAC des identifiants de session (≥ 32 octets aléatoires ; référence Key Vault en prod). |
| `ACA_SESSIONS_TOKEN` | **Dev local seulement** : jeton `az account get-access-token --resource https://dynamicsessions.io --query accessToken -o tsv` (expire ~1 h). Vide en prod. |
| `RUN_PYTHON_MAX_CALLS_PER_REQUEST`, `RUN_PYTHON_TIMEOUT_SECONDS` | Surcharges optionnelles des limites. |
| `IDENTITY_ENDPOINT`, `IDENTITY_HEADER` | Injectées automatiquement par Azure Functions (identité managée). |

Placeholders ajoutés dans `azure-functions/local.settings.json.example`.

## Intégration (à faire quand `src/logic/agent.ts` est libre)

1. **`src/logic/agent.ts`**
   - Ajouter à `RunAgentOptions` : `runPython?: RunPythonTool` (figures/tableaux complets
     transmis à l'UI via la trace `tool_end`, voir 3).
   - `TOOL_DEFS` : construire la liste effective par requête :
     `const tools = opts.runPython ? [...TOOL_DEFS, RUN_PYTHON_TOOL_DEF] : TOOL_DEFS;`
     et l'utiliser dans l'appel chat (`makeAoaiChat` doit recevoir `tools` au lieu de lire
     la constante).
   - `executeTool` : nouveau `case "run_python"` → `opts.runPython.run(args)`. Garder le
     résultat complet pour l'UI ; le message `tool` envoyé au LLM = `JSON.stringify(toModelPayload(result))`
     (sans base64).
   - Garde-fou `has_microdata` : avant `run`, refuser tout `survey_ids` absent du manifest
     (même logique que `crosstab`).
   - `SYSTEM_PROMPT` : une règle courte — « `crosstab` d'abord ; `run_python` seulement pour
     régression multivariée, tendance multi-sondages, profils, pondération spéciale ; toujours
     utiliser `__weight` ; citer sondage + variable ».
2. **`azure-functions/src/functions/agent.ts`**
   - Lire `conversation_id` du corps (string 1–128, sinon ignorer l'outil pour cette requête).
   - Si `RUN_PYTHON_ENABLED === "true"` et l'endpoint présent :
     ```ts
     const getToken = process.env.ACA_SESSIONS_TOKEN
       ? staticTokenProvider(process.env.ACA_SESSIONS_TOKEN)
       : managedIdentityTokenProvider({
           identityEndpoint: process.env.IDENTITY_ENDPOINT!,
           identityHeader: process.env.IDENTITY_HEADER!,
         });
     const executor = new AcaSessionsExecutor({
       poolManagementEndpoint: process.env.ACA_SESSIONS_POOL_ENDPOINT!,
       apiVersion: (process.env.ACA_SESSIONS_API_VERSION as AcaApiVersion) || undefined,
       getToken,
     });
     const runPython = createRunPythonTool({
       executor,
       sessionId: await sessionIdentifier(process.env.ACA_SESSIONS_ID_SECRET!, auth.userId, conversationId),
       fetchParquet: async (id) => {
         if (!isMicrodataSurveyAccessible(auth.tenant, id)) throw new MicrodataError(404, "Survey not found");
         const res = await fetch(signedBlobUrl(microdataConfig.storage, `${id}.parquet`));
         if (!res.ok) throw new Error(`blob HTTP ${res.status}`);
         return new Uint8Array(await res.arrayBuffer());
       },
       limits: { maxCallsPerRequest: Number(process.env.RUN_PYTHON_MAX_CALLS_PER_REQUEST) || undefined,
                 timeoutSeconds: Number(process.env.RUN_PYTHON_TIMEOUT_SECONDS) || undefined },
     });
     ```
     puis `runAgentStream(history, env, microdata, { usage, indexes, runPython })`.
     **Une instance `createRunPythonTool` par requête** (c'est elle qui porte le compteur d'appels).
   - Ne pas ajouter ces variables à `REQUIRED_ENV` : l'outil reste optionnel.
3. **UI** (`src/api.ts` + vue agent)
   - Générer un `conversation_id` (UUID) par conversation, le persister avec la conversation
     et l'envoyer dans le POST `/agent`.
   - Rendre `figures` (PNG base64 → `<img src="data:image/png;base64,…">`) et `tables` depuis
     l'event `tool_end` de `run_python` ; le texte final peut citer `fig-1`, `fig-2`.
4. **Délai** : vérifier `DEFAULT_DEADLINE_MS` de l'agent et le timeout HTTP de la Function
   (Flex Consumption) — un tour `run_python` peut prendre jusqu'à ~105 s (90 + marge).
5. **Coûts** : ajouter une ligne `costlog` `run_python` (durée, sondages chargés) pour
   l'epic pricing.

## Infra provisionnée le 2026-10-16 (pool + rôles Function et info@opubliq.com ; Key Vault + app settings PAS encore faits)

Abonnement startup `a54061e5-b5f7-49c0-94f0-d2e7b95de4a4`, groupe `rg-opubliq-sondages`.
Identité managée système de `opubliq-sondages-functions` : principalId
`791ed199-6c60-49b4-af54-308f622d4577` (vérifié en lecture).

```bash
SUB=a54061e5-b5f7-49c0-94f0-d2e7b95de4a4
RG=rg-opubliq-sondages
POOL=opubliq-sondages-pysessions
FUNC_MI=791ed199-6c60-49b4-af54-308f622d4577

# 0. Prérequis : le fournisseur Microsoft.App n'est PAS enregistré sur l'abonnement (constaté).
az provider register --namespace Microsoft.App --subscription $SUB
az provider show -n Microsoft.App --subscription $SUB --query registrationState -o tsv   # attendre "Registered"
az extension add --name containerapp --upgrade

# 1. Pool code interpreter Python, canadaeast, sans egress, cooldown 15 min.
az containerapp sessionpool create \
  --subscription $SUB -g $RG -n $POOL -l canadaeast \
  --container-type PythonLTS \
  --max-sessions 20 --ready-sessions 1 \
  --cooldown-period 900 \
  --network-status EgressDisabled

# 2. Endpoint de gestion → ACA_SESSIONS_POOL_ENDPOINT
az containerapp sessionpool show --subscription $SUB -g $RG -n $POOL \
  --query properties.poolManagementEndpoint -o tsv
POOL_ID=$(az containerapp sessionpool show --subscription $SUB -g $RG -n $POOL --query id -o tsv)

# 3. Rôle : la Function App peut exécuter dans le pool (portée = le pool seul).
az role assignment create \
  --role "Azure ContainerApps Session Executor" \
  --assignee-object-id $FUNC_MI --assignee-principal-type ServicePrincipal \
  --scope $POOL_ID

# 3b. (Optionnel, dev local) même rôle pour ton compte, portée pool seulement.
# az role assignment create --role "Azure ContainerApps Session Executor" \
#   --assignee $(az ad signed-in-user show --query id -o tsv) --scope $POOL_ID

# 4. Secret HMAC dans le Key Vault + app settings.
az keyvault secret set --vault-name opubliq-sondages-kv --name aca-sessions-id-secret \
  --value "$(openssl rand -base64 48)"
# (la Function App doit déjà pouvoir lire le KV ; sinon rôle "Key Vault Secrets User" à prévoir)
az functionapp config appsettings set --subscription $SUB -g $RG -n opubliq-sondages-functions --settings \
  RUN_PYTHON_ENABLED=false \
  ACA_SESSIONS_POOL_ENDPOINT="<sortie étape 2>" \
  ACA_SESSIONS_API_VERSION=2024-02-02-preview \
  "ACA_SESSIONS_ID_SECRET=@Microsoft.KeyVault(VaultName=opubliq-sondages-kv;SecretName=aca-sessions-id-secret)"
```

Note : une page de la doc Microsoft mentionne aussi « Contributor » sur le pool ; la page
d'authentification n'exige que *Session Executor*. Commencer par Session Executor seul ;
n'ajouter Contributor (portée pool uniquement) que si un 403 persiste.

### Test de fumée après provisionnement

```bash
TOKEN=$(az account get-access-token --resource https://dynamicsessions.io --query accessToken -o tsv)
curl -s -X POST "$ENDPOINT/code/execute?api-version=2024-02-02-preview&identifier=smoke-test-0001" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"properties":{"codeInputType":"inline","executionType":"synchronous","code":"import pandas, statsmodels; print(pandas.__version__)"}}'
```
Confirmer : forme exacte de la réponse, présence de `statsmodels` et `pyarrow` (lecture Parquet).

## Pool custom (MRP bayésienne) — `opubliq-sondages-pycustom`

PythonLTS n'a ni egress ni `pip` ni bibliothèques bayésiennes hiérarchiques. Un second pool,
de type **CustomContainer**, exécute notre image (`sandbox/`) qui ajoute numpyro + JAX (CPU),
PyMC, Bambi, ArviZ aux paquets PythonLTS. Les deux pools coexistent ; le choix se fait par
app setting (retour arrière = retirer `RUN_PYTHON_POOL_KIND`).

- **Image** `sandbox/Dockerfile` : `python:3.12-slim-bookworm`, `g++` (backend C de PyTensor),
  versions figées dans `sandbox/requirements.txt` (compilé depuis `requirements.in`),
  utilisateur non-root `sandbox` (uid 1000), `warmup.py` au build (imports + cache PyTensor).
- **Serveur** `sandbox/server.py` (Starlette/uvicorn, port 8080) : réimplémente le sous-ensemble
  de l'API code interpreter utilisé par `AcaSessionsExecutor` — `POST /code/execute`,
  `GET /files`, `POST /files/upload` (2024-02-02-preview) et `POST /executions`, `POST /files`
  (2025-10-02-preview), + `GET /files/content/{name}`, `GET /health`. Le pool relaie
  `<endpoint>/<chemin>?identifier=<id>` au conteneur dédié à `identifier` après validation du
  jeton Entra (le conteneur ne voit jamais de requête non authentifiée) ; `api-version` et
  `identifier` sont ignorés côté conteneur (un conteneur = une session).
- **Noyau** `sandbox/kernel.py` : processus enfant persistant (`globals()` conservé entre appels,
  comme PythonLTS) ; `result` = valeur de la dernière expression (str telle quelle). Timeout
  par exécution (`timeoutInSeconds`, plafond 220 s) : le noyau est tué et relancé (état perdu).
  Figures/tableaux : inchangés, c'est le prélude TS (`wrapCode`) qui les renvoie dans `result`
  (pas de troncature 4 095 car. ici, mais le protocole reste le même).
- **Infra** : environnement Container Apps `opubliq-geo-env` (rg-opubliq-geo-marketing,
  **Canada East**, Consumption), pool dans `rg-opubliq-sondages`, 2 vCPU / 4 Gi par session,
  `EgressDisabled`, cooldown 900 s (`Timed`), max 10 sessions, 1 session prête. Tirage d'image
  par l'identité managée utilisateur `opubliq-sondages-pysessions-acrpull` (AcrPull sur
  `opubliqgeomarketingacr`).
- **TS** : `RUN_PYTHON_POOL_KIND=custom` → `resolveSandboxPool` prend
  `ACA_SESSIONS_CUSTOM_POOL_ENDPOINT` (pas de repli silencieux sur PythonLTS si absent) et
  `createRunPythonTool({ poolKind: "custom" })` expose `runPythonToolDef("custom")` (liste de
  paquets + consigne numpyro). Description par défaut inchangée.

### Reconstruire l'image

```bash
# (si requirements.in change)
uv pip compile sandbox/requirements.in --python-version 3.12 \
  --python-platform x86_64-unknown-linux-gnu -o sandbox/requirements.txt
TAG=v$(date +%Y%m%d%H%M)
az acr build -r opubliqgeomarketingacr -t sondages-pysandbox:$TAG sandbox/
az containerapp sessionpool update -g rg-opubliq-sondages -n opubliq-sondages-pycustom \
  --image opubliqgeomarketingacr.azurecr.io/sondages-pysandbox:$TAG
```
Les sessions déjà allouées gardent l'ancienne image jusqu'à leur cooldown.

### Créer le pool (fait le 2026-10-22)

```bash
SUB=a54061e5-b5f7-49c0-94f0-d2e7b95de4a4; RG=rg-opubliq-sondages; POOL=opubliq-sondages-pycustom
ENV_ID=$(az containerapp env show -g rg-opubliq-geo-marketing -n opubliq-geo-env --query id -o tsv)
UAMI_ID=$(az identity show -g $RG -n opubliq-sondages-pysessions-acrpull --query id -o tsv)
# UAMI : AcrPull sur le registre
az role assignment create --role AcrPull --assignee-object-id $(az identity show --ids $UAMI_ID --query principalId -o tsv) \
  --assignee-principal-type ServicePrincipal --scope $(az acr show -n opubliqgeomarketingacr --query id -o tsv)
az containerapp sessionpool create --subscription $SUB -g $RG -n $POOL -l canadaeast \
  --container-type CustomContainer --environment $ENV_ID \
  --image opubliqgeomarketingacr.azurecr.io/sondages-pysandbox:v3-20261022 \
  --registry-server opubliqgeomarketingacr.azurecr.io --registry-identity $UAMI_ID \
  --mi-user-assigned $UAMI_ID --cpu 2.0 --memory 4Gi --target-port 8080 \
  --cooldown-period 900 --max-sessions 10 --ready-sessions 1 --network-status EgressDisabled
POOL_ID=$(az containerapp sessionpool show -g $RG -n $POOL --query id -o tsv)
# Function App (identité système) : exécuteur sur CE pool seulement
az role assignment create --role "Azure ContainerApps Session Executor" \
  --assignee-object-id 791ed199-6c60-49b4-af54-308f622d4577 --assignee-principal-type ServicePrincipal --scope $POOL_ID
# (dev / test de fumée) même rôle pour ton compte, portée pool
az role assignment create --role "Azure ContainerApps Session Executor" \
  --assignee $(az ad signed-in-user show --query id -o tsv) --scope $POOL_ID
```

### Basculer le backend (Function App)

```bash
az functionapp config appsettings set -g rg-opubliq-sondages -n opubliq-sondages-functions --settings \
  RUN_PYTHON_POOL_KIND=custom \
  ACA_SESSIONS_CUSTOM_POOL_ENDPOINT=https://opubliq-sondages-pycustom.purpleforest-7fa51f82.canadaeast.azurecontainerapps.io
# retour PythonLTS : az functionapp config appsettings delete ... --setting-names RUN_PYTHON_POOL_KIND
```
`ACA_SESSIONS_ID_SECRET`, `ACA_SESSIONS_API_VERSION`, `RUN_PYTHON_*` : inchangés (partagés).

### Test de fumée

```bash
node --experimental-transform-types scripts/smoke_custom_pool.ts \
  --endpoint https://opubliq-sondages-pycustom.purpleforest-7fa51f82.canadaeast.azurecontainerapps.io
# ou contre un conteneur local : docker run --rm -p 8080:8080 <image> ; ... --local http://localhost:8080
```
Téléverse un Parquet synthétique (2 000 lignes, 50 groupes), le lit, ajuste une logistique
hiérarchique numpyro (2 chaînes × 500/500) et récupère une figure, via le vrai chemin TS.

## Risques ouverts

- **Forme de réponse** : non vérifiée contre un vrai pool (pas d'infra). Parseur tolérant
  aux deux formes connues. Forme 2024-02-02-preview vérifiée au test de fumée (2026-10-16) ;
  la charge utile dépend du champ `result` (texte de la dernière expression).
- **Paquets** : `pyarrow`/`statsmodels` supposés présents dans PythonLTS — à vérifier ;
  sinon pas d'`pip install` possible (egress désactivé) → image custom (`CustomContainer`,
  exige un environnement Container Apps + ACR).
- **Loi 25** : le pool est en canadaeast, mais les micro-données sortent du Blob vers la
  session (même région). Documenter dans l'EFVP ; cooldown court (15 min) = suppression
  rapide des fichiers.
- **Durée** : appel synchrone long dans une Function HTTP/SSE ; à surveiller avec le
  deadline de l'agent.
- **Coût** : facturation à la durée de session ; `--ready-sessions 1` garde une session
  chaude en permanence (mettre 0 si coût > latence de démarrage).
- **Exfiltration via sortie** : le code peut imprimer des lignes brutes de répondants
  (déjà possible via crosstab agrégé seulement). Envisager un garde-fou (tailles de cellule
  minimales) si des clients externes accèdent à l'agent.
- **Pool custom (2026-10-22)** : rôle *Session Executor* sur `opubliq-sondages-pycustom` PAS
  encore attribué (Function App ni compte dev) → le test de fumée distant renvoie 403 tant que
  ce n'est pas fait ; validé seulement contre le serveur local. 1 session prête 2 vCPU/4 Gi
  facturée en continu (mettre `--ready-sessions 0` si le démarrage à froid est acceptable).
