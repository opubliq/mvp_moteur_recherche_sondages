# Versioning & migration des embeddings

Le moteur de recherche dépend d'un modèle d'embeddings précis : les vecteurs stockés
dans l'index (`content_vector`, 3072 dims pour `text-embedding-3-large`) et le vecteur
de requête calculé à la volée par la function `/search` **doivent provenir du même
modèle**. Mélanger deux modèles dans un même index donne des scores de similarité
incohérents.

Pour rendre ce couplage traçable, l'ingestion écrit sur chaque document enfant le champ
`embedding_model` (= nom du déploiement Azure OpenAI utilisé, lu depuis
`AOAI_EMBED_DEPLOYMENT`). On peut donc auditer quel index contient quels vecteurs.

## Quand migrer

Dès qu'on change de modèle d'embeddings : nouvelle version de `text-embedding-3-large`,
passage à un autre modèle, ou changement de dimensions. Un changement de dimensions
impose de toute façon un nouvel index (le champ vecteur a une dimension figée à la
création de l'index).

## Procédure blue-green

On ne modifie jamais un index en place : on crée un index « green » à côté du « blue »
en service, on le remplit, on bascule la lecture, puis on supprime l'ancien. Le trafic
n'est jamais servi par un index à moitié ré-indexé.

1. **Choisir un nom d'index versionné.** Inclure le modèle/version, p. ex.
   `survey-questions-te3l-v2`. L'index actuel est `survey-questions` (constante
   `INDEX_NAME` dans `ingestion/config.py` et dans `netlify/functions/search.ts`).

2. **Créer l'index green.** Adapter la création d'index pour viser le nouveau nom et,
   si besoin, la nouvelle dimension de vecteur, puis le créer (vide).

3. **Configurer le nouveau déploiement d'embeddings.** Pointer `AOAI_EMBED_DEPLOYMENT`
   vers le nouveau modèle dans le `.env` d'ingestion.

4. **Ré-ingérer dans l'index green.** Relancer l'orchestrateur en ciblant le nouvel
   index (`uv run python -m ingestion.run --recreate-index`). Tous les enfants seront
   ré-embeddés avec le nouveau modèle ; leur `embedding_model` reflétera le changement.

5. **Vérifier.** Comparer le nombre de documents (`get_document_count`) entre blue et
   green, et lancer quelques requêtes de contrôle sur l'index green avant de basculer.

6. **Basculer la lecture.** Pointer la function `/search` (et `/survey`) vers l'index
   green : mettre à jour la constante `INDEX_NAME` dans `netlify/functions/*.ts`
   (ou, mieux, l'externaliser en variable d'env `INDEX_NAME` côté Netlify pour basculer
   sans redéploiement de code). Redéployer / mettre à jour la variable.

7. **Surveiller**, puis **supprimer l'index blue** une fois la bascule confirmée, pour
   libérer le quota du tier Free (3 index, 50 MB).

## Rollback

La bascule (étape 6) est le seul point de non-retour pour les utilisateurs : tant que
l'index blue n'est pas supprimé (étape 7), il suffit de re-pointer `INDEX_NAME` vers
`survey-questions` (blue) pour revenir en arrière instantanément. Ne supprimer le blue
qu'après une période de validation.

## Note tier Free

Le service AI Search Free est limité à **3 index**. Une migration blue-green consomme 2
slots simultanément : s'assurer qu'il reste de la place, sinon supprimer un index obsolète
avant de commencer (ou migrer sur Basic).
