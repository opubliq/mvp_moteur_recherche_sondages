# Schéma JSON normalisé — catalogue de questions de sondage

## Fichier normalisé (entrée de l'ingestion)

Un fichier par sondage, structure :

```json
{
  "survey": {
    "survey_id":          "string  — identifiant unique (ex. CROP2023_CONF)",
    "survey_name":        "string  — titre lisible",
    "survey_description": "string|null  — MOU (LLM) : 1-2 phrases de contexte",
    "year":               "int|null",
    "survey_month":       "int|null  — MOU : mois du terrain 1-12, best-effort",
    "pollster":           "string|null  — ex. CROP, Léger, Abacus",
    "language":           "string  — 'fr' par défaut",
    "n_respondents":      "int|null",
    "raw_data_file":      "string|null  — chemin relatif dans data/",
    "tags":               ["string"]
  },
  "questions": [
    {
      "variable":         "string  — nom de variable RAW (ex. Q1, CONF_GOV)",
      "question_text":    "string  — VERBATIM raw : libellé tel que posé",
      "display_label":    "string|null  — MOU (LLM) : titre lisible autonome",
      "response_options": [
        { "code": "int|str", "label": "string  — VERBATIM raw" }
      ],
      "var_type":         "string|null  — 'single'|'multiple'|'open'|'scale'|...",
      "is_sociodemo":     "bool  — false par défaut",
      "sociodemo_type":   "string|null  — 'age'|'gender'|'education'|...",
      "concepts":         ["string  — MOU (LLM)"],
      "themes":           ["string  — MOU (LLM)"]
    }
  ]
}
```

> **Champs VERBATIM vs MOU.** Les champs *verbatim* (`question_text`,
> `response_options`, `variable`, métadonnées SAV) proviennent exclusivement du
> raw et sont protégés par `validate.py`. Les champs *mous* (`display_label`,
> `concepts`, `themes`, `survey_description`, `survey_month`) sont authorés par un
> subagent LLM, figés dans `ingestion/enrichment/<survey_id>.py`, et superposés à
> l'extraction par `ingestion/enrich.py`. Voir `docs/ENRICHMENT_BRIEF.md`.

## Documents Azure AI Search (sortie de `build_docs`)

### Parent (doc_type = "survey")

| Champ           | Type        | Source                  |
|-----------------|-------------|-------------------------|
| `id`            | string      | = `survey_id`           |
| `doc_type`      | "survey"    | constante               |
| `survey_id`     | string      | survey.survey_id        |
| `survey_name`   | string      | survey.survey_name      |
| `survey_description` | string\|null | survey.survey_description (mou) |
| `survey_year`   | int\|null   | survey.year             |
| `survey_month`  | int\|null   | survey.survey_month (mou) |
| `pollster`      | string\|null| survey.pollster         |
| `language`      | string      | survey.language         |
| `n_respondents` | int\|null   | survey.n_respondents    |
| `raw_data_file` | string\|null| survey.raw_data_file    |
| `tags`          | [string]    | survey.tags             |

### Child (doc_type = "question")

| Champ              | Type        | Source / note                                    |
|--------------------|-------------|--------------------------------------------------|
| `id`               | string      | `{survey_id}__{variable}`                        |
| `doc_type`         | "question"  | constante                                        |
| `parent_id`        | string      | = `survey_id`                                    |
| `variable`         | string      | question.variable                                |
| `question_text`    | string      | question.question_text                           |
| `display_label`    | string\|null| question.display_label (mou, LLM)                |
| `response_options` | [{code,label}] | codes convertis en string                     |
| `var_type`         | string\|null| question.var_type                                |
| `is_sociodemo`     | bool        | question.is_sociodemo                            |
| `sociodemo_type`   | string\|null| question.sociodemo_type                          |
| `concepts`         | [string]    | question.concepts                                |
| `themes`           | [string]    | question.themes                                  |
| `survey_id`        | string      | dénormalisé depuis survey (filtre sans JOIN)     |
| `survey_name`      | string      | dénormalisé                                      |
| `survey_year`      | int\|null   | dénormalisé                                      |
| `survey_month`     | int\|null   | dénormalisé (mou)                                |
| `pollster`         | string\|null| dénormalisé                                      |
| `language`         | string      | dénormalisé                                      |
| `n_respondents`    | int\|null   | dénormalisé                                      |
| `tags`             | [string]    | dénormalisé                                      |
| `content_vector`   | float[3072] | **absent de build_docs** — vecteur QUESTION injecté par l'orchestrateur |
| `survey_vector`    | float[3072] | **absent de build_docs** — vecteur CONTEXTE sondage injecté par l'orchestrateur |

## Deux vecteurs par question (recherche pondérée)

Chaque doc question porte **deux** vecteurs 3072 dims (même profil HNSW) :

**`content_vector`** — vecteur QUESTION (dominant), via `embed_text(question)` :
```
{question_text}            ← wording verbatim (ancre)
{display_label}            ← si présent (titre lisible, mou)
{label_option_1} ...
{concepts joints par ", "} ← si présents (mots-clés, mou)
```

**`survey_vector`** — vecteur CONTEXTE sondage, via `survey_embed_text(survey)`,
calculé UNE fois puis dénormalisé sur chaque question du sondage :
```
{survey_name} — {survey_description}
```

À la recherche (`netlify/functions/search.ts`), la requête est comparée aux deux
vecteurs avec des **poids distincts** (`content_vector` = 1.0, `survey_vector` =
0.3) : le contexte sondage oriente vers les sondages pertinents sans écraser le
signal propre à la question. Un saut de ligne entre chaque élément ; pas de
préfixe ni ponctuation ajoutée.
