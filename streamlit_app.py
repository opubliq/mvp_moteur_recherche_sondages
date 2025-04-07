import streamlit as st
import numpy as np
from matching.semantic_search import load_model, load_corpus, semantic_search
from viz.functions import plot_variables_from_results

st.set_page_config(layout="wide")

# --- Caching pour performance ---
@st.cache_resource
def cached_model():
    return load_model()

@st.cache_data
def cached_corpus():
    return load_corpus()

# --- Tirage pondéré aléatoire ---
def sample_top_results(df, n=3, exponent=5):
    scores = df["similarity_score"].to_numpy()
    weights = np.exp(scores * exponent)
    weights /= weights.sum()
    sampled_indices = np.random.choice(df.index, size=min(n, len(df)), replace=False, p=weights)
    return df.loc[sampled_indices]

# --- Interface ---
st.title("Explorateur de variables de sondage")
query = st.text_input("Entrez un mot-clé ou une phrase :", "")

# Rerun déclenché par bouton
if "rerun" not in st.session_state:
    st.session_state["rerun"] = False

if st.button("🔄 Rafraîchir les exemples", key="refresh_button"):
    st.session_state["rerun"] = True

if query:
    model = cached_model()
    corpus_info, corpus_texts = cached_corpus()
    df_results = semantic_search(query, model, corpus_texts, corpus_info)

    st.write(f"Résultats pour : **{query}**")

    #if st.button("🔄 Rafraîchir les exemples"):
    #    st.session_state["rerun"] = True

    sampled_df = sample_top_results(df_results, n=3, exponent=30)
    #st.dataframe(sampled_df.reset_index(drop=True))

    st.markdown("### Visualisations")
    plot_variables_from_results(sampled_df)

