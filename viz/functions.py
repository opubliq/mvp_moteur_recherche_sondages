import sqlite3
import pandas as pd
import matplotlib.pyplot as plt
import streamlit as st

def plot_variables_from_results(df_matches, db_path="surveys_bd.sqlite"):
    if df_matches.empty:
        st.warning("Aucun résultat à afficher.")
        return
        
    conn = sqlite3.connect(db_path)
    cols = st.columns(len(df_matches))

    for i, (_, row) in enumerate(df_matches.iterrows()):
        survey_id = row["survey_id"]
        variable = row["variable_id"]
        table_name = f"survey_{str(survey_id).lower()}"

        # Requête SQL sécurisée
        query = f'SELECT "{variable}" FROM {table_name} WHERE "{variable}" IS NOT NULL'

        try:
            df = pd.read_sql_query(query, conn)
        except Exception as e:
            cols[i].error(f"{survey_id}.{variable} : {e}")
            continue

        # Label de la variable
        label_query = """
            SELECT DISTINCT label
            FROM codebook_variables
            WHERE survey_id = ? AND variable_id = ?
            LIMIT 1;
        """
        label_result = conn.execute(label_query, (survey_id, variable)).fetchone()
        variable_label = label_result[0] if label_result else variable

        # Labels de valeur
        value_labels_query = """
            SELECT value, value_label
            FROM codebook_values
            WHERE survey_id = ? AND variable_id = ?
        """
        value_label_map = {
            str(k): v
            for k, v in conn.execute(value_labels_query, (survey_id, variable)).fetchall()
        }

        counts = df[variable].value_counts().sort_index()
        counts.index = counts.index.astype(str)

        def normalize_key(x):
            try:
                val = float(x)
                return str(int(val)) if val.is_integer() else str(val).rstrip('0').rstrip('.')
            except:
                return str(x)

        labeled_counts = counts.rename(index=lambda x: value_label_map.get(normalize_key(x), x))

        # Tracé du graphique
        fig, ax = plt.subplots(figsize=(6, 6))
        labeled_counts = labeled_counts.sort_values(ascending=False)
        labeled_counts.plot(kind="bar", ax=ax)
        ax.set_title(f"{variable_label}", fontsize=10)
        ax.set_xlabel("")
        ax.set_ylabel("")
        ax.tick_params(axis='x', rotation=45)
        ax.bar_label(ax.containers[0], fmt='%d')
        fig.tight_layout()

        with cols[i]:
            st.markdown(
                "<div style='max-height:300px; overflow:hidden;'>", 
                unsafe_allow_html=True
            )
            st.pyplot(fig)
            st.markdown("</div>", unsafe_allow_html=True)


    conn.close()
