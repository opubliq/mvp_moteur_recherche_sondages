# Cas d'usage — Agent Analytique & Interactif (epic `aat`)

Principe directeur : la valeur de l'agent n'est PAS de faire une chose que le UI
fait déjà (chercher une question, ouvrir un croisement). C'est de **chaîner** —
produire une réponse qui exigerait N appels manuels — et de **poser des
questions de clarification** quand la demande est sous-spécifiée. Tout ce qui se
fait en un clic dans le UI n'a pas besoin d'un agent.

« L'agent » n'est pas un produit : c'est une **boucle tool-use qu'on écrit**
(fonction `agent.ts`) = un endpoint chat en *function calling* + nos fonctions
exposées comme outils + un system prompt. Le LLM décide quel outil appeler et
rédige la réponse ; il ne CALCULE rien (c'est `/microdata` qui calcule).
**Endpoint = Azure OpenAI existant** (`AOAI_CHAT_DEPLOYMENT`, déjà utilisé par
l'annotation) — décision 2026-07-23, pas d'éval comparative, on
réutilise la plomberie en place.

Tous les cas ci-dessous se construisent sur les fonctions DÉJÀ exposées :
`/search` (recherche hybride + rerank Cohere), `/survey` (catalogue d'un sondage
avec codes + labels + `sociodemo_type`), `/microdata` (distribution / crosstab /
moyenne PONDÉRÉS, avec erreur-type de Kish), `/open-questions`, `/annotate`
(étiquetage LLM à la volée), `/verbatims`. Aucun code interpreter requis : le
seul vrai calcul (croisement pondéré + SE) est déjà fait en dur dans `core.ts`.

---

## Cas retenus

### 1. Portrait d'un sous-groupe sur un sujet large
> « Les 18-34 ans au Québec, qu'est-ce qui les distingue sur l'immigration ? »

Sujet large et vague : plusieurs questions du corpus peuvent contribuer.
L'agent devrait **poser des questions supplémentaires** (immigration = accueil ?
seuils ? religion ? économie ?) avant de partir. Puis : cherche les questions du
thème, applique le même filtre sociodémo à chacune, compare le sous-groupe à
l'ensemble, rédige un portrait.

Reste **dans un seul sondage** pour la première tranche → mêmes poids, même
échantillon, même échelle, zéro problème de comparabilité inter-sondages.

### 2. Optimisation de recherche sur un sujet non sondé directement
> « Qu'est-ce qu'on a comme questions qui me permettraient d'en savoir plus sur
> [sujet X] ? » — ex. « les réfugiés climatiques ».

Le sujet n'est pas sondé tel quel dans le corpus. L'agent sert à **optimiser les
requêtes de recherche** pour repérer les batteries de questions les plus
approchantes, puis peut les analyser. « On n'a pas ça directement, mais voici
trois batteries qui l'approchent » est un livrable de première classe — c'est
aussi la réponse à « est-ce que votre corpus peut répondre à mes questions ? »,
posée AVANT l'achat. (Recouvre en partie le cas 6.)

### 3. La question inversée : *qui* pense X ? — en BATCH
> « Qui appuie le troisième lien ? » → l'agent balaie les clivages, pas juste un.

Au lieu de partir d'un sous-groupe, on part d'une question cible et l'agent
cherche **quels croisements sont intéressants**. Point clé (retour Hubert) :
**pas seulement les variables sociodémo** — croiser avec n'importe quelle
variable pertinente du corpus, pas uniquement âge/genre/revenu/région.

L'angle le plus fort : le faire **en batch sur plusieurs jeux de variables** —
identifier automatiquement des patterns/écarts saillants qu'un humain ne
testerait jamais à la main. C'est ce que le UI ne peut pas faire : le résultat
est une TROUVAILLE, pas une confirmation d'hypothèse. Bon candidat pour la
tranche 1 (une seule question cible, rendu spectaculaire).

### 4. Fact-check d'une affirmation externe
> « Voici un article de La Presse — vois-tu des choses à rectifier ? »
> « Tel commentateur affirme que 70 % des Québécois appuient X — nos données le
> confirment-elles ? »

Entrée = une affirmation (ou un article) à vérifier. Même mécanique de
croisement que le cas 3, mais orientée vérification. Très concret pour un client
média, se démontre en quelques secondes.

---

## Cas de second ordre (retenus mais plus tard / réserves)

### 5. Verbatims croisés (réponses libres)
> « Qu'est-ce que les gens disent spontanément à propos de X, et est-ce que ça
> change selon l'âge ? »

Chaînage déjà branché : `/open-questions` → `/annotate` → `/microdata` avec
`__annotation` comme cible et une sociodémo comme dimension, pondéré (jsu.6/7).
Codification automatisée de questions ouvertes — fort différenciateur.
**RÉSERVE COÛT (Hubert)** : l'annotation LLM est déjà chère ; agent + annotation
en boucle = $$$$$$. À encadrer par des garde-fous de coût (taille de batch,
opt-in explicite) avant de l'ouvrir à l'agent. Moins prioritaire aussi parce que
le corpus a **peu** de questions ouvertes vs numériques.

### 6. Inventaire de couverture
> « Qu'est-ce qu'on a sur la santé, sur quelles années, avec quels
> échantillons ? »

Presque gratuit (`/themes`, `/surveys`, `/search`), aucun calcul. Version
« avant l'analyse ». Recoupe le cas 2 (l'un cherche pour analyser, l'autre pour
recenser). À traiter ensemble.

