import streamlit as st
import numpy as np
import sqlite3
import sys
import pandas as pd

sys.path.append("matching")
sys.path.append("viz")

from matching.semantic_search import load_corpus, semantic_search
from viz.functions import plot_variables_from_results

st.set_page_config(layout="wide")
st.title("Explorateur de variables de sondage")

@st.cache_data
def cached_corpus():
    return load_corpus()

# Aller chercher les labels depuis la base
def fetch_variable_labels(df, db_path="surveys_bd.sqlite"):
    conn = sqlite3.connect(db_path)
    label_map = {}
    for _, row in df.iterrows():
        sid, vid = row["survey_id"], row["variable_id"]
        query = """
            SELECT label FROM codebook_variables
            WHERE survey_id = ? AND variable_id = ?
            LIMIT 1
        """
        res = conn.execute(query, (sid, vid)).fetchone()
        if res:
            label_map[(sid, vid)] = res[0]
    conn.close()
    return df.assign(variable_label=df.apply(lambda r: label_map.get((r["survey_id"], r["variable_id"]), ""), axis=1))

# Sidebar: Recherche
with st.sidebar:
    st.header("🔍 Recherche")
    query = st.text_input("Mot-clé ou phrase :", "")
    st.markdown("---")

if "rerun" not in st.session_state:
    st.session_state["rerun"] = False

if st.sidebar.button("🔄 Rafraîchir les exemples", key="refresh_button"):
    st.session_state["rerun"] = True

if query:
    try:
        with st.spinner("Recherche sémantique en cours..."):
            corpus_info, corpus_texts = cached_corpus()
            df_results = semantic_search(query, corpus_texts, corpus_info)

            if df_results.empty:
                st.warning("Aucun résultat trouvé pour cette requête.")
            elif "similarity_score" not in df_results.columns:
                st.error("Les résultats ne contiennent pas de score de similarité.")
                st.write("Colonnes disponibles:", df_results.columns.tolist())
                st.write("Aperçu des résultats:", df_results.head())
            else:
                # Ajouter les labels dans le DataFrame
                df_labeled = fetch_variable_labels(df_results)
                df_labeled = df_labeled.sort_values(by="similarity_score", ascending=False).reset_index(drop=True)
                df_labeled["🔘 Sélection"] = False
                df_labeled.loc[:2, "🔘 Sélection"] = True  # coche les 3 premières par défaut


                # TABLE DANS LA SIDEBAR
                with st.sidebar:
                    st.subheader("📋 Résultats")
                    edited_df = st.data_editor(
                        df_labeled[["🔘 Sélection", "variable_label", "similarity_score"]],
                        use_container_width=True,
                        num_rows="fixed",
                        hide_index=True,
                        key="results_editor"
                    )

                # Extraire les lignes sélectionnées
                selected_rows = df_labeled[edited_df["🔘 Sélection"] == True]

                if len(selected_rows) > 3:
                    st.warning("Veuillez sélectionner **maximum 3 variables**.")
                elif not selected_rows.empty:
                    st.markdown("### Visualisations sélectionnées")

                    # Organisation : 1 rangée de 3 graphiques
                    selected_rows = selected_rows.head(3)
                    cols = st.columns(len(selected_rows))

                    for i, (_, r) in enumerate(selected_rows.iterrows()):
                        sub_df = pd.DataFrame([r[["survey_id", "variable_id"]]])
                        with cols[i]:
                            plot_variables_from_results(sub_df)

    except Exception as e:
        st.error(f"Une erreur est survenue: {str(e)}")
