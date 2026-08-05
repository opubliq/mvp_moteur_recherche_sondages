# Audit d'isolation des données entre clients (f3i.14)

Réalisé le 2026-08-04, avant l'onboarding du premier client P2 payant (Andrew
Parkin / Environics). Valide le travail de f3i.11 (résolution d'index côté
serveur, Basic Auth multi-comptes) plutôt que de le réimplémenter. Contexte :
`docs/multi_tenant_design.md` (bead f3i.9), `pricing/STRATEGIE_PRICING.md`
§Architecture.

## Méthode

1. Lecture complète du mécanisme d'autorisation (`netlify/edge-functions/auth.ts`,
   `src/logic/tenancy.ts`, `src/logic/costlog.ts`) et de tous les endpoints
   catalogue (`netlify/functions/{search,verbatims,survey,surveys,themes,
   open-questions,agent}.ts`).
2. Recherche systématique (grep) de tout point où un `index`/`tenant`/`client`
   pourrait provenir d'une entrée client (query string, body JSON, header)
   plutôt que d'être dérivé côté serveur de l'identité authentifiée.
3. Exécution de la suite de tests existante (`netlify/functions/tenancy.test.ts`,
   `client-id.test.ts`, `client-id-propagation.test.ts`, `agent-tenancy.test.ts`)
   — 52 tests, tous verts avant tout changement.
4. Test empirique en lecture seule sur l'infra réelle (Azure Blob Storage,
   compte `opubliqsondagesdata`) pour vérifier l'état réel du manifeste
   micro-données, avec les identifiants déjà présents dans `.env`.
5. Tentative de test end-to-end via `netlify dev` local (curl avec différents
   comptes Basic Auth) — partiellement concluant, voir §Limites.
6. Correctif appliqué pour la faille trouvée, puis re-vérification (tsc +
   suite de tests complète, 64 tests après ajout).

## Constats — catalogue AI Search (index `survey-questions*` / `survey-verbatims*`)

**Aucune fuite trouvée.** La résolution d'index est strictement dérivée
côté serveur, sans point d'entrée client :

- `resolveAuthorizedTenant` (`src/logic/tenancy.ts`) ne lit **que** le
  username du header `Authorization: Basic` (déjà validé par
  `netlify/edge-functions/auth.ts` avant que la requête n'atteigne la
  fonction — mauvais mot de passe = 401 avant tout traitement métier).
  Le header `x-client-id` (utilisé ailleurs pour l'attribution de coût,
  falsifiable) est **explicitement ignoré** pour cette décision — vérifié
  par test (`tenancy.test.ts`, déjà présent avant cet audit) et relu.
- `resolveAccessibleQuestionIndexes`/`resolveAccessibleVerbatimIndexes`
  retournent une liste fermée : `[public]` ou `[public, {index}-{tenant}]`
  où `tenant` vient uniquement de `resolveAuthorizedTenant`. Aucun des
  8 endpoints qui les appellent (`search`, `verbatims`, `survey`, `surveys`,
  `themes`, `open-questions`, `agent`) n'accepte de paramètre `index`,
  `tenant` ou équivalent dans le body/query — vérifié par lecture des
  interfaces `SearchBody` et équivalents : aucun champ de ce type n'existe.
- `KNOWN_TENANTS` est une liste blanche statique (`Set(["opubliq"])`) : un
  username Basic Auth valide mais absent de cette liste ne débloque aucun
  index privé, même si son compte existe dans `BASIC_AUTH_EXTRA_ACCOUNTS`.
- Les messages d'erreur (`AI Search error ${status} (index ${indexName})`)
  ne peuvent référencer que des index déjà résolus pour CE compte — aucun
  chemin ne mélange les listes d'index de deux comptes différents.
- L'edge function `auth.ts` a `path: "/*"` — couvre toute la surface,
  y compris un appel direct à `/.netlify/functions/<fn>` en contournant les
  redirects `netlify.toml` (vérifié par lecture de la config, cf. §Limites
  pour la partie non testée en direct).

## Constats — rail micro-données (Parquet/Blob, `/microdata`, `/microdata-manifest`)

**Faille trouvée et corrigée.** Ce rail (`netlify/functions/microdata.ts`,
`microdata-manifest.ts`, `microdata-core/core.ts`, et l'outil micro-données
de l'agent dans `agent.ts`) est un pipeline **indépendant** du catalogue AI
Search — il identifie un sondage par `survey_id` et lit directement un
Parquet signé sur Azure Blob Storage. Avant correctif, il ne consultait
**jamais** `src/logic/tenancy.ts` : n'importe quel compte Basic Auth valide
(peu importe le tenant) pouvait :

- lister `_manifest.json` en entier via `/microdata-manifest`, y compris les
  sondages privés d'un autre client (métadonnées : nombre de répondants,
  variables, poids) ;
- interroger `/microdata?survey_id=<id_privé>&target=<var>` et obtenir les
  distributions/crosstabs réels d'un sondage privé appartenant à un autre
  client ;
- passer par le même chemin via l'outil micro-données de l'agent
  conversationnel (`agent.ts` injecte `handleMicrodataQuery`/`fetchManifest`
  directement, sans filtre).

**Confirmé empiriquement**, pas seulement en lecture de code : une requête
directe (Node + `crypto`, signature Account SAS reproduisant
`microdata-core/sas.ts`) contre le Blob Storage réel a confirmé que
`medaillon_organismes_qualitatif` — le sondage privé `opubliq` défini dans
`ingestion/tenancy.py::PRIVATE_SURVEYS` — **est bien présent** dans le
`_manifest.json` de production, aux côtés des sondages publics. Le code des
trois endpoints exposait donc un vrai sondage privé, avec la même sévérité
que la faille que f3i.11 a fermée côté catalogue.

