# Conventions d'ingestion

Règles **impératives** pour tout extracteur `ingestion/surveys/*.py` et pour
toute extension de couverture (p.ex. 9gf.1). Référencé depuis `AGENTS.md`.

## 1. INTERDICTION ABSOLUE de fabriquer du texte

> **On n'invente JAMAIS un `question_text` ni un `label` de choix de réponse.**

Tout texte indexé doit provenir **du raw** :

| Champ | Source autorisée (raw) |
|---|---|
| `question_text` | variable label SAV/DTA, colonne `Label`/`Etiquette` d'un dictionnaire XLSX, libellé du codebook PDF/DOCX/RTF, en-tête de colonne « étiquetée » |
| `response_options[].label` | value labels SAV/DTA, table code→étiquette du dictionnaire/codebook |
| `response_options[].code` | codes du raw |

Sont **interdits** :

- inventer une phrase plausible de question à partir du seul nom de variable ;
- recopier le nom de variable dans `question_text` (`question_text = "VOT1"`) ;
- mettre un placeholder (`<none>`, `N/A`, `Question 1`, `TODO`, `—`…) ;
- « deviner » le libellé d'un choix à partir du code.

### Anti-pattern à proscrire

```python
# INTERDIT : fallback silencieux sur le nom de variable
question_text = (var_labels.get(col) or "").strip() or col
```

Le `or col` **fabrique** un `question_text` quand le label est absent. À la
place :

```python
raw_label = (var_labels.get(col) or "").strip()
if not raw_label:
    continue   # EXCLURE la variable (ou flagger le sondage, voir §2)
question_text = _clean_text(raw_label)
```

> Note : `ingestion/surveys/cecd_elxn_qc_1998.py` utilisait ce fallback `or col`
> (legacy) — **corrigé** (2026-07-06) en `continue`, avec ajout d'un
> `EXCLUDED_VARS` (pondérations, n° de questionnaire, admin terrain).

## 2. Quand le wording est absent du raw

Deux options, **jamais** l'invention :

1. **Exclure la variable** si seules quelques variables n'ont pas de libellé
   (variables techniques : poids, id, dates, flags de routing…). Documenter
   l'exclusion dans le module (`EXCLUDED_VARS` + raison), comme dans `eeq_2014.py`.
2. **Flagger le sondage entier « nécessite le questionnaire »** si le raw n'est
   qu'une liste de codes (variable → code → label) sans aucun wording de
   question : **n'écris pas d'extracteur**, recense-le dans `COUVERTURE.md` avec
   le verdict `nécessite questionnaire`. Le wording devra venir d'un
   questionnaire/codebook externe avant ingestion.

### Exception : sociodémo au libellé dégénéré → wording canonique

Une variable **sociodémographique universelle** (sexe, âge, scolarité, revenu,
région, langue…) dont le *seul* libellé raw est dégénéré (se réduit au nom de
variable, p.ex. label SAV « sexe » pour `sexe`) n'a pas à être exclue : lui
assigner le `question_text` **canonique** versionné dans
`ingestion/canonical.py` (`CANONICAL_SOCIODEMO[sociodemo_type]`). Ce n'est pas
une fabrication de question : c'est l'étiquetage standard, auditable et
whitelisté, d'une variable démographique — les *options de réponse* restant
verbatim du raw. Le garde-fou (`validate.py`) whiteliste exactement ces paires.

Motif d'extraction (n'appliquer le canonique qu'en **dernier recours**, un
libellé raw riche reste toujours verbatim) :

```python
sociodemo_type = SOCIODEMO_VARS.get(col)  # None si non-sociodémo
if sociodemo_type and (not raw_label or fabrication_reason(col, raw_label)):
    question_text = canonical_sociodemo_text(sociodemo_type)
    if question_text is None:
        continue  # sociodemo_type hors table canonique → exclure
else:
    question_text = raw_label
    if not question_text:
        continue
```

Cette exception vaut **uniquement** pour les sociodémo (`is_sociodemo=True`) :
une variable substantielle au libellé dégénéré reste exclue/bloquante.

## 3. Garde-fou technique

`ingestion/validate.py` détecte automatiquement les libellés manifestement
fabriqués/vides. L'orchestrateur (`ingestion/run.py`) appelle
`assert_no_fabricated_text(survey_file)` après validation Pydantic et **avant**
l'indexation : une fabrication détectée **lève `FabricatedTextError`** et stoppe
l'ingestion du sondage.

Cas détectés (honnêtes et conservateurs) :

- `question_text` vide / espaces ;
- placeholder explicite (`<none>`, `n/a`, `Question 1`, `TODO`, `???`, `---`…) ;
- `question_text` = copie verbatim du nom de variable (`VOT1`, `Q3.`) ;
- `question_text` purement numérique (code brut) ;
- `label` de choix vide.

**Limite assumée** : une question *inventée de toutes pièces* (phrase plausible
absente du raw) n'est **pas** détectable automatiquement. La défense est ici
**humaine + organisationnelle** : cette convention, le recensement
`COUVERTURE.md` (qui empêche d'écrire un extracteur pour un sondage sans
wording), et la revue. Le validateur attrape les dégénérescences ; il ne
remplace pas l'honnêteté de l'extracteur.

## 4. Rappels de structure

- Un extracteur expose `extract() -> dict` conforme à `SurveyFile` (voir
  `ingestion/models.py` et `ingestion/SCHEMA.md`).
- Aucun accès réseau ni embedding dans `extract()` : pure extraction de
  structure. Les embeddings sont calculés par l'orchestrateur.
- Nettoyer le markup (balises SPSS `{u}`/`{b}`/`{br}`, `&nbsp;`) sans altérer
  le sens (cf. `_clean_text` dans `eeq_2014.py`).
