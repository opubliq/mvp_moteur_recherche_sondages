# Corpus verbatim — instantané du 2026-07-21

Décompte **reproductible** (bead jsu.5) :

```
uv run python -m ingestion.open_text
```

La règle de qualification vit à un seul endroit — `ingestion/open_text.py` — et est
appliquée par les deux rails (catalogue `run.py`, microdonnées `microdata.py`).
Barème et sémantique de `text_kind` : `ingestion/SCHEMA.md` § text_kind.

## Totaux

| `text_kind` | questions | sens |
|---|---:|---|
| `prose`   | 82 | **corpus verbatim** — 17 309 réponses non-vides |
| `short`   | 11 | réponses d'un ou deux mots (langue, province, station de radio…) |
| `numeric` | 13 | nombres stockés en string → requalifiés `var_type = "continuous"` |
| `empty`   |  4 | colonnes texte entièrement vides |
| **total** | **110** | colonnes détectées `open` par les extracteurs |

Deux corrections expliquent l'écart avec les décomptes antérieurs :

- `has_verbatims` (6 questions sur 3083) était du code mort — supprimé.
- Le test `str(df[col].dtype) == "object"` des extracteurs échouait silencieusement
  sous pandas ≥ 2 (dtype `str` pour les colonnes chaîne de pyreadstat) : les verbatims
  de `cecd_elxn_can_2011`, `cecd_elxn_qc_1998`, `cecd_elxn_qc_2007` et `cecd_elxn_qc_2018`
  tombaient en `continuous`. Remplacé par `open_text.is_text_column()`.

## Détail par colonne

