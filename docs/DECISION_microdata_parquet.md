# Décision — Microdonnées répondant (réponses fermées) : contrat Parquet + crosstab DuckDB

Statut : **validé** (issue `mvp_moteur_recherche_sondages-v33.1`), prêt à implémenter.
Portée : figer, **avant ingestion**, le schéma des fichiers Parquet répondant-niveau, la
gestion codes/labels, le typage raw-first, les poids, le patron de requête DuckDB et la
convention Blob. Store déjà tranché : **1 Parquet par sondage dans Azure Blob**, interrogé
par **DuckDB** dans une Netlify Function. AI Search reste réservé au sémantique.

Ces choix sont **ancrés sur les données réelles** (SAV/DTA/CSV observés), pas supposés — voir
§ Surprises.

---

## 0. Principe directeur

Le Parquet est un **miroir RAW-FIRST** de la matrice répondant × variable : 1 ligne = 1
répondant, 1 colonne = 1 variable RAW, valeurs = **codes RAW** tels quels. Aucun nettoyage de
fond. Les labels d'options, le flag sociodémo et le typage de variable **ne sont PAS dupliqués
à côté du Parquet** : ils vivent déjà dans l'index AI Search `survey-questions`, keyés sur
`variable` (= le nom de colonne du Parquet). Seules les métadonnées niveau-sondage absentes
d'AI Search (poids, ID répondant, présence de microdonnées) vivent dans un petit `_manifest.json`.
Le même Parquet sert le UI et le futur sandbox de l'agent analytique.

---

## 1. Schéma des colonnes Parquet

**Grain** : 1 ligne = 1 répondant. **Colonnes** = toutes les variables du raw + colonnes
techniques minimales. On **conserve l'ID de variable RAW** comme nom de colonne.

### Convention de nommage des colonnes

- **Nom de colonne = ID de variable RAW, préservé tel quel** (`QSEXE`, `Q29A`, `GENDER`,
  `EDUCATION`, `WEIGHTMERGED`). C'est la même clé que `question.variable` dans le JSON
  normalisé et que le champ `variable` des docs AI Search — **jointure triviale** entre le
  Parquet (données) et le catalogue (labels/wording/sociodémo).
- Ajustement de **format seulement** (autorisé par raw-first), jamais de fond :
  normalisation Parquet-safe des noms si nécessaire (trim, un nom non vide, unicité). Si un ID
  RAW doit être ajusté pour être un identifiant de colonne valide, **conserver l'original**
  dans les métadonnées de colonne (`raw_name`) pour ne rien perdre. En pratique, les IDs
  observés (`QSEXE`, `Q57`, `GENDER`…) sont déjà valides : aucune transformation attendue.
- **Casse préservée** telle qu'au raw. La jointure catalogue↔Parquet se fait sur la valeur
  exacte de `variable`.

### Colonnes techniques réservées (préfixe `__`)

Pour éviter toute collision avec un ID de variable RAW, les colonnes ajoutées par l'ingestion
sont préfixées `__` :

| Colonne | Type | Rôle |
|---|---|---|
| `__respondent_id` | int64 | identité de ligne stable. Dérivée de l'ID répondant RAW s'il existe (`QUEST` eeq, `record` habit) ; sinon index de ligne 0..N-1. **Toujours présent.** |
| `__survey_id` | string (dictionary) | constante = `survey_id`. Permet d'empiler plusieurs Parquet si besoin, et trace l'origine dans le sandbox. |
| `__weight` | double, **non-nullable** | poids du répondant (voir §5). Toujours présent et rempli : poids fourni par la maison de sondage, ou `1.0` si le sondage n'en fournit pas. |

> Les variables de poids RAW (`POND`, `WEIGHTMERGED`, `WEIGHT_FIN`) restent **aussi** comme
> colonnes normales (raw-first : on ne supprime rien) ; `__weight` en est une **copie
> pointée** vers celle déclarée, pour un accès uniforme cross-sondage.

### Hétérogénéité inter-sondages

Chaque sondage a **son propre jeu de colonnes** — c'est voulu et géré par « 1 Parquet par
sondage » : pas de schéma union, pas de colonnes fantômes. Le point de rencontre cross-sondage
est **sémantique** (catalogue AI Search : `variable` + `concepts`/`themes`), pas structurel.
Un crosstab s'exécute **dans un seul Parquet à la fois**. Un futur croisement multi-sondages
passera par le `sociodemo_type` canonique (dimension comparable d'un sondage à l'autre), pas
par les IDs RAW (non comparables).

