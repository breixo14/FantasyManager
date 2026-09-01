import streamlit as st

# Título de la app
st.title("⚽ LALIGA Fantasy Manager")

# Buscador moderno
busqueda = st.text_input("🔍 Buscar jugador (ej: Hugo Duro)")

if busqueda:
    # Aquí usaríamos la función que ya hemos creado
    st.subheader("Hugo Duro (Valencia CF)")
    
    # Dividimos la pantalla en 3 columnas para que quede bonito
    col1, col2, col3 = st.columns(3)
    
    with col1:
        st.metric(label="💰 Precio", value="40.5 M", delta="1.2 M") # delta pone la flecha verde de subida
    with col2:
        st.metric(label="⭐ Puntos", value="85", delta="8") # Puntos última jornada
    with col3:
        st.metric(label="📊 Media", value="6.5")

    # Gráfica de evolución
    st.line_chart(datos_de_precio_historico)
    