# Leçons du MVP — à porter dans un projet de moteur de recherche similaire

Au départ on avait importé de la doc d'un autre projet pour reproduire un moteur de
recherche ici. Ceci capture le sens inverse — **ce qu'on a appris et mis en place dans ce
MVP** qui vaut la peine d'être appliqué ailleurs. Rangé du plus transférable au plus
spécifique.

---

## 1. Recherche : ce qu'on a VRAIMENT retenu (et ce qu'on a abandonné)

> ⚠️ **Correction importante.** L'ancien projet (du code R) reposait sur une **couverture
> de concepts pondérés → score de pertinence discret (Exact/Partiel/Faible)**. **Ce pattern
> a été complètement ABANDONNÉ dans ce MVP.** Le code le dit explicitement : les paliers
> ont été retirés et les poids de concepts **ne sont jamais lus** dans le retrieval
> (`c.weight` n'influence jamais la requête). Ne pas reporter ce pattern ailleurs en croyant
> qu'il vient de nous — il a été essayé puis jeté.

### Ce qui est réellement en place

- **Un seul appel LLM (`/decompose`) produit DEUX sorties** à partir de la requête brute :
  1. des **concepts** `{orig, syns, qualifiers, weight}`, et
  2. une **reformulation de la requête** (`rerank_query`) — un énoncé de recherche
     désambiguïsé, destiné au reranker.
- **Les concepts servent UNIQUEMENT à enrichir la moitié full-text/BM25** de la recherche
  hybride Azure. `buildLuceneQuery` fabrique `(orig^2 OR syn OR qualifier) AND (…) AND …` :
  chaque concept = un groupe OR (forme + synonymes + qualifiers), groupes reliés par AND.
  Les synonymes/qualifiers **élargissent le rappel lexical** ; le `^2` privilégie la forme
  originale.
- **`weight` : à DROPPER.** Il ne sert à rien — jamais lu au retrieval, purement cosmétique.
  Test A/B sur le golden (l'activer via boost Lucene ∝ poids) : nDCG@10 inchangé sur 14/15
  requêtes, légèrement pire sur la 15e (le rerank a le dernier mot sur une fenêtre déjà
  exhaustive). Les concepts ne servent qu'au retrieval (rappel BM25) : garder seulement
  `orig` / `syns` / `qualifiers`.
- **Moitié vectorielle** : utilise l'embedding de la **requête utilisateur brute** (pas les
  concepts), comparée à **deux vecteurs** — `content_vector` (question, poids ~1.0) +
  `survey_vector` (contexte sondage, poids ~0.15).
- **Classement final = Cohere rerank sur la requête REFORMULÉE** (`rerank_query`), pas sur
  la requête brute (fallback sur la brute seulement si la reformulation manque), et pas une
  couverture de concepts. Gradient continu 0-100. C'est LUI qui détermine la pertinence, pas
  le BM25. La reformulation compte vraiment : sur « intention de vote », la requête brute
  classe « intention d'aller voter » (participation) devant « intention de vote » (choix de
  parti) ; la reformulation `…pour un parti politique` corrige le classement.

### Leçon transférable réelle

Le vrai apprentissage n'est PAS « faire un scoring discret par couverture », c'est
**l'inverse** : on est parti de ce pattern (importé) et on a constaté qu'un **reranker
dédié (Cohere) sur une requête reformulée par LLM donne un meilleur classement, plus
simple**, que toute la mécanique de couverture pondérée. Le seul appel LLM sert donc à deux
choses : (1) une reformulation désambiguïsée qui va au reranker, et (2) des concepts qui ne
**boostent que le rappel lexical** de la branche BM25 du hybride — utile quand le wording
varie. Ni couverture, ni score discret, ni poids actif.

## 2. Reranking : Cohere plutôt que scoring maison

- **C'est le cœur du classement**, pas un ajout. Cohere Rerank v4.0 pro = rapide / cheap /
  bon. Gradient absolu 0-100, **pas de paliers discrets** — les paliers ont justement été
  retirés au profit de ce gradient continu.
- Astuce du fil Reddit : passer les chunks par similarité décroissante et **s'arrêter dès N
  chunks ≥ seuil** (latence/coût). Calibrer un petit modèle de rerank sur les sorties d'un
  modèle plus cher comme vérité terrain.

## 3. Versioning des embeddings — blue-green

À porter dès qu'un moteur dépend d'un modèle d'embedding précis.

- Champ **`embedding_model` sur chaque doc** : le vecteur de requête et les vecteurs
  stockés **doivent** venir du même modèle ; ce champ rend le couplage auditable.
- **Jamais de ré-index en place** : index « green » à côté du « blue », on remplit, on
  bascule la lecture (idéalement `INDEX_NAME` en variable d'env → bascule sans redéploiement
  de code), on supprime le blue **après** validation. Rollback = re-pointer la constante.
- Un changement de **dimensions** impose de toute façon un nouvel index (dimension figée à
  la création).
