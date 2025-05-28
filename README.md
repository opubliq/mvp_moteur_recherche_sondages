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

### Tester l'API localement

1. Construire l'image Docker :

```bash
docker build -t fullstack-embedding-app .
```

2. Lancer le conteneur :

```bash
docker run -p 8000:8000 fullstack-embedding-app
```

3. Vérifier que l'API répond :

```bash
curl http://localhost:8000
```

Le scrit `test_api_local.sh` fait ces 3 commandes.

### Workflow pour redéployer l’API sur DigitalOcean

1. **Builder et pousser l’image Docker**
   - Lancer le script :
     ```
     ./deploy_docker.sh
     ```

2. **Redéployer l’application sur DigitalOcean App Platform**
   - Aller sur le dashboard DigitalOcean.
   - Sélectionner l’app `embedding-api`.
   - Cliquer sur “Deploy” pour utiliser la nouvelle image Docker.

3. **Tester l’API sur Postman**
   - Tester les endpoints principaux (`/`, `/embed`, `/search`, `/viz`) pour vérifier que tout fonctionne après le déploiement.

### Workflow pour déployer le UI

1. **Compiler l'interface React pour la production**
   - Lancer la commande :
     ```
     make build-react
     ```
   - Cette commande exécute `npm run build` dans le répertoire `ui/`

2. **Déployer l'interface sur Netlify**
   - Lancer la commande :
     ```
     make deploy-react
     ```
   - Cette commande exécute une compilation locale avec `netlify build` puis déploie en production avec `netlify deploy --prod`

3. **Vérifier le déploiement**
   - Ouvrir l'URL du site Netlify (https://ui-moteur-recherche.netlify.app) pour vérifier que l'interface fonctionne correctement
   - Tester les fonctionnalités principales pour s'assurer que la communication avec l'API fonctionne