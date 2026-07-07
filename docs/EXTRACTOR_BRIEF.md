# Brief — écriture d'un extracteur de sondage par subagent LLM

Brief **réutilisable** : à donner à un subagent (Sonnet recommandé — plus rigoureux
que Haiku pour classer 50-130 variables) chargé d'écrire l'extracteur d'UN sondage.
Un subagent = un sondage. C'est l'étape 1 du workflow (voir
[`INGESTION_RUNBOOK.md`](INGESTION_RUNBOOK.md)) ; l'enrichissement (étape 2) est
un autre subagent avec [`ENRICHMENT_BRIEF.md`](ENRICHMENT_BRIEF.md).

## Objectif

Produire `ingestion/surveys/<survey_id>.py` exposant `extract() -> dict` conforme
au schéma `SurveyFile`, à partir du fichier brut (SPSS `.sav`, Stata `.dta`, ou
dictionnaire XLSX/codebook selon `COUVERTURE.md`). Extraction **PURE** : aucun
réseau, aucun embedding, aucun LLM dans `extract()`. Les embeddings sont calculés
par l'orchestrateur.

## Règle cardinale : ZÉRO fabrication

On n'invente **JAMAIS** un `question_text` ni un `label` de réponse. Tout texte
vient du raw (var labels, value labels, colonne dico, codebook). Lis
**impérativement** `ingestion/CONVENTIONS.md` (règles complètes) et
`ingestion/SCHEMA.md` (format de sortie) AVANT d'écrire. Le garde-fou
`ingestion/validate.py::assert_no_fabricated_text` **rejette** l'ingestion si un
wording dégénéré (vide, placeholder, = nom de variable, numérique) atteint l'index.

## Modèle à copier

Utilise **`ingestion/surveys/cecd_elxn_qc_2018.py`** (ou `_2012`) comme TEMPLATE :
docstring (source, encodage), constantes (`SURVEY_ID/NAME/YEAR/POLLSTER/LANGUAGE`,
`SAV_FILE`/`OUT_FILE`), `EXCLUDED_VARS` (dict `var → raison`), `SOCIODEMO_VARS`
(dict `var → sociodemo_type`), la boucle `extract()`, le bloc `__main__` de
self-check.

## Mécanisme sociodémo canonique

Le repo a `ingestion/canonical.py` avec `CANONICAL_SOCIODEMO` (`gender`, `age`,
`education`, `income`, `region`, `language`, `occupation`, `marital_status`). Pour
une variable **sociodémo** dont le libellé raw est absent ou dégénéré (se réduit au
nom de variable, rejeté par `fabrication_reason`), **n'exclus pas** : retombe sur le
wording canonique. Motif EXACT (déjà dans le template) :

```python
from ingestion.canonical import canonical_sociodemo_text
from ingestion.validate import fabrication_reason
...
sociodemo_type = SOCIODEMO_VARS.get(col)   # None si non-sociodémo
if sociodemo_type and (not raw_label or fabrication_reason(col, raw_label)):
    question_text = canonical_sociodemo_text(sociodemo_type)
    if question_text is None:
        continue                            # sociodemo_type hors table → exclure
else:
    question_text = raw_label               # PAS de fallback `or col`
    if not question_text:
        continue
```

Un libellé raw **riche** (vraie question) reste toujours **verbatim** — ne le
remplace jamais par le canonique. L'exception vaut UNIQUEMENT pour les sociodémo.

## Variables à EXCLURE (documenter chacune dans `EXCLUDED_VARS` + raison)

1. **Techniques / administratives** : pondérations (`weight`, `pond*`), IDs de
   questionnaire, dates/durées/métadonnées d'appel, méthodo, flags de routing,
   variables de gestion terrain sans libellé de question.
2. **Dérivées / recodées** : recodages, regroupements (« en X groupes »),
   croisements, combinaisons de plusieurs variables déjà présentes, indices
   binaires. **Vérifie** en comparant les value labels / distributions à la variable
   source (le label contient souvent « recodé », « en 3 groupes », « Q2+Q3 »…).
   Garde la **source**, exclus la **dérivée**.

Ne JAMAIS exclure une vraie question substantielle pour « simplifier ».

## Couverture complète obligatoire

Chaque variable du raw doit être **soit une question, soit dans `EXCLUDED_VARS`**.
Zéro variable orpheline. Zéro question fantôme (absente du raw).

## Nettoyage

Nettoie le markup SPSS (`{u}`/`{b}`/`{br}`, `&nbsp;`) sans altérer le sens (cf.
`_clean_text` dans `eeq_2014.py`). Les préfixes de numéro de question (« qa. … »,
« Q8 - … ») sont **verbatim** : conserve-les tels quels, ne les fabrique pas.
Les libellés SPSS sont souvent **tronqués à 256 car.** : c'est du raw verbatim, ne
les complète pas (le wording complet est récupéré à l'étape enrichissement, via le
codebook).

## Validation avant de finir (obligatoire)

```bash
uv run ruff check ingestion/surveys/<survey_id>.py
uv run python - <<'EOF'
import pyreadstat
from ingestion.surveys.<survey_id> import extract, EXCLUDED_VARS, SAV_FILE
from ingestion.models import SurveyFile
from ingestion.validate import assert_no_fabricated_text
sf = SurveyFile.model_validate(extract()); assert_no_fabricated_text(sf)
df, meta = pyreadstat.read_sav(str(SAV_FILE))
raw = list(meta.column_names); qv = {q.variable for q in sf.questions}
missing = [v for v in raw if v not in (qv | set(EXCLUDED_VARS))]
labeled = {v:(meta.column_names_to_labels.get(v) or "").strip() for v in raw}
mismatch = [q.variable for q in sf.questions if q.question_text.strip()!=labeled.get(q.variable,"")]
print("questions:", len(sf.questions), "| exclues:", len(EXCLUDED_VARS), "| non comptées:", missing)
print("question_text != label brut (hors sociodémo canonique):", mismatch)
print("sociodemo:", [(q.variable,q.sociodemo_type) for q in sf.questions if q.is_sociodemo])
assert not missing, "COUVERTURE INCOMPLÈTE"
print("OK")
EOF
```

`mismatch` doit être vide **sauf** les sociodémo passées au wording canonique.

## Rapport final du subagent

Réponds avec : chemin du fichier, nombre de questions / exclues / sociodémo, la
liste sociodémo (`var → type`), confirmation que ruff + `assert_no_fabricated_text`
+ couverture complète passent, et 3 exemples de `question_text`. **Ne lance PAS
d'ingestion** (rôle de l'orchestrateur).
