// ==========================================
// ESTADO GLOBAL Y ELEMENTOS DOM
// ==========================================
const tabBtns = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');

// Botones de Sincronización Directa (1 Clic)
const btnSyncDirecto = document.getElementById('btn-sync-directo');
const btnSyncEquipoActivo = document.getElementById('btn-sync-equipo-activo');

// Selector de Equipos
const selectorEquipo = document.getElementById('selector-equipo');
const btnAbrirModalEquipo = document.getElementById('btn-abrir-modal-equipo');
const btnEliminarEquipo = document.getElementById('btn-eliminar-equipo');
const tituloPlantillaActual = document.getElementById('titulo-plantilla-actual');

// Modal Crear / Importar Equipo
const modalCrearEquipo = document.getElementById('modal-crear-equipo');
const modalOverlay = modalCrearEquipo.querySelector('.modal-overlay');
const modalCloseBtn = document.getElementById('modal-close-btn');
const btnsModalCancel = document.querySelectorAll('.btn-modal-cancel');

// Sub-pestañas Modal
const subtabBtns = document.querySelectorAll('.subtab-btn');
const subtabPaneles = document.querySelectorAll('.subtab-panel');

// Formulario Manual
const formCrearEquipo = document.getElementById('form-crear-equipo');
const inputNuevoEquipoNombre = document.getElementById('nuevo-equipo-nombre');
const inputNuevoEquipoPresupuesto = document.getElementById('nuevo-equipo-presupuesto');
const inputBuscarJugadorInicial = document.getElementById('buscar-jugador-inicial');
const sugerenciasJugadorInicial = document.getElementById('sugerencias-jugador-inicial');
const listaJugadoresIniciales = document.getElementById('lista-jugadores-iniciales');
const contadorIniciales = document.getElementById('contador-iniciales');

// Formulario Importar LaLiga
const formImportarEquipo = document.getElementById('form-importar-equipo');
const inputImportToken = document.getElementById('import-token');
const inputImportLeagueId = document.getElementById('import-league-id');
const inputImportManagerId = document.getElementById('import-manager-id');
const inputImportNombre = document.getElementById('import-nombre');
const btnSincronizarEquipo = document.getElementById('btn-sincronizar-equipo');

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

// Formulario Fichar Plantilla
const formFichar = document.getElementById('form-fichar');
const inputFicharNombre = document.getElementById('fichar-nombre');
const inputFicharId = document.getElementById('fichar-id');
const inputFicharPrecio = document.getElementById('fichar-precio');
const dropdownSugerencias = document.getElementById('fichar-sugerencias');

// Toast
const toast = document.getElementById('toast');

// Variables de estado
let equiposList = [];
let equipoActivoId = null;
let equipoActivoData = null;
let jugadoresInicialesTemp = [];

let searchTimeout;
let autocompleteTimeout;
let modalAutocompleteTimeout;

// ==========================================
// INICIALIZACIÓN
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    inicializarTabs();
    inicializarBuscadorMercado();
    inicializarPresupuesto();
    inicializarFormFichar();
    inicializarModalCrearEquipo();
    inicializarSelectorEquipos();
    inicializarSyncDirecto();
    cargarListaEquipos();
});

// ==========================================
// SISTEMA DE PESTAÑAS (TABS PRINCIPALES)
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

            if (targetTab === 'plantilla' && equipoActivoId) {
                cargarDatosEquipo(equipoActivoId);
            }
        });
    });
}

// ==========================================
// FORMATEO DE VALORES Y UTILS
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
    }, 3500);
}

// ==========================================
// SINCRONIZACIÓN EN 1 CLIC (BOTÓN DIRECTO)
// ==========================================
function inicializarSyncDirecto() {
    const triggers = [btnSyncDirecto, btnSyncEquipoActivo];
    triggers.forEach(btn => {
        if (!btn) return;
        btn.addEventListener('click', () => {
            ejecutarSincronizacionDirecta(btn);
        });
    });
}

