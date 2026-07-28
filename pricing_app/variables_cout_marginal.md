# Coût d'usage de la plateforme — variables à mesurer

> **Prix unitaires** : voir la price card datée
> [`price_card_canadaeast_2026-07-28.md`](price_card_canadaeast_2026-07-28.md)
> (bead 97r.6). Ce document-ci décrit *ce qu'on mesure* ; la price card donne
> *combien ça coûte*.

Objectif de cette phase : **connaître** le coût marginal réel d'utiliser la
plateforme (agent, Cohere, annotation, recherche), et **l'attribuer par client**.
Pas de plafonnement ici — on mesure d'abord, on décidera des garde-fous ensuite.

**Hors scope pour l'instant** : l'ingestion des sondages. One-shot par client au
démarrage, on s'en occupe plus tard (partie LLM sous Claude Max = forfait plat).

## Principe

Ne pas deviner : **instrumenter**. Chaque appel LLM/API renvoie `usage`
(prompt/completion tokens) ; Cohere facture à la « search unit ». Un wrapper de
logging autour des appels sortants, **taguant `client_id`**, `request_id`, type
d'opération, `usage` et latence = la seule source fiable, et le seul moyen
d'obtenir un coût *par client* plutôt qu'un agrégat. Prendre **médiane + p90**,
pas la moyenne seule : l'agent a une variance énorme selon le nombre de tool calls.

## Ce qu'une requête déclenche vraiment (relevé dans le code)

Une **recherche interactive** (UI) coûte **trois** choses :

0. **1 `/decompose`** — appel chat AOAI (`src/logic/decompose.ts:178`), déclenché
   avant le search (`src/context/SearchContext.tsx:127`). **Gros system prompt**
   (consignes concepts + `rerank_query`), repayé à **chaque** requête. Facile à
   oublier parce qu'il est dans une autre fonction que `/search`.
1. **1 embedding** de la query — Azure OpenAI `text-embedding-3-large` (3072 dims).
2. **1 rerank Cohere** d'une fenêtre de **150 documents** (`RERANK_WINDOW = 150`,
   `src/logic/rerank.ts`). Cohere facture par *search unit* = 1 query + **jusqu'à
   100 docs** → 150 docs = **2 search units par appel `/search`**. Câblé par le
   ticket 97r.3 : chaque appel Cohere émet une ligne `[costlog] op:"rerank"` avec
   `units = ceil(nb_docs / 100)` et `nb_docs`. **Split écarté pour nos docs** —
   voir la section Cohere ci-dessous.

> Le LLM Judge a été **entièrement retiré** du code (2026-07-23) → **absent du coût**.

Et **une requête agent enchaîne plusieurs `/search`** → multiplie embedding +
Cohere. Le coût d'une requête agent n'est donc pas « 1 appel LLM » mais la somme
de la boucle : tours d'agent + tous les `/search` (donc tous les rerank +
embeddings) qu'elle déclenche. (L'agent fait sa propre décomposition dans la
boucle ; le `/decompose` ci-dessus est le coût du **chemin recherche directe**.)

## Variables à instrumenter

### 1. Requête agent (le gros morceau)
| Composant | Source | Mesure |
|---|---|---|
| Tokens boucle agent | `AOAI_CHAT_DEPLOYMENT`, function calling (`docs/aiagent_usecase.md`) | Sommer `usage` sur **tous** les tours + rapport final, par `request_id` |
| `/search` déclenchés | boucle agent | Compter par requête → chacun porte embedding + Cohere |

Piège : le system prompt + les schémas d'outils se repaient à **chaque** tour →
coût ∝ nombre de tours, pas ∝ requêtes.

### 2. Décomposition de requête (chemin recherche directe)
| Variable | Mesure |
|---|---|
| Tokens / `/decompose` | `usage` de l'appel chat (`src/logic/decompose.ts`) × prix ; system prompt fixe + query |
| Appels / requête UI | 1 par recherche interactive (pas dans la boucle agent) |

### 3. Cohere rerank
| Variable | Mesure |
|---|---|
| Search units / appel | `ceil(nb_docs / 100)` → **2 units** pour 150 docs ; émis en direct (`op:"rerank"`, `units`, `nb_docs`) par le wrapper costlog (ticket 97r.3) |
| Appels rerank / requête | 1 par `/search` ; ×N si l'agent chaîne |

`/verbatims` a aussi un pool de 150 (`RERANK_POOL`) → même base de 2 units par
appel. Les deux chemins (questions ET verbatims) passent par
`cohereRerankDocuments()`, seul point d'émission du comptage → instrumentés d'un
coup.

