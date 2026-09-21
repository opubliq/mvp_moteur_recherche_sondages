"""Tests de la règle de typage des questions fermées (`ingestion/var_types.py`).

Tous les cas sont tirés du corpus réel (CES 2019 phone/online, 2021, 2025) —
voir les docstrings du module pour le contexte du bug corrigé.
"""

from __future__ import annotations

import pandas as pd

from ingestion.var_types import derive_var_type, is_special_code, substantive_options


def _codes(series_values, options):
    return derive_var_type(
        pd.Series(series_values, dtype=object),
        [{"code": c, "label": lab} for c, lab in options],
    )


def test_colonne_texte_reste_open():
    assert derive_var_type(pd.Series(["immigration", "santé"], dtype=object), []) == "open"


def test_codes_entiers_en_dtype_object_ne_sont_pas_open():
    # cps21_imp_iss_party : 7 options codées, typé `open` avant correctif.
    opts = [
        (1, "Liberal Party"),
        (2, "Conservative Party"),
        (3, "ndp"),
        (4, "Bloc Québécois"),
        (5, "Green Party"),
        (6, "Another party (please specify)"),
        (7, "Don't know/ Prefer not to answer"),
    ]
    assert _codes([1, 2, None, 7], opts) == "single"


def test_sans_option_declaree_reste_continuous():
    assert derive_var_type(pd.Series([12.0, 38.0]), []) == "continuous"


def test_wording_slider_donne_scale():
    assert (
        derive_var_type(pd.Series([0.0, 55.0]), [], "Set the slider to a number between 0 and 100")
        == "scale"
    )


def test_seuls_des_codes_de_non_reponse_donnent_continuous():
    # ces_2019_phone q14 : thermomètre 0-100, seuls les manquants sont étiquetés.
    opts = [
        (-9, "(-9) Aware of party, but don't know"),
        (-8, "(-8) Refused"),
        (-7, "(-7) Skipped"),
        (-6, "(-6) Don't know party"),
    ]
    assert _codes([0, 50, 100, -9], opts) == "continuous"


def test_item_de_batterie_a_choix_multiples():
    # cps21_not_vote_for_1 : une seule modalité étiquetée (le choix coché).
    assert _codes([1, None], [(1, "Liberal Party")]) == "multiple"
    # ces_2019_phone q66_1 : 0/1 « Not Selected / Selected ».
    opts = [
        (-9, "(-9) Don't know"),
        (-7, "(-7) Skipped"),
        (0, "(0) Not Selected"),
        (1, "(1) Selected"),
    ]
    assert _codes([0, 1], opts) == "multiple"


def test_binaire_oui_non_reste_single():
    assert _codes([1, 2], [(1, "Yes"), (2, "No")]) == "single"


def test_echelle_numerique_ancree_donne_scale():
    # ces_2019_phone p27 : échelle 0-10 d'intérêt pour la politique.
    opts = [(-9, "(-9) Don't know"), (-7, "(-7) Skipped")]
    opts += [(0, "(0) 0 - No interest at all")]
    opts += [(i, f"({i}) {i}") for i in range(1, 10)]
    opts += [(10, "(10) 10 - A great deal of interest")]
    assert _codes([0, 5, 10], opts) == "scale"


def test_referentiel_numerique_long_reste_single():
    # cps21_imm_year : 103 années → référentiel, pas une échelle de notation.
    opts = [(i, str(1919 + i)) for i in range(1, 104)]
    assert _codes([12, 44], opts) == "single"


def test_categories_ordonnees_non_numeriques_restent_single():
    # cses_module6_Q02a : 0 à 7 jours + PNR, libellés en toutes lettres.
    opts = [
        (0, "0. None / Zero days"),
        (1, "1. One day"),
        (2, "2. Two days"),
        (3, "3. Three days"),
        (4, "4. Four days"),
        (5, "5. Five days"),
        (6, "6. Six days"),
        (7, "7. Seven days"),
        (8, "8. Prefer not to answer"),
    ]
    assert _codes([0, 3, 7], opts) == "single"


def test_is_special_code_et_substantive_options():
    assert is_special_code(-9)
    assert not is_special_code(7)
    assert not is_special_code("autre")
    opts = [{"code": -9, "label": "DK"}, {"code": 1, "label": "Oui"}]
    assert substantive_options(opts) == [{"code": 1, "label": "Oui"}]
