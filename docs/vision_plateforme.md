# Vision : plateforme d'analyse de l'opinion publique

*Rédigé le 12 octobre 2026, après les tests de Nicolas. Source canonique de la direction
produit ; le plan d'affaires (`plan_affaires_creavenir`) en reprend un résumé.*

Ce doc décrit **quoi** et **pourquoi**. Les choix techniques (stack, schémas, outils de
l'agent) se décident dans les issues et les docs techniques du repo.

## En une phrase

Le moteur de recherche de sondages devient une plateforme centrale où un agent
analytique répond aux questions en croisant trois types de données : les microdonnées
de sondages, les résultats publiés par les sondeurs et les données géographiques.

## Pourquoi ce virage

- **L'agent est ce qui impressionne en démo, mais il est caché.** On arrive sur une page
  de recherche ; l'agent est un onglet parmi d'autres.
- **L'agent ralentit l'utilisateur.** Il pose des clarifications en boucle avant
  d'exécuter (exemple réel : 5 tours avant le premier calcul, voir
  `aiagent_painpoints.md`). Il ne peut pas faire d'analyses complexes.
- **Nos actifs sont éparpillés.** L'API géo (`geo-marketing-api`) est prête mais vit à
  part. Le corpus ne contient que des microdonnées, alors que la majorité des sondages
  publiés au Québec n'existent qu'en PDF de résultats.
- **Un produit unique se vend mieux que trois outils.** Une plateforme qui croise
  opinion, territoire et socio-démo, c'est ce que ni Vividata ni les outils de recherche
  par mots-clés n'offrent.

## Ce qui change pour l'utilisateur

1. **L'agent est la page d'accueil.** On arrive, on pose une question en langage
   naturel, on reçoit une réponse fondée sur les données.
2. **La recherche reste**, en onglet secondaire, avec les croisements, l'export Excel
   et les questions ouvertes. C'est pour l'utilisateur qui veut contrôler chaque étape.
3. **Les réponses croisent les sources.** Exemple : « L'appui à la
   souveraineté est-il plus fort dans les circonscriptions à revenu médian faible, et
   qu'en disaient les derniers sondages Léger par région ? »

## Les quatre chantiers

Dans l'ordre où on les fait.

### 1. Un agent analytique meilleur, en page d'accueil

- **Il agit avant de demander.** Par défaut, il fait une hypothèse raisonnable, exécute,
  montre le résultat et dit quelle hypothèse il a prise. Il pose une question seulement
  si la demande est vraiment impossible à interpréter.
- **Il fait des analyses complexes.** Il peut exécuter du code (Python) sur les données :
  régressions, pondération, tendances dans le temps, profils. Plus seulement des
  croisements prédéfinis.
- **Il produit des rapports courts.** Concis, chiffrés, sans remplissage, avec
  graphiques et sources citées (quel sondage, quelle question).
- **Il est la porte d'entrée de toutes les données** : il sait chercher dans les
  microdonnées, les résultats publiés et le géo.

### 2. Intégrer l'API géo dans la plateforme

- L'API `geo-marketing-api` devient une source de la plateforme, interrogeable par
  l'agent et visible dans l'interface (profils et cartes par territoire).
- **Croisement avec l'opinion.** Rattacher les répondants (code postal, région,
  circonscription) aux profils géographiques, et comparer opinion et territoire.
- **Données de dons (DGEQ) accessibles aux clients.** Direction retenue : le dossier
  Loi 25 actuel est jugé très conservateur. **Préalable :** réviser l'analyse juridique
  et l'EFVP (`geo-marketing-api/docs/loi25/`) avant toute mise en ligne. Le dossier
  actuel suppose une API interne, utilisée seulement par l'équipe.
- Le repo `geo-marketing-api` reste ; c'est la couche de données que la plateforme
  appelle.

### 3. Enrichir l'API géo

Ajouts prévus, sans ordre fixé :

- **Résultats électoraux par section de vote** (provinciaux, puis municipaux et fédéraux).
- **Autres variables socio-économiques** : à préciser selon les demandes clients.

### 4. Un nouveau type de données : les résultats publiés

- **Quoi :** les rapports PDF publics des sondeurs (Léger, Pallas, Mainstreet, Angus
  Reid, Abacus, etc.) : résultats globaux et croisements par âge, région, langue, etc.
- **Pourquoi :** pas de microdonnées, mais beaucoup plus de sondages couverts, plus
  récents et plus fréquents. Croisés avec les microdonnées et le géo, ils comblent les
  trous du corpus (ex. : suivre une question entre deux études académiques).
- **Ce que ça demande :** un nouveau schéma « résultats agrégés » à côté des
  microdonnées, et une collecte automatisée des PDF.
- **Principe :** l'agent doit toujours dire de quel type de donnée vient un chiffre
  (calculé sur microdonnées ou repris d'un rapport publié).

## Hors périmètre pour l'instant

- Ingestion en continu de nouveaux sondages clients (on reste sur un corpus contrôlé).
- Plateforme de sondages en libre-service : produit séparé (contrat Médaillon).

## Questions ouvertes

1. **Loi 25 :** quel niveau de détail des dons peut-on montrer aux clients (indice,
   agrégats par territoire, autre) ? À trancher avec la révision juridique.
2. **Droits sur les rapports publiés :** peut-on stocker et redistribuer les chiffres
   des PDF des sondeurs, ou seulement les citer avec un lien ? À vérifier avant la
   collecte à grande échelle.
3. **Quels sondeurs en premier** pour les résultats publiés ?
4. **Quelles variables socio-économiques** ajouter au géo en priorité ?
5. **Tarification :** est-ce que le géo et les résultats publiés font partie de
   l'abonnement de base ou sont des modules en option ? (voir `pricing/`)
