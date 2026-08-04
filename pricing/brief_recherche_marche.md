# Brief de recherche — taille du marché accessible par segment

**Objectif unique de cette recherche : estimer la taille du marché accessible,
par segment de client potentiel.** Pas de benchmark de prix concurrents (déjà
couvert par le volet qualitatif, pas nécessaire ici) — le seul livrable
attendu est un **dénombrement/estimation par segment**, avec méthode et
sources.

## Contexte

Opubliq construit un moteur de recherche + agent LLM sur des données de
sondages d'opinion publique (questions et verbatims, historique multi-études).
9 entretiens exploratoires menés en 2025 (Québec principalement) ont fait
émerger des segments de clients potentiels et une intuition de leur douleur —
mais aucune idée de leur **nombre**. C'est ce que cette recherche doit
combler : passer du qualitatif (« ce genre de client existe et a une
douleur ») au quantitatif (« combien y en a-t-il, où, de quelle taille »).

## Ce qu'on sait déjà (à ne pas re-découvrir)

- **Agences de communication stratégique / affaires publiques (20+ employés)**
  — segment le plus prometteur. Douleur : données de sondages clients en
  silos, pas d'historique, outils existants (ex. Vividata) jugés chers et
  complexes. Exemples rencontrés : agence de 25-30 employés (Montréal),
  Catapulte (25 employés, affaires publiques), TACT Conseil (la plus grosse
  du Québec).
- **Instituts de recherche / firmes détenant un panel propriétaire** (ex.
  Environics Institute) — vente relationnelle, cas d'usage = interroger en
  langage naturel leur **propre** corpus historique de sondages.
- **Petites agences boutique** — ponctuelles, sensibles au prix, préfèrent un
  modèle à l'usage plutôt qu'un abonnement annuel coûteux.
- **OBNL / organismes publics à mandat de communication** — faible capacité
  de payer, probablement pas prioritaires mais utile de savoir combien
  existent pour la suite (offre freemium éventuelle).
- Hors-cible identifié : rôles où l'opinion publique n'entre pas dans le
  travail (ex. rédaction technique), associations à besoin trop niché.

Échantillon qualitatif très concentré au **Québec** — un des objectifs de
cette recherche est justement de voir si le marché s'élargit à l'échelle du
Canada (anglophone inclus) ou reste un jeu majoritairement québécois/francophone.

## Segments à chiffrer

Pour chaque segment ci-dessous : nombre d'organisations qualifiées, taille
typique (employés/budget si trouvable), répartition géographique (Québec vs
reste du Canada vs ailleurs), et niveau de confiance de l'estimation (source
directe vs extrapolation).

### 1. Agences de communication stratégique et d'affaires publiques
Cible : organisations de ~20 employés et plus offrant des services de
relations publiques, affaires publiques/gouvernementales, ou stratégie de
communication à des clients externes. Pistes de dénombrement : répertoires
d'associations professionnelles (ex. IABC, SQPRP/SRAM, Association des
professionnels en relations publiques, Government Relations Institute of
Canada / GRIC), classements d'agences (ex. Best Agencies, palmarès Infopresse
au Québec), LinkedIn (recherche par taille d'entreprise + secteur « public
relations » ou « government relations »).

### 2. Compagnies avec un panel propriétaire de sondage
Cible : firmes qui opèrent leur propre panel de répondants et accumulent un
historique de données d'opinion (ex. Léger, Ipsos, Angus Reid, Advanis,
Narrative Research, Forum Research, Environics, Numeris/Vividata). Ce segment
est particulier : la vente n'est pas nécessairement « licence utilisateur
final » mais potentiellement **outillage interne / marque blanche** pour
qu'elles interrogent leur propre corpus (cas Parkin/Environics). À dénombrer :
combien de firmes de ce type opèrent au Canada, taille de leurs équipes
recherche/analyse.

### 3. Organisations qui ont commandé beaucoup de sondages historiquement
Cible : gros **acheteurs répétés** de données de sondage plutôt que
producteurs. Pistes concrètes :
- **Gouvernements** — les ministères fédéraux et provinciaux publient
  publiquement leurs contrats de recherche sur l'opinion publique (Canada :
  registre POR — Public Opinion Research — de Travaux publics et Services
  gouvernementaux ; Québec : SEAO/registre des contrats publics). Ces
  registres donnent un signal direct de volume et de fréquence par ministère.
- **Grandes entreprises** avec départements d'études de marché internes
  (banques, assureurs, télécoms, grande distribution) — commanditaires
  réguliers de sondages de satisfaction/notoriété.
- **Partis politiques et firmes de campagne** — sondages internes réguliers,
  surtout en période électorale.
