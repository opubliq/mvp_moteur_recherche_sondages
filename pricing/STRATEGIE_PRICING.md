# Stratégie de pricing Opubliq

Document de référence officiel. Synthétise `brief_recherche_marche.md`
(recherche de marché, taille des segments) et `modele_parametrique_97r9.md`
(coût marginal mesuré) en une stratégie de prix actionnable.

**Statut** : plusieurs chiffres marqués `[À VALIDER]` sont des hypothèses de
départ, pas des prix arrêtés — à ajuster avant le premier contrat signé.

## Principe directeur

Le levier de prix est **le corpus**, jamais la fonctionnalité. Les mêmes
capacités existent aux trois paliers (agent LLM, recherche codebook,
croisements) — ce qui change, c'est l'accès aux données.

Pas de tarification au siège (les équipes recherche font 3-8 personnes,
facturer par utilisateur plafonne l'ACV). Le marché total est petit
(quelques centaines d'organisations qualifiées, cf. `brief_recherche_marche.md`)
→ vente relationnelle, pas de funnel self-serve pour le revenu principal.

---

## Palier 1 — Catalogue public (particuliers)

**Rôle : actif de vente, pas source de revenu principale.** Démo permanente
qui laisse le prospect voir l'agent fonctionner sur de vraies données avant
de confier les siennes. Corpus de sondages publics uniquement. **P1 =
particuliers ; P2 = entreprises** — chaque palier a ses propres forfaits internes,
mais la distinction P1/P2 est celle-là : qui achète, pas ce qui est vendu.

### Forfaits d'usage `[À VALIDER]`

Le forfait gratuit doit plafonner **rapidement** — son but est de qualifier
l'intention, pas de servir un usage soutenu gratuitement.

| Forfait | Prix | Recherches | Requêtes agent |
|---|---:|---:|---:|
| Gratuit | 0 $ | ~10/jour | ~5/mois |
| Découverte | 5 $/mois | ~50/jour | ~30/mois |
| Actif | 10 $/mois | ~500/jour | ~500/mois |
| Pro `[expérimental]` | 50 $/mois | ~1000/jour | ~1000/mois |

Le coût marginal réel de ces volumes est négligeable (cents/mois, cf.
`modele_parametrique_97r9.md`) — ces paliers ne couvrent pas un coût, ils
qualifient un lead. Un usager qui paie 10 $/mois est un signal d'intention
bien plus fort qu'un compte gratuit inactif.

Les plafonds Actif/Pro sont volontairement hauts — bien au-dessus du profil
le plus intensif mesuré (« analyste », 300 requêtes agent/mois,
`modele_parametrique_97r9.md`) — pour qu'aucun usager légitime ne les
atteigne jamais. Ce sont des **plafonds numériques durs**, pas un principe
de « fair use » à surveiller manuellement : le même rate-limit technique par
`client_id` prévu pour protéger le quota TPM partagé (§Garde-fous
techniques) les applique automatiquement.

**Le palier 50$/mois est différent des autres : ce n'est pas un pari sur le
revenu, c'est une mesure.** On s'attend à peu ou pas d'adoption — l'objectif
est de savoir si un outil grand public a un marché du tout, avant d'investir
dans cette direction. À revisiter (garder/couper/repositionner) après
quelques mois de données réelles, pas avant.

Gate d'inscription email obligatoire dès le forfait gratuit (capture de lead
commercial). Rate-limit technique par `client_id` requis avant mise en
production (protection de capacité partagée, voir §Garde-fous techniques).

---

## Palier 2 — Corpus client (entreprises)

**Focus opérationnel actuel.** Cible : agences, ministères, instituts.
Premier client visé : Environics (Andrew Parkin).

### Ancres de marché (entretiens)

Deux points de données concrets tirés de `entretiens/grille_entretiens_clients_potentiels.csv` :

- **Vividata** (concurrent principal, jugé « cher et complexe ») : **15 000-
  20 000 $/an**, plus un agrégateur (Telmar) à payer par-dessus. C'est
  l'ancre haute — se positionner sous ce prix est un argument de vente direct
  (« meilleur produit, moins cher que ce que vous payez déjà »).
- **Catapulte** (agence d'affaires publiques, 25 employés — exactement le
  profil « agence ≥20 employés » identifié comme segment le plus prometteur) :
  budget max déclaré **500 $/mois = 6 000 $/an**. C'est l'ancre basse pour le
  palier d'entrée — au-delà, on perd le bas de la fourchette du segment
  principal.
- **Andrew Parkin (Environics)** : fournisseur actuel = **5 000 $ initial +
  1 000-2 000 $/an de maintenance**. Mais ce chiffre reflète la valeur d'un
  **mauvais outil** — plateforme jugée laide, recherche regex seulement,
  export de sondage identifié comme un « méga pain point ». Ce n'est **pas**
  un plafond de volonté de payer pour l'agent Opubliq : Parkin a lui-même
  nommé l'agent LLM comme différenciateur principal et l'export/cross-tab
  fluide comme réponse directe à sa douleur concrète (hiérarchie de valeur,
  `entretiens/andrew_parkin.md`). À traiter comme premier client + pilote
  (prix plein présenté d'abord, puis partenariat pilote — stratégie déjà
  actée dans l'entretien), pas comme un signal de sous-pricer le catalogue.

### Essai P2 sur corpus public

Mécanisme de vente : un prospect P2 qualifié reçoit un accès **complet aux
fonctionnalités P2** (agent sans restriction, API si pertinent) mais sur le
**corpus P1** (public), pour une durée limitée (**2 semaines**
`[À VALIDER]`). Objectif : prouver la capacité du produit — surtout l'agent
analytique, différenciateur principal sans équivalent marché (cf. entretien
Parkin) — avant que le prospect commissionne l'ingestion de son propre
corpus. L'annotation de verbatims n'a pas de sens ici (pas de données
propriétaires à annoter pendant l'essai) — non incluse de facto.

### Structure de prix

Deux composantes séparées — l'ingestion est un coût one-shot, l'abonnement
est récurrent :

**1. Ingestion — toujours au même tarif, initiale ou continue**

Un seul mécanisme, peu importe *quand* l'ingestion arrive : à la signature
(corpus initial) ou n'importe quand ensuite (nouvelles études du client
au fil du temps). **Ce n'est pas un paramètre distinct de l'abonnement
annuel** — c'est une facture one-time à chaque batch, point final. Deux
régimes selon le format :

- **Format déjà supporté** (SAV/DTA/dico XLSX, codebook PDF/DOCX structuré) :
  prix **par sondage, par palier de nombre de questions** — pas un prix fixe
  par étude. Le nombre de questions varie de 22 à 1 239 dans le corpus déjà
  ingéré (56x d'écart), donc un $/étude plat sous-facture massivement les gros
  sondages et sur-facture les petits. Mais ce n'est pas non plus linéaire :
  `govcan_parca_2024` (1 239 questions au catalogue) n'a que 60 questions
  enrichies individuellement — le reste passe par une logique par défaut, pas
  une revue une par une. D'où des paliers **dégressifs** plutôt qu'un
  $/question fixe :

  | Taille (questions) | Prix d'ingestion `[À VALIDER]` |
  |---|---:|
  | < 50 | 200 - 300 $ |
  | 50-200 | 400 - 700 $ |
  | 200-500 | 800 - 1 200 $ |
  | 500+ | 1 200 - 2 000 $ *(plafonné — économie d'échelle du pipeline)* |

  Basé sur ~30-60 min de travail orchestrateur + subagents par sondage
  (mesuré sur le batch du 2026-07-07). Le calcul (tokens LLM) est un coût
  quasi nul — le vrai coût est le temps de supervision humaine (validation
  anti-fabrication, relecture). `[À VALIDER — taux horaire]` : hypothèse
  125 CAD/h.
- **Nouveau format** (ex. `medaillon_organismes_qualitatif`, CSV+SurveyJS
  inédit) : hors grille, devis séparé — c'est un projet d'ingénierie, pas
  une ingestion répétable.

Plus un **setup fixe par nouveau client** `[À VALIDER]` (~500-1000 CAD) :
nouvelle ressource AOAI, nouvel index Azure AI Search, wiring auth/résolution
d'index. Indépendant de la taille du corpus — ne pas le diluer dans le
$/étude, sinon un petit client est pénalisé pour un coût qui n'a rien à voir
avec son volume.

**Attention seuil 40k$** : si l'ingestion et la 1ère année d'abonnement
tombent dans le même contrat/année fiscale, vérifier que le **total combiné**
reste sous le seuil fédéral de contrat à fournisseur unique (40 000 $/an),
pas juste l'abonnement seul.

**2. Abonnement annuel — fixe, fonction du corpus (stock, pas flux)**

Pas de facturation à l'usage (voir §Pourquoi pas de facturation à l'usage
ci-dessous). Le prix annuel est fixé sur **une seule variable : la taille du
corpus total accessible au client à ce moment** (le sien + le public). Le
*rythme* d'ingestion (combien de nouvelles études par an) n'entre **pas**
dans ce prix — il est déjà couvert par le mécanisme d'ingestion ci-dessus
(§1), qui facture chaque batch séparément, qu'il arrive à la signature ou
n'importe quand après.

Ça règle le cas où le stock et le flux divergent : un client qui ingère 200
études d'un coup à la signature, puis seulement 1/an ensuite, paie
simplement 200× le tarif d'ingestion au départ, puis 1× le tarif chaque
année suivante — et son **forfait annuel reste stable** d'une année à
l'autre, parce que son corpus total ne change presque pas. Pas besoin
d'estimer un rythme d'ingestion à l'avance pour fixer le prix.

**On est généreux sur la marge ici — c'est la marge principale du produit.**
Bandes ancrées sur les deux points de repère marché (§Ancres de marché), en
tenant compte que **l'agent analytique n'a aucun équivalent marché**
(Vividata : « aucune capacité LLM », d'après l'entretien Parkin) — se
positionner strictement sous Vividata partout reviendrait à sous-vendre un
produit objectivement supérieur.

Corpus mesuré en **questions totales**, pas en nombre d'études — même
correction que pour l'ingestion (§1) : un client avec 20 études de 1 000
questions chacune a un corpus 20x plus gros qu'un client avec 20 études de
50 questions, et « nombre d'études » masquerait complètement cet écart.

| Forfait | Corpus (questions) | Prix/an `[À VALIDER]` |
|---|---|---:|
| Essentiel | < 1 000 | 6 000 - 8 000 $ *(plafond budgétaire dur — Catapulte)* |
| Standard | 1 000-5 000 | 15 000 - 20 000 $ *(aligné sur Vividata, pas en-dessous)* |
| Intensif | 5 000+ | 25 000 - 35 000 $ *(au-dessus — capacité sans équivalent)* |

Pour référence, le corpus public actuel (14 sondages) totalise ~3 100
questions — soit un forfait Standard à lui seul.

Le palier Essentiel reste bas volontairement : le plafond de Catapulte est
une contrainte budgétaire dure, pas un jugement de valeur — le pousser plus
haut perd ces clients peu importe la qualité du produit. Les paliers
Standard/Intensif, eux, ciblent des organisations qui peuvent absorber le
prix plein d'un produit sans équivalent.

Un éventuel rabais de lancement (ex. partenariat pilote Environics) est une
tactique de vente ponctuelle — feedback structuré + référence + durée
limitée — jamais un changement du prix catalogue. Présenter le prix plein
d'abord (cf. entretien Parkin).

Tous les paliers restent sous le seuil de 40 000 $/an. Un corpus qui
approcherait ou dépasserait ~15 000-20 000 questions (cas Environics évoqué
comme hypothèse — ex. 200 études volumineuses) sort de cette grille — à
traiter en cas particulier, la frontière avec le P3 devient floue à ce
volume.

**Le prix ne bouge que si le corpus bouge — jamais avec l'usage, jamais en
cours d'année.** Un client Intensif reste Intensif d'une année à l'autre tant
que son corpus total reste dans la bande, peu importe combien il a ingéré
*cette année précise* (0 nouvelle étude ou 1 000 questions, sans importance —
il paie pour l'accès à son corpus existant, pas pour le flux de l'année). Au
renouvellement, seule une vraie variation du corpus total (via l'ingestion
continue, déjà facturée séparément au moment où elle arrive, §1) peut faire
changer le client de forfait.

### Pourquoi pas de reclassement par usage au renouvellement

Version antérieure de ce document proposait de faire monter le prix au
renouvellement si l'usage d'une année avait été intensif. **Mauvaise idée,
retirée** : ça crée l'incitatif inverse de ce qu'on veut — un client
rationnerait son propre usage pour éviter une facture plus salée l'an
prochain, ce qui sabote directement l'argument de vente principal (« usage
illimité, aucune raison de se retenir »). La prévisibilité du prix d'une
année à l'autre n'est pas juste agréable, elle est structurellement requise
par le reste de la stratégie.

**Un client à petit corpus qui utilise beaucoup la plateforme paie donc
légitimement moins qu'un client à gros corpus qui utilise peu — et ce n'est
pas une fuite de valeur à corriger.** Le coût marginal de cet usage est
négligeable (voir §Pourquoi pas de facturation à l'usage), donc ça ne coûte
rien de le laisser filer. Un usage intensif sur un petit corpus est plutôt un
**signal de vente** : ce client tire visiblement de la valeur de l'outil et a
probablement d'autres études historiques non encore ingérées. Le bon geste
commercial est de lui proposer d'agrandir son corpus (ce qui le fait
légitimement changer de forfait, par le seul levier qui existe), pas
d'augmenter son prix pour l'accès qu'il a déjà.

### Pourquoi pas de facturation à l'usage

Le coût marginal mesuré (`modele_parametrique_97r9.md`) est de quelques
CAD/mois même pour le profil le plus intensif — un client qui utiliserait la
plateforme sans limite ne fait jamais de trou dans la marge d'un contrat de
6-35 k$/an. La facturation à l'usage ajouterait de la complexité (expliquer
un compteur au client, gérer des dépassements) sans bénéfice réel. Le seul
risque d'un usage massif n'est pas financier mais de **capacité partagée**
(quota TPM `gpt-5.4-mini` partagé avec un autre projet) — ça se règle par un
garde-fou technique (rate-limit par `client_id`), pas par un mécanisme de
prix.

---

## Palier 3 — Plateforme / marque blanche

Cible : les ~10 firmes à panel propriétaire (Léger, Ipsos, Advanis, Ekos,
Nanos, Maru/Blue, Forum, Narrative, Logit, Elemental). Année 2-3, cycle de
vente 12-18 mois, exige des références produites par les paliers 1-2.

- Prix négocié, six chiffres. Licence annuelle **ou** partage de revenus
  `[décision ouverte]`.
- Pas du custom : même produit, emballage différent — leur corpus, leur
  marque en surface, une API pour intégration.
- Environics = prototype de palier 3 à petite échelle (même mécanique :
  interroger son propre corpus historique).
- **Risque à nommer d'avance** : ces firmes ont des équipes techniques et
  pourraient vouloir reconstruire. La protection n'est pas la techno, c'est
  le corpus multi-études et l'accumulation d'usage. À traiter dès le premier
  contrat.

---

## Features par palier

| | P1 Public | Essai P2 (temporaire) | P2 Client | P3 Plateforme |
|---|---|---|---|---|
| Recherche codebook | ✓ | ✓ | ✓ | ✓ |
| Agent LLM | ✓ (limité par forfait) | ✓ (illimité, 2 sem.) | ✓ | ✓ |
| Croisements + export Excel | ✓ | ✓ | ✓ | ✓ |
| Annotation LLM des verbatims | — | — (rien à annoter) | ✓ | ✓ |
| API / intégration | — | — | — | ✓ |
| Corpus | Public | Public | Public + le sien | Le sien + revente |

Ne pas découper davantage. Un agent bridé au P1 ne démontre rien, et le P1
n'existe que pour démontrer.

---

## Architecture (rappel — implémentation)

Une seule plateforme, un seul URL, une seule base de code. L'authentification
détermine quels index sont interrogeables.

- **Le P2 doit pouvoir croiser son corpus avec le public dans une même
  question** — différenciateur principal, ne pas cloisonner.
- **L'autorisation se résout côté serveur**, au moment de la requête — jamais
  côté client. Une erreur ici = fuite de données propriétaires entre
  concurrents.
- **Le P3 diffère par sous-domaine/thème, pas par le code.**
- Coût infra : Azure AI Search Basic ≈ 104 USD/mois par tier de capacité
  Azure (concept d'infra, sans rapport avec les forfaits de pricing
  ci-dessus), un index par client → ~13-15 clients avant de devoir passer au
  tier de capacité Azure supérieur (borne de croissance dominante, bien
  avant le TPM — voir `modele_parametrique_97r9.md` §3).

## Garde-fous techniques requis avant scaling

- **Rate-limit par `client_id`** sur le déploiement `gpt-5.4-mini` (partagé
  avec un autre projet) — protège les autres clients contre un usage massif
  d'un seul, indépendant de toute logique de facturation.
- Modèle multi-tenant (1 index/client, résolution par token) — **pas encore
  en place**, l'app sert aujourd'hui un index partagé `survey-questions`.

---

## Décisions encore ouvertes

- [ ] Chiffrer précisément les forfaits P1 (limites exactes, prix) et les
      paliers d'ingestion P2 (taux horaire réel, pas l'hypothèse à 125 CAD/h)
- [ ] Fixer le setup fixe par nouveau client P2 (infra)
- [ ] Trancher licence annuelle vs partage de revenus pour le P3
- [ ] Confirmer le modèle multi-tenant (thématisation + résolution d'index
      par token) avant le premier client P2
- [ ] Implémenter le rate-limit par `client_id`
- [ ] Extraire StatCan 33-10-1097-01 pour resserrer le segment 1 (n'affecte
      pas la stratégie)
- [ ] Dédoublonner les données du Commissariat au lobbying
