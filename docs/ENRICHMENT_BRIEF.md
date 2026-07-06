# Brief — enrichissement d'un sondage par subagent LLM

Brief **réutilisable** : à donner à un subagent (Haiku suffit) chargé d'enrichir
UN sondage déjà extrait mécaniquement. Un subagent = un sondage. L'orchestrateur
en lance un par `survey_id` à (ré)ingérer.

## Contexte

Le produit est un **moteur de recherche de questions de sondage** : l'utilisateur
tape un concept (« confiance envers le gouvernement ») et retrouve les questions
pertinentes à travers plusieurs sondages, même quand le wording change. Les
sondages sont extraits mécaniquement des fichiers SPSS/Stata (`ingestion/surveys/
*.py`, via pyreadstat) → `question_text` et `response_options` sont **verbatim du
raw**. Ton rôle : ajouter les champs **mous** qui améliorent recherche + affichage.

## Ce que tu produis : UN fichier

`ingestion/enrichment/<survey_id>.py`, contenant **uniquement deux dicts figés** :

```python
"""Enrichment authoré — <survey_id>. Produit par subagent LLM (<date>)."""

SURVEY = {
    "description": "1-2 phrases : commanditaire, sujet, population, moment.",
    "month": 10,   # mois du terrain 1-12, ou None si non déterminable
}

QUESTIONS = {
    "<variable>": {
        "display_label": "Titre lisible et autonome de la question",
        "concepts": ["concept_a", "concept_b"],
        "themes": ["theme_1"],
    },
    # ... une entrée par question NON technique
}
```

Rien d'autre : pas de logique, pas d'appel réseau. C'est de la **donnée figée**,
versionnée en git, revue humainement. Le merge est fait par
`ingestion/enrich.py::apply_enrichment` — tu n'y touches pas.

## Règles impératives

1. **Ne JAMAIS redéfinir un champ verbatim** (`question_text`, `response_options`,
   `variable`). `apply_enrichment` lève une erreur si tu le fais. Tu n'ajoutes que
   `display_label`, `concepts`, `themes` (par question) et `description`, `month`
   (sondage). Cf. `ingestion/CONVENTIONS.md`.
2. **Pas de fabrication.** `display_label` doit **reformuler fidèlement** la
   question réelle (à partir de `question_text` + labels de réponse + codebook) —
   jamais inventer un sujet. Si tu ne peux pas déterminer de quoi parle une
   variable (ex. stub `MENTION 1` sans contexte dans le codebook), **laisse-la
   hors de `QUESTIONS`** plutôt que deviner.
3. **`month` best-effort.** Dérive-le du `survey_id` (`..._2013_10` → 10), d'une
   date d'élection connue, ou du codebook. Introuvable → `None`. Jamais inventé.
4. **`concepts`** = notions substantielles interrogées (ex. `confiance`,
   `souveraineté`, `immigration`), en minuscules, réutilisables entre sondages
   (vocabulaire cohérent → facettes utiles). **`themes`** = catégories larges
   (ex. `démocratie`, `économie`, `identité`). Vide `[]` si rien de net.
5. Les **variables techniques déjà exclues** par l'extracteur (pondérations, IDs,
   admin) n'apparaissent pas dans l'extraction : tu ne les enrichis pas.

## Marche à suivre pour le subagent

1. Lire la liste réelle des questions à enrichir :
   ```
   uv run python -c "from ingestion.surveys.<survey_id> import extract; \
   [print(q['variable'],'|',q['question_text'][:90]) for q in extract()['questions']]"
   ```
2. Lire le **codebook** du sondage dans `data/<survey_id>/` (PDF/DOC/MD/TXT) pour
   le contexte, le wording complet (les labels SPSS sont tronqués à 256 car) et le
   moment du terrain. Utiliser l'outil Read (il lit les PDF).
3. Écrire `ingestion/enrichment/<survey_id>.py` avec `SURVEY` + `QUESTIONS`.
4. Vérifier que ça charge et valide :
   ```
   uv run python -c "from ingestion.enrich import apply_enrichment; \
   from ingestion.surveys.<survey_id> import extract; \
   from ingestion.models import SurveyFile; from ingestion.validate import assert_no_fabricated_text; \
   sf=SurveyFile.model_validate(apply_enrichment(extract(),'<survey_id>')); \
   assert_no_fabricated_text(sf); \
   print('OK', sum(1 for q in sf.questions if q.display_label), 'display_labels /', len(sf.questions))"
   ```

## Après tous les subagents (orchestrateur)

```
uv run python -m ingestion.create_index   # additif : ajoute display_label / survey_* si absents
uv run python -m ingestion.run            # réingère avec l'enrichment
```
Puis vérifier une requête sémantique (`docs`/README) et l'idempotence (doc count
stable au 2e run).
