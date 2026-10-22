"""Table de correspondance circonscriptions fédérales QC (2013 Representation
Order, feduid 24001-24078) -> région(s) administrative(s) du Québec (découpage
officiel ISQ/MAMH, 17 régions).

Construite le 2026-10-21.

MÉTHODE
-------
Pour chaque circonscription, on a identifié les MRC (municipalités régionales
de comté) et villes/territoires équivalents qui la composent, puis on a
rattaché chaque MRC à sa région administrative officielle. Deux types de cas :

1. Circonscriptions urbaines à nom de ville/arrondissement (Montréal, Laval,
   Québec, Gatineau, Longueuil, Sherbrooke, Trois-Rivières, etc.) : le
   rattachement à une seule région est direct et non ambigu (toutes les
   municipalités/arrondissements composant la circonscription appartiennent à
   la même région administrative). Pas de recherche web dédiée pour ces cas :
   connaissance géographique directe des limites municipales (ces villes ne
   sont pas scindées entre régions administratives).

2. Circonscriptions rurales/périphériques dont le nom assemble plusieurs
   anciens comtés ou MRC : vérifiées individuellement via recherche web
   (pages Wikipédia des circonscriptions, fiches Élections Canada / commission
   de délimitation 2012-2013 et 2022, fiches ISQ statistique.quebec.ca sur les
   découpages Estrie/Montérégie). Sources citées ligne par ligne ci-dessous
   pour les cas non triviaux. Quand une circonscription chevauche deux (ou
   trois) régions administratives, la valeur est une liste, dans l'ordre
   décroissant de poids démographique approximatif, avec commentaire.

IMPORTANT - changement de découpage Estrie/Montérégie (2021) :
Les MRC de La Haute-Yamaska (Granby, incl. Shefford) et de Brome-Missisquoi
sont passées de la région Montérégie à la région Estrie, en vigueur le
28 juillet 2021 (ISQ, "Modification des découpages des régions administratives
Estrie et Montérégie",
https://statistique.quebec.ca/fr/actualite/modification-decoupages-regions-administratives-estrie-et-monteregie).
Les sondages CES 2021 (terrain à l'automne 2021) et CES 2025 utilisent donc
déjà potentiellement le nouveau découpage selon la date de collecte ; ce
fichier applique le découpage ACTUEL (post-2021), qui est la référence
officielle au moment de la construction de cette table. Les circonscriptions
concernées (Shefford, Brome--Missisquoi) sont annotées en conséquence.

Sources principales consultées (recherche web, 2026-10-21) :
- Wikipédia (FR/EN), pages de chaque circonscription électorale fédérale
  (description des MRC composant la circonscription, limites 2013/2022).
- noscommunes.ca / ourcommons.ca (fiches de circonscription).
- redecoupage-redistribution-2022.ca (rapports de la commission de
  délimitation 2022, descriptions MRC par circonscription).
- statistique.quebec.ca (ISQ) - liste des MRC par région administrative et
  note sur le changement de découpage Estrie/Montérégie (2021).
- stephentaylor.ca/data/political/canada/federal (cartes de résultats par
  circonscription, utilisées pour confirmer les limites municipales).

Aucune circonscription n'a été laissée "à vérifier" : toutes les 78 ont pu
être rattachées avec une source identifiable. Les cas de chevauchement
documentés explicitement (liste + commentaire) plutôt que de forcer un choix
unique, conformément à la consigne.
"""

from __future__ import annotations

