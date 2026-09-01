const buscador = document.getElementById('buscador');
const contenedorResultados = document.getElementById('resultados');

let timeoutId;

buscador.addEventListener('input', (e) => {
    clearTimeout(timeoutId);
    const query = e.target.value.trim();
    
    if (query.length < 2) {
        contenedorResultados.innerHTML = '';
        return;
    }

    timeoutId = setTimeout(() => {
        fetch(`/api/buscar?q=${encodeURIComponent(query)}`)
            .then(res => res.json())
            .then(data => mostrarResultados(data.resultados))
            .catch(err => console.error(err));
    }, 300);
});

function formatearDinero(valor) {
    if (!valor) return "0 M";
    return (valor / 1000000).toFixed(1) + " M";
}

function mostrarResultados(jugadores) {
    contenedorResultados.innerHTML = '';
    
    if (jugadores.length === 0) {
        contenedorResultados.innerHTML = '<p style="color: var(--text-muted)">No se encontraron jugadores.</p>';
        return;
    }

    jugadores.forEach((jugador, index) => {
        const nombre = jugador.nickname || jugador.name;
        const equipo = jugador.teamName || 'Sin Equipo';
        const precio = formatearDinero(jugador.marketValue);
        const puntos = jugador.points || 0;

        const card = document.createElement('div');
        card.className = 'card';
        card.style.animationDelay = `${index * 0.1}s`;
        
        card.innerHTML = `
            <div class="card-title">${nombre}</div>
            <div class="card-team">${equipo}</div>
            <div class="stats">
                <div>
                    <div style="font-size: 0.8rem; color: #a0a0a0">Precio</div>
                    <div class="stat-value">${precio}</div>
                </div>
                <div style="text-align: right">
                    <div style="font-size: 0.8rem; color: #a0a0a0">Puntos</div>
                    <div class="stat-value" style="color: #fff">${puntos}</div>
                </div>
            </div>
        `;
        
        contenedorResultados.appendChild(card);
    });
}
