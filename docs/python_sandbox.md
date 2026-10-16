# Outil agent `run_python` — bac à sable Python (bead 9ou.4)

Vision : `docs/vision_plateforme.md`, chantier 1 (« Il fait des analyses complexes »).
Code : `src/logic/pythonSandbox.ts` (+ tests `src/logic/pythonSandbox.test.ts`).
État : **code prêt, non branché, infra non provisionnée.**

## Design

- **Bac à sable** : Azure Container Apps dynamic sessions, pool `PythonLTS` (code interpreter,
  isolation Hyper-V, pandas/numpy/statsmodels/scipy/sklearn/matplotlib préinstallés),
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
  traceback sur stderr, puis épilogue qui sérialise les figures matplotlib ouvertes (PNG)
  et les tableaux `show_table(df, title)` sur une ligne sentinelle de stdout.
  Helper `load(survey_id)` → DataFrame.
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

## Risques ouverts

- **Forme de réponse** : non vérifiée contre un vrai pool (pas d'infra). Parseur tolérant
  aux deux formes connues ; à confirmer au test de fumée. La sentinelle rend l'outil
  indépendant du champ `result`.
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