RIDING_TO_REGION: dict[str, str | list[str]] = {
    # --- Abitibi-Témiscamingue / Nord-du-Québec ---
    # Source: redecoupage-redistribution-2022.ca (rapport 24001) + Wikipédia.
    # Composition: MRC de La Vallée-de-l'Or (Abitibi-Témiscamingue) + territoire
    # du Gouvernement régional d'Eeyou Istchee Baie-James et terres cries
    # catégories I/II (Chisasibi, Eastmain, Mistissini, Nemaska, Ouje-Bougoumou,
    # Waskaganish, Waswanipi, Wemindji) + Nunavik (Nord-du-Québec).
    # Majoritairement Nord-du-Québec en superficie; La Vallée-de-l'Or (Val-d'Or,
    # Senneterre) est en Abitibi-Témiscamingue.
    "Abitibi--Baie-James--Nunavik--Eeyou": ["Nord-du-Québec", "Abitibi-Témiscamingue"],
    "Abitibi--Témiscamingue": "Abitibi-Témiscamingue",

    # --- Montréal (circonscriptions entièrement intra-municipales) ---
    "Ahuntsic-Cartierville": "Montréal",
    "Bourassa": "Montréal",
    "Dorval--Lachine--LaSalle": "Montréal",
    "Hochelaga": "Montréal",
    "Honoré-Mercier": "Montréal",
    "La Pointe-de-l'Île": "Montréal",
    "Lac-Saint-Louis": "Montréal",
    "LaSalle--Émard--Verdun": "Montréal",
    "Laurier--Sainte-Marie": "Montréal",
    "Mont-Royal / Mount Royal": "Montréal",
    # CES 2021 utilise parfois la variante EN seule ("Mount Royal") pour la
    # même circonscription — alias, pas une circonscription distincte.
    "Mount Royal": "Montréal",
    "Notre-Dame-de-Grâce--Westmount": "Montréal",
    "Outremont": "Montréal",
    "Papineau": "Montréal",
    "Pierrefonds--Dollard": "Montréal",
    "Rosemont--La Petite-Patrie": "Montréal",
    "Saint-Laurent": "Montréal",
    "Saint-Léonard--Saint-Michel": "Montréal",
    "Ville-Marie--Le Sud-Ouest--Île-des-Soeurs": "Montréal",

    # --- Laval ---
    # Marc-Aurèle-Fortin: source Wikipédia EN "Marc-Aurèle-Fortin (electoral
    # district)" - comprend les quartiers Auteuil, Sainte-Rose, est de
    # Fabreville, ouest de Vimont, tous à Laval.
    "Alfred-Pellan": "Laval",
    "Laval--Les Îles": "Laval",
    "Marc-Aurèle-Fortin": "Laval",
    "Vimy": "Laval",

    # --- Laurentides ---
    "Mirabel": "Laurentides",
    "Rivière-des-Mille-Îles": "Laurentides",
    "Rivière-du-Nord": "Laurentides",
    "Thérèse-De Blainville": "Laurentides",
    "Laurentides--Labelle": "Laurentides",

    # Argenteuil--La Petite-Nation : chevauchement Laurentides/Outaouais.
    # Source: Wikipédia EN "Argenteuil—La Petite-Nation"; La Gazette du Canada
    # vol.156 n.3 (2022) - commission de délimitation (maintien des 25
    # municipalités de la MRC de Papineau dans la circonscription). MRC
    # Argenteuil (+ partie Pays-d'en-Haut) = Laurentides; MRC Papineau =
    # Outaouais. Laurentides majoritaire en population (Argenteuil).
    "Argenteuil--La Petite-Nation": ["Laurentides", "Outaouais"],

    # --- Outaouais ---
    "Gatineau": "Outaouais",
    "Hull--Aylmer": "Outaouais",
    "Pontiac": "Outaouais",

    # --- Capitale-Nationale ---
    "Beauport--Limoilou": "Capitale-Nationale",
    "Charlesbourg--Haute-Saint-Charles": "Capitale-Nationale",
    "Louis-Hébert": "Capitale-Nationale",
    "Louis-Saint-Laurent": "Capitale-Nationale",
    "Portneuf--Jacques-Cartier": "Capitale-Nationale",
    "Québec": "Capitale-Nationale",
    # Inclut Charlevoix, qui appartient administrativement à Capitale-Nationale.
    "Beauport--Côte-de-Beaupré--Île d’Orléans--Charlevoix": "Capitale-Nationale",
    # Variante mojibake de la même circonscription, telle qu'elle apparaît
    # verbatim dans les .dta CES 2021/2025 (octet CP1252 0x92 décodé comme le
    # caractère de contrôle U+0092 au lieu de l'apostrophe courbe ’ — défaut
    # d'encodage du fichier raw lui-même, pas une faute de frappe de cette
    # table). Alias conservé pour que le lookup fonctionne sur ces 2 sondages.
    "Beauport--Côte-de-Beaupré--Île d\x92Orléans--Charlevoix": "Capitale-Nationale",

    # --- Chaudière-Appalaches ---
    "Beauce": "Chaudière-Appalaches",
    "Bellechasse--Les Etchemins--Lévis": "Chaudière-Appalaches",
    "Lévis--Lotbinière": "Chaudière-Appalaches",

    # Montmagny--L'Islet--Kamouraska--Rivière-du-Loup : chevauchement
    # Chaudière-Appalaches/Bas-Saint-Laurent. Source: noscommunes.ca fiche
    # 687 + archives BAnQ (délimitation) - MRC Montmagny et L'Islet
    # (Chaudière-Appalaches) + MRC Kamouraska et Rivière-du-Loup
    # (Bas-Saint-Laurent), environ 2/3 Chaudière-Appalaches, 1/3
    # Bas-Saint-Laurent en électeurs.
    "Montmagny--L'Islet--Kamouraska--Rivière-du-Loup": [
        "Chaudière-Appalaches",
        "Bas-Saint-Laurent",
    ],

    # Mégantic--L'Érable : chevauchement Centre-du-Québec/Chaudière-Appalaches/
    # Estrie. Source: Wikipédia EN "Mégantic—L'Érable—Lotbinière" (nom
    # post-redécoupage 2022) + stephentaylor.ca (carte 2011) confirmant la
    # composition historique (MRC L'Érable, MRC Les Appalaches - Thetford
    # Mines -, MRC Le Granit - Lac-Mégantic -). L'Érable = Centre-du-Québec
    # (plus peuplé, Victoriaville/Plessisville), Les Appalaches =
    # Chaudière-Appalaches (Thetford Mines), Le Granit = Estrie (Lac-Mégantic).
    "Mégantic--L'Érable": [
        "Centre-du-Québec",
        "Chaudière-Appalaches",
        "Estrie",
    ],

    # --- Mauricie ---
    "Saint-Maurice--Champlain": "Mauricie",
    "Trois-Rivières": "Mauricie",

    # --- Lanaudière / Mauricie (chevauchement) ---
    # Berthier--Maskinongé : source Wikipédia EN "Berthier—Maskinongé" - MRC
    # D'Autray (Berthier, Lanaudière) + MRC Maskinongé (Mauricie). Lanaudière
    # légèrement majoritaire (Berthierville plus peuplé que Louiseville/
    # Maskinongé).
    "Berthier--Maskinongé": ["Lanaudière", "Mauricie"],

    # --- Lanaudière ---
    "Joliette": "Lanaudière",
    "Montcalm": "Lanaudière",
    "Repentigny": "Lanaudière",
    "Terrebonne": "Lanaudière",

    # --- Saguenay-Lac-Saint-Jean ---
    "Chicoutimi--Le Fjord": "Saguenay–Lac-Saint-Jean",
    "Jonquière": "Saguenay–Lac-Saint-Jean",
    "Lac-Saint-Jean": "Saguenay–Lac-Saint-Jean",

    # --- Côte-Nord ---
    # Source: consultation.quebec.ca (mémoire MRC de Manicouagan) + ISQ -
    # limites de la circonscription Manicouagan correspondent aux MRC de la
    # région Côte-Nord (Haute-Côte-Nord, Manicouagan, Sept-Rivières,
    # Minganie/Caniapiscau pour la partie continentale sud); pas de débordement
    # identifié vers Nord-du-Québec dans les sources consultées.
    "Manicouagan": "Côte-Nord",

    # --- Gaspésie-Îles-de-la-Madeleine ---
    "Gaspésie--Les Îles-de-la-Madeleine": "Gaspésie–Îles-de-la-Madeleine",

    # Avignon--La Mitis--Matane--Matapédia : chevauchement
    # Bas-Saint-Laurent/Gaspésie. Source: Wikipédia EN "Haute-Gaspésie—La
    # Mitis—Matane—Matapédia" (historique de la circonscription) + elections.ca
    # (11678E) - MRC La Mitis, La Matanie (La Matane) et La Matapédia
    # appartiennent à la région Bas-Saint-Laurent; MRC Avignon appartient à la
    # région Gaspésie–Îles-de-la-Madeleine. Bas-Saint-Laurent majoritaire
    # (3 MRC sur 4 dans le nom).
    "Avignon--La Mitis--Matane--Matapédia": [
        "Bas-Saint-Laurent",
        "Gaspésie–Îles-de-la-Madeleine",
    ],

    # --- Bas-Saint-Laurent ---
    "Rimouski-Neigette--Témiscouata--Les Basques": "Bas-Saint-Laurent",

    # --- Estrie ---
    "Compton--Stanstead": "Estrie",
    "Sherbrooke": "Estrie",
    # Brome--Missisquoi: MRC Brome-Missisquoi rattachée à l'Estrie depuis le
    # 28 juillet 2021 (ISQ, avant cette date: Montérégie).
    "Brome--Missisquoi": "Estrie",
    # Shefford: MRC La Haute-Yamaska (Granby) rattachée à l'Estrie depuis le
    # 28 juillet 2021 (ISQ, avant cette date: Montérégie). Voir note de module.
    "Shefford": "Estrie",

    # Richmond--Arthabaska : chevauchement Centre-du-Québec/Estrie. Source:
    # Wikipédia EN "Richmond—Arthabaska" + redecoupage-redistribution-2022.ca
    # (24060) - MRC Arthabaska (Victoriaville, Centre-du-Québec) + MRC Les
    # Sources et partie de la MRC Le Val-Saint-François (Richmond, Windsor -
    # Estrie). Centre-du-Québec majoritaire (Victoriaville, pôle principal).
    "Richmond--Arthabaska": ["Centre-du-Québec", "Estrie"],

    # --- Centre-du-Québec ---
    "Drummond": "Centre-du-Québec",

    # Bécancour--Nicolet--Saurel : chevauchement Centre-du-Québec/Montérégie.
    # Source: Wikipédia EN "Bécancour—Nicolet—Saurel—Alnôbak" +
    # noscommunes.ca (645/983) - MRC Bécancour et Nicolet-Yamaska
    # (Centre-du-Québec) + MRC Pierre-De Saurel (Montérégie). Centre-du-Québec
    # majoritaire (deux MRC sur trois).
    "Bécancour--Nicolet--Saurel": ["Centre-du-Québec", "Montérégie"],

    # --- Montérégie ---
    "Beloeil--Chambly": "Montérégie",
    "Brossard--Saint-Lambert": "Montérégie",
    "Châteauguay--Lacolle": "Montérégie",
    "La Prairie": "Montérégie",
    "Longueuil--Charles-LeMoyne": "Montérégie",
    "Longueuil--Saint-Hubert": "Montérégie",
    "Montarville": "Montérégie",
    "Pierre-Boucher--Les Patriotes--Verchères": "Montérégie",
    "Saint-Hyacinthe--Bagot": "Montérégie",
    "Saint-Jean": "Montérégie",
    "Salaberry--Suroît": "Montérégie",
    "Vaudreuil--Soulanges": "Montérégie",
}


def region_administrative_for_riding(fedname: str) -> str | list[str] | None:
    """Retourne la région administrative (ou liste de régions en cas de
    chevauchement) correspondant à une circonscription fédérale du Québec,
    identifiée par son `fedname` exact (orthographe CES/EEQ, séparateur
    `--` pour le tiret cadratin). Retourne None si le nom est inconnu de la
    table."""
    return RIDING_TO_REGION.get(fedname)
