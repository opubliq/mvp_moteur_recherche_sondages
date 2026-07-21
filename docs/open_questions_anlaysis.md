Qu'est-ce qu'on veut dans cet onglet/page?

1. Par 1 question à la fois
    - Dans les onglets de recherche, si on clique sur une question ouverte, ça l'amene dans cet onglet.
    - On voit vraiment une question à la fois, pas plusieurs

2. Premiere feature: retrieve relevant citations.
    Un outil qui serait utile selon moi serait de taper en mots ce qu'on cherche comme citation et avoir un simple BM25 + rerank basic qui sort 10-15 réponses ouvertes pertinentes que le user peut copier coller/downloader pour mettre dans ses rapports comme des exemples de réponse, pas analyse quanti.
    On reste simple ici.

3. Deuxieme feature: analyse quanti + possibilité de croiser avec autres variables un peu comme dans question dashbord.
    Donc ça implique d'annoter quantitativement les questions ouvertes.
    Je verrais une genre de boite texte libre ou on dicte ce qu'on veut comme annotation en style format json
        Exemple: propriété = est-ce que le répondant a peur ou est optimiste, options = peur, optimiste, autre.
    Et donc les propriétés sont ajoutées en tant que colonnes au sondage en question, puis on peut croiser les propriétés annotées avec d'autres questions du sondage, downloader ça etc.
    La feature 1 de retrieval simple peut etre utile pour raffiner le prompt ici
        Meme qu'il devrait avoir une étape de test avant de lancer le LLM sur des batchs totalisant 1000 reponses: genre je sélectionne 4-5 reponses et on lance le prompt sur les 4-5 pour valider qu'il est bon