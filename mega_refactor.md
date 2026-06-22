# Contexte du projet — pour l'agent

Ce doc donne le contexte du projet. Ce n'est **pas** une spec technique : les choix de
stack, de schéma, de pipeline et de recherche se décident avec l'agent, pas ici.

## Opubliq

Startup québécoise de recherche sur l'opinion publique et d'analyse de données.

## Le produit qu'on construit

Un catalogue de questions de sondage. On prend les archives de sondages d'une
organisation et on les rend cherchables *au niveau de la question* : retrouver
instantanément chaque fois qu'un concept a été demandé, à travers plein de sondages,
même quand le wording change d'une étude à l'autre. Recherche mots-clés + sémantique.

## La niche

Techniquement le service marcherait avec n'importe quel type de données, mais côté
marketing et affaires on reste sur la niche **sondages / opinion publique**. Clients
visés : firmes de recherche, instituts d'opinion, observatoires et baromètres, orgs qui
produisent ou commandent beaucoup de sondages. Ce qui nous distingue d'une boîte TI
générique, c'est notre muscle d'analyse de l'opinion — pas juste structurer de la donnée.

## Ce qu'on veut : un proto pour démontrer à des clients

Pas un produit de prod. Un démo qui fait comprendre la valeur en 30 secondes à un
prospect : il tape un concept (ex. « confiance envers le gouvernement ») et voit les
questions pertinentes ressortir à travers nos sondages, y compris quand elles sont
formulées différemment. Le wow = retrouver le même construit malgré un wording
différent, à travers plusieurs sondages.

## Les données

~55 sondages publics dans un dossier Google Drive partagé. C'est la base figée pour le
proto — pas d'ingestion live de nouvelles sources pour l'instant.

Données raw sont dans dossier partagé google drive ici /home/hubcad25/opubliq/gdrive/_SharedFolder_data_produit. Faire un symbolic link vers les données.

## État de départ

- Rien de setup côté Azure AI Search — pas même de compte Opubliq. Table rase côté infra.
- Le repo contient notre ancien MVP, complètement désuet.
- Plan convenu pour repartir propre : créer une branche backup, puis méga ménage dans
  `main` (tout supprimer pour revenir à la base), et créer un symlink vers le dossier
  Google Drive partagé.

À partir de là, on réfléchit au technique ensemble.