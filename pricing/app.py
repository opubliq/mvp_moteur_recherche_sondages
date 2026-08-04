import streamlit as st

st.set_page_config(page_title="Pricing Opubliq", layout="wide")


def ingestion_revenue(Q, prix, plancher):
    return max(plancher, Q * prix)


def cad(x):
    return f"{round(x):,.0f} $".replace(",", " ")


with st.sidebar:
    st.header("Profil du client")
    Q = st.number_input("Questions à ingérer", min_value=0, value=800, step=50)
    Ragent = st.number_input("Requêtes agent / mois", min_value=0, value=100, step=10)
    Nannot = st.number_input("Réponses annotées / an", min_value=0, value=5000, step=500)

    st.header("Pricing")
    abo = st.number_input("Abonnement annuel $", min_value=0, value=12000, step=500)
    prix = st.number_input("Tarif ingestion $/question", min_value=0.0, value=4.0, step=0.25)
    plancher = st.number_input("Plancher ingestion $", min_value=0, value=1500, step=100)

    st.header("Coûts unitaires")
    cIng = st.number_input("Coût pipeline $/question", min_value=0.0, value=0.5, step=0.05)
    cIdx = st.number_input("Coût index $/question/mois", min_value=0.0, value=0.02, step=0.005, format="%.3f")
    cReq = st.number_input("Coût LLM $/requête agent", min_value=0.0, value=0.8, step=0.05)
    cAnnot = st.number_input("Coût $/réponse annotée", min_value=0.0, value=0.02, step=0.005, format="%.3f")
    taux = st.number_input("Taux horaire interne $/h", min_value=0.0, value=60.0, step=5.0)
    hOnb = st.number_input("Heures onboarding (one-time)", min_value=0.0, value=15.0, step=1.0)

I = ingestion_revenue(Q, prix, plancher)
R = I + abo

c_onb = hOnb * taux
c_pipe = cIng * Q
c_idx = cIdx * Q * 12
c_agent = cReq * Ragent * 12
c_annot = cAnnot * Nannot
C = c_onb + c_pipe + c_idx + c_agent + c_annot

P = R - C
marge = P / R if R > 0 else None

st.title("Calculateur de pricing — Opubliq")

m1, m2, m3, m4 = st.columns(4)
m1.metric("Revenus totaux", cad(R))
m2.metric("Coûts totaux", cad(C))
m3.metric("Profit", cad(P), delta=("déficit" if P < 0 else "positif"),
          delta_color=("inverse" if P < 0 else "normal"))
m4.metric("Marge", "—" if marge is None else f"{marge * 100:.1f} %")

st.divider()

col_r, col_c = st.columns(2)

with col_r:
    st.subheader("Revenus")
    plancher_actif = Q * prix < plancher
    st.write(f"Ingestion (one-shot) — **{cad(I)}**"
             + (" *(plancher appliqué)*" if plancher_actif else f" *({Q} × {prix:g} $)*"))
    st.write(f"Abonnement annuel — **{cad(abo)}**")
    st.caption(f"Total : {cad(R)}")

with col_c:
    st.subheader("Coûts")
    st.write(f"Onboarding ({hOnb:g} h) — **{cad(c_onb)}**")
    st.write(f"Pipeline ingestion — **{cad(c_pipe)}**")
    st.write(f"Index Azure (12 mois) — **{cad(c_idx)}**")
    st.write(f"Agent LLM (12 mois) — **{cad(c_agent)}**")
    st.write(f"Annotation — **{cad(c_annot)}**")
    st.caption(f"Total : {cad(C)}")
