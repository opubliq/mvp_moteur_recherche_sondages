# Runbook — provisionner un nouveau client P2 (Azure)

**Point d'entrée unique** pour onboarder un nouveau client P2 (ex. Andrew/Environics)
après signature. Donne ce fichier à l'orchestrateur :

> « Lis `docs/CLIENT_PROVISIONING_RUNBOOK.md` et provisionne le client `<slug>`. »

Contexte produit et convention de nommage : `docs/multi_tenant_design.md`. Ce
runbook remplace l'onboarding manuel fait pour `opubliq`/medaillon le
2026-08-04 (bead f3i.10) — c'était le brouillon, ceci est la version tenue à
jour.

## Ce que ce runbook NE couvre PAS

- **Gestion des secrets** (Key Vault, rotation) : bead f3i.15, séparé. Ce
  runbook réutilise la clé admin Search / les clés AOAI partagées existantes —
  aucun nouveau secret n'est créé pour un client.
- **Chiffrage du prix de setup** : bead f3i.5, séparé. Ce runbook doit rester
  assez court/instrumenté pour que le temps réel d'exécution serve d'intrant à
  f3i.5, mais ne produit pas le chiffrage lui-même.
- **"Wiring AOAI par client"** (mentionné dans la description originale du
  bead) : AOAI, Cohere Rerank et Foundry sont des ressources **partagées**
  entre tous les clients (un seul déploiement chacun) — il n'y a rien à câbler
  par client aujourd'hui. Seul l'index Azure AI Search est per-client.

## Pré-requis

- Un **`client_slug`** choisi (kebab-case, court, ex. `opubliq`, `andrew`) —
  devient le suffixe `{index}-{slug}` des index privés et la valeur de
  `tenant` du compte de connexion.
- La liste des `survey_id` privés du client, si applicable (un client peut
  être provisionné avec zéro sondage privé au départ — juste corpus public +
  compte de connexion — et se voir ajouter des sondages plus tard en répétant
  les étapes 2-4).
- Un email + mot de passe temporaire pour le compte de connexion du client.

## Étape 1 — Enregistrer le client dans les registres (MÊME COMMIT)

Trois tables hand-maintenues doivent bouger ensemble, dans un seul commit.
**Ne jamais les séparer** : `docs/audit_isolation_donnees_f3i14.md` documente
une vraie fuite de données causée par exactement ce genre de désynchronisation
(`PRIVATE_MICRODATA_SURVEYS` absent alors que `PRIVATE_SURVEYS` était déjà à
jour — le sondage privé restait interrogeable via `/microdata` par n'importe
quel compte).