```
survey_id                variable               text_kind      n   %num  %3mots  exemple
----------------------------------------------------------------------------------------
cecd_elxn_can_2011       O_Q5A                  prose        574  0.000   0.920  Besoin de partie de gauche pour équilibré le partie de droit
cecd_elxn_can_2011       Texte                  prose        574  0.000   0.920  Besoin de partie de gauche pour équilibré le partie de droit
cecd_elxn_qc_1998        mention1               prose        370  0.000   0.862  TRAVAIL DANS LA SANTE ET LE GV ACTUEL DECU, PROGRAMME DE SAN
cecd_elxn_qc_1998        mention2               prose         13  0.000   1.000  PAS DE BON MODELE POUR LES ENFANTS
cecd_elxn_qc_2007        lmat_ouv               short         33  0.000   0.030  italien
cecd_elxn_qc_2007        lusage_ouv             short         11  0.000   0.000  espagnol
cecd_elxn_qc_2007        q4a_verb               prose        245  0.000   0.918  Pour le chef, c'est le seul que je trouve qui se tient debou
cecd_elxn_qc_2007        q4b_verb               prose        230  0.000   0.791  n'a pas pu quitter le travail
cecd_elxn_qc_2007        poste_radio            short       1160  0.188   0.245  Rock détente
cecd_elxn_qc_2018        q3a_verb               prose        704  0.000   0.905  pq il des choses de spromesse qui nous font, il pense qil ar
cecd_elxn_qc_2018        q3b_verb               prose         13  0.000   0.923  Because of the candidates
cecd_elxn_qc_2018        q4_verb                prose        111  0.000   0.847  Parce que je connais pas assez du gouvernement quebecois. RE
cecd_sante_can_usa       LANG                   short       7064  0.000   0.000  EN
cecd_sante_can_usa       PROV                   short       3522  0.000   0.000  ON
eeq_2014                 LANG                   short       1517  0.000   0.000  FR
govcan_habit_2024        SOCCON_MH_CONDITION    numeric     2021  1.000   0.000  60
govcan_habit_2024        SOCCON_PH_CONDITION    numeric     2021  1.000   0.000  30
govcan_habit_2024        SOCCON_BELONG_COMMUNITY numeric     2021  1.000   0.000  20
govcan_habit_2024        SOCCON_BELONG_LONELINESS numeric     2021  1.000   0.000  30
govcan_habit_2024        PA_DAYS                numeric     2021  1.000   0.000  6
govcan_habit_2024        SEDENTARY_HOURS_OLD    empty          0  0.000   0.000  
govcan_habit_2024        SOCCON_FLU_2022        numeric     2036  1.000   0.000  40
govcan_habit_2024        SOCCON_FLU_2023        numeric     2036  1.000   0.000  35
govcan_habit_2024        SOCCON_COVID_2023      empty          0  0.000   0.000  
govcan_parca_2024        A3O                    short          7  0.000   0.000  Intersex
govcan_parca_2024        C2A_O                  numeric     9252  1.000   0.000  0
govcan_parca_2024        C8_O                   numeric     7238  1.000   0.000  1
govcan_parca_2024        C8_AO                  numeric     2236  1.000   0.000  1
govcan_parca_2024        C8IO                   prose       2730  0.003   0.835  To balance cost of carbon tax
govcan_parca_2024        C21O                   prose        887  0.005   0.930  Impossible
govcan_parca_2024        D6_V2_O                numeric     2524  1.000   0.000  4
govcan_parca_2024        E5O                    short       2637  0.001   0.011  china
govcan_parca_2024        E7_12O                 short        299  0.000   0.080  Italian
govcan_parca_2024        H1O                    prose       1524  0.000   0.529  - producing electricity
govcan_parca_2024        J1AO                   prose       1605  0.000   0.667  the trees gives us fresh air to breathe and blocks the sun a
govcan_parca_2024        J1BO                   prose       1635  0.000   0.847  helps us breathe
govcan_parca_2024        J4A_10_TEXT            numeric      332  1.000   0.000  99
govcan_parca_2024        J4A_10_TEXTO           prose        284  0.000   0.468  I dont know
govcan_parca_2024        J4B_9_TEXT             numeric      318  1.000   0.000  97
govcan_parca_2024        J4B_9_TEXTO            prose        268  0.000   0.384  N/a
govcan_parca_2024        I9O                    prose         61  0.000   0.852  don't have the money to do it, we love to do it. just cost w
govcan_parca_2024        I9_10O                 prose        156  0.000   0.917  don't have the money to do it, we love to do it. just cost w
govcan_parca_2024        I9OTHO                 prose        155  0.000   0.858  we love to make our home a net-zone house but cost is way to
govcan_parca_2024        I10C1O                 prose          3  0.000   1.000  Personally I hate them, they make me get more sick and havin
govcan_parca_2024        I10C1_8O               prose          4  0.000   1.000  Personally I hate them, they make me get more sick and havin
govcan_parca_2024        I10C2O                 empty          0  0.000   0.000  
govcan_parca_2024        I10C2_8O               empty          0  0.000   0.000  
govcan_parca_2024        I10C3O                 prose          2  0.000   1.000  I put in the wrong answer on the previous question as I have
govcan_parca_2024        I10C3_8O               prose          4  0.000   1.000  I put in the wrong answer on the previous question as I have
govcan_parca_2024        I10C4O                 prose          1  0.000   1.000  I selected the wrong answer on the last one and I have just 
govcan_parca_2024        I10C4_8O               prose          2  0.000   1.000  I selected the wrong answer on the last one and I have just 
govcan_parca_2024        I10C5O                 prose          2  0.000   0.500  I will not purchase
govcan_parca_2024        I10C5_8O               prose          3  0.000   0.667  the sun is so hot now, I thought it would be beneficial
govcan_parca_2024        I10C6O                 prose          2  0.000   0.500  Condo
govcan_parca_2024        I10C6_8O               prose          2  0.000   0.500  Condo
govcan_parca_2024        I10C7O                 prose         12  0.000   0.917  i may get an EV
govcan_parca_2024        I10C7_8O               prose         12  0.000   0.917  i may get an EV
govcan_parca_2024        I10C8O                 prose          3  0.000   1.000  To save on house insurance
govcan_parca_2024        I10C8_8O               prose          5  0.000   1.000  so I can get a heat pump
govcan_parca_2024        I10D1O                 prose         30  0.000   0.767  we have many power outages in our area all year round, most 
govcan_parca_2024        I10D1_12O              prose         76  0.000   0.895  we have many power outages in our area all year round, most 
govcan_parca_2024        I10D2O                 prose         21  0.000   0.952  I have geothermal so spent enough on heating and cooling my 
govcan_parca_2024        I10D2_12O              prose         39  0.000   0.974  I do not have the funds right now to do anything.
govcan_parca_2024        I10D3O                 prose         24  0.000   1.000  Electrical panel will not support it
govcan_parca_2024        I10D3_12O              prose         46  0.000   0.978  Electrical panel will not support it
govcan_parca_2024        I10D4O                 prose         42  0.000   0.905  our house does not have a furnace, we heat using the sun or 
govcan_parca_2024        I10D4_12O              prose         85  0.000   0.941  our house does not have a furnace, we heat using the sun or 
govcan_parca_2024        I10D5O                 prose         35  0.000   0.914  Pointless in our weather
govcan_parca_2024        I10D5_12O              prose         81  0.000   0.914  We use heat pump now
govcan_parca_2024        I10D6O                 prose         18  0.000   0.889  batteries for storage cost $12K for the first one, and $6K f
govcan_parca_2024        I10D6_12O              prose         42  0.000   0.929  batteries for storage cost $12K for the first one, and $6K f
govcan_parca_2024        I10D7O                 prose        173  0.000   0.948  electric vehicles are harder on the environment to manufactu
govcan_parca_2024        I10D7_12O              prose        267  0.000   0.955  electric vehicles are harder on the environment to manufactu
govcan_parca_2024        I10D8O                 prose         19  0.000   0.947  Expect Iwill be moving in the next few years so not worth th
govcan_parca_2024        I10D8_12O              prose         32  0.000   0.906  in the plans, but not in the next year
govcan_parca_2024        K2O                    prose          4  0.000   0.750  Plastic never breaks down. Every answer above is importnat.
govcan_parca_2024        K2_10O                 prose         20  0.000   0.950  Recycle whenever possible
govcan_parca_2024        K3_L_TEXT              prose        980  0.027   0.361  je ne crois pas avoir rien fait d'autre
govcan_parca_2024        K4AO                   prose         33  0.000   0.909  it was what available
govcan_parca_2024        K4A_12O                prose         45  0.000   0.867  didn't want to have to deal with the packaging when done wit
govcan_parca_2024        K4BO                   prose         13  0.000   0.923  Not mush is available this way anymore
govcan_parca_2024        K4B_12O                prose         26  0.000   0.962  Items in plastic containers that I can continuously use for 
govcan_parca_2024        K4CO                   prose         17  0.000   0.882  Most everything comes in single use plastic
govcan_parca_2024        K4C_12O                prose         29  0.000   0.897  Most everything comes in single use plastic
govcan_parca_2024        K4DO                   prose         44  0.000   0.750  comfy
govcan_parca_2024        K4D_12O                prose         75  0.000   0.733  comfy
govcan_parca_2024        K4EO                   prose         28  0.000   0.929  plastic is very hard to repair
govcan_parca_2024        K4E_12O                prose         58  0.000   0.897  plastic is very hard to repair
govcan_parca_2024        K4FO                   prose         16  0.000   0.812  did not want to throw out
govcan_parca_2024        K4F_12O                prose         31  0.000   0.742  because they always something you can use them for
govcan_parca_2024        K4GO                   prose         29  0.000   0.828  to help out people in need
govcan_parca_2024        K4G_12O                prose         41  0.000   0.854  to help out people in need
govcan_parca_2024        K4HO                   prose         21  0.000   0.810  If there was a recycling around me.
govcan_parca_2024        K4H_12O                prose         41  0.000   0.829  easy way to make a little more money
govcan_parca_2024        K4IO                   prose         11  0.000   0.727  The only way most things come.
govcan_parca_2024        K4I_12O                prose         12  0.000   0.750  The only way most things come.
govcan_parca_2024        K4JO                   prose         63  0.000   0.905  donated
govcan_parca_2024        K4J_12O                prose        112  0.000   0.911  to help people in need
govcan_parca_2024        K4KO                   prose         33  0.000   0.818  because it's fun
govcan_parca_2024        K4K_12O                prose         63  0.000   0.889  because it's fun
govcan_parca_2024        K5_L_TEXT              prose        848  0.018   0.347  Unknwon
govcan_parca_2024        M2_H_TEXT              prose       1109  0.033   0.371  Unknown
govcan_parca_2024        M3_F_TEXT              short        885  0.040   0.270  Cara
govcan_parca_2024        M4_F_TEXT              short        722  0.030   0.270  Makeup
govcan_parca_2024        M5AO                   prose         24  0.000   0.917  Tout le monde touche aux appareils et ils ne sont pas tous p
govcan_parca_2024        M5A_10O                prose         45  0.000   0.867  Tout le monde touche aux appareils et ils ne sont pas tous p
govcan_parca_2024        M6AO                   prose          9  0.000   0.889  Might not be safe to reuse
govcan_parca_2024        M6A_10O                prose         18  0.000   0.722  Might not be safe to reuse
govcan_parca_2024        M7AO                   prose         75  0.000   0.973  Out shopping and no where to water doesn't have fluoride in 
govcan_parca_2024        M7A_12O                prose        110  0.000   0.955  Out shopping and no where to water doesn't have fluoride in 

TOTAL colonnes `open` au catalogue : 110
  prose    : 82
  short    : 11
  numeric  : 13
  empty    : 4

Corpus verbatim : 82 questions, 17309 réponses non-vides.
```