async function ejecutarSincronizacionDirecta(botonActivador) {
    const icono = botonActivador.querySelector('.sync-icon');
    if (icono) icono.classList.add('rotating');
    botonActivador.disabled = true;

    try {
        // Verificar primero si tenemos credenciales
        const resConfig = await fetch('/api/config');
        const configData = await resConfig.json();

        // Si no hay credenciales guardadas y no hay equipo seleccionado, abrir modal
        if (!configData.tiene_credenciales && (!equipoActivoData || !equipoActivoData.es_sincronizable)) {
            mostrarToast("Introduce tus credenciales de LaLiga una sola vez para sincronizar en 1 clic", "info");
            abrirModalCrearEquipo();
            return;
        }

        mostrarToast("Sincronizando plantilla en tiempo real...", "info");

        const url = equipoActivoId ? `/api/sincronizar?equipo_id=${encodeURIComponent(equipoActivoId)}` : '/api/sincronizar';
        const res = await fetch(url, { method: 'POST' });
        const data = await res.json();

        if (res.ok) {
            mostrarToast(data.mensaje || "¡Plantilla sincronizada con éxito!");
            await cargarListaEquipos(data.equipo.id);
            // Cambiar a la pestaña de plantilla automáticamente
            const tabPlantillaBtn = document.getElementById('tab-btn-plantilla');
            if (tabPlantillaBtn) tabPlantillaBtn.click();
        } else {
            mostrarToast(data.detail || "Error al sincronizar", "error");
            if (data.detail && data.detail.includes("credenciales")) {
                abrirModalCrearEquipo();
            }
        }
    } catch (err) {
        console.error(err);
        mostrarToast("Error de conexión al sincronizar", "error");
    } finally {
        if (icono) icono.classList.remove('rotating');
        botonActivador.disabled = false;
    }
}

// ==========================================
// GESTIÓN DE EQUIPOS (MULTI-EQUIPO)
// ==========================================
function inicializarSelectorEquipos() {
    selectorEquipo.addEventListener('change', (e) => {
        const idSeleccionado = e.target.value;
        if (idSeleccionado) {
            equipoActivoId = idSeleccionado;
            localStorage.setItem('fantasy_equipo_activo', idSeleccionado);
            cargarDatosEquipo(idSeleccionado);
        }
    });

    btnEliminarEquipo.addEventListener('click', async () => {
        if (!equipoActivoId) return;
        const nombreEquipo = equipoActivoData ? equipoActivoData.nombre : "este equipo";
        
        if (!confirm(`¿Estás seguro de que quieres eliminar el equipo "${nombreEquipo}"? Esta acción no se puede deshacer.`)) {
            return;
        }

        try {
            const res = await fetch(`/api/equipos/${encodeURIComponent(equipoActivoId)}`, {
                method: 'DELETE'
            });

            if (res.ok) {
                mostrarToast(`Equipo "${nombreEquipo}" eliminado`);
                localStorage.removeItem('fantasy_equipo_activo');
                equipoActivoId = null;
                cargarListaEquipos();
            } else {
                mostrarToast("No se pudo eliminar el equipo", "error");
            }
        } catch (err) {
            console.error(err);
            mostrarToast("Error de conexión", "error");
        }
    });
}

async function cargarListaEquipos(seleccionarId = null) {
    try {
        const res = await fetch('/api/equipos');
        const data = await res.json();
        equiposList = data.equipos || [];

        selectorEquipo.innerHTML = '';

        if (equiposList.length === 0) {
            selectorEquipo.innerHTML = '<option value="" disabled selected>No tienes equipos creados</option>';
            limpiarDashboardPlantilla();
            abrirModalCrearEquipo();
            return;
        }

        equiposList.forEach(eq => {
            const opt = document.createElement('option');
            opt.value = eq.id;
            opt.textContent = `${eq.nombre} (${eq.num_jugadores} jug. | ${formatearDinero(eq.presupuesto)})`;
            selectorEquipo.appendChild(opt);
        });

        // Determinar qué equipo seleccionar
        const guardado = localStorage.getItem('fantasy_equipo_activo');
        let idParaSeleccionar = seleccionarId || (equiposList.some(e => e.id === guardado) ? guardado : equiposList[0].id);

        selectorEquipo.value = idParaSeleccionar;
        equipoActivoId = idParaSeleccionar;
        localStorage.setItem('fantasy_equipo_activo', idParaSeleccionar);

        cargarDatosEquipo(idParaSeleccionar);
    } catch (err) {
        console.error(err);
        mostrarToast("Error al cargar listado de equipos", "error");
    }
}

