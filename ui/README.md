# Moteur de Recherche de Sondages - Composant UI

Ce dépôt contient l'interface utilisateur React pour le projet Moteur de Recherche de Sondages, construit avec Vite.

## Stack Technique

- [React](https://reactjs.org/) - Bibliothèque UI
- [Vite](https://vitejs.dev/) - Outil de build et serveur de développement
- [TailwindCSS](https://tailwindcss.com/) - Framework CSS utilitaire
- [React Router](https://reactrouter.com/) - Routage côté client

## Développement

### Prérequis

- Node.js (v18+)
- npm ou yarn

### Mise en Route

1. Cloner le dépôt
2. Installer les dépendances :
    ```bash
    npm install
    ```
3. Démarrer le serveur de développement :
    ```bash
    npm run dev
    ```

## Build pour la Production

```bash
npm run build
```

Les artefacts de build seront stockés dans le répertoire `dist/`.

## Structure du Projet

```
ui/
├── public/         # Ressources statiques
├── src/
│   ├── assets/     # Images, polices, etc.
│   ├── components/ # Composants UI réutilisables
│   ├── pages/      # Composants de pages
│   ├── services/   # Services API
│   ├── App.jsx     # Composant principal de l'application
│   └── main.jsx    # Point d'entrée de l'application
└── README.md
```
