// ==========================================
// VARIABLES DE ESTADO Y ELEMENTOS DOM
// ==========================================
const tabBtns = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');

// Elementos de Mercado
const buscadorMercado = document.getElementById('buscador');
const contenedorResultados = document.getElementById('resultados');

// Elementos de Presupuesto
const displayPresupuesto = document.getElementById('display-presupuesto');
const btnEditarPresupuesto = document.getElementById('btn-editar-presupuesto');
const formPresupuesto = document.getElementById('form-presupuesto');
const inputPresupuesto = document.getElementById('input-presupuesto');
const btnGuardarPresupuesto = document.getElementById('btn-guardar-presupuesto');
const btnCancelarPresupuesto = document.getElementById('btn-cancelar-presupuesto');

// Elementos de Métricas Plantilla
const displayValorPlantilla = document.getElementById('display-valor-plantilla');
const displayNumJugadores = document.getElementById('display-num-jugadores');
const displayBeneficioTotal = document.getElementById('display-beneficio-total');
const displayRentabilidadTotal = document.getElementById('display-rentabilidad-total');
const displayPatrimonioTotal = document.getElementById('display-patrimonio-total');
const contadorPlantilla = document.getElementById('contador-plantilla');
const tablaPlantillaBody = document.getElementById('tabla-plantilla-body');

// Formulario Fichar
const formFichar = document.getElementById('form-fichar');
const inputFicharNombre = document.getElementById('fichar-nombre');
const inputFicharId = document.getElementById('fichar-id');
const inputFicharPrecio = document.getElementById('fichar-precio');
const dropdownSugerencias = document.getElementById('fichar-sugerencias');

// Toast
const toast = document.getElementById('toast');

let equipoData = {
    presupuesto: 0,
    jugadores: []
};

let searchTimeout;
let autocompleteTimeout;

// ==========================================
// INICIALIZACIÓN
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    inicializarTabs();
    inicializarBuscadorMercado();
    inicializarPresupuesto();
    inicializarFormFichar();
    cargarEquipo();
});

// ==========================================
// SISTEMA DE PESTAÑAS (TABS)
// ==========================================
function inicializarTabs() {
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetTab = btn.getAttribute('data-tab');

            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));

            btn.classList.add('active');
            const targetContent = document.getElementById(`tab-${targetTab}`);
            if (targetContent) {
                targetContent.classList.add('active');
            }

            if (targetTab === 'plantilla') {
                cargarEquipo();
            }
        });
    });
}