async function cargarDatosEquipo(equipoId) {
    if (!equipoId) return;

    try {
        const res = await fetch(`/api/equipos/${encodeURIComponent(equipoId)}`);
        if (!res.ok) throw new Error("Equipo no encontrado");

        equipoActivoData = await res.json();
        renderizarPlantilla(equipoActivoData);
    } catch (err) {
        console.error(err);
        mostrarToast("Error al cargar datos del equipo", "error");
    }
}

function limpiarDashboardPlantilla() {
    displayPresupuesto.textContent = "0 €";
    displayValorPlantilla.textContent = "0 €";
    displayNumJugadores.textContent = "0 jugadores";
    displayBeneficioTotal.textContent = "0 €";
    displayRentabilidadTotal.textContent = "0.0% rentabilidad";
    displayPatrimonioTotal.textContent = "0 €";
    contadorPlantilla.textContent = "0 Jugadores";
    tituloPlantillaActual.textContent = "Plantilla Actual";
    tablaPlantillaBody.innerHTML = `
        <tr>
            <td colspan="7" class="text-center text-muted py-4">
                No tienes equipos creados. Haz clic en "Sincronizar con LaLiga" o "Crear / Importar".
            </td>
        </tr>
    `;
}

function renderizarPlantilla(equipo) {
    const presupuesto = equipo.presupuesto || 0;
    const jugadores = equipo.jugadores || [];

    tituloPlantillaActual.textContent = `Plantilla: ${equipo.nombre}`;

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
                    Tu plantilla está vacía. Pulsa "Sincronizar" o ficha jugadores con el formulario superior.
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
// VENTANA MODAL: CREAR / IMPORTAR EQUIPO
// ==========================================
function inicializarModalCrearEquipo() {
    btnAbrirModalEquipo.addEventListener('click', abrirModalCrearEquipo);
    modalCloseBtn.addEventListener('click', cerrarModalCrearEquipo);
    modalOverlay.addEventListener('click', cerrarModalCrearEquipo);

    btnsModalCancel.forEach(btn => {
        btn.addEventListener('click', cerrarModalCrearEquipo);
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !modalCrearEquipo.classList.contains('hidden')) {
            cerrarModalCrearEquipo();
        }
    });

    // Sub-pestañas Modal
    subtabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetSubtab = btn.getAttribute('data-subtab');
            subtabBtns.forEach(b => b.classList.remove('active'));
            subtabPaneles.forEach(p => p.classList.remove('active'));

            btn.classList.add('active');
            const targetPanel = document.getElementById(`subtab-panel-${targetSubtab}`);
            if (targetPanel) {
                targetPanel.classList.add('active');
            }
        });
    });

    // Mini-buscador de jugadores iniciales (Manual)
    inputBuscarJugadorInicial.addEventListener('input', (e) => {
        clearTimeout(modalAutocompleteTimeout);
        const query = e.target.value.trim();

        if (query.length < 2) {
            sugerenciasJugadorInicial.innerHTML = '';
            sugerenciasJugadorInicial.classList.add('hidden');
            return;
        }

        modalAutocompleteTimeout = setTimeout(async () => {
            try {
                const res = await fetch(`/api/buscar?q=${encodeURIComponent(query)}`);
                const data = await res.json();
                mostrarSugerenciasIniciales(data.resultados || []);
            } catch (err) {
                console.error(err);
            }
        }, 200);
    });

    document.addEventListener('click', (e) => {
        if (!e.target.closest('#modal-crear-equipo .autocomplete-wrapper')) {
            sugerenciasJugadorInicial.classList.add('hidden');
        }
    });

    // Formulario 1: Envío Creación Manual
    formCrearEquipo.addEventListener('submit', async (e) => {
        e.preventDefault();

        const nombre = inputNuevoEquipoNombre.value.trim();
        const presupuesto = parseFloat(inputNuevoEquipoPresupuesto.value);

        if (!nombre || isNaN(presupuesto)) {
            mostrarToast("Completa los datos del equipo", "error");
            return;
        }

        try {
            const payload = {
                nombre: nombre,
                presupuesto: presupuesto,
                jugadores: jugadoresInicialesTemp
            };

            const res = await fetch('/api/equipos', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                const data = await res.json();
                mostrarToast(`¡Equipo "${nombre}" creado con éxito!`);
                cerrarModalCrearEquipo();
                cargarListaEquipos(data.equipo.id);
            } else {
                mostrarToast("No se pudo crear el equipo", "error");
            }
        } catch (err) {
            console.error(err);
            mostrarToast("Error en la solicitud", "error");
        }
    });

    // Formulario 2: Envío Importación LaLiga Fantasy
    formImportarEquipo.addEventListener('submit', async (e) => {
        e.preventDefault();

        const token = inputImportToken.value.trim();
        const leagueId = inputImportLeagueId.value.trim();
        const managerId = inputImportManagerId.value.trim();
        const nombre = inputImportNombre.value.trim() || null;

        if (!token || !leagueId || !managerId) {
            mostrarToast("Debes introducir Token, League ID y Manager ID", "error");
            return;
        }

        // Estado de carga UI
        const btnText = btnSincronizarEquipo.querySelector('.btn-text');
        const spinner = btnSincronizarEquipo.querySelector('.spinner');
        const icon = btnSincronizarEquipo.querySelector('.sync-icon');
        
        btnSincronizarEquipo.disabled = true;
        btnText.textContent = "Sincronizando con LaLiga...";
        if (icon) icon.classList.add('rotating');
        if (spinner) spinner.classList.remove('hidden');

        try {
            const res = await fetch('/api/equipos/importar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    token: token,
                    league_id: leagueId,
                    manager_id: managerId,
                    nombre: nombre
                })
            });

            const data = await res.json();

            if (res.ok) {
                mostrarToast(data.mensaje || "¡Plantilla sincronizada con éxito!");
                cerrarModalCrearEquipo();
                formImportarEquipo.reset();
                await cargarListaEquipos(data.equipo.id);
            } else {
                mostrarToast(data.detail || "Error al sincronizar con LaLiga Fantasy", "error");
            }
        } catch (err) {
            console.error(err);
            mostrarToast("Error de conexión al servidor", "error");
        } finally {
            btnSincronizarEquipo.disabled = false;
            btnText.textContent = "Sincronizar y Guardar";
            if (icon) icon.classList.remove('rotating');
            if (spinner) spinner.classList.add('hidden');
        }
    });
}

