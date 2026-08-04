# Entretien — Andrew Parkin (Environics Institute)

## Contexte
- Directeur d'institut, pas un acheteur de type procurement — approche relationnelle, pas transactionnelle.
- Vu comme premier client potentiel pour le catalogue de codebooks de sondages (recherche sémantique).

## Solution actuelle
- Utilise un compétiteur américain : recherche par mots-clés/regex basique.
- Stockage avec frais unique + maintenance annuelle.
- Aucune capacité LLM.
- Mauvaise UX pour le cross-tabulation.

## Douleur identifiée
- Processus manuel d'export CSV à travers plusieurs sondages — jugé pénible.
- Difficulté à retrouver rapidement si une question a déjà été posée dans les études passées.

## Besoin exprimé (verbatim)
> Pouvoir dire à un LLM : "je veux voir si le support pour le fédéralisme a baissé en C.-B. chez les jeunes" — et que ça génère le rapport automatiquement.

## Hiérarchie de valeur pour ce client
1. Agent LLM d'analyse en langage naturel (aucun équivalent marché) — différenciateur principal
2. Export/cross-tabulation fluide multi-sondages — répond à sa douleur concrète
3. Annotation LLM des réponses ouvertes
4. Recherche BM25 + rerank (Cohere) — table stakes

## Stratégie d'approche décidée
- Demo live utilisant son use case exact (fédéralisme/BC/jeunes).
- Présenter le prix régulier d'abord, puis offrir un "partenariat pilote" (pas un rabais brut).
- En échange : feedback structuré, droit de le citer comme client référence, durée limitée sur le tarif réduit.