C'est le point le plus important à corriger avant l'onboarding d'Andrew :
un client P2 fait typiquement du sondage quantitatif (pondéré, crosstabs) —
exactement le type de données que ce rail sert. Une future fuite sur ce
chemin serait au moins aussi grave qu'une fuite côté catalogue.

## Correctif appliqué

Ajout d'une vérification d'accès par sondage, symétrique à celle du
catalogue, au même point d'entrée (`src/logic/tenancy.ts`) :

- `PRIVATE_MICRODATA_SURVEYS` : miroir TS de `ingestion/tenancy.py::PRIVATE_SURVEYS`
  (actuellement `{ medaillon_organismes_qualitatif: "opubliq" }`).
- `isMicrodataSurveyAccessible(headers, surveyId)` : vrai si le sondage est
  public, ou si le tenant authentifié (Basic Auth **uniquement**, même
  garde-fou que le reste de `tenancy.ts` — `x-client-id` ignoré) en est le
  propriétaire.

Câblé aux trois points d'entrée :

- `netlify/functions/microdata.ts` : 404 (pas 403, pour ne pas confirmer
  l'existence du sondage à un tiers) si `survey_id` n'est pas accessible,
  avant tout appel à `handleMicrodataQuery`.
- `netlify/functions/microdata-manifest.ts` : le manifeste retourné est
  filtré aux sondages accessibles avant sérialisation — un sondage privé
  n'apparaît même plus dans la liste pour un tiers.
- `netlify/functions/agent.ts` : le `MicrodataProvider` injecté dans
  `runAgentStream` applique le même filtre sur `crosstab()` (lève une
  `MicrodataError(404, ...)`) et `manifest()` (filtre la liste) — l'agent
  conversationnel ne peut donc plus ni lister ni interroger un sondage privé
  d'un autre tenant.

Fichiers modifiés : `src/logic/tenancy.ts`, `netlify/functions/microdata.ts`,
`netlify/functions/microdata-manifest.ts`, `netlify/functions/agent.ts`,
`netlify/functions/tenancy.test.ts` (5 nouveaux tests de régression).

## Re-vérification post-correctif

- `npx tsc -b` : aucune erreur.
- `npx vitest run` (suite complète, 12 fichiers) : 64/64 tests verts — les
  52 préexistants + 5 nouveaux pour `isMicrodataSurveyAccessible`, plus 7
  tests de `src/logic/conversations.test.ts` (hors périmètre tenancy, non
  affectés par ce correctif). `npx tsc -b` : aucune erreur. Cas couverts
  par les 5 nouveaux tests :
  - sondage public accessible sans authentification ;
  - sondage privé **refusé** sans authentification ;
  - sondage privé **refusé** à un tenant authentifié tiers (compte valide,
    mais pas le bon) ;
  - le header `x-client-id` falsifié n'élargit jamais l'accès ;
  - sondage privé accessible à son propriétaire authentifié.

## Limites de cet audit (transparence)

- **Test end-to-end par `curl` contre `netlify dev` local** : tenté, mais
  non concluant. `netlify-cli` résout `BASIC_AUTH_USER`/`BASIC_AUTH_PASSWORD`
  comme des « project settings env vars » qui **priment** sur le `.env`
  local (log : `Injected project settings env vars: BASIC_AUTH_PASSWORD,
  BASIC_AUTH_USER`) — impossible de contrôler les identifiants réels sans
  connaître le compte configuré côté Netlify. `BASIC_AUTH_EXTRA_ACCOUNTS`
  n'apparaissait dans aucun des deux logs (« Ignored » / « Injected ») lors
  de cette tentative, donc pas non plus testable en pratique dans cette
  session. La vérification du contournement d'auth s'appuie donc sur la
  lecture de code (`auth.ts`) + les tests unitaires existants de f3i.11
  (`tenancy.test.ts`), pas sur un essai HTTP réel bout-en-bout dans cette
  session. Recommandation : refaire ce test curl directement sur un
  déploiement Netlify (preview ou prod), où les vars d'env sont résolues
  sans ambiguïté.
- Le rail micro-données a été audité et corrigé pour l'isolation par
  `survey_id`. Il n'a pas de notion de filtrage par colonne/variable — non
  pertinent ici puisqu'un sondage entier appartient à un seul tenant.
- Cet audit couvre le code applicatif. Il ne couvre pas la configuration
  Azure elle-même (clés API AI Search/Storage partagées entre index, accès
  IAM), hors périmètre de f3i.14 tel que cadré par le bead.

## Verdict

- **Catalogue AI Search (search/verbatims/survey/surveys/themes/open-questions/agent)** :
  aucune fuite trouvée. Résolution d'index strictement server-side, aucun
  paramètre client ne peut l'influencer, `x-client-id` ignoré pour
  l'autorisation. Sûr pour l'onboarding.
- **Rail micro-données (Parquet/Blob)** : faille réelle trouvée et confirmée
  empiriquement (sondage privé `opubliq` exposé à tout compte authentifié),
  **corrigée** dans cette session (f3i.14) avec tests de régression. Sûr
  pour l'onboarding après ce correctif.
- Recommandation avant onboarding effectif d'Andrew : si son corpus reçoit
  un traitement micro-données (probable, sondages quantitatifs), refaire un
  test curl bout-en-bout sur un déploiement réel (preview Netlify) une fois
  son compte `BASIC_AUTH_EXTRA_ACCOUNTS` et son `client_slug` provisionnés,
  pour couvrir la limite notée ci-dessus.