function abrirModalCrearEquipo() {
    formCrearEquipo.reset();
    inputNuevoEquipoPresupuesto.value = "20000000";
    jugadoresInicialesTemp = [];
    renderizarChipsIniciales();
    sugerenciasJugadorInicial.innerHTML = '';
    sugerenciasJugadorInicial.classList.add('hidden');

    modalCrearEquipo.classList.remove('hidden');
    inputImportToken.focus();
}

function cerrarModalCrearEquipo() {
    modalCrearEquipo.classList.add('hidden');
}

function mostrarSugerenciasIniciales(jugadores) {
    sugerenciasJugadorInicial.innerHTML = '';

    if (jugadores.length === 0) {
        sugerenciasJugadorInicial.innerHTML = '<div class="suggestion-item text-muted">Sin coincidencias</div>';
        sugerenciasJugadorInicial.classList.remove('hidden');
        return;
    }

    jugadores.forEach(j => {
        const nombre = j.nickname || j.name;
        const equipo = j.teamName || 'Sin Equipo';
        const precio = j.marketValue || 0;
        const id = String(j.id || nombre);

        const yaAgregado = jugadoresInicialesTemp.some(item => item.id === id);

        const item = document.createElement('div');
        item.className = 'suggestion-item';
        item.innerHTML = `
            <div>
                <div class="suggestion-name">${nombre} ${yaAgregado ? '<span style="font-size:0.75rem; color:var(--primary);">(Añadido)</span>' : ''}</div>
                <div class="suggestion-team">${equipo}</div>
            </div>
            <div class="suggestion-price">${formatearDinero(precio)}</div>
        `;

        if (!yaAgregado) {
            item.addEventListener('click', () => {
                jugadoresInicialesTemp.push({
                    id: id,
                    nombre: nombre,
                    precio_compra: 0.0
                });

                renderizarChipsIniciales();
                inputBuscarJugadorInicial.value = '';
                sugerenciasJugadorInicial.classList.add('hidden');
                inputBuscarJugadorInicial.focus();
            });
        }

        sugerenciasJugadorInicial.appendChild(item);
    });

    sugerenciasJugadorInicial.classList.remove('hidden');
}

