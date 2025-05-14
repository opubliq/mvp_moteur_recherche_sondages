# MVP – Plateforme d'exploration de sondages publics

Ce projet vise à construire un MVP pour explorer des données de sondages publics québécois via trois branches fonctionnelles : création de base de données, matching utilisateur, visualisation.

## Structure du projet

```
.
├── app/                 # Interface utilisateur (ex. Streamlit)
├── bd/                  # Fichiers SQLite ou scripts liés à la BD finale
├── create_survey_bd/    # Scripts R pour extraire, nettoyer et indexer les sondages
├── matching/            # Matching input utilisateur ↔ questions (keywords, LLM)
├── schemas/             # Codebook, définitions des variables, métadonnées
├── tests/               # Scripts de test pour chaque module
├── viz/                 # Extraction de variables et visualisations
└── README.md
```

## Branches fonctionnelles

1. **Création de la BD** (`create_survey_bd/`)
   - Nettoyage et structuration en R
   - Indexation dans une base SQLite

2. **Matching utilisateur** (`matching/`)
   - Recherche par mot-clé ou sémantique
   - Intégration possible d’un LLM pour enrichir les requêtes

3. **Visualisation** (`viz/`)
   - Extraction de variables pertinentes
   - Visualisation via règles simples

## Dossier `schemas/`

Contient le **codebook** (`codebook.csv`) décrivant les questions :
- `question_abbr`, `question_text`, `theme`, `variable_type`, etc.

---

**Statut :** version MVP en développement.

### Composants
- [API d'embedding (FastAPI)](api/README.md)


### Makefile

Le projet inclut un Makefile qui permet de créer des raccourcis pour les commandes fréquemment utilisées :
- Installation des dépendances
- Exécution des tests
- Lancement des différents composants
- Construction de la base de données

Pour voir les commandes disponibles, utilisez `make help`.