# Pattern : décomposition de requête en concepts pondérés + niveau de pertinence discret

## Principe général

Au lieu de faire matcher une requête utilisateur telle quelle contre un moteur de
recherche (BM25/vectoriel), on la **décompose en concepts pondérés**, on construit
une requête plus riche à partir de ça, puis on **note chaque résultat sur une
échelle discrète de pertinence** (pas un score continu opaque) en fonction de la
couverture réelle de ces concepts. Ça donne un score explicable ("pourquoi ce
résultat est classé Partiel") au lieu d'un score de similarité brut illisible.

Trois étapes :
1. Décomposition en concepts pondérés (appel LLM, JSON structuré)
2. Requête élargie + couverture pondérée (code déterministe)
3. Niveau discret 1-4 affiché dans l'UI

## 1. Décomposition en concepts (appel LLM, JSON structuré)

Prompt qui demande de découper la requête en concepts **indépendants** (pas juste
des reformulations du même concept), chacun avec :

- `orig` : le terme original
- `syns` : synonymes/variantes morphologiques (courts, 1-3 mots, cherchables comme
  sous-chaîne littérale — pas de paraphrase multi-mots)
- `qualifiers` (optionnel) : structure à 2 niveaux quand un concept a un nom de
  base générique + un adjectif qui le précise (ex. "eau" + qualifiers:["potable",
  "à boire"]) — le nom de base doit rester valide seul, juste moins précis sans
  le qualifier
- `weight` : importance relative 0-1, somme = 1 sur tous les concepts

Règles clés du prompt à garder :

- Un concept ne doit ouvrir un axe de recherche **vraiment indépendant** ; sinon
  fusionner comme synonyme du concept principal.
- Un mot évaluatif générique (qualité/état/satisfaction/accès) précédé d'un objet
  est en général un **concept à part** à poids faible, pas un qualificatif
  fusionné.
- Poids faible aux concepts évaluatifs/génériques, poids fort au concept-objet
  principal.

Après réception : normaliser les poids (somme=1, repli sur poids égaux si
absent), dédupliquer syns/qualifiers (insensible casse, retirer doublons de
`orig`).

## 2. Requête élargie + couverture pondérée

- Construire une requête Lucene/full-text : chaque concept = groupe
  `(orig^boost OR syn1 OR syn2 ...)`, groupes reliés par `AND`.
- **Boost différencié par champ** si tu as un champ "signal direct" vs un champ
  "contexte" (ex. libellé vs titre du document parent) : un match qui n'existe
  que dans le champ contexte ne doit pas suffire à faire remonter un résultat
  hors-sujet. Deux constantes : boost Lucene du champ (BM25) + poids de
  couverture du champ (souvent différents).
- **Score de couverture** = `sum(weight_i * score_concept_i)` où
  `score_concept_i` vaut :
  - 0 si aucun terme du concept ne matche,
  - poids du champ (libellé ou titre) si la base matche,
  - réduit (ex. ×0.5) si le concept a des qualifiers mais que seule la base
    matche (sans l'adjectif) — permet à un match partiel de sortir mais moins
    bien noté.
- Normaliser le texte avant matching littéral (apostrophes courbes → droites,
  espaces insécables → normaux) : sinon un terme pourtant présent mot-pour-mot
  rate le match.
- Gérer un "OU" explicite dans la requête utilisateur en séparant en branches,
  chaque branche décomposée séparément, couverture = max sur les branches (mode
  ET normal = toutes les branches doivent contribuer, mode OU = une seule
  suffit).

## 3. Niveau discret (1-4) au lieu d'un score continu

```
cov >= 1 (quasi) -> 4 "Exact"
cov >= 0.5       -> 3 "Partiel"
cov >= seuil_min -> 2 "Faible"
sinon            -> 1 "Hors-sujet"
```

Point important : le **score brut du moteur** (similarité vectorielle, RRF,
etc.) ne sert **jamais** à faire sortir un résultat de son palier — seulement à
départager les ex-aequo dans un même niveau. C'est ce qui rend l'échelle
interprétable : "Exact" veut vraiment dire couverture totale, pas juste "score
élevé".

## 4. UI : afficher la décomposition + permettre le réajustement

- Afficher chaque concept comme une petite carte : terme original + `[poids%]`
  + synonymes (`= syn1, syn2`) + qualifiers (`+ qual1, qual2`), avec un
  `numericInput` (ou équivalent) pour rejuger le poids.
- Bouton "réappliquer les poids" → renormalise et **recalcule la couverture
  sans rappeler le LLM/le moteur** (fonction pure sur les résultats déjà
  récupérés + nouveaux poids).
- Badge de niveau : libellé texte + petite barre colorée (pas de score
  numérique brut affiché à l'utilisateur — seul le palier compte).
- Highlight des termes (originaux + synonymes) dans les résultats affichés, en
  excluant les stopwords et les termes trop courts (<3 caractères).

## Ce qui rend ce pattern portable

- Séparation stricte : la décomposition/pondération (LLM) est indépendante de la
  couverture (code déterministe) — permet de rejuger les poids sans re-appeler
  le LLM ni le moteur de recherche.
- L'échelle de pertinence est **fixée par la couverture des concepts**, pas par
  le score brut du moteur — donc reproductible/interprétable peu importe le
  moteur sous-jacent (Azure AI Search, Elasticsearch, pgvector...).
- Le concept "base + qualifiers" à 2 niveaux est le point le plus subtil : il
  évite de sur-spécifier une requête tout en récompensant les résultats qui
  matchent la précision complète.