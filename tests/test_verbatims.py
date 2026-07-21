"""Logique pure du peuplement `survey-verbatims` — cf. ingestion/verbatims.py."""

from __future__ import annotations

import numpy as np
import pandas as pd

from ingestion.verbatims import (
    build_verbatim_docs,
    clean_text,
    normalize_code,
    pick_sociodemo_variable,
    resolve_sociodemo_series,
)

# --- Filtre blanc -----------------------------------------------------------


def test_les_cellules_blanches_ne_sont_pas_des_verbatims():
    # Piège central du corpus : govcan_parca_2024.C8IO a 13 751 valeurs
    # non-NULL pour 2 730 verbatims réels, le reste est ' '.
    assert clean_text(" ") is None
    assert clean_text("") is None
    assert clean_text(None) is None
    assert clean_text(np.nan) is None
    assert clean_text("  Parce que le chef  ") == "Parce que le chef"


# --- Normalisation des codes ------------------------------------------------


def test_normalize_code_aligne_les_entiers_parquet_sur_les_codes_string():
    # Bug silencieux si absent : les codes de l'index sont "2", le Parquet 2 ou 2.0.
    assert normalize_code(2) == "2"
    assert normalize_code(2.0) == "2"
    assert normalize_code(np.int16(9999)) == "9999"
    assert normalize_code("En") == "En"
    assert normalize_code(" 2 ") == "2"


def test_normalize_code_ecarte_les_vides():
    assert normalize_code(None) is None
    assert normalize_code(np.nan) is None
    assert normalize_code(" ") is None


def test_normalize_code_ne_tronque_pas_un_float_non_entier():
    # Raw-first : on ne fabrique jamais un code en arrondissant.
    assert normalize_code(2.5) != "2"


# --- Résolution code → libellé ----------------------------------------------


def test_resolution_sociodemo_traduit_et_compte_les_codes_inconnus():
    mapping = {"1": "Man", "2": "Woman"}
    labels, unknown = resolve_sociodemo_series(pd.Series([1, 2, 7, np.nan]), mapping)
    assert labels == ["Man", "Woman", None, None]
    # Le code 7 est dans les données mais pas au catalogue → null, jamais inventé.
    assert unknown == 1


def test_resolution_sociodemo_sur_colonne_string_blanche():
    # Cas govcan_parca_2024.A1A : colonne sociodémo en dtype string, 98 % de ' '.
    labels, unknown = resolve_sociodemo_series(
        pd.Series([" ", "3", ""], dtype="string"), {"3": "25 to 34"}
    )
    assert labels == [None, "25 to 34", None]
    assert unknown == 0


def test_choix_de_la_variable_la_mieux_couverte_quand_il_y_en_a_deux():
    # Cas cecd_elxn_qc_2007 : `sexe` (100 %) et `genre_post` (68 %, post-hoc)
    # portent tous deux `gender`. L'alphabet choisirait le mauvais.
    df = pd.DataFrame({"sexe": [1, 2, 1], "genre_post": [1, np.nan, np.nan]})
    options = {"1": "Homme", "2": "Femme"}
    candidats = {"genre_post": options, "sexe": options}
    assert pick_sociodemo_variable("s", "gender", candidats, df) == "sexe"


def test_egalite_de_couverture_tranchee_par_lalphabet_donc_deterministe():
    df = pd.DataFrame({"reg2": [1, 1], "reg": [1, 1]})
    options = {"1": "Montréal"}
    candidats = {"reg2": options, "reg": options}
    assert pick_sociodemo_variable("s", "region", candidats, df) == "reg"
    assert pick_sociodemo_variable("s", "region", dict(reversed(candidats.items())), df) == "reg"


def test_variable_absente_du_parquet_est_ecartee_du_choix():
    df = pd.DataFrame({"sexe": [1, 2]})
    options = {"1": "Homme", "2": "Femme"}
    candidats = {"absente": options, "sexe": options}
    assert pick_sociodemo_variable("s", "gender", candidats, df) == "sexe"


# --- Dépivotage -------------------------------------------------------------


def _frame() -> pd.DataFrame:
    return pd.DataFrame(
        {
            "__respondent_id": [10, 11, 12],
            "__weight": [1.5, 0.5, 2.0],
            "q1_verb": ["j'ai voté pour le chef", " ", "rien à dire"],
            "q2_verb": [None, "parce que", ""],
        }
    )


def test_depivotage_une_cellule_non_vide_un_document():
    docs = build_verbatim_docs(
        "s1", _frame(), ["q1_verb", "q2_verb"], {"gender": ["Man", "Woman", None]}
    )
    assert len(docs) == 3
    assert {d["id"] for d in docs} == {
        "s1__q1_verb__10",
        "s1__q1_verb__12",
        "s1__q2_verb__11",
    }


def test_depivotage_porte_poids_et_sociodemo_de_la_ligne():
    docs = build_verbatim_docs("s1", _frame(), ["q2_verb"], {"gender": ["Man", "Woman", None]})
    assert docs[0] == {
        "id": "s1__q2_verb__11",
        "survey_id": "s1",
        "variable": "q2_verb",
        "respondent_id": 11,
        "text": "parce que",
        "weight": 0.5,
        "gender": "Woman",
        "age": None,
        "education": None,
        "income": None,
        "region": None,
        "language": None,
        "occupation": None,
        "marital_status": None,
    }


def test_depivotage_ignore_une_colonne_absente_du_parquet():
    docs = build_verbatim_docs("s1", _frame(), ["q1_verb", "inexistante"], {})
    assert len(docs) == 2


def test_id_deterministe_donc_rejouable():
    docs_a = build_verbatim_docs("s1", _frame(), ["q1_verb"], {})
    docs_b = build_verbatim_docs("s1", _frame(), ["q1_verb"], {})
    assert [d["id"] for d in docs_a] == [d["id"] for d in docs_b]
