# Schéma JSON normalisé — catalogue de questions de sondage

## Fichier normalisé (entrée de l'ingestion)

Un fichier par sondage, structure :

```json
{
  "survey": {
    "survey_id":      "string  — identifiant unique (ex. CROP2023_CONF)",
    "survey_name":    "string  — titre lisible",
    "year":           "int|null",
    "pollster":       "string|null  — ex. CROP, Léger, Abacus",
    "language":       "string  — 'fr' par défaut",
    "n_respondents":  "int|null",
    "raw_data_file":  "string|null  — chemin relatif dans data/",
    "tags":           ["string"]
  },
  "questions": [
    {
      "variable":         "string  — nom de variable RAW (ex. Q1, CONF_GOV)",
      "question_text":    "string  — libellé de la question tel que posé",
      "response_options": [
        { "code": "int|str", "label": "string" }
      ],
      "var_type":         "string|null  — 'single'|'multiple'|'open'|'scale'|...",
      "is_sociodemo":     "bool  — false par défaut",
      "sociodemo_type":   "string|null  — 'age'|'gender'|'education'|...",
      "concepts":         ["string"],
      "themes":           ["string"]
    }
  ]
}
```

## Documents Azure AI Search (sortie de `build_docs`)

### Parent (doc_type = "survey")

| Champ           | Type        | Source                  |
|-----------------|-------------|-------------------------|
| `id`            | string      | = `survey_id`           |
| `doc_type`      | "survey"    | constante               |
| `survey_id`     | string      | survey.survey_id        |
| `survey_name`   | string      | survey.survey_name      |
| `year`          | int\|null   | survey.year             |
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
| `response_options` | [{code,label}] | codes convertis en string                     |
| `var_type`         | string\|null| question.var_type                                |
| `is_sociodemo`     | bool        | question.is_sociodemo                            |
| `sociodemo_type`   | string\|null| question.sociodemo_type                          |
| `concepts`         | [string]    | question.concepts                                |
| `themes`           | [string]    | question.themes                                  |
| `survey_id`        | string      | dénormalisé depuis survey (filtre sans JOIN)     |
| `survey_name`      | string      | dénormalisé                                      |
| `year`             | int\|null   | dénormalisé                                      |
| `pollster`         | string\|null| dénormalisé                                      |
| `language`         | string      | dénormalisé                                      |
| `n_respondents`    | int\|null   | dénormalisé                                      |
| `tags`             | [string]    | dénormalisé                                      |
| `content_vector`   | float[3072] | **absent ici** — injecté par l'orchestrateur     |

## Texte à embedder (`embed_text`)

```
{question_text}
{label_option_1}
{label_option_2}
...
```

Un saut de ligne entre chaque élément. Pas de préfixe, pas de ponctuation ajoutée.
