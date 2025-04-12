import streamlit as st
import numpy as np
import sqlite3
import sys

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

query = st.text_input("Entrez un mot-clé ou une phrase :", "")

if "rerun" not in st.session_state:
    st.session_state["rerun"] = False

if st.button("🔄 Rafraîchir les exemples", key="refresh_button"):
    st.session_state["rerun"] = True

if query:
    try:
        with st.spinner("Recherche en cours..."):
            corpus_info, corpus_texts = cached_corpus()
            df_results = semantic_search(query, corpus_texts, corpus_info)

            if df_results.empty:
                st.warning("Aucun résultat trouvé pour cette requête.")
            elif "similarity_score" not in df_results.columns:
                st.error("Les résultats ne contiennent pas de score de similarité.")
                st.write("Colonnes disponibles:", df_results.columns.tolist())
                st.write("Aperçu des résultats:", df_results.head())
            else:
                #st.info(f"Résultats trouvés: {len(df_results)}")
                #st.write(f"Résultats pour : **{query}**")

                # Ajouter les labels dans le DataFrame
                df_labeled = fetch_variable_labels(df_results)

                # Tableau avec tous les résultats
                st.subheader("Top résultats")
                st.dataframe(
                    df_labeled[["variable_label", "similarity_score"]]
                    .sort_values(by="similarity_score", ascending=False)
                    .reset_index(drop=True),
                    use_container_width=True
                )

                # Top 3 pour visualisation
                top3_df = df_labeled.sort_values(by="similarity_score", ascending=False).head(3)

                if not top3_df.empty:
                    st.markdown("### Visualisations")
                    try:
                        plot_variables_from_results(top3_df)
                    except Exception as e:
                        st.error(f"Erreur lors de la visualisation: {str(e)}")

    except Exception as e:
        st.error(f"Une erreur est survenue: {str(e)}")