### Exemple de schéma (extrait `eeq_2014.parquet`)

```
__respondent_id : int64
__survey_id     : string        = "eeq_2014"
__weight        : double        (copie de POND)
QUEST           : int32         (num. questionnaire RAW, conservé)
QSEXE           : int8   (dict) (1,2)            ← sociodémo (gender)
CLAGE           : int8   (dict) (2..8)           ← sociodémo (age)
QREGION         : int8   (dict) (1..17)          ← sociodémo (region)
Q57             : int8   (dict) (1..9,99)        ← sociodémo (income)
Q29A            : double         (0..100)         ← échelle (thermomètre)
Q31A            : double         (0..10)          ← échelle
VOTE1           : int16  (dict)                   ← question fermée
POND            : double         (0.5..2.6)        ← poids RAW (aussi copié en __weight)
LANG            : string (dict) ("FR","EN")
<open text>     : string                           ← verbatims (présents mais hors crosstab)
```

---

## 2. Codes vs labels — OÙ vivent les labels

**Décision : valeurs Parquet = codes RAW ; les labels ne sont pas émis à côté du Parquet — ils
viennent de l'index AI Search `survey-questions`, keyés sur `variable`.** Pas de sidecar labels
par sondage.

> **Cadrage.** La source de vérité des labels est le **JSON normalisé** (`ingestion/normalized/`) ;
> AI Search en est une **projection**, un sidecar en serait une seconde. « Éviter la duplication »
> ne tranche donc pas à lui seul. Ce qui tranche : le seul consommateur actuel est le **UI**, qui
> charge déjà les `response_options` — un sidecar n'apporterait rien aujourd'hui. Et la décision est
> **réversible sans coût** : si le sandbox de l'agent (epic `aat`) a un jour besoin de fichiers
> auto-descriptifs, le sidecar s'ajoute par une simple projection du normalisé vers le Blob, sans
> jamais toucher aux Parquet.

Justification : l'index `survey-questions` (cf. `ingestion/create_index.py`) contient **déjà**,
par question (doc `question`), tout ce qu'un sidecar porterait, et sur **la même clé** que
le nom de colonne du Parquet :

- `variable` — l'ID de variable RAW = **clé de jointure** avec les colonnes Parquet.
- `response_options` — collection `{code, label}` : **les labels d'options**.
- `is_sociodemo`, `sociodemo_type`, `var_type`, `display_label`, `question_text`, `has_verbatims`.

Le UI charge déjà ces `response_options` pour la vue structure du sondage : au moment de rendre
une distribution/crosstab, le front a **déjà en mémoire** les maps `code → label` de la variable
cible et de la dimension de croisement. Un sidecar `.labels.json` n'ajouterait donc **aucune
capacité** au seul consommateur actuel, tout en créant un second artefact à générer et à garder
à jour. On ne le construit pas tant que rien ne le réclame (cf. encadré ci-dessus).

Conséquences :
- **Ne PAS** émettre de sidecar labels par sondage.
- **Ne PAS** enfouir les labels dans les métadonnées Parquet ni comme valeurs de cellule
  (casse le raw-first, gonfle le fichier, crosstabs fragiles).
- Flux de rendu : DuckDB agrège sur les **codes** → le JS mappe `code → label` avec les
  `response_options` déjà chargées depuis AI Search (jointure sur `variable`).

### Ce qui n'est PAS dans AI Search → `_manifest.json` (niveau sondage)

Quelques métadonnées propres aux microdonnées ne sont pas indexées (les poids et l'ID répondant
sont dans `EXCLUDED_VARS` des extracteurs, donc absents d'AI Search). Elles vivent dans un petit
`_manifest.json` unique dans le container (voir §7), pas dans des sidecars par variable :

```json
{
  "surveys": [
    {
      "survey_id": "eeq_2014",
      "n_respondents": 2456,
      "n_vars": 180,
      "weight_var": "POND",
      "weight_source": "provided",
      "respondent_id_var": "QUEST",
      "updated_at": "2026-07-10T..."
    }
  ]
}
```

- `weight_var` / `respondent_id_var` : déclarés par sondage à l'ingestion (le poids n'est **pas**
  deviné, cf. §5). `weight_var` est `null` quand le sondage ne fournit pas de poids.