1. `ingestion/tenancy.py::PRIVATE_SURVEYS` — ajouter une entrée par
   `survey_id` privé du client :
   ```python
   PRIVATE_SURVEYS: dict[str, str] = {
       "medaillon_organismes_qualitatif": "opubliq",
       "<survey_id>": "<slug>",
   }
   ```
   (skip cette étape si le client n'a encore aucun sondage privé).
2. `src/logic/tenancy.ts::KNOWN_TENANTS` — ajouter le slug :
   ```ts
   export const KNOWN_TENANTS = new Set(["opubliq", "<slug>"]);
   ```
3. `src/logic/tenancy.ts::PRIVATE_MICRODATA_SURVEYS` — miroir de l'étape 1,
   uniquement si le rail microdonnées/Parquet s'applique aux sondages ajoutés :
   ```ts
   export const PRIVATE_MICRODATA_SURVEYS: Record<string, string> = {
     medaillon_organismes_qualitatif: "opubliq",
     "<survey_id>": "<slug>",
   };
   ```
4. Lancer la suite de tests TS (`netlify/functions/__tests__/tenancy.test.ts`
   contient un test d'invariant qui échoue si un slug de
   `PRIVATE_MICRODATA_SURVEYS` est absent de `KNOWN_TENANTS` — garde-fou
   automatique pour cette étape précise, cf. §Vérification ci-dessous).
5. Commit.

## Étape 2 — Créer les index AI Search (catalogue + verbatims)

```bash
INDEX_NAME=survey-questions-<slug> uv run python -m ingestion.create_index
INDEX_NAME=survey-verbatims-<slug> uv run python -m ingestion.create_verbatims_index
```

Idempotent (`create_or_update_index`) — sûr à relancer. Ceci ne fait que créer
le schéma vide ; les documents arrivent à l'étape 3.

## Étape 3 — Ingérer les sondages du client (si applicable)

```bash
uv run python -m ingestion.run --only <survey_id>
```

Le routage vers l'index privé est **automatique** une fois l'étape 1 faite
(`ingestion/run.py` appelle `index_name_for()` par sondage) — pas besoin de
préfixer `INDEX_NAME=` ici (contrairement au tout premier onboarding opubliq,
fait avant que `ingestion/tenancy.py` existe, où l'override manuel était le
seul moyen).

## Étape 4 — Microdonnées (rail séparé, si applicable)

```bash
uv run python -m ingestion.run_microdata <survey_id>
```

Indépendant du catalogue AI Search — voir `docs/INGESTION_RUNBOOK.md` §Étape 4
pour le détail (poids, format Parquet, vérification blob).

## Étape 5 — Créer le compte de connexion du client

```bash
cd azure-functions
AZURE_STORAGE_ACCOUNT=<compte-storage-prod> \
AZURE_STORAGE_KEY=<clé-storage-prod> \
PASSWORD_PEPPER=<pepper-prod> \
  npm run create-client-account -- <email> <mot-de-passe-temporaire> <slug>
```

Utilise `azure-functions/src/scripts/create-client-account.ts` (nouveau,
f3i.10) — vérifie que `<slug>` est bien dans `KNOWN_TENANTS` avant de créer le
compte (échoue proprement sinon, avec un pointeur vers l'étape 1). Toujours
contre les App Settings de **prod**, jamais Azurite — un vrai client, pas un
essai. Jamais exposé en HTTP.

## Étape 6 — Vérification

1. **Doc count des nouveaux index** (même pattern que
   `docs/INGESTION_RUNBOOK.md` §Étape 3, lag de cohérence ~3 s normal) :
   ```bash
   uv run python - <<'EOF'
   import time
   from azure.core.credentials import AzureKeyCredential
   from azure.search.documents import SearchClient
   from ingestion.config import get_settings
   s = get_settings()
   for index in ("survey-questions-<slug>", "survey-verbatims-<slug>"):
       c = SearchClient(s.search_endpoint, index, AzureKeyCredential(s.search_admin_key))
       time.sleep(3)
       print(index, "total:", c.get_document_count())
   EOF
   ```
2. **Round-trip login** :
   ```bash
   curl -s -X POST https://opubliq-sondages-functions.azurewebsites.net/api/auth/login \
     -H 'Content-Type: application/json' \
     -d '{"email":"<email>","password":"<mot-de-passe-temporaire>"}'
   ```
   Confirmer que la réponse contient un `token` et `tenant: "<slug>"`.
3. **Requête scopée au tenant** — avec le token obtenu, appeler `POST
   /api/search` (`azure-functions/src/functions/search.ts`) et confirmer que
   des documents de l'index privé du client remontent bien (pas seulement le
   public). C'est le test qui confirme que l'accès est correctement **accordé**
   — complémentaire à l'audit f3i.14 qui vérifiait qu'il n'était pas
   sur-accordé.

## État actuel (mettre à jour à chaque provisioning)

- **`opubliq`** — provisionné à la main le 2026-08-04 (avant ce runbook), sert
  de brouillon initial. Index `survey-questions-opubliq` /
  `survey-verbatims-opubliq`. Sondage privé : `medaillon_organismes_qualitatif`.

## Pièges connus

- **Ne jamais séparer les 3 registres de l'étape 1** entre plusieurs commits —
  c'est exactement la cause de la fuite f3i.14. Le test d'invariant dans
  `tenancy.test.ts` attrape l'oubli côté TS (`PRIVATE_MICRODATA_SURVEYS` sans
  `KNOWN_TENANTS`), mais rien n'attrape automatiquement un oubli côté Python
  (`PRIVATE_SURVEYS`) — la checklist manuelle reste la première ligne de
  défense.
- **`create-client-account.ts` n'est jamais exposé en HTTP** — invocation
  locale uniquement, avec les App Settings de prod en variables
  d'environnement.
- **Limite d'infra connue, hors scope ici** : Azure AI Search Basic ≈
  104 USD/mois par tier de capacité, ~13-15 index avant de devoir passer au
  tier supérieur (cf `pricing/STRATEGIE_PRICING.md` §Architecture). Ce runbook
  ne fait pas de bascule de tier — juste un rappel qu'elle approchera avec la
  croissance du nombre de clients.
- **Gestion des secrets (f3i.15) et pricing du setup (f3i.5)** sont des beads
  séparés — ne pas les traiter ici, voir §Ce que ce runbook NE couvre PAS.