---

## Écarté

### L'écart est-il réel ? (test de significativité seul)
> « Hommes vs femmes divergent-ils vraiment sur X ? »

`core.ts` calcule déjà la SE (n effectif de Kish + Bessel), donc techniquement
faisable. **Mais** (retour Hubert) les utilisateurs savent calculer / interpréter
/ communiquer un écart eux-mêmes — peu de valeur ajoutée en tant que cas isolé.
La significativité reste utile comme **garde-fou intégré** aux autres cas
(signaler un écart hors marge vs du bruit, flagger les petits sous-groupes via
`raw_n`), pas comme use case autonome.

---

## Primitives statistiques — DANS le scope du prototype

Décision (Hubert) : l'analyse inférentielle **à forme close** entre dans le
prototype. Frontière ferme = *une équation fermée (SQL) vs algèbre
matricielle / itératif*. On prend tout ce qui est de forme close ; le reste est
hors scope prototype.

**DANS le scope** — chacune = une nouvelle primitive fixe, whitelistée,
pondérée, déterministe, testée une fois (même patron que `core.ts`, PAS de
sandbox) :

| Primitive | Ce qu'il faut ajouter | Effort |
|---|---|---|
| **SE de proportion** | 1 ligne de SQL (alimente le garde-fou de significativité) | trivial |
| **t-test 2 groupes** | `(m₁−m₂)/√(se₁²+se₂²)` sur 2 appels `mean_by_group` existants | trivial |
| **Corrélation de Pearson pondérée** | 1 `SELECT` agrégé (`Σw·xy, Σw·x, …`) | jours |
| **OLS bivariée (pente/ordonnée)** | mêmes sommes que la corrélation | trivial une fois la corrélation faite |
| **ANOVA (F à k groupes)** | `mean_by_group` existant + sommes de carrés inter/intra en `GROUP BY` | jours – 1 sem. |

Toutes correctes par construction (pondération + SE en dur), donc utilisables
comme **outils** par l'agent ET dans le UI. L'agent choisit la primitive et
interprète ; il ne calcule jamais la stat lui-même.

**HORS scope prototype** (algèbre matricielle / itératif → runtime numérique) :
régression multiple `(XᵀX)⁻¹Xᵀy`, régression logistique / GLM pondéré (IRLS).
Le jour venu → **endpoint de régression fixe et audité**, PAS un code
interpreter. Le sandbox généraliste ne se justifie que pour de l'exploratoire
imprévisible, et c'est sur données pondérées qu'il est le plus dangereux (SE
fausses invisibles) — donc pas dans ce prototype, et probablement pas avant un
vrai besoin client assumé.

---

## Ce que ça implique pour le découpage de l'epic

- Les cas 1, 3, 4 sont **la même boucle tool-use** avec des prompts différents →
  la tranche 1 doit livrer *la boucle + le rendu narratif*, validés sur
  plusieurs cas à la fois, pas un seul.
- Rester **intra-sondage** en tranche 1 (esquive toute la comparabilité).
- La comparabilité inter-sondages + le longitudinal (« le fédéralisme a-t-il
  baissé chez les 18-34 en C.-B. depuis 2010 ? ») = phase ultérieure : c'est
  l'endgame, mais c'est là qu'est le vrai risque méthodologique.
- Cas 5 = seul qui demande du nouveau (l'agent décide de la propriété à
  annoter) + garde-fous de coût → après la boucle et le rendu.
- **Primitives statistiques closes** (t-test, corrélation, ANOVA, OLS bivariée,
  SE de proportion) = nouvel enfant de l'epic, en remplacement du sandbox tué
  (`aat.2`). Extensions de `microdata-core` + tools exposés à l'agent.