#### max_tokens_per_doc & split — split ÉCARTÉ pour nos docs (recherche 97r.3, 2026-07-24)

**Déploiement mesuré** : `COHERE_RERANK_DEPLOYMENT = Cohere-rerank-v4.0-pro`
(Azure AI Foundry, ressource `info-4552-resource`, cf. `.env`).

**Deux mécanismes DISTINCTS, à ne pas confondre :**

1. **`max_tokens_per_doc` (troncature pour le SCORING, pas la facturation).**
   Contrôle la longueur max d'un doc avant troncature. Défaut Cohere = **4096
   tokens** (v3.5) ; rerank-v4.0 a un contexte de **32 768 tokens** (docs
   découpés en chunks de 32 764). Un doc trop long est **tronqué** à cette
   valeur ; il n'affecte PAS directement le nombre de search units.
   Source : [Cohere — Best Practices for Rerank](https://docs.cohere.com/docs/reranking-best-practices).

2. **Seuil de SPLIT pour la facturation en search units = 500 tokens (query
   INCLUSE).** C'est le vrai levier de coût, et il est **bien plus bas** que
   `max_tokens_per_doc`. Règle exacte : *« Cohere counts a single search unit as
   a query with up to 100 documents to be ranked. Documents longer than 500
   tokens when including the length of the search query are split up into
   multiple chunks, where each chunk counts as a single document. »*
   Sources : [Azure — Deploy Cohere Rerank (Foundry)](https://learn.microsoft.com/en-us/azure/ai-studio/how-to/deploy-models-cohere-rerank),
   [Cohere Rerank best-practices (mdx)](https://github.com/cohere-ai/cohere-developer-experience/blob/main/fern/pages/text-embeddings/reranking/reranking-best-practices.mdx).

**Nos docs dépassent-ils 500 tokens ? Non — largement en dessous.**
Un doc envoyé à Cohere = `titre: … \n question: … \n options_de_reponse: opt1 | … | optN`
(`yamlDoc`, `src/logic/rerank.ts`). Échantillonnage local des 15 dictionnaires de
données (`data/*/*data-dictionary*.xlsx`, `.venv/bin/python` + openpyxl) :
- cellule de texte la plus longue (stem de question) : **253 chars ≈ 72 tokens** (~3,5 chars/token FR) ;
- p95 des cellules : 148 chars (~42 tokens) ; médiane 37 chars.
- Un doc typique (stem + échelle Likert 2-7 options courtes) ≈ **120-160 tokens**.
- Pire cas raisonné (stem ~250 chars + multi-sélection généreuse ~15 options × 60 chars) ≈ **1250 chars ≈ 360 tokens**, query brève comprise ⇒ toujours **< 500**.

Il faudrait un doc de ~1750 chars (≈ 500 tokens) pour déclencher UN split (→ 2
chunks). Aucun de nos docs question n'approche ce seuil ; les verbatims (réponses
libres) sont eux aussi majoritairement courts (< 350 mots). Même en supposant une
poignée de docs scindés, il faudrait **50+ docs scindés sur 150** pour passer de 2
à 3 units — invraisemblable.

**Conclusion / facteur de correction.** Le split est **écarté** : la formule
`units = ceil(nb_docs / 100)` est exacte pour nos deux chemins. **Facteur de
correction sur les units = 1,0** (aucune correction). Le champ `nb_docs` est
loggé pour pouvoir re-détecter une dérive si le format des docs s'allongeait un
jour (ex. injection de contexte de sondage dans le YAML).

### 4. Embedding de recherche
| Variable | Mesure |
|---|---|
| Tokens / query | `usage` de l'embedding × prix `text-embedding-3-large` |

Petit à l'unité, mais présent à chaque `/search`.

### 5. Annotation à la volée
| Variable | Mesure |
|---|---|
| Tokens / item annoté | `usage` de `netlify/functions/annotate.ts` (AOAI) × prix |
| Items / batch | taille de batch réelle |

Coût par item, à mesurer tel quel (le plafonnement viendra après).

## Fixes à connaître (pas à imputer au /unité)
- **AI Search** : 1 service (Basic, 104,70 $/mois), plusieurs index — 1 par client. Fixe tant qu'on est sous les limites du tier (voir multi-tenant).
- **Claude Max** : forfait plat (sert surtout à l'ingestion).
- **Container Apps + Service Bus** : relever sur un mois réel (Cost Management, filtre resource group).

---

## Multi-tenant SaaS — implications

Modèle confirmé : un codebase, un déploiement, **un seul service AI Search avec
plusieurs index** (1 par client), login client → accès à ses features + ses
données. Trois conséquences pour le coût et la capacité :

**1. Les coûts d'usage (agent, Cohere, embedding, annotation) sont marginaux et
par-tenant — mais seulement si on les attribue.** Endpoints partagés =
facturation globale. La seule façon de connaître le coût *par client* est de
**taguer chaque appel avec `client_id`** dans le wrapper de logging. C'est
l'objectif explicite de cette phase → c'est l'action n°1.

**2. Le service AI Search unique est un coût fixe par paliers, pas un $/client
linéaire.** Tant qu'on est sous les limites du tier Basic (nombre d'index,
storage, replicas — **à vérifier sur la doc Azure**), +1 client = +1 index ≈ 0 $
marginal. À la limite → monter de tier ou ajouter un service = **saut discret**.
Variable à modéliser : « combien de clients tient un service Basic ».

**3. Le déploiement GPT est partagé par tous les tenants → contrainte de quota,
pas seulement de coût.** Aujourd'hui tout le monde tape les **mêmes ressources** :
1 ressource AOAI (chat `annotate` + embedding `retrieve`) + 1 endpoint Foundry
(`decompose` + agent). Le quota Azure OpenAI est un budget **TPM (tokens/minute)
par déploiement** tiré d'un pool régional ; dépassement → **HTTP 429**. Deux
conséquences :

- **Noisy neighbor** : un seul client en boucle agent lourde (gros system prompt
  `decompose` repayé à chaque tour × N `/search`) peut saturer le TPM et faire
  **429 pour tous les autres tenants**, recherches directes incluses.
- **Plafond régional** : la hausse de quota a une limite ; on ne monte pas un
  déploiement unique à l'infini.

Comme le palier AI Search, c'est une **contrainte discrète de capacité, pas un
$/client linéaire**. Variable à modéliser : « TPM consommé par client (par type
d'usage) × nb de clients avant saturation du déploiement chat ».

Leviers (du moins cher au plus lourd) : **rate-limit logique par `client_id`**
dans le wrapper (le même que pour la mesure) → **retry + backoff sur 429**
(`Retry-After`) → hausse de quota TPM → plusieurs déploiements/régions + routage →
PTU (capacité réservée, à l'échelle seulement). Priorité au stade proto : les deux
premiers.

Le reste (compute, embeddings, Cohere) ne dépend pas du nombre de tenants : coûts
à l'usage, fonction du volume.

---

## Anticiper le coût par type d'usage (une fois les stats en main)

Le but final n'est pas un nombre unique mais un **modèle paramétrique** : coûts
unitaires par composant (issus de l'instrumentation) × un **profil de volumes**.
Une fois la price card + les distributions mesurées, on peut **fabriquer des
profils clients synthétiques** (fausses données d'usage) et calculer leur coût
marginal :

```
coût_client ≈ n_recherches      × (decompose + embedding + rerank)
            + n_requêtes_agent  × E[tours × /search par tour]   ← distribution, pas un scalaire
            + n_items_annotés   × coût/item
            + part fixe AI Search (palier, ≈ 0 marginal sous la limite du tier)
```

Nuance à garder : **coût par `/search` = quasi déterministe** (on le prédit à
±quelques %), mais **coût par requête agent = une distribution** (variance
dominée par le nombre de tool calls / `/search` enchaînés → toujours raisonner en
médiane + p90, jamais en point). Donc un profil = « client léger » (surtout des
recherches directes) vs « client agent-intensif » donnera deux coûts marginaux
très différents, et c'est exactement ce que le modèle doit exposer.

## Prochaines actions
1. Wrapper de logging `usage` **avec `client_id`** sur agent / decompose / search (embedding + Cohere) / annotate.
2. Price card datée (`canadaeast`) : AOAI chat + `text-embedding-3-large`, Cohere rerank (par search unit ; `max_tokens_per_doc`/split **vérifié et écarté**, cf. section Cohere), limites du tier AI Search Basic.
3. Faire tourner 10-20 requêtes agent réelles instrumentées → médiane + p90 du coût/requête, décomposé par composant.
4. Mesurer coût/item d'annotation sur une batch réelle.
5. Établir « nb de clients par service AI Search Basic » (limites de tier).
6. Relever le **quota TPM** des déploiements chat/embedding (AOAI + Foundry) et estimer le TPM/client par type d'usage → « nb de clients avant saturation ». Prévoir rate-limit par `client_id` + retry/backoff 429 dans le wrapper.
7. Assembler le modèle paramétrique + quelques profils clients synthétiques → coût marginal simulé par type d'usage.
