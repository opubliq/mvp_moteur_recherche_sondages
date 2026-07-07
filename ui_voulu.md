Use cases

1. Je tape une requete textuelle style mots-clés, je reçois les questions pertinentes

Pour 1. c'est pas mal ce qu'on a live. Mais live la navigation est assez difficile
    - Pas possible de déplier/plier un sondage, donc on doit scroll down chaque sondage.
        - En fait chaque sondage devrait etre plié par défaut.
    - Description du sondage pas présente dans le catalogue, pas de contexte sur ce qu'est le sondage.
        -Srm d'autres nouveaux champs pertinents pas pris en compte non plus.
    - On peut filtrer par année et tout après la query, mais pas avant la recherche dans AI Search, il faut pouvoir le faire dans la recherche aussi.
    - on devrait pouvoir filtrer par sondage aussi, je veux pouvoir voir la liste
    - Est-ce qu'on fait de la query expansion? Pcq on devrait en faire avec gpt4.1.
    - Il faut décomposer la query en "concepts". Par exemple "qualité de l'eau potable" est "qualité" à 30% et "eau avec potable comme adjectf" à 70%. Puis comparer l'embedding de chacun de nos concepts à nos docs.
        Ca nous permet devaluer la correspondance entre question et query. 
        Comme expliqué dans scoring_search_output.md. On veut voir dans le UI si le matching est Exact, Partiel, Faible ou Hors-Sujet.
        Si chaque sondage est déplié par défauts, je voudrais quand meme voir a coté du nom/description/année de chaque sondage le nombre de matchs Exact, partiel et faible (filter out les hors-sujet)
    - Pas de limite de 30 questions, retourne toutes les questions Exact, Partiel et Faible
    - Le facettage par défaut est par sondage, c'est ok. Mais devrait avoir possibilité de facetter par année, sondeur et thème.
        - Avec toujours le nombre de matchs Exact, partiel et faible (filter out les hors-sujet)
    Faible = orange, partiel = jaune, exact = vert. Barre qui va de 33% à 67% à 100% (sans les chiffres)
    
Il faudrait un onglet différent qui est plus une vue d'ensemble du corpus
    - Timeline des sondages dans le dataset (genre on voit sur une timeline chaque sondage)
    - Analyse plus textuelle du corpus, genre on peut voir seon différentes déclinaisons % de questions portant sur theme X, Y etc.
        - Possibilité de voir par année
    - Donc vraiment plus exploration du corpus, surement d'autres features à mettre ici

C'est pour après je crois, mais j'aimerais avoir un "agent" conversationnel. Genre:
    - tu poses une question en language naturel à l'agent: Je veux voir l'évolution des attitudes envers les changements climatiques chez les personnes nés avant 1970
    - il va chercher les questions pertinentes.
    - il structure ses questions selon un ordre narratif pertinent 
    - Il exécute du code python/R pertinent pour filtrer selon les socio-demo que tu demandes etc., il interagit vraiment avec la donnée
        - Est-ce qu'on doit envoyer les données dans dataverse donc? Mais vu que l'agent interatif avec les données via code, pas besoin de standardisation préalable
    - Il retourne un petit rapport md qui se render en html, directement sur le site. On veut qu'il soit concis, pas AI slop, vraiment basé sur les données.

Éventuellement, on va aussi vouloir identifier les questions qui veulent dire exactement la meme chose mais qui sont formulées différemment via une propriété quelconque pour pouvoir les regrouper ensemble