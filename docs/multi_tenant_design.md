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

Création d'un nouvel index par client : f3i.10. Premier cas fait à la main
pour `opubliq` (`ingestion/create_index.py` avec `INDEX_NAME` en override) —
sert de brouillon pour le futur script de provisioning.
