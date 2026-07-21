"""Règle de qualification des colonnes texte (`text_kind`) — cf. ingestion/open_text.py."""

from __future__ import annotations

import numpy as np
import pandas as pd

from ingestion.open_text import (
    effective_var_type,
    is_text_column,
    is_verbatim,
    qualify_text_column,
)


def test_colonne_vide_ou_blanche_est_empty():
    assert qualify_text_column(pd.Series([None, np.nan, "", "   "])) == "empty"


def test_nombres_stockes_en_string_sont_numeric():
    # Cas govcan_habit_2024 : PA_DAYS, SOCCON_MH_CONDITION…
    assert qualify_text_column(pd.Series(["6", "0", "1", "60"])) == "numeric"
    assert qualify_text_column(pd.Series(["1,5", "2.5"])) == "numeric"


def test_une_seule_valeur_non_numerique_suffit_a_ecarter_numeric():
    # Seuil STRICT : garantit que le retypage du Parquet est sans perte.
    assert qualify_text_column(pd.Series(["6", "0", "refus"])) == "short"


def test_reponses_dun_mot_sont_short():
    # Cas cecd_elxn_qc_2007.lmat_ouv / cecd_sante_can_usa.LANG.
    assert qualify_text_column(pd.Series(["italien", "ESPAGNOL", "anglais"])) == "short"


def test_reponses_en_phrases_sont_prose():
    assert (
        qualify_text_column(
            pd.Series(
                [
                    "Parce que je ne fais pas confiance aux partis",
                    "Le chef me semble honnête",
                    "santé",
                ]
            )
        )
        == "prose"
    )


def test_seuil_de_prose_a_30_pourcent():
    # 3 réponses de ≥ 3 mots sur 10 = 0.30 exactement → prose (seuil inclusif).
    values = ["un deux trois"] * 3 + ["mot"] * 7
    assert qualify_text_column(pd.Series(values)) == "prose"
    values = ["un deux trois"] * 2 + ["mot"] * 8
    assert qualify_text_column(pd.Series(values)) == "short"


def test_effective_var_type_ne_touche_que_les_open():
    series = pd.Series(["1", "2"])
    assert effective_var_type("single", series) == ("single", None)
    assert effective_var_type(None, series) == (None, None)


def test_effective_var_type_requalifie_le_numerique_deguise():
    assert effective_var_type("open", pd.Series(["6", "0"])) == ("continuous", "numeric")
    assert effective_var_type("open", pd.Series(["italien"])) == ("open", "short")


def test_is_verbatim_exige_open_et_prose():
    assert is_verbatim("open", "prose")
    assert not is_verbatim("open", "short")
    assert not is_verbatim("open", "empty")
    assert not is_verbatim("continuous", "numeric")
    assert not is_verbatim("single", None)


def test_is_text_column_couvre_les_dtypes_chaine_de_pandas_2():
    # pyreadstat expose ses colonnes chaîne en dtype `str` sous pandas ≥ 2 :
    # le test historique `dtype == object` les manquait silencieusement.
    assert is_text_column(pd.Series(["a", "b"], dtype="str"))
    assert is_text_column(pd.Series(["a", "b"], dtype=object))
    assert not is_text_column(pd.Series([1.0, 2.0]))