- `weight_source` : `"provided"` (poids de la maison de sondage) ou `"uniform"` (aucun poids
  fourni → `__weight = 1.0`). **Essentiel** : sans ce champ, un `__weight` uniforme est
  indiscernable d'un vrai poids, et des chiffres non pondérés se lisent comme représentatifs.
- La liste `surveys` dit **quels sondages ont des microdonnées** (tous n'en auront pas).

---

## 3. Typage minimal raw-first

Objectif : typage **exploitable** (catégoriel vs numérique) sans toucher au fond.

### Règle de typage (dérivée du normalisé, pas d'heuristique fragile)

| Cas (var_type normalisé) | Type Parquet | Justification |
|---|---|---|
| `single` / `multiple` (a des `response_options`) | entier **dictionary-encoded** (`int8/int16` selon cardinalité), ou `string` dictionary si codes RAW alphanumériques (ex. `LANG` = "FR"/"EN") | codes catégoriels : petit domaine → dictionary = compact + GROUP BY rapide |
| `scale` | `double` (ou `int16` si toutes valeurs entières) | échelle numérique 0–10 / 0–100, ordonnée |
| `continuous` (ex. année de naissance `QAGE`) | `double` / `int32` | vraie mesure numérique |
| `open` / verbatims | `string` | texte libre — présent mais **hors crosstab** |
| poids | `double` | jamais catégoriel |

Le `var_type` d'AI Search (`single`/`multiple`/`scale`/`continuous`/`open`) pilote déjà le UI
(bar chart de distribution catégorielle vs histogramme numérique) — pas besoin de le redupliquer.

### Missing / NA — RAW-FIRST strict

- **On n'impute rien, on ne recode rien.** Les sentinelles RAW sont **conservées comme
  valeurs** : `99`/`98` (« Je préfère ne pas répondre », déjà dans `response_options`), `9999`
  (refus, observé dans les CSV govcan), etc. Elles restent des codes visibles, filtrables par
  l'analyste, avec leur label dans le catalogue AI Search.
- **Seul** le missing *structurel* (cellule vide SAV/CSV, `NaN`) devient **NULL Parquet** —
  c'est un ajustement de format, pas de fond. DuckDB distingue alors « pas de réponse »
  (`NULL`, exclu des dénominateurs par défaut) de « a refusé » (code RAW présent).
- Aucune plage user-missing SPSS observée (`missing_ranges` vide sur eeq) ; si un futur SAV en
  a, **ne pas les appliquer** (`pyreadstat(..., apply_value_formats=False)` déjà en place) —
  garder les codes bruts, documenter la plage dans le `_manifest.json` (`missing_codes`) au besoin.

### Encodage

- Sortie Parquet **UTF-8** systématique (les accents français doivent survivre).
- Lecture : SAV/DTA via `pyreadstat` (gère l'encodage SPSS). **CSV : PAS UTF-8 par défaut** —
  au moins un CSV govcan est **latin-1/cp1252** (voir § Surprises). Détecter/forcer l'encodage
  à la lecture ; c'est un ajustement de **format** autorisé, le contenu est identique.
- Codes numériques : `pyreadstat` renvoie des `float64` même pour des codes entiers (`1.0`,
  `2.0`). **Downcast en entier** quand toutes les valeurs non-nulles sont entières — ajustement
  de format (typage), le code RAW est inchangé.

---

## 4. Sociodémo

**Décision : réutiliser tel quel le flag `is_sociodemo` + `sociodemo_type` du JSON
normalisé.** Aucune nouvelle source.

- Représentation actuelle (vérifiée) : le flag vit **par question** dans le normalisé
  (`Question.is_sociodemo: bool`, `sociodemo_type: str|None`), alimenté dans chaque extracteur
  par un dict `SOCIODEMO_VARS: {var_id → sociodemo_type}` (ex. `eeq_2014.py` : `QSEXE→gender`,
  `CLAGE→age`, `QREGION→region`, `Q57→income`…). `sociodemo_type` suit une nomenclature
  transversale (`gender|age|education|income|region|language|occupation|marital_status`…),
  aussi câblée dans `ingestion/canonical.py`.
- Les variables sociodémo **ne sont pas séparées physiquement** : ce sont des colonnes RAW
  normales dans le Parquet. Le catalogue AI Search porte `is_sociodemo`/`sociodemo_type` par
  variable → le UI peuple le sélecteur « croiser par… » en filtrant `is_sociodemo == true`.
- **Bénéfice cross-sondage** : `sociodemo_type` est la clé **comparable** entre sondages (le UI
  peut proposer « croiser par âge » quel que soit l'ID RAW réel : `CLAGE` ici, `AGE_CAT`
  ailleurs). Les IDs RAW, eux, ne sont pas comparables.

---

## 5. Poids de sondage

**Décision : `__weight` est obligatoire.** Le contrat d'ingestion garantit que **tout** Parquet a
une colonne de poids, toujours nommée pareil, toujours remplie. Le UI et l'agent n'ont donc
**jamais** de branche pondéré/non-pondéré à gérer : c'est toujours `SUM(__weight)`.

**Des poids existent** dans les données réelles (`POND` sur eeq_2014, `float` ~0.5–2.6 ;
`WEIGHTMERGED` + `WEIGHT_FIN` sur habit) et étaient jusqu'ici **exclus** de l'index
(`EXCLUDED_VARS` des extracteurs). Pour le Parquet, on les **capte**.

- **Déclaration, pas détection.** Le poids retenu est déclaré par sondage dans le module
  extracteur (`ingestion/surveys/{survey_id}.py`), à côté d'`EXCLUDED_VARS` :
  `WEIGHT_VAR = "POND"`. C'est là que vit déjà la connaissance spécifique au sondage. Aucune
  heuristique sur le nom de colonne — trop fragile.
- **Remplissage de `__weight`** :
  - `WEIGHT_VAR` déclaré → `__weight` = copie de cette colonne, `weight_source = "provided"`.
  - `WEIGHT_VAR` absent → `__weight = 1.0` pour tous les répondants,
    `weight_source = "uniform"`. `SUM(__weight)` vaut alors exactement `COUNT(*)` : le contrat
    reste uniforme, sans prétention statistique.
- Les colonnes de poids RAW restent **toutes** présentes (raw-first) pour l'analyste avancé ;
  `__weight` en est une copie d'accès uniforme.
- **Plusieurs poids dans un même sondage** (cas `habit`) : réglé par le même mécanisme — on
  déclare `WEIGHT_VAR` quand on ingère ce sondage. Pas de règle d'arbitrage à inventer d'avance.
- **Hors scope** : générer un vrai poids (post-stratification / raking sur cibles de
  recensement) est un travail statistique à part entière → bead dédié le jour où on en veut un.
  `weight_source = "uniform"` est le marqueur honnête en attendant.

---

## 6. Stratégie crosstab DuckDB

DuckDB lit le Parquet **directement depuis le Blob** (extension `httpfs`, `read_parquet` sur
URL SAS) dans la Netlify Function ; agrégation **sur les codes RAW**, mapping en labels côté
JS via les `response_options` d'AI Search. Requête **paramétrée** : variable cible × dimension
sociodémo (+ filtres), pondérée ou non.

### Patron paramétré

Paramètres : `target` (var cible), `dim` (var sociodémo de croisement, optionnelle),
`filters` (liste `var IN (codes)`). Pas de paramètre `weighted` : `__weight` étant toujours
présent (§5), l'agrégation est **toujours** `SUM(__weight)`. Identifiants **whitelistés** contre les
noms de variable connus (schéma Parquet / champ `variable` d'AI Search) avant interpolation
(anti-injection ; DuckDB ne paramètre pas les noms de colonne).

### Distribution simple (1 variable, pondérée)

```sql
SELECT
  "QSEXE"                          AS code,
  SUM("__weight")                  AS weighted_n,
  COUNT(*)                         AS raw_n
FROM read_parquet('https://<acct>.blob.core.windows.net/survey-responses/eeq_2014.parquet?<SAS>')
WHERE "QSEXE" IS NOT NULL
GROUP BY "QSEXE"
ORDER BY "QSEXE";
```

### Crosstab (cible × dimension sociodémo, pondéré, avec % par colonne)

```sql
WITH base AS (
  SELECT "Q57" AS target_code, "QSEXE" AS dim_code, "__weight" AS w
  FROM read_parquet('.../eeq_2014.parquet?<SAS>')
  WHERE "Q57" IS NOT NULL AND "QSEXE" IS NOT NULL
    -- filtres optionnels (ex. région = Montréal) :
    AND "QREGION" IN (6)
)
SELECT
  dim_code,
  target_code,
  SUM(w)                                            AS weighted_n,
  COUNT(*)                                          AS raw_n,
  SUM(w) / SUM(SUM(w)) OVER (PARTITION BY dim_code) AS col_share
FROM base
GROUP BY dim_code, target_code
ORDER BY dim_code, target_code;
```

- `raw_n` est conservé à côté de `weighted_n` : c'est le **n brut** (taille d'échantillon réelle),
  nécessaire pour afficher les effectifs et juger de la fiabilité d'une cellule. Quand
  `weight_source = "uniform"`, les deux colonnes sont égales.
- Le JS mappe `dim_code`/`target_code` → labels via les `response_options` d'AI Search (jointure
  sur `variable`), pivote en tableau (dimension en colonnes, cible en lignes) et affiche `col_share`.
- `NULL` exclu par les `WHERE ... IS NOT NULL` → dénominateur = répondants ayant répondu aux
  deux. Les codes « refus » (99/9999) **restent inclus** par défaut (ce sont des réponses RAW) ;
  le UI peut offrir de les masquer via un filtre explicite.
- **Perf** : Basic/serverless — un Parquet/sondage (100 Ko–qq Mo), dictionary-encoded ; DuckDB
  ne scanne que les colonnes citées (projection pushdown) et peut lire des ranges via `httpfs`.
  Largement suffisant pour un crosstab interactif.

---

## 7. Convention de nommage / partitionnement Blob

Container Azure Blob dédié, **un objet Parquet par sondage** + un `_manifest.json` unique, clé =
`survey_id` (même identifiant partout : dossiers `data/`, `ingestion/normalized/`, docs AI Search).
Pas de sidecar labels (labels ← AI Search, cf. §2).

```
Container: survey-responses
  eeq_2014.parquet
  govcan_habit_2024.parquet
  cecd_elxn_qc_2012.parquet
  _manifest.json          ← index : [{survey_id, n_respondents, n_vars, weight_var, weight_source, respondent_id_var, updated_at}]
```

- **Pas de partition Hive** (`survey_id=.../`) : granularité = le fichier lui-même ; l'accès est
  toujours « ouvre le Parquet de CE sondage ». Simplicité maximale pour DuckDB `read_parquet`
  sur une URL directe.
- Nommage : `survey-responses/{survey_id}.parquet`. Le `survey_id` est la clé de jointure avec le
  catalogue AI Search (le UI connaît déjà le `survey_id` sélectionné).
- `_manifest.json` : petit index chargé par la Function pour lister les sondages ayant des
  microdonnées et exposer `weight_source` (nature du poids) sans ouvrir chaque Parquet.
- Accès Function → Blob : SAS en lecture (ou connection string côté serveur). **Nouvelle
  infra** : aucun compte/connexion Blob dans `.env` aujourd'hui → à provisionner en v33.2
  (`AZURE_STORAGE_*`). Le Parquet n'est **jamais** exposé public : la Function relaie.

---

## Récapitulatif du contrat (à implémenter)

1. **1 Parquet/sondage**, 1 ligne = 1 répondant, colonnes = **IDs de variable RAW** + `__respondent_id`/`__survey_id`/`__weight`. Valeurs = **codes RAW**.
2. **Labels ← AI Search** (`response_options {code,label}`, keyés sur `variable`), **pas de sidecar** : l'index `survey-questions` porte déjà labels + `is_sociodemo` + `sociodemo_type` + `var_type`, sur la même clé que les colonnes Parquet. Seules les métadonnées absentes d'AI Search (`weight_var`, `weight_source`, `respondent_id_var`, présence de microdonnées) vont dans `_manifest.json`.
3. **Typage** : catégoriel = entier/dictionary, numérique/échelle = double, texte = string ; NaN structurel → NULL, **codes de refus conservés** ; downcast float→int ; sortie **UTF-8**.
4. **Sociodémo** = colonnes RAW normales, flaggées via le `is_sociodemo`/`sociodemo_type` déjà présent par question ; `sociodemo_type` = clé de croisement transversale.
5. **Poids obligatoire** : `WEIGHT_VAR` déclaré dans l'extracteur → `__weight` (non-nullable) ; absent → `__weight = 1.0` + `weight_source = "uniform"`. Colonnes de poids RAW conservées. Agrégation **toujours** `SUM(__weight)`, aucune bascule.
6. **DuckDB** lit le Parquet Blob via `httpfs`, GROUP BY paramétré sur les codes, mapping labels côté JS.
7. **Blob** : container `survey-responses`, `{survey_id}.parquet` + `_manifest.json`, pas de partition Hive.

---

## Surprises / risques relevés dans les données réelles

- **Formats hétérogènes** : SAV (`eeq_2014`), DTA (aussi présent pour eeq), CSV+dictionnaire
  XLSX (`govcan_habit_2024` = 904 colonnes, `govcan_parca_2024` = 74 Mo). Le générateur Parquet
  doit gérer **≥3 chemins de lecture**. Bonne nouvelle : le **JSON normalisé homogénéise déjà**
  le catalogue → le générateur peut s'appuyer dessus pour connaître variables/types/labels, et
  ne lit le raw que pour les **valeurs de cellule**.
- **Encodage CSV non-UTF-8** : `HABIT` échoue en UTF-8, lisible en **latin-1**. Détection
  d'encodage obligatoire pour les CSV (risque d'accents corrompus sinon).