- **Médias avec unité de sondage maison** (ex. sondages Léger-Le Devoir/Journal
  de Montréal, Angus Reid Institute côté éditorial) — consommateurs et parfois
  co-commanditaires réguliers.
- **Syndicats et associations sectorielles/municipales** (type FQM rencontrée
  en entretien) — commandent occasionnellement, mais nombreuses : à chiffrer
  même si le budget par organisation est probablement faible.

### 4. Autres idées à explorer (à valider/écarter par la recherche)
- **Cabinets de relations gouvernementales / lobbying** enregistrés (registres
  publics de lobbyistes fédéral et provinciaux — donnent une liste exhaustive
  et vérifiable d'organisations actives).
- **Universités et centres de recherche en sciences sociales/politiques** —
  accès à des corpus de sondages pour la recherche académique.
- **Cabinets de relations publiques internationaux** avec bureau canadien
  (Edelman, Weber Shandwick, etc.) — à vérifier s'ils achètent localement ou
  centralisent au siège.
- Toute autre catégorie de gros consommateur/producteur de données d'opinion
  publique identifiée en cours de recherche — à documenter même si elle ne
  faisait pas partie des entretiens.

## Portée géographique

Défaut proposé : **Québec en priorité, Canada en secondaire** (reflète
l'échantillon qualitatif et la langue des données ingérées à ce jour). Si la
recherche révèle un marché anglophone canadien significativement plus grand
pour un segment donné (ex. cabinets de lobbying fédéraux à Ottawa), le
signaler même si hors du scope géographique par défaut.

## Livrable attendu

Un tableau par segment (1 à 4 ci-dessus, plus toute sous-catégorie découverte)
avec :
- Estimation du nombre d'organisations qualifiées
- Taille typique (employés) quand trouvable
- Sources utilisées (registres publics, répertoires, LinkedIn, etc.) et
  méthode d'estimation (comptage direct vs extrapolation)
- Niveau de confiance (élevé/moyen/faible) par estimation

Pas besoin de scorer ou prioriser les segments dans ce livrable — l'analyse
et la priorisation se feront après, une fois les chiffres en main.


# Réponse de Fable

# Opubliq — Stratégie de pricing et architecture des paliers

## Contexte : taille du marché

Recherche de dénombrement (août 2026). **Tous les segments sont petits** — quelques
centaines d'organisations qualifiées au total, pas des milliers.

| Segment | Estimation | Base | Confiance |
|---|---|---|---|
| 1. Agences comm./affaires publiques ≥20 empl. | ~15-30 QC, ~60-120 Canada | Estimation en chaîne (SCIAN 5418) | Faible |
| 2. Firmes à panel propriétaire | 10 (terrain), 22-24 qualifiées | Comptage direct (offres à commandes POR) | Élevée |
| 3a. Ministères fédéraux acheteurs | 33/an, 12,2 M$ (2025-26) | Comptage direct (registre POR) | Élevée |
| 3b. Orgs payant un lobbyiste-conseil | 2 272 | Comptage direct (Commissariat au lobbying) | Élevée |
| 4. Cabinets de lobbying | ~150-300, peu ≥20 empl. | Estimation (1 670 individus à dédoublonner) | Faible |

### Conséquences directes

- **Le self-serve est mort.** ~20 prospects par segment au Québec → vente
  relationnelle, ACV élevé. Pas de funnel.
- **Le segment 2 est le vrai jeu.** Seul segment où un client donne accès à un
  marché plutôt qu'à un siège.
- **Le fédéral se contracte.** 20,3 M$ (2022-23) → 12,2 M$ (2025-26), soit -40 %
  en 3 ans. Ne pas y ancrer une projection de revenus.

### Sources de référence

- Registre POR fédéral — rapports annuels SPAC
- Répertoire ROP, Bibliothèque et Archives Canada — recherche inversée
  fournisseur → ministère commanditaire, depuis août 2006
- SEAO données ouvertes — XML depuis 2009, JSON (OCDS) depuis mars 2021, seuil 25 k$
- Commissariat au lobbying du Canada — données libres téléchargeables
- Carrefour Lobby Québec — provincial + municipal
- StatCan 33-10-1097-01 — SCIAN 54182 / 54191 par tranche d'effectifs (**non extrait**)

### Limite structurelle

Les acheteurs **privés** (banques, télécoms, partis, médias) n'ont aucune
obligation de divulgation. Le code CRIC fait de la confidentialité client le
défaut. Ils resteront en confiance faible peu importe l'effort de recherche —
sauf via le registre des lobbyistes (3b), seul endroit où ils sont nommés avec
preuve de budget.

---

## Les trois paliers

Le levier de prix est **le corpus**, jamais la fonctionnalité.

### Palier 1 — Catalogue public

- Corpus de sondages publics uniquement
- Libre accès ou ~3-6 k$/an
- **Rôle : actif de vente, pas source de revenu.** Démo permanente qui laisse le
  prospect voir l'agent fonctionner sur de vraies données avant de confier les
  siennes.
- Aucun effort commercial dédié.

### Palier 2 — Corpus client

- Ingestion one-shot + abonnement annuel
- Cible : agences, ministères, instituts
- **Garder le total annuel sous 40 000 $** — seuil fédéral du contrat à
  fournisseur exclusif, donc sans appel d'offres. Seul chiffre de la recherche
  qui dicte directement un prix.
- Premier client : Environics (Andrew Parkin)
- **Focus opérationnel actuel.**

### Palier 3 — Plateforme / marque blanche

- Cible : les 10 firmes à panel (Léger, Ipsos, Advanis, Ekos, Nanos, Maru/Blue,
  Forum, Narrative, Logit, Elemental)
- Prix négocié, six chiffres. Licence annuelle **ou** partage de revenus.
- Ce n'est **pas** du custom : même produit, trois différences d'emballage —
  leur corpus, leur marque en surface, une API pour intégration.
- Année 2-3. Cycle de vente 12-18 mois, exige des références produites par les
  paliers 1-2.
- Environics = prototype de palier 3 à petite échelle (même mécanique :
  interroger son propre corpus historique).

**Risque à nommer d'avance :** ces firmes ont des équipes techniques et
pourraient vouloir reconstruire. La protection n'est pas la techno, c'est le
corpus multi-études et l'accumulation d'usage. À traiter dès le premier contrat.

---

## Features par palier

**Mêmes capacités partout. Ce qui varie, c'est le corpus.**

| | P1 Public | P2 Client | P3 Plateforme |
|---|---|---|---|
| Recherche codebook | ✓ | ✓ | ✓ |
| Agent LLM | ✓ | ✓ | ✓ |
| Croisements + export Excel | ✓ | ✓ | ✓ |
| Annotation LLM des verbatims | — | ✓ | ✓ |
| API / intégration | — | — | ✓ |
| Corpus | Public | Public + le sien | Le sien + revente |

Deux exceptions seulement :

- **Annotation des verbatims** hors P1 — n'a de sens que sur données
  propriétaires.
- **API** définit le P3 — c'est par elle que la marque blanche existe.

Ne pas découper le reste. Un agent LLM bridé au P1 ne démontre rien, et le P1
n'existe que pour démontrer. Découper les features crée trois produits à
maintenir avec une équipe de trois personnes.

### Règles transversales

- **Pas de tarification au siège.** Les équipes recherche font 3-8 personnes ;
  facturer par utilisateur plafonne l'ACV et punit l'adoption interne.
  Facturer au corpus : nombre d'études ingérées, profondeur historique.
- **Pas de freemium.** Un freemium a besoin de volume pour convertir. Le P1
  joue ce rôle, mais en vente accompagnée.

---

## Architecture

**Une seule plateforme, un seul URL, une seule base de code.** L'authentification
détermine quels index sont interrogeables.

```
Palier 1  →  index public
Palier 2  →  index public + index client
Palier 3  →  index client, servi via API sous leur marque
```

### Règles d'implémentation

**Le P2 doit pouvoir croiser son corpus avec le public dans une même question.**
C'est le différenciateur — l'agent qui traverse plusieurs sondages. Cloisonner
les deux corpus détruit l'argument de vente principal.

**L'autorisation se résout côté serveur, au moment de la requête.** La liste
d'index autorisés vient du token, jamais du client. Une erreur ici = fuite de
données propriétaires entre concurrents.

**Le P3 diffère par le sous-domaine et le thème, pas par le code.**
`leger.opubliq.com` ou un domaine à eux qui pointe chez toi. Même déploiement.

**Customiser la surface, jamais le moteur.** Si un prospect P3 exige une
modification du moteur, c'est un signal que ce n'est pas le bon client.

### Coût

Azure AI Search Basic ≈ 104 USD/mois par tier, un index par client.
~13-14 clients avant de devoir passer en S1.

---

## Décisions à prendre

- [ ] Extraire StatCan 33-10-1097-01 (SCIAN 54182/54191, Montréal/Québec) pour
      resserrer le segment 1 — n'affecte aucune conclusion stratégique
- [ ] Dédoublonner le champ employeur des données libres du Commissariat au
      lobbying → compte réel de cabinets + liste des 2 272 organisations clientes
- [ ] Fixer le prix exact du P2 sous le seuil de 40 k$
- [ ] Trancher licence annuelle vs partage de revenus pour le P3
- [ ] Confirmer le modèle multi-tenant (thématisation + résolution d'index par token)