function renderizarChipsIniciales() {
    listaJugadoresIniciales.innerHTML = '';
    contadorIniciales.textContent = `${jugadoresInicialesTemp.length} seleccionados`;

    if (jugadoresInicialesTemp.length === 0) {
        listaJugadoresIniciales.innerHTML = '<div class="chips-placeholder text-muted">Aún no has añadido jugadores iniciales. Búscalos arriba.</div>';
        return;
    }

    jugadoresInicialesTemp.forEach((j, index) => {
        const chip = document.createElement('div');
        chip.className = 'player-chip';
        chip.innerHTML = `
            <span class="chip-name">${j.nombre}</span>
            <span class="chip-price">(Inicial 0 €)</span>
            <button type="button" class="chip-remove" onclick="removerJugadorInicial(${index})" title="Eliminar">&times;</button>
        `;
        listaJugadoresIniciales.appendChild(chip);
    });
}

function removerJugadorInicial(index) {
    jugadoresInicialesTemp.splice(index, 1);
    renderizarChipsIniciales();
}

// ==========================================
// ACTUALIZAR PRESUPUESTO DEL EQUIPO ACTIVO
// ==========================================
function inicializarPresupuesto() {
    btnEditarPresupuesto.addEventListener('click', () => {
        if (!equipoActivoId) return;
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
        if (!equipoActivoId) return;
        const nuevoPresupuesto = parseFloat(inputPresupuesto.value);
        if (isNaN(nuevoPresupuesto)) {
            mostrarToast("Introduce un presupuesto válido", "error");
            return;
        }

        try {
            const res = await fetch(`/api/equipos/${encodeURIComponent(equipoActivoId)}/presupuesto`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ presupuesto: nuevoPresupuesto })
            });

            if (res.ok) {
                formPresupuesto.classList.add('hidden');
                displayPresupuesto.classList.remove('hidden');
                btnEditarPresupuesto.classList.remove('hidden');
                mostrarToast("Presupuesto actualizado");
                cargarDatosEquipo(equipoActivoId);
            }
        } catch (err) {
            console.error(err);
            mostrarToast("Error al guardar presupuesto", "error");
        }
    });
}

// ==========================================
// FICHAR JUGADOR EN EL EQUIPO ACTIVO
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

    document.addEventListener('click', (e) => {
        if (!e.target.closest('.add-player-card .autocomplete-wrapper')) {
            dropdownSugerencias.classList.add('hidden');
        }
    });

    formFichar.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (!equipoActivoId) {
            mostrarToast("Selecciona o crea un equipo primero", "error");
            return;
        }

        const nombre = inputFicharNombre.value.trim();
        const id = inputFicharId.value.trim() || nombre.toLowerCase().replace(/\s+/g, '-');
        const precioCompra = parseFloat(inputFicharPrecio.value);

        if (!nombre || isNaN(precioCompra)) {
            mostrarToast("Completa los campos requeridos", "error");
            return;
        }

        try {
            const res = await fetch(`/api/equipos/${encodeURIComponent(equipoActivoId)}/jugadores`, {
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
                cargarDatosEquipo(equipoActivoId);
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
    if (!equipoActivoId) return;
    if (!confirm("¿Deseas vender/eliminar este jugador de la plantilla?")) return;

    try {
        const res = await fetch(`/api/equipos/${encodeURIComponent(equipoActivoId)}/jugadores/${encodeURIComponent(jugadorId)}`, {
            method: 'DELETE'
        });

        if (res.ok) {
            mostrarToast("Jugador eliminado de la plantilla");
            cargarDatosEquipo(equipoActivoId);
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
    if (!equipoActivoId && equiposList.length === 0) {
        abrirModalCrearEquipo();
        mostrarToast("Crea o importa primero un equipo para fichar", "error");
        return;
    }

    const btnPlantilla = document.getElementById('tab-btn-plantilla');
    if (btnPlantilla) btnPlantilla.click();

    inputFicharNombre.value = nombre;
    inputFicharId.value = id;
    inputFicharPrecio.value = precio;
    inputFicharPrecio.focus();

    mostrarToast(`Listo para fichar a ${nombre} en ${equipoActivoData ? equipoActivoData.nombre : 'tu equipo'}`);
}