- **Codes float dans SAV** : `pyreadstat` renvoie `1.0/2.0` — prévoir le downcast entier
  (sinon GROUP BY sur des floats et labels string mal alignés).
- **Sentinelles de missing incohérentes** : `99`/`98` (eeq) vs `9999` (CSV govcan) vs cellule
  vide. Raw-first tranche proprement : sentinelle codée = valeur conservée ; vide = NULL.
- **Poids multiples** : `habit` a `WEIGHTMERGED` **et** `WEIGHT_FIN` (valeurs identiques sur
  l'échantillon vu). Réglé par la déclaration `WEIGHT_VAR` dans l'extracteur (§5) — on tranche au
  moment d'ingérer ce sondage, pas d'avance.
- **Sondages sans poids** : `__weight = 1.0` (§5). Le risque réel n'est pas technique mais
  interprétatif — d'où `weight_source` au manifeste, pour que « non pondéré » reste visible.
- **Poids/ID actuellement exclus de l'index** (`EXCLUDED_VARS`) : pour le Parquet il faut au
  contraire les **capter** — le générateur ne doit PAS réutiliser la liste d'exclusion des
  extracteurs telle quelle (elle sert le catalogue de questions, pas les microdonnées).
- **Identité de ligne non uniforme** : `QUEST` (eeq) vs `record` (habit) vs rien. D'où
  `__respondent_id` synthétisé (RAW si dispo, sinon index de ligne).
- **CSV mixtes codes/labels** : la plupart des colonnes fermées govcan stockent des **codes
  numériques** (`GENDER` 1/2, `EDUCATION` 6/8/9999) — conforme au plan ; mais certaines
  colonnes techniques stockent déjà du **texte** (`Device`="Smartphone", `ResLanguage`="fr").
  Raw-first : on garde tel quel (string dictionary) ; le catalogue n'aura pas de table
  code→label pour elles — le UI affiche alors la valeur brute, qui est déjà lisible.
- ~~**Infra Blob à créer**~~ : fait (v33.2). Compte `opubliqsondagesdata` + container privé
  `survey-responses` (canadaeast, Standard_LRS/hot) ; `AZURE_STORAGE_*` dans `.env`, doc dans
  le README (§ Infra Azure).
- **Dictionary sur colonne entière non restauré à la relecture** (constaté au smoke test v33.2) :
  une colonne `int8` écrite dictionary-encoded revient en `int8` simple via
  `pyarrow.parquet.read_table` (les colonnes `string` reviennent bien en `dictionary`). Sans
  conséquence : l'encodage dictionary est bien appliqué **sur disque** (compacité) et les
  **valeurs sont identiques** ; seul le type in-memory diffère. Ne pas s'en alarmer en v33.3 —
  utiliser `read_dictionary=[...]` seulement si un consommateur exige le type dictionary.
