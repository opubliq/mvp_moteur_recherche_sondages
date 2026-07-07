"""Enrichment authoré — cecd_sante_can_usa. Produit par subagent LLM (2026-07-07)."""

SURVEY = {
    "description": "Étude Leger Marketing (février-mars 2011) comparant les opinions sur les systèmes de santé au Canada et aux États-Unis. Aborde la satisfaction, l'accès aux soins, les délais d'attente, les coûts, l'assurance maladie et les opinions sur la réforme Obama.",
    "month": 2,
}

QUESTIONS = {
    "LANG": {
        "display_label": "Langue de préférence pour répondre au sondage",
        "concepts": ["langue"],
        "themes": ["démographie"],
    },
    "PROV": {
        "display_label": "Province ou territoire de résidence (Canada)",
        "concepts": ["géographie"],
        "themes": ["démographie"],
    },
    "QAB": {
        "display_label": "Région de résidence en Alberta",
        "concepts": ["géographie"],
        "themes": ["démographie"],
    },
    "QON": {
        "display_label": "Région de résidence en Ontario",
        "concepts": ["géographie"],
        "themes": ["démographie"],
    },
    "QBC": {
        "display_label": "Région de résidence en Colombie-Britannique",
        "concepts": ["géographie"],
        "themes": ["démographie"],
    },
    "QQC": {
        "display_label": "Région de résidence au Québec",
        "concepts": ["géographie"],
        "themes": ["démographie"],
    },
    "STATE": {
        "display_label": "État de résidence (États-Unis)",
        "concepts": ["géographie"],
        "themes": ["démographie"],
    },
    "DIVIS": {
        "display_label": "Division géographique de résidence (États-Unis)",
        "concepts": ["géographie"],
        "themes": ["démographie"],
    },
    "USREG": {
        "display_label": "Région géographique de résidence (États-Unis)",
        "concepts": ["géographie"],
        "themes": ["démographie"],
    },
    "BIRTH": {
        "display_label": "Année de naissance du répondant",
        "concepts": ["âge"],
        "themes": ["démographie"],
    },
    "SEX": {
        "display_label": "Sexe du répondant",
        "concepts": ["genre"],
        "themes": ["démographie"],
    },
    "Q1A": {
        "display_label": "Unité de mesure utilisée pour le poids (livres ou kilos)",
        "concepts": ["santé_personnelle", "poids"],
        "themes": ["santé"],
    },
    "Q1B1": {
        "display_label": "Poids du répondant (en livres)",
        "concepts": ["santé_personnelle", "poids"],
        "themes": ["santé"],
    },
    "Q1B2": {
        "display_label": "Poids du répondant (en kilos)",
        "concepts": ["santé_personnelle", "poids"],
        "themes": ["santé"],
    },
    "Q2A": {
        "display_label": "Unité de mesure utilisée pour la taille",
        "concepts": ["santé_personnelle", "taille"],
        "themes": ["santé"],
    },
    "Q2B1": {
        "display_label": "Taille du répondant (pieds)",
        "concepts": ["santé_personnelle", "taille"],
        "themes": ["santé"],
    },
    "Q2B2": {
        "display_label": "Taille du répondant (pouces supplémentaires)",
        "concepts": ["santé_personnelle", "taille"],
        "themes": ["santé"],
    },
    "Q2C1": {
        "display_label": "Taille du répondant (mètres)",
        "concepts": ["santé_personnelle", "taille"],
        "themes": ["santé"],
    },
    "Q2C2": {
        "display_label": "Taille du répondant (centimètres supplémentaires)",
        "concepts": ["santé_personnelle", "taille"],
        "themes": ["santé"],
    },
    "Q3": {
        "display_label": "Auto-évaluation de l'état de santé général",
        "concepts": ["santé_personnelle"],
        "themes": ["santé"],
    },
    "Q4": {
        "display_label": "Présence d'une maladie grave ou chronique (2 dernières années)",
        "concepts": ["santé_personnelle", "maladie_chronique"],
        "themes": ["santé"],
    },
    "Q5A": {
        "display_label": "Diagnostic médical : Arthrite",
        "concepts": ["santé_personnelle", "diagnostic"],
        "themes": ["santé"],
    },
    "Q5B": {
        "display_label": "Diagnostic médical : Maladie cardiaque",
        "concepts": ["santé_personnelle", "diagnostic"],
        "themes": ["santé"],
    },
    "Q5C": {
        "display_label": "Diagnostic médical : Diabète",
        "concepts": ["santé_personnelle", "diagnostic"],
        "themes": ["santé"],
    },
    "Q5D": {
        "display_label": "Diagnostic médical : Asthme",
        "concepts": ["santé_personnelle", "diagnostic"],
        "themes": ["santé"],
    },
    "Q5E": {
        "display_label": "Diagnostic médical : Cancer",
        "concepts": ["santé_personnelle", "diagnostic"],
        "themes": ["santé"],
    },
    "Q6": {
        "display_label": "Satisfaction globale envers le fonctionnement du système de santé national",
        "concepts": ["satisfaction", "système_de_santé"],
        "themes": ["santé", "services_publics"],
    },
    "Q7": {
        "display_label": "Évaluation de la couverture des soins de santé dans le pays",
        "concepts": ["satisfaction", "couverture_santé"],
        "themes": ["santé", "services_publics"],
    },
    "Q8": {
        "display_label": "Évaluation de la qualité des soins de santé dans le pays",
        "concepts": ["satisfaction", "qualité_des_soins"],
        "themes": ["santé", "services_publics"],
    },
    "Q9": {
        "display_label": "Perception de l'évolution de la qualité des soins (2 dernières années)",
        "concepts": ["évolution", "qualité_des_soins"],
        "themes": ["santé"],
    },
    "Q10": {
        "display_label": "Perception de l'évolution de l'accès aux soins (2 dernières années)",
        "concepts": ["évolution", "accès_aux_soins"],
        "themes": ["santé"],
    },
    "Q11": {
        "display_label": "Perception du coût total de la santé par rapport à l'économie",
        "concepts": ["coût_de_la_santé", "économie"],
        "themes": ["santé", "économie"],
    },
    "Q12": {
        "display_label": "Opinion sur l'ampleur des réformes nécessaires au système de santé",
        "concepts": ["réforme", "système_de_santé"],
        "themes": ["santé", "politique"],
    },
    "Q13": {
        "display_label": "Opinion : Le gouvernement devrait se limiter aux services essentiels",
        "concepts": ["rôle_de_l_état", "services_publics"],
        "themes": ["politique", "santé"],
    },
    "Q14": {
        "display_label": "Opinion : Gérabilité de la hausse des coûts de santé par la croissance",
        "concepts": ["coût_de_la_santé", "croissance_économique"],
        "themes": ["santé", "économie"],
    },
    "Q14A": {
        "display_label": "Opinion : Capacité à contenir les coûts par l'efficacité du système",
        "concepts": ["coût_de_la_santé", "efficacité"],
        "themes": ["santé", "économie"],
    },
    "Q15": {
        "display_label": "Qualité des soins médicaux reçus personnellement (2 dernières années)",
        "concepts": ["expérience_patient", "qualité_des_soins"],
        "themes": ["santé"],
    },
    "Q16A": {
        "display_label": "Besoin d'une chirurgie non urgente ou élective (2 dernières années)",
        "concepts": ["accès_aux_soins", "chirurgie"],
        "themes": ["santé"],
    },
    "Q16B1": {
        "display_label": "Unité de mesure du délai d'attente pour une chirurgie élective",
        "concepts": ["délais_d_attente", "chirurgie"],
        "themes": ["santé"],
    },
    "Q16B2": {
        "display_label": "Délai d'attente pour une chirurgie élective (nombre d'unités)",
        "concepts": ["délais_d_attente", "chirurgie"],
        "themes": ["santé"],
    },
    "Q17A": {
        "display_label": "Fréquence d'utilisation des urgences hospitalières (2 dernières années)",
        "concepts": ["utilisation_des_services", "urgences"],
        "themes": ["santé"],
    },
    "Q17B": {
        "display_label": "Délai d'attente aux urgences lors de la dernière visite (heures)",
        "concepts": ["délais_d_attente", "urgences"],
        "themes": ["santé"],
    },
    "Q18": {
        "display_label": "Expérience de soins requis mais non reçus",
        "concepts": ["accès_aux_soins", "besoins_non_comblés"],
        "themes": ["santé"],
    },
    "Q19": {
        "display_label": "Soins non reçus en raison du coût (abordabilité)",
        "concepts": ["abordabilité", "accès_aux_soins"],
        "themes": ["santé", "économie"],
    },
    "Q20": {
        "display_label": "Incapacité à obtenir les médicaments les plus efficaces",
        "concepts": ["médicaments", "accès_aux_soins"],
        "themes": ["santé"],
    },
    "Q21": {
        "display_label": "Incapacité à recevoir des soins de haute qualité",
        "concepts": ["qualité_des_soins", "accès_aux_soins"],
        "themes": ["santé"],
    },
    "Q22": {
        "display_label": "Expérience de délais d'attente jugés déraisonnables",
        "concepts": ["délais_d_attente", "perception"],
        "themes": ["santé"],
    },
    "Q23": {
        "display_label": "Difficultés à payer des factures médicales (2 dernières années)",
        "concepts": ["coût_de_la_santé", "difficultés_financières"],
        "themes": ["santé", "économie"],
    },
    "Q24": {
        "display_label": "Risque perçu de ne pas pouvoir payer les soins requis à l'avenir",
        "concepts": ["abordabilité", "risque_futur"],
        "themes": ["santé", "économie"],
    },
    "Q25": {
        "display_label": "Risque perçu de ne pas pouvoir obtenir les médicaments efficaces à l'avenir",
        "concepts": ["médicaments", "risque_futur"],
        "themes": ["santé"],
    },
    "Q26": {
        "display_label": "Risque perçu de ne pas recevoir des soins de haute qualité à l'avenir",
        "concepts": ["qualité_des_soins", "risque_futur"],
        "themes": ["santé"],
    },
    "Q27": {
        "display_label": "Risque perçu de délais d'attente déraisonnables à l'avenir",
        "concepts": ["délais_d_attente", "risque_futur"],
        "themes": ["santé"],
    },
    "Q28A": {
        "display_label": "Confiance d'obtenir des soins de qualité et sécuritaires en cas de maladie grave",
        "concepts": ["confiance", "qualité_des_soins"],
        "themes": ["santé"],
    },
    "Q28B": {
        "display_label": "Confiance de recevoir les médicaments les plus efficaces en cas de maladie grave",
        "concepts": ["confiance", "médicaments"],
        "themes": ["santé"],
    },
    "Q28C": {
        "display_label": "Confiance de recevoir la meilleure technologie médicale en cas de maladie grave",
        "concepts": ["confiance", "technologie_médicale"],
        "themes": ["santé"],
    },
    "Q28D": {
        "display_label": "Confiance de pouvoir payer les soins requis en cas de maladie grave",
        "concepts": ["confiance", "abordabilité"],
        "themes": ["santé", "économie"],
    },
    "Q28E": {
        "display_label": "Possession d'un médecin de famille au moment du sondage",
        "concepts": ["médecin_de_famille", "accès_aux_soins"],
        "themes": ["santé"],
    },
    "Q29": {
        "display_label": "Détention d'une assurance santé privée",
        "concepts": ["assurance_maladie", "secteur_privé"],
        "themes": ["santé", "économie"],
    },
    "Q30A": {
        "display_label": "Couverture par une assurance santé via l'employeur",
        "concepts": ["assurance_maladie", "emploi"],
        "themes": ["santé", "économie"],
    },
    "Q30B": {
        "display_label": "Couverture par Medicare (plan gouvernemental)",
        "concepts": ["assurance_maladie", "système_public"],
        "themes": ["santé", "politique"],
    },
    "Q30C": {
        "display_label": "Couverture par Medicaid ou autre plan étatique",
        "concepts": ["assurance_maladie", "système_public"],
        "themes": ["santé", "politique"],
    },
    "Q30D": {
        "display_label": "Couverture par une assurance santé achetée individuellement",
        "concepts": ["assurance_maladie", "achat_personnel"],
        "themes": ["santé", "économie"],
    },
    "Q30E": {
        "display_label": "Couverture par une assurance santé d'une autre source",
        "concepts": ["assurance_maladie"],
        "themes": ["santé"],
    },
    "Q31": {
        "display_label": "Inquiétude quant à la capacité de payer les soins médicaux futurs",
        "concepts": ["abordabilité", "inquiétude"],
        "themes": ["santé", "économie"],
    },
    "Q32C": {
        "display_label": "Perception de l'inquiétude des Canadiens vs Américains sur le coût des soins",
        "concepts": ["comparaison_internationale", "perception", "abordabilité"],
        "themes": ["santé", "opinion_publique"],
    },
    "Q32A": {
        "display_label": "Perception de l'inquiétude des Américains vs Canadiens sur le coût des soins",
        "concepts": ["comparaison_internationale", "perception", "abordabilité"],
        "themes": ["santé", "opinion_publique"],
    },
    "Q33": {
        "display_label": "Inquiétude quant à la couverture future des besoins de santé",
        "concepts": ["couverture_santé", "inquiétude"],
        "themes": ["santé"],
    },
    "Q34C": {
        "display_label": "Perception de l'inquiétude des Canadiens vs Américains sur la couverture santé",
        "concepts": ["comparaison_internationale", "perception", "couverture_santé"],
        "themes": ["santé", "opinion_publique"],
    },
    "Q34A": {
        "display_label": "Perception de l'inquiétude des Américains vs Canadiens sur la couverture santé",
        "concepts": ["comparaison_internationale", "perception", "couverture_santé"],
        "themes": ["santé", "opinion_publique"],
    },
    "Q35": {
        "display_label": "Satisfaction envers le régime d'assurance maladie actuel",
        "concepts": ["satisfaction", "assurance_maladie"],
        "themes": ["santé"],
    },
    "Q36": {
        "display_label": "Nombre de changements d'assureur ou de régime (2 dernières années)",
        "concepts": ["assurance_maladie", "mobilité"],
        "themes": ["santé", "économie"],
    },
    "Q37": {
        "display_label": "Période sans aucune couverture d'assurance maladie (dernière année)",
        "concepts": ["assurance_maladie", "accès_aux_soins"],
        "themes": ["santé"],
    },
    "Q38A": {
        "display_label": "Difficultés à obtenir des exemptions de paiement ou des tarifs spéciaux",
        "concepts": ["expérience_patient", "coût_de_la_santé"],
        "themes": ["santé", "économie"],
    },
    "Q38B": {
        "display_label": "Difficultés à remplir les demandes d'assurance maladie",
        "concepts": ["expérience_patient", "assurance_maladie"],
        "themes": ["santé"],
    },
    "Q38C": {
        "display_label": "Difficultés à connaître les prestations de son régime d'assurance",
        "concepts": ["expérience_patient", "assurance_maladie"],
        "themes": ["santé"],
    },
    "Q38D": {
        "display_label": "Difficultés à obtenir un remboursement de l'assureur",
        "concepts": ["expérience_patient", "assurance_maladie", "remboursement"],
        "themes": ["santé", "économie"],
    },
    "Q39": {
        "display_label": "Paiement direct (hors assurance) pour un service médical nécessaire",
        "concepts": ["abordabilité", "coût_de_la_santé"],
        "themes": ["santé", "économie"],
    },
    "Q39B": {
        "display_label": "Évaluation du montant payé personnellement (très élevé à très bas)",
        "concepts": ["abordabilité", "perception"],
        "themes": ["santé", "économie"],
    },
    "Q40": {
        "display_label": "Satisfaction globale envers les coûts de santé payés personnellement",
        "concepts": ["satisfaction", "abordabilité"],
        "themes": ["santé", "économie"],
    },
    "Q41": {
        "display_label": "Prêt à payer de sa poche pour obtenir des soins à l'étranger",
        "concepts": ["accès_aux_soins", "comparaison_internationale"],
        "themes": ["santé"],
    },
    "Q42": {
        "display_label": "Préférence : Régime public universel vs régimes privés individuels",
        "concepts": ["modèle_de_santé", "système_public", "système_privé"],
        "themes": ["politique", "santé"],
    },
    "Q43": {
        "display_label": "Priorité : Protection de l'accès universel vs coûts trop élevés",
        "concepts": ["accès_universel", "équité", "coût_de_la_santé"],
        "themes": ["politique", "santé"],
    },
    "Q44": {
        "display_label": "Impression générale du système de santé au Canada",
        "concepts": ["perception", "système_de_santé"],
        "themes": ["santé"],
    },
    "Q45": {
        "display_label": "Impression générale du système de santé aux États-Unis",
        "concepts": ["perception", "système_de_santé"],
        "themes": ["santé"],
    },
    "Q46": {
        "display_label": "Comparaison personnelle : Système américain vs système canadien",
        "concepts": ["comparaison_internationale", "préférence"],
        "themes": ["santé"],
    },
    "Q47": {
        "display_label": "Opinion : Lequel des deux systèmes est le plus efficace ?",
        "concepts": ["comparaison_internationale", "efficacité"],
        "themes": ["santé"],
    },
    "Q48": {
        "display_label": "Opinion : Lequel des deux systèmes est le plus juste (équitable) ?",
        "concepts": ["comparaison_internationale", "équité"],
        "themes": ["santé", "société"],
    },
    "Q49": {
        "display_label": "Comparaison : Proportion de la population incapable de payer ses soins",
        "concepts": ["comparaison_internationale", "abordabilité"],
        "themes": ["santé", "économie"],
    },
    "Q50": {
        "display_label": "Comparaison : Proportion de la population incapable d'obtenir des médicaments",
        "concepts": ["comparaison_internationale", "médicaments"],
        "themes": ["santé"],
    },
    "Q51": {
        "display_label": "Comparaison : Proportion de la population incapable de recevoir des soins de qualité",
        "concepts": ["comparaison_internationale", "qualité_des_soins"],
        "themes": ["santé"],
    },
    "Q52": {
        "display_label": "Comparaison : Proportion de la population subissant des délais d'attente excessifs",
        "concepts": ["comparaison_internationale", "délais_d_attente"],
        "themes": ["santé"],
    },
    "Q52A1": {
        "display_label": "Perception de la part du financement public/privé de la santé au Canada",
        "concepts": ["système_public", "système_privé", "financement"],
        "themes": ["santé", "économie"],
    },
    "Q52A2": {
        "display_label": "Perception de la part du financement public/privé de la santé aux É-U",
        "concepts": ["système_public", "système_privé", "financement"],
        "themes": ["santé", "économie"],
    },
    "Q52B1": {
        "display_label": "Perception des coûts de santé par habitant au Canada vs États-Unis",
        "concepts": ["coût_de_la_santé", "comparaison_internationale"],
        "themes": ["santé", "économie"],
    },
    "Q52B2": {
        "display_label": "Perception des coûts de santé par habitant aux É-U vs Canada",
        "concepts": ["coût_de_la_santé", "comparaison_internationale"],
        "themes": ["santé", "économie"],
    },
    "Q53A": {
        "display_label": "Meilleur système pour des soins abordables (cas personnel)",
        "concepts": ["abordabilité", "comparaison_internationale"],
        "themes": ["santé"],
    },
    "Q53B": {
        "display_label": "Meilleur système pour obtenir les médicaments efficaces (cas personnel)",
        "concepts": ["médicaments", "comparaison_internationale"],
        "themes": ["santé"],
    },
    "Q53C": {
        "display_label": "Meilleur système pour des soins de haute qualité (cas personnel)",
        "concepts": ["qualité_des_soins", "comparaison_internationale"],
        "themes": ["santé"],
    },
    "Q53D": {
        "display_label": "Meilleur système pour l'accès rapide à un spécialiste (cas personnel)",
        "concepts": ["accès_aux_soins", "comparaison_internationale", "délais_d_attente"],
        "themes": ["santé"],
    },
    "Q53E": {
        "display_label": "Meilleur système pour une chirurgie rapide (cas personnel)",
        "concepts": ["accès_aux_soins", "comparaison_internationale", "délais_d_attente"],
        "themes": ["santé"],
    },
    "Q53F": {
        "display_label": "Meilleur système pour le choix du médecin ou de l'hôpital (cas personnel)",
        "concepts": ["liberté_de_choix", "comparaison_internationale"],
        "themes": ["santé"],
    },
    "Q53G": {
        "display_label": "Meilleur système pour une assurance santé complète et abordable (cas personnel)",
        "concepts": ["assurance_maladie", "comparaison_internationale"],
        "themes": ["santé"],
    },
    "Q54A": {
        "display_label": "Meilleur système pour des soins abordables pour tous (population)",
        "concepts": ["équité", "abordabilité", "comparaison_internationale"],
        "themes": ["santé", "société"],
    },
    "Q54B": {
        "display_label": "Meilleur système pour l'accès aux médicaments pour tous (population)",
        "concepts": ["équité", "médicaments", "comparaison_internationale"],
        "themes": ["santé", "société"],
    },
    "Q54C": {
        "display_label": "Meilleur système pour des soins de qualité pour tous (population)",
        "concepts": ["équité", "qualité_des_soins", "comparaison_internationale"],
        "themes": ["santé", "société"],
    },
    "Q54D": {
        "display_label": "Meilleur système pour l'accès aux spécialistes pour tous (population)",
        "concepts": ["équité", "accès_aux_soins", "comparaison_internationale"],
        "themes": ["santé", "société"],
    },
    "Q54E": {
        "display_label": "Meilleur système pour une chirurgie rapide pour tous (population)",
        "concepts": ["équité", "délais_d_attente", "comparaison_internationale"],
        "themes": ["santé", "société"],
    },
    "Q54F": {
        "display_label": "Meilleur système pour le choix du prestataire pour tous (population)",
        "concepts": ["équité", "liberté_de_choix", "comparaison_internationale"],
        "themes": ["santé", "société"],
    },
    "Q54G": {
        "display_label": "Meilleur système pour une assurance abordable pour tous (population)",
        "concepts": ["équité", "assurance_maladie", "comparaison_internationale"],
        "themes": ["santé", "société"],
    },
    "Q55": {
        "display_label": "Opinion sur le niveau d'implication du privé dans la santé au Canada",
        "concepts": ["système_privé", "rôle_du_marché"],
        "themes": ["politique", "santé"],
    },
    "Q56": {
        "display_label": "Opinion sur le niveau d'implication du gouvernement dans la santé aux É-U",
        "concepts": ["système_public", "rôle_de_l_état"],
        "themes": ["politique", "santé"],
    },
    "Q57A": {
        "display_label": "Impact d'un recours accru au privé sur la qualité au Canada",
        "concepts": ["système_privé", "qualité_des_soins"],
        "themes": ["santé", "politique"],
    },
    "Q57B": {
        "display_label": "Impact d'un recours accru au privé sur l'accès au Canada",
        "concepts": ["système_privé", "accès_aux_soins"],
        "themes": ["santé", "politique"],
    },
    "Q57C": {
        "display_label": "Impact d'un recours accru au privé sur les coûts au Canada",
        "concepts": ["système_privé", "coût_de_la_santé"],
        "themes": ["santé", "économie"],
    },
    "Q58A": {
        "display_label": "Impact d'un recours accru au public sur la qualité aux É-U",
        "concepts": ["système_public", "qualité_des_soins"],
        "themes": ["santé", "politique"],
    },
    "Q58B": {
        "display_label": "Impact d'un recours accru au public sur l'accès aux É-U",
        "concepts": ["système_public", "accès_aux_soins"],
        "themes": ["santé", "politique"],
    },
    "Q58C": {
        "display_label": "Impact d'un recours accru au public sur les coûts aux É-U",
        "concepts": ["système_public", "coût_de_la_santé"],
        "themes": ["santé", "économie"],
    },
    "Q58A1": {
        "display_label": "Opinion : Un système à deux vitesses nuirait à la société canadienne",
        "concepts": ["système_à_deux_vitesses", "impact_social"],
        "themes": ["santé", "société"],
    },
    "Q58": {
        "display_label": "Opinion : Un système à deux vitesses nuirait aux familles canadiennes",
        "concepts": ["système_à_deux_vitesses", "famille"],
        "themes": ["santé", "société"],
    },
    "Q59": {
        "display_label": "Opinion : Un système à deux vitesses me nuirait personnellement",
        "concepts": ["système_à_deux_vitesses", "impact_personnel"],
        "themes": ["santé"],
    },
    "Q60": {
        "display_label": "Opinion : Un système financé par le public nuirait à la société américaine",
        "concepts": ["système_public", "impact_social"],
        "themes": ["santé", "société"],
    },
    "Q61": {
        "display_label": "Opinion : Un système financé par le public nuirait aux familles américaines",
        "concepts": ["système_public", "famille"],
        "themes": ["santé", "société"],
    },
    "Q62": {
        "display_label": "Opinion : Un système financé par le public me nuirait personnellement",
        "concepts": ["système_public", "impact_personnel"],
        "themes": ["santé"],
    },
    "Q63": {
        "display_label": "Le financement public universel comme valeur fondamentale canadienne",
        "concepts": ["identité_nationale", "valeurs", "système_public"],
        "themes": ["société", "politique"],
    },
    "Q64": {
        "display_label": "Le libre marché de la santé comme valeur fondamentale américaine",
        "concepts": ["identité_nationale", "valeurs", "système_privé"],
        "themes": ["société", "politique"],
    },
    "Q65": {
        "display_label": "Priorité : Santé gratuite universelle vs éducation gratuite universelle",
        "concepts": ["priorités_sociales", "services_publics"],
        "themes": ["société", "politique"],
    },
    "Q66": {
        "display_label": "Le système de santé comme symbole unificateur du pays",
        "concepts": ["unité_nationale", "symbole"],
        "themes": ["société"],
    },
    "Q66A1": {
        "display_label": "Évolution future de l'implication du privé au Canada",
        "concepts": ["évolution", "système_privé"],
        "themes": ["santé", "économie"],
    },
    "Q66A2": {
        "display_label": "Évolution future de l'implication du gouvernement aux É-U",
        "concepts": ["évolution", "système_public"],
        "themes": ["santé", "politique"],
    },
    "Q66B": {
        "display_label": "Pénurie perçue de médecins de famille",
        "concepts": ["accès_aux_soins", "pénurie_de_personnel"],
        "themes": ["santé"],
    },
    "Q66C": {
        "display_label": "Pénurie perçue de médecins spécialistes",
        "concepts": ["accès_aux_soins", "pénurie_de_personnel"],
        "themes": ["santé"],
    },
    "Q66D": {
        "display_label": "Pénurie perçue de membres du personnel infirmier",
        "concepts": ["accès_aux_soins", "pénurie_de_personnel"],
        "themes": ["santé"],
    },
    "Q66E": {
        "display_label": "Principal avantage du système canadien sur le système américain",
        "concepts": ["comparaison_internationale", "avantage"],
        "themes": ["santé"],
    },
    "Q66F": {
        "display_label": "Principal avantage du système américain sur le système canadien",
        "concepts": ["comparaison_internationale", "avantage"],
        "themes": ["santé"],
    },
    "Q66G": {
        "display_label": "Opinion sur les réformes de santé d'Obama (2010)",
        "concepts": ["réforme", "obamacare"],
        "themes": ["politique", "santé"],
    },
    "Q67": {
        "display_label": "Identification partisane (Canada)",
        "concepts": ["partisanerie"],
        "themes": ["politique"],
    },
    "Q68": {
        "display_label": "Identification partisane (États-Unis)",
        "concepts": ["partisanerie"],
        "themes": ["politique"],
    },
    "Q69": {
        "display_label": "Autopositionnement sur l'échelle gauche-droite (Canada)",
        "concepts": ["idéologie", "gauche_droite"],
        "themes": ["politique"],
    },
    "Q70": {
        "display_label": "Autopositionnement libéral-conservateur (États-Unis)",
        "concepts": ["idéologie", "libéral_conservateur"],
        "themes": ["politique"],
    },
    "Q71": {
        "display_label": "Rôle de l'État : Assurer l'emploi et le niveau de vie (Canada)",
        "concepts": ["rôle_de_l_état", "économie_sociale"],
        "themes": ["politique", "économie"],
    },
    "Q71A": {
        "display_label": "Rôle de l'État : Assurer l'emploi et le niveau de vie (É-U)",
        "concepts": ["rôle_de_l_état", "économie_sociale"],
        "themes": ["politique", "économie"],
    },
    "Q72": {
        "display_label": "Opinion : Nécessité d'assurer l'égalité des chances pour tous",
        "concepts": ["équité", "égalité_des_chances"],
        "themes": ["société", "politique"],
    },
    "Q73": {
        "display_label": "Opinion : On est allé trop loin dans la promotion des droits égaux",
        "concepts": ["droits_égaux", "valeurs"],
        "themes": ["société", "politique"],
    },
    "Q74": {
        "display_label": "Opinion : On devrait moins s'inquiéter de l'égalité entre les gens",
        "concepts": ["égalité", "valeurs"],
        "themes": ["société", "politique"],
    },
    "Q75": {
        "display_label": "Opinion : Ce n'est pas un problème si certains ont plus de chances",
        "concepts": ["équité", "valeurs"],
        "themes": ["société", "politique"],
    },
    "Q76": {
        "display_label": "Opinion : Un traitement plus égalitaire réduirait les problèmes sociaux",
        "concepts": ["égalité", "valeurs"],
        "themes": ["société", "politique"],
    },
    "Q77": {
        "display_label": "Opinion : Le manque d'égalité des chances est un problème majeur",
        "concepts": ["équité", "problèmes_sociaux"],
        "themes": ["société", "politique"],
    },
    "SCOL": {
        "display_label": "Plus haut niveau de scolarité complété",
        "concepts": ["éducation"],
        "themes": ["démographie"],
    },
    "JOB": {
        "display_label": "Statut d'emploi actuel",
        "concepts": ["emploi"],
        "themes": ["démographie"],
    },
    "OCCUP": {
        "display_label": "Occupation ou profession principale",
        "concepts": ["profession"],
        "themes": ["démographie"],
    },
    "OCC2": {
        "display_label": "Raison principale d'inactivité professionnelle",
        "concepts": ["inactivité_professionnelle"],
        "themes": ["démographie"],
    },
    "HOUS": {
        "display_label": "Nombre de personnes résidant dans le ménage",
        "concepts": ["composition_familiale"],
        "themes": ["démographie"],
    },
    "ENFAN": {
        "display_label": "Nombre d'enfants de moins de 18 ans dans le ménage",
        "concepts": ["composition_familiale", "enfants"],
        "themes": ["démographie"],
    },
    "REVEN": {
        "display_label": "Tranche de revenu annuel total du ménage",
        "concepts": ["revenu"],
        "themes": ["démographie", "économie"],
    },
    "RELIG": {
        "display_label": "Importance de la religion dans la vie du répondant",
        "concepts": ["religion"],
        "themes": ["société", "démographie"],
    },
    "MTONG": {
        "display_label": "Langue maternelle du répondant",
        "concepts": ["langue"],
        "themes": ["démographie"],
    },
    "CANAD": {
        "display_label": "Citoyenneté canadienne de naissance",
        "concepts": ["citoyenneté"],
        "themes": ["démographie"],
    },
    "AMERI": {
        "display_label": "Citoyenneté américaine de naissance",
        "concepts": ["citoyenneté"],
        "themes": ["démographie"],
    },
    "YCAN": {
        "display_label": "Année d'établissement au Canada",
        "concepts": ["immigration"],
        "themes": ["démographie"],
    },
    "YAMER": {
        "display_label": "Année d'établissement aux États-Unis",
        "concepts": ["immigration"],
        "themes": ["démographie"],
    },
    "RACE": {
        "display_label": "Origine culturelle ou raciale (Canada)",
        "concepts": ["ethnicité"],
        "themes": ["démographie"],
    },
    "RACE2": {
        "display_label": "Groupe racial d'appartenance (États-Unis)",
        "concepts": ["ethnicité"],
        "themes": ["démographie"],
    },
}
