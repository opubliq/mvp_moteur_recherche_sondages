# Design multi-tenant — résolution d'index par client (f3i.9)

Décidé en session le 2026-08-04. Premier cas concret : `opubliq` (nos propres
sondages, dont `medaillon_organismes_qualitatif`), pour un accès interne
(Alexandre). Sert de validation du design avant le premier vrai client P2.

## Convention de nommage des index

- Index public/partagé (P1) : `survey-questions` (inchangé, aucun client).
- Index par client : `survey-questions-{client_slug}`.
- `opubliq` est traité **comme n'importe quel client** dans ce schéma, pas
  comme un cas spécial — premier `client_slug` : `opubliq`.

## Source d'identité

Réutilise le mécanisme déjà prévu pour ça (`src/logic/costlog.ts`,
`resolveClientId`, bead 97r.5) plutôt que d'inventer un deuxième système :

1. Header `x-client-id` explicite (déjà utilisé pour l'attribution de coût).
2. Fallback : username du Basic Auth global (`netlify/edge-functions/auth.ts`).
   Actuellement un seul couple `BASIC_AUTH_USER`/`PASSWORD` existe pour tout
   le site — passer à un couple par client (au minimum : un deuxième couple
   pour `opubliq`) est le prérequis pour que ce fallback identifie vraiment un
   client, pas juste "unknown".

`resolveClientId` ne fait aujourd'hui **aucun contrôle d'accès** (déclaratif,
falsifiable) — il ne sert qu'au coût. L'utiliser aussi pour la résolution
d'index est un changement de nature : ça devient security-sensitive. Cf.
§Autorisation ci-dessous.

## Résolution des index à interroger

Un compte client interroge **le public + son index privé dans la même
requête** (contrainte produit : « le P2 doit pouvoir croiser son corpus avec
le public dans une même question » — différenciateur, ne pas cloisonner).

- Compte inconnu / P1 sans client_id : `survey-questions` seul.
- Compte avec `client_slug` connu ayant un index privé : `survey-questions` +
  `survey-questions-{client_slug}`, résultats fusionnés côté backend.

## Autorisation (portée hors f3i.9)

La résolution d'index par `client_slug` doit se faire **côté serveur**
(f3i.11) — jamais le frontend qui décide seul quels index interroger, sinon
fuite de données entre clients concurrents en modifiant la requête. f3i.9
pose la convention de nommage et le principe de résolution ; l'implémentation
de la vérification d'accès stricte reste f3i.11 (nécessaire avant tout vrai
client P2 externe — pas bloquant pour l'usage interne opubliq derrière le
Basic Auth déjà en place).

## Provisioning (portée hors f3i.9)

Onboarder un client = un nouvel index Azure AI Search (`{index}-{slug}`, même
service, pas de nouvelle ressource Azure), les entrées correspondantes dans
les registres de routage/accès (`ingestion/tenancy.py::PRIVATE_SURVEYS`,
`src/logic/tenancy.ts::KNOWN_TENANTS`/`PRIVATE_MICRODATA_SURVEYS`), et un
compte de connexion avec `tenant` fixé. Aucun nouveau secret, aucune ressource
AOAI/Cohere/Foundry par client (partagées). Processus documenté/scripté
(f3i.10) : voir `docs/CLIENT_PROVISIONING_RUNBOOK.md`. Premier cas
(`opubliq`) fait à la main le 2026-08-04, avant que ce runbook n'existe.

## Essai P2 temporaire sur corpus public (f3i.7)

cf `pricing/STRATEGIE_PRICING.md` §Essai P2 sur corpus public. Un prospect
qualifié (ex. Andrew Parkin) reçoit un accès complet aux fonctionnalités P2
(agent analytique sans restriction) mais scopé au corpus public, pour une
durée limitée (2 semaines `[À VALIDER]`).

Implémentation : un essai est un compte utilisateur (`azure-functions/src/logic/auth-store.ts`)
sans `tenant` (donc `resolveAccessibleQuestionIndexes` ci-dessus le scope déjà
au public seul, aucun changement requis dans `tenancy.ts`) avec un champ
`trialExpiresAt` (epoch ms) fixé à la création. `verifySession`/`login`
traitent un essai dont `trialExpiresAt` est dépassé comme une session
invalide (401) — pas de logique de plan/feature-gating séparée, puisque
aucune restriction P1 n'existe encore par ailleurs (le tableau « Agent LLM
limité par forfait » de STRATEGIE_PRICING.md n'est pas implémenté ; tant que
ce n'est pas le cas, tout compte authentifié a de facto un agent illimité,
donc un essai P2 = un compte normal + expiration automatique).

Création : script d'admin `azure-functions/src/scripts/create-trial-account.ts`
(`npm run create-trial-account -- <email> <password> [jours]`, jamais exposé
en HTTP — cf. commentaire sur `signup()` dans `auth-store.ts`).

Hors scope ici, à faire quand le feature-gating P1 existera vraiment : si un
jour l'agent P1 devient réellement restreint, l'essai P2 devra porter un
signal explicite (`plan: "p2_trial"` ou équivalent) pour continuer à
contourner cette restriction — actuellement l'absence de restriction P1 rend
ce signal inutile.