// ==========================================
// FORMATEO DE VALORES
// ==========================================
function formatearDinero(valor) {
    if (valor === undefined || valor === null || isNaN(valor)) return "0 €";
    if (Math.abs(valor) >= 1000000) {
        return (valor / 1000000).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " M €";
    } else if (Math.abs(valor) >= 1000) {
        return (valor / 1000).toLocaleString('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 1 }) + " K €";
    }
    return Math.round(valor).toLocaleString('es-ES') + " €";
}

function formatearBeneficio(beneficio, precioCompra) {
    const signo = beneficio > 0 ? "+" : "";
    const textoDinero = signo + formatearDinero(beneficio);
    let textoPorcentaje = "";
    
    if (precioCompra && precioCompra > 0) {
        const porcentaje = (beneficio / precioCompra) * 100;
        textoPorcentaje = ` (${signo}${porcentaje.toFixed(1)}%)`;
    }

    const claseColor = beneficio > 0 ? 'text-green' : (beneficio < 0 ? 'text-red' : 'text-muted');
    return `<span class="${claseColor}">${textoDinero}${textoPorcentaje}</span>`;
}

function mostrarToast(mensaje, tipo = 'info') {
    toast.textContent = mensaje;
    toast.className = 'toast';
    if (tipo === 'error') {
        toast.style.borderLeftColor = 'var(--red)';
    } else {
        toast.style.borderLeftColor = 'var(--primary)';
    }
    
    setTimeout(() => {
        toast.classList.add('hidden');
    }, 3000);
}

// ==========================================
// GESTIÓN DE EQUIPO Y PLANTILLA (API)
// ==========================================
async function cargarEquipo() {
    try {
        const res = await fetch('/api/equipo');
        if (!res.ok) throw new Error("Error al obtener equipo");
        equipoData = await res.json();
        renderizarPlantilla();
    } catch (err) {
        console.error(err);
        mostrarToast("No se pudo cargar la plantilla", "error");
    }
}

function renderizarPlantilla() {
    const presupuesto = equipoData.presupuesto || 0;
    const jugadores = equipoData.jugadores || [];

    // Actualizar Presupuesto
    displayPresupuesto.textContent = formatearDinero(presupuesto);
    inputPresupuesto.value = presupuesto;

    // Calcular Métricas
    let valorTotalPlantilla = 0;
    let costeTotalPlantilla = 0;

    jugadores.forEach(j => {
        valorTotalPlantilla += Number(j.valor_actual || 0);
        costeTotalPlantilla += Number(j.precio_compra || 0);
    });

    const beneficioTotal = valorTotalPlantilla - costeTotalPlantilla;
    const patrimonioTotal = presupuesto + valorTotalPlantilla;
    const rentabilidad = costeTotalPlantilla > 0 ? (beneficioTotal / costeTotalPlantilla) * 100 : 0;

    // Pintar Métricas
    displayValorPlantilla.textContent = formatearDinero(valorTotalPlantilla);
    displayNumJugadores.textContent = `${jugadores.length} ${jugadores.length === 1 ? 'jugador' : 'jugadores'}`;
    
    displayBeneficioTotal.innerHTML = formatearBeneficio(beneficioTotal, costeTotalPlantilla);
    displayRentabilidadTotal.textContent = `${beneficioTotal >= 0 ? '+' : ''}${rentabilidad.toFixed(1)}% rentabilidad`;
    displayRentabilidadTotal.className = `metric-sub ${beneficioTotal >= 0 ? 'text-green' : 'text-red'}`;

    displayPatrimonioTotal.textContent = formatearDinero(patrimonioTotal);
    contadorPlantilla.textContent = `${jugadores.length} Jugadores`;

    // Pintar Tabla
    tablaPlantillaBody.innerHTML = '';

    if (jugadores.length === 0) {
        tablaPlantillaBody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center text-muted py-4">
                    Tu plantilla está vacía. Busca y añade jugadores con el formulario superior.
                </td>
            </tr>
        `;
        return;
    }

    jugadores.forEach(j => {
        const beneficio = Number(j.valor_actual || 0) - Number(j.precio_compra || 0);
        const tr = document.createElement('tr');

        tr.innerHTML = `
            <td>
                <div class="player-name-cell">${j.nombre}</div>
                ${j.posicion ? `<span class="badge" style="font-size: 0.7rem; padding: 0.1rem 0.4rem;">${j.posicion}</span>` : ''}
            </td>
            <td><span class="team-badge">${j.equipo || 'Sin equipo'}</span></td>
            <td class="text-right">${formatearDinero(j.precio_compra)}</td>
            <td class="text-right" style="font-weight: 600;">${formatearDinero(j.valor_actual)}</td>
            <td class="text-right">${formatearBeneficio(beneficio, j.precio_compra)}</td>
            <td class="text-center"><strong style="color: #fff">${j.puntos ?? 0}</strong></td>
            <td class="text-center">
                <button class="btn-delete" onclick="eliminarJugadorPlantilla('${j.id}')" title="Vender/Eliminar de plantilla">
                    🗑️ Vender
                </button>
            </td>
        `;

        tablaPlantillaBody.appendChild(tr);
    });
}

// ==========================================
// ACTUALIZAR PRESUPUESTO
// ==========================================
function inicializarPresupuesto() {
    btnEditarPresupuesto.addEventListener('click', () => {
        displayPresupuesto.classList.add('hidden');
        btnEditarPresupuesto.classList.add('hidden');
        formPresupuesto.classList.remove('hidden');
        inputPresupuesto.focus();
    });

    btnCancelarPresupuesto.addEventListener('click', () => {
        formPresupuesto.classList.add('hidden');
        displayPresupuesto.classList.remove('hidden');
        btnEditarPresupuesto.classList.remove('hidden');
    });

    btnGuardarPresupuesto.addEventListener('click', async () => {
        const nuevoPresupuesto = parseFloat(inputPresupuesto.value);
        if (isNaN(nuevoPresupuesto)) {
            mostrarToast("Introduce un presupuesto válido", "error");
            return;
        }

        try {
            const res = await fetch('/api/equipo/presupuesto', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ presupuesto: nuevoPresupuesto })
            });

            if (res.ok) {
                equipoData.presupuesto = nuevoPresupuesto;
                formPresupuesto.classList.add('hidden');
                displayPresupuesto.classList.remove('hidden');
                btnEditarPresupuesto.classList.remove('hidden');
                renderizarPlantilla();
                mostrarToast("Presupuesto actualizado con éxito");
            }
        } catch (err) {
            console.error(err);
            mostrarToast("Error al guardar presupuesto", "error");
        }
    });
}

// ==========================================
// FORMULARIO FICHAR (AUTOCOMPLETE & SUBMIT)
// ==========================================
function inicializarFormFichar() {
    inputFicharNombre.addEventListener('input', (e) => {
        clearTimeout(autocompleteTimeout);
        const query = e.target.value.trim();

        if (query.length < 2) {
            dropdownSugerencias.innerHTML = '';
            dropdownSugerencias.classList.add('hidden');
            return;
        }

        autocompleteTimeout = setTimeout(async () => {
            try {
                const res = await fetch(`/api/buscar?q=${encodeURIComponent(query)}`);
                const data = await res.json();
                mostrarSugerenciasFichar(data.resultados || []);
            } catch (err) {
                console.error(err);
            }
        }, 250);
    });

    // Cerrar sugerencias al hacer clic fuera
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.autocomplete-wrapper')) {
            dropdownSugerencias.classList.add('hidden');
        }
    });

    formFichar.addEventListener('submit', async (e) => {
        e.preventDefault();

        const nombre = inputFicharNombre.value.trim();
        const id = inputFicharId.value.trim() || nombre.toLowerCase().replace(/\s+/g, '-');
        const precioCompra = parseFloat(inputFicharPrecio.value);

        if (!nombre || isNaN(precioCompra)) {
            mostrarToast("Completa los campos requeridos", "error");
            return;
        }

        try {
            const res = await fetch('/api/equipo/jugador', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: id,
                    nombre: nombre,
                    precio_compra: precioCompra
                })
            });

            if (res.ok) {
                mostrarToast(`¡${nombre} añadido a tu plantilla!`);
                formFichar.reset();
                inputFicharId.value = '';
                dropdownSugerencias.classList.add('hidden');
                cargarEquipo();
            } else {
                mostrarToast("No se pudo añadir el jugador", "error");
            }
        } catch (err) {
            console.error(err);
            mostrarToast("Error en la solicitud", "error");
        }
    });
}

function mostrarSugerenciasFichar(jugadores) {
    dropdownSugerencias.innerHTML = '';

    if (jugadores.length === 0) {
        dropdownSugerencias.innerHTML = '<div class="suggestion-item text-muted">Sin coincidencias</div>';
        dropdownSugerencias.classList.remove('hidden');
        return;
    }

    jugadores.forEach(j => {
        const nombre = j.nickname || j.name;
        const equipo = j.teamName || 'Sin Equipo';
        const precio = j.marketValue || 0;

        const item = document.createElement('div');
        item.className = 'suggestion-item';
        item.innerHTML = `
            <div>
                <div class="suggestion-name">${nombre}</div>
                <div class="suggestion-team">${equipo}</div>
            </div>
            <div class="suggestion-price">${formatearDinero(precio)}</div>
        `;

        item.addEventListener('click', () => {
            inputFicharNombre.value = nombre;
            inputFicharId.value = j.id || nombre;
            inputFicharPrecio.value = precio;
            dropdownSugerencias.classList.add('hidden');
            inputFicharPrecio.focus();
        });

        dropdownSugerencias.appendChild(item);
    });

    dropdownSugerencias.classList.remove('hidden');
}

// ==========================================
// ELIMINAR / VENDER JUGADOR
// ==========================================
async function eliminarJugadorPlantilla(jugadorId) {
    if (!confirm("¿Deseas eliminar este jugador de tu plantilla?")) return;

    try {
        const res = await fetch(`/api/equipo/jugador/${encodeURIComponent(jugadorId)}`, {
            method: 'DELETE'
        });

        if (res.ok) {
            mostrarToast("Jugador eliminado de la plantilla");
            cargarEquipo();
        } else {
            mostrarToast("Error al eliminar jugador", "error");
        }
    } catch (err) {
        console.error(err);
        mostrarToast("Error de conexión", "error");
    }
}

// ==========================================
// BUSCADOR MERCADO
// ==========================================
function inicializarBuscadorMercado() {
    buscadorMercado.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        const query = e.target.value.trim();

        if (query.length < 2) {
            contenedorResultados.innerHTML = '';
            return;
        }

        searchTimeout = setTimeout(async () => {
            try {
                const res = await fetch(`/api/buscar?q=${encodeURIComponent(query)}`);
                const data = await res.json();
                mostrarResultadosMercado(data.resultados || []);
            } catch (err) {
                console.error(err);
            }
        }, 300);
    });
}

function mostrarResultadosMercado(jugadores) {
    contenedorResultados.innerHTML = '';

    if (jugadores.length === 0) {
        contenedorResultados.innerHTML = '<p style="color: var(--text-muted); grid-column: 1/-1; text-align: center;">No se encontraron jugadores en el mercado.</p>';
        return;
    }

    jugadores.forEach((jugador, index) => {
        const nombre = jugador.nickname || jugador.name;
        const equipo = jugador.teamName || 'Sin Equipo';
        const precio = jugador.marketValue || 0;
        const puntos = jugador.points || 0;
        const id = jugador.id || nombre;

        const card = document.createElement('div');
        card.className = 'card player-card';
        card.style.animationDelay = `${index * 0.05}s`;

        card.innerHTML = `
            <div>
                <div class="card-title">${nombre}</div>
                <div class="card-team">${equipo}</div>
                <div class="stats">
                    <div>
                        <div style="font-size: 0.8rem; color: var(--text-muted)">Precio Mercado</div>
                        <div class="stat-value">${formatearDinero(precio)}</div>
                    </div>
                    <div style="text-align: right">
                        <div style="font-size: 0.8rem; color: var(--text-muted)">Puntos</div>
                        <div class="stat-value" style="color: #fff">${puntos}</div>
                    </div>
                </div>
            </div>
            <button class="btn-card-action" onclick="ficharDirectoDesdeMercado('${id}', '${nombre.replace(/'/g, "\\'")}', ${precio})">
                + Fichar para Mi Plantilla
            </button>
        `;

        contenedorResultados.appendChild(card);
    });
}

function ficharDirectoDesdeMercado(id, nombre, precio) {
    // Cambiar a pestaña plantilla y pre-rellenar formulario
    const btnPlantilla = document.getElementById('tab-btn-plantilla');
    if (btnPlantilla) btnPlantilla.click();

    inputFicharNombre.value = nombre;
    inputFicharId.value = id;
    inputFicharPrecio.value = precio;
    inputFicharPrecio.focus();

    mostrarToast(`Listo para fichar a ${nombre}`);
}
