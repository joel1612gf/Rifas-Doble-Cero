// main.js - Rifas Doble Cero (Premium, 2024)

let rifasGlobal = [];
let rifaSeleccionada = null;
let numerosSeleccionados = [];
let paginaActual = 1;
let numerosPorPagina = 100; // Ajusta este número para mostrar más o menos en el grid
let searchValue = "";
let exitoAbierto = false; // ← Candado para evitar cierres accidentales

// --- Lógica de Entornos (Staging y Producción) ---

// 1. Define tus URLs
const PROD_HOST = 'doblecerove.com';
const PROD_API = 'https://doble-cero.onrender.com';
const STAGING_API = 'https://doble-cero-staging.onrender.com'; // URL de Render Staging

let API;
const currentHost = location.hostname;

// 2. Revisa si estamos en el dominio de PRODUCCIÓN
if (currentHost.includes(PROD_HOST) || currentHost.includes('www.' + PROD_HOST)) {
    // SÍ: Conectar al Backend EN VIVO
    API = PROD_API;
} else {
    // NO: Conectar al Backend DE PRUEBAS
    // (Esto aplica para 'staging.rifas-doble-cero.pages.dev' Y para '127.0.0.1' de Live Server)
    API = STAGING_API;
}

console.log('API conectada a:', API); // (Para que podamos verificar)
// --- Fin de la lógica de entornos ---

    // === Meta helpers (seguros si no hay Pixel) ===
function metaTrack(event, params = {}, options = {}) {
  try {
    if (window.fbq) {
      // Para eventos estándar: track; para custom: trackCustom
      const standard = ['PageView','ViewContent','InitiateCheckout','AddPaymentInfo','Purchase','Contact','Subscribe'];
      const fn = standard.includes(event) ? 'track' : 'trackCustom';
      if (options.eventId) {
        fbq(fn, event, params, { eventID: options.eventId });
      } else {
        fbq(fn, event, params);
      }
    }
  } catch(_) {}
}

function genEventId() {
  return 'dc_' + Date.now() + '_' + Math.random().toString(36).slice(2, 10);
}

// Enviar a CAPI (servidor) SOLO para Purchase (deduplicación con event_id)
async function sendPurchaseToCapi({ value, currency, eventId }) {
  try {
    await fetch(`${API}/api/meta/track`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_name: 'Purchase',
        event_id: eventId,
        value,
        currency,
        event_source_url: location.href
      })
    });
  } catch (e) {
    console.warn('CAPI falló (no es grave):', e?.message);
  }
}

// Helper para $/Bs → USD/VES
function currencyCodeFrom(monedaSimbolo) {
  return (monedaSimbolo === '$') ? 'USD' : 'VES';
}

// --- INICIO DE CAMBIO (TAREA 1) ---
/**
 * Formatea un número de ticket con ceros a la izquierda.
 * Ej: (5, 1000) -> "0004" (basado en longitud)
 * Ej: (101, 9999) -> "0101"
 */
function formatTicketNumber(number, totalNumbers) {
  // Determina la cantidad de dígitos necesarios
  // Si totalNumbers es 999, la longitud es 3. Si es 1000, la longitud es 4.
  const padding = String(totalNumbers).length;
  return String(number).padStart(padding, '0');
}
// --- FIN DE CAMBIO (TAREA 1) ---

// ============ 1. CARGAR RIFAS DINÁMICAMENTE ===============
async function cargarRifas() {
    const rifasContainer = document.getElementById('rifas-container');
    rifasContainer.innerHTML = `<div class="text-center text-gray-400">Cargando rifas...</div>`;
    try {
        const res = await fetch(`${API}/api/raffles`);
        let rifas = await res.json();
        rifas = rifas.filter(r => r.status === 'activa');
        rifasGlobal = rifas;

        if (rifas.length === 0) {
            rifasContainer.innerHTML = `<div class="text-center text-gray-400">No hay rifas activas en este momento.</div>`;
            return;
        }

    // Layout responsive sólido (móvil 1 col; >=sm 2 col; >=lg 3 col)
    if (rifas.length === 1) {
        rifasContainer.className = "grid grid-cols-1 gap-8 place-items-center";
    } else if (rifas.length === 2) {
        rifasContainer.className = "grid grid-cols-1 sm:grid-cols-2 gap-8 place-items-center";
    } else {
        rifasContainer.className = "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 place-items-center";
    }


        let html = '';
        rifas.forEach((rifa, idx) => {
            html += `
                <div class="bg-gray-800 rounded-lg overflow-hidden shadow-lg hover:shadow-xl transition duration-300 mb-6 w-[92%] sm:w-full max-w-md sm:max-w-2xl lg:max-w-none mx-auto">
                    <div class="p-2 sm:p-3 lg:p-0 bg-gray-900/70 lg:bg-transparent rounded-xl lg:rounded-none">
                    <div class="aspect-square sm:aspect-video lg:aspect-[16/8] w-full overflow-hidden rounded-lg lg:rounded-none">
                        <img src="${rifa.image || ''}" alt="${rifa.title}" class="w-full h-full object-cover" loading="lazy">
                    </div>
                    </div>
                    <div class="p-6">
                        <h3 class="text-2xl font-bold text-green-400 mb-2">${rifa.title}</h3>
                        <p class="text-gray-300 mb-4">${rifa.description}</p>
                        <ul class="mb-2">
                            ${(rifa.prizes && rifa.prizes.length > 0) ? rifa.prizes.map(p => `
                                <li class="text-sm text-green-300"><b>${p.place}° Premio:</b> ${p.description}</li>
                            `).join('') : ''}
                        </ul>
                        <div class="flex justify-between items-center mb-2">
                            <span class="text-gray-400"><i class="fas fa-ticket-alt mr-2"></i> ${rifa.priceBs} Bs</span>
                            <span class="text-gray-400"><i class="fas fa-calendar-alt mr-2"></i> ${rifa.drawDate ? new Date(rifa.drawDate).toLocaleDateString() : ''}</span>
                        </div>
                        <div class="mt-4">
                            <a href="#" class="block w-full bg-green-500 hover:bg-green-600 text-black font-bold py-2 px-4 rounded text-center transition duration-300" onclick="abrirModalSelector('${rifa._id}'); return false;">
                                Participar <i class="fas fa-arrow-right ml-2"></i>
                            </a>
                        </div>
                    </div>
                </div>
            `;
        });
        rifasContainer.innerHTML = html;
    } catch (err) {
        rifasContainer.innerHTML = `<div class="text-center text-red-400">Error cargando rifas.</div>`;
    }
}

// ============ 2. MODAL DE SELECCIÓN DE NÚMEROS ===============
async function abrirModalSelector(raffleId) {
    rifaSeleccionada = rifasGlobal.find(r => r._id === raffleId);
    if (!rifaSeleccionada) return;
    
    numerosSeleccionados = [];
    paginaActual = 1;
    searchValue = "";
    currentViewMode = 'random'; // <--- NUEVO: Empezar en modo aleatorio por defecto

    document.getElementById('selector-content').innerHTML = renderSelectorContent();
    const overlaySel = document.getElementById('modal-selector');
    overlaySel.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}
function cerrarModalSelector() {
  const overlay = document.getElementById('modal-selector');
  overlay.classList.add('hidden');
  document.body.style.overflow = 'auto';
  setTimeout(() => { document.getElementById('selector-content').innerHTML = ""; }, 300);
}

// --- INICIO DE CAMBIO (TAREA 5 - vFinal) ---
/**
 * Renderiza SÓLO el grid de números y el paginador.
 */
function renderGridAndPaginatorHTML() {
    const rifa = rifaSeleccionada;
    if (!rifa) return '';

    const total = rifa.totalNumbers || 100;
    const reservados = Array.isArray(rifa.numbersReserved) ? rifa.numbersReserved : [];
    const vendidos = [...new Set([...(rifa.numbersSold || []), ...reservados])];
    
    // TAREA 2: (Ya implementado) La lista base es solo de disponibles
    let numerosFiltrados = Array.from({ length: total }, (_, i) => i + 1).filter(n => !vendidos.includes(n));
    
    // Aplicamos el filtro de búsqueda (searchValue es una variable global)
    if (searchValue && searchValue.length > 0) {
        numerosFiltrados = numerosFiltrados.filter(n => {
            const numFormateado = formatTicketNumber(n, total);
            return numFormateado.includes(searchValue) || String(n).includes(searchValue);
        });
    }

    const startIdx = (paginaActual - 1) * numerosPorPagina;
    const endIdx = startIdx + numerosPorPagina;
    const numerosPaginados = numerosFiltrados.slice(startIdx, endIdx);

    // CUADRÍCULA
    let gridHtml = `<div id="numeros-grid" class="grid grid-cols-5 sm:grid-cols-10 gap-2 mb-2 mt-2">`;
    for (let i = 0; i < numerosPaginados.length; i++) {
        const n = numerosPaginados[i];
        const seleccionado = numerosSeleccionados.includes(n);
        gridHtml += `
            <button type="button"
                class="numero-btn h-12 w-18 rounded-md font-bold text-lg border border-gray-700 transition
                ${seleccionado ? 'bg-green-400 text-gray-900 border-green-600' : 'bg-gray-700 text-gray-200 hover:bg-green-400 hover:text-gray-900'}"
                onclick="toggleNumero(${n}, this)"
                data-numero="${n}">
                ${formatTicketNumber(n, total)}
            </button>
        `;
    }
    gridHtml += `</div>`;

    // PAGINADOR
    let paginadorHtml = '';
    let paginasTotales = Math.ceil(numerosFiltrados.length / numerosPorPagina);
    if (paginasTotales > 1) {
        let paginasPorBloque = 10;
        let bloqueActual = Math.floor((paginaActual - 1) / paginasPorBloque);
        let inicioBloque = bloqueActual * paginasPorBloque + 1;
        let finBloque = Math.min(inicioBloque + paginasPorBloque - 1, paginasTotales);

        paginadorHtml += `<div class="flex justify-center items-center mt-3 gap-2 flex-wrap">`;
        paginadorHtml += `
            <button onclick="cambiarBloquePaginas(-1)" ${bloqueActual === 0 ? 'disabled style="opacity:.5;cursor:not-allowed"' : ''}
                class="px-2 py-1 rounded bg-gray-600 text-white hover:bg-gray-500 transition" title="Anterior 10">
                &#171;
            </button>
        `;
        for (let i = inicioBloque; i <= finBloque; i++) {
            paginadorHtml += `
                <button onclick="irPagina(${i})"
                    class="px-3 py-1 rounded ${i === paginaActual ? 'bg-green-400 text-black font-bold' : 'bg-gray-700 text-gray-300 hover:bg-green-300 hover:text-black'} transition">
                    ${i}
                </button>
            `;
        }
        paginadorHtml += `
            <button onclick="cambiarBloquePaginas(1)" ${finBloque === paginasTotales ? 'disabled style="opacity:.5;cursor:not-allowed"' : ''}
                class="px-2 py-1 rounded bg-gray-600 text-white hover:bg-gray-500 transition" title="Siguiente 10">
                &#187;
            </button>
        `;
        paginadorHtml += `</div>`;
    }
    
    // Devolvemos ambos HTML combinados
    return gridHtml + paginadorHtml;
}
// --- FIN DE CAMBIO (TAREA 5 - vFinal) ---

// --- INICIO DE CAMBIO (TAREA 5 - vFinal) ---
function renderSelectorContent() {
    const rifa = rifaSeleccionada;
    
    // --- 1. Calcular Datos ---
    const total = rifa.totalNumbers || 100;
    const reservados = Array.isArray(rifa.numbersReserved) ? rifa.numbersReserved : [];
    const vendidos = [...new Set([...(rifa.numbersSold || []), ...reservados])];
    const disponiblesCount = total - vendidos.length;
    const seleccionadosCount = numerosSeleccionados.length;
    
    // Calcular precio total (considerando si es en $ o Bs)
    // Nota: Tu código original usa priceBs para mostrar, ajusta si usas priceUsd
    const precioUnitario = rifa.priceBs; 
    const totalPagar = (seleccionadosCount * precioUnitario).toLocaleString('es-VE');

    // --- 2. Preparar HTML de Premios (Igual que antes) ---
    let premiosHtml = '';
    if (rifa.prizes && rifa.prizes.length > 0) {
        premiosHtml = `
            <div class="mb-4 bg-gray-900/50 p-3 rounded-lg border border-gray-700">
                <span class="text-green-400 font-bold block mb-2"><i class="fas fa-trophy mr-1"></i> Premios:</span>
                <ul class="space-y-1">
                    ${rifa.prizes.map(p => `
                        <li class="text-gray-300 text-lg flex items-start gap-2">
                            <span class="bg-green-500 text-black text-lg font-bold px-1.5 rounded">${p.place}°</span>
                            ${p.description}
                        </li>
                    `).join('')}
                </ul>
            </div>
        `;
    }

    // --- 3. Preparar Botones Aleatorios (Configurables) ---
    // Si configuraste los botones en el admin, los usamos. Si no, usamos los defecto.
    const botonesConfig = rifa.randomButtons && rifa.randomButtons.length > 0 
        ? rifa.randomButtons 
        : [
            { count: 5, label: "Prueba" },
            { count: 10, label: "Popular" },
            { count: 25, label: "Para ganar" }
        ];

    // --- 4. Renderizar Contenido Dinámico (Tabla o Aleatorio) ---
    let contenidoCentral = '';

    if (currentViewMode === 'random') {
        // === VISTA ALEATORIA ===
        contenidoCentral = `
            <div class="flex flex-col items-center py-6 animate-fade-in">
                <div class="w-full max-w-xs mb-6">
                    <label class="block text-gray-400 text-sm mb-2 text-center">Escribe una cantidad</label>
                    <div class="flex gap-2">
                        <input type="number" id="input-cantidad-azar" placeholder="Ej: 50" 
                            class="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-3 text-center text-white text-xl font-bold focus:border-green-500 outline-none transition-colors"
                            onkeydown="if(event.key === 'Enter') agregarDesdeInput()">
                        <button onclick="agregarDesdeInput()" class="bg-gray-700 hover:bg-green-500 hover:text-black text-white px-4 rounded-lg transition-colors">
                            <i class="fas fa-plus"></i>
                        </button>
                    </div>
                </div>

                <div class="w-full mb-4">
                     <p class="text-gray-400 text-xs text-center mb-3 uppercase tracking-wide">O elige una opción rápida</p>
                     <div class="grid grid-cols-3 gap-3">
                        ${botonesConfig.map(btn => `
                            <button onclick="agregarAlAzar(${btn.count})" 
                                class="flex flex-col items-center justify-center bg-gray-800 border-2 border-gray-700 hover:border-green-500 hover:bg-gray-700/80 text-white py-4 rounded-xl transition-all duration-200 group active:scale-95">
                                <span class="text-2xl font-bold text-green-400 group-hover:text-green-300">${btn.count}</span>
                                <span class="text-[10px] text-gray-400 uppercase mt-1">${btn.label}</span>
                            </button>
                        `).join('')}
                     </div>
                </div>
            </div>
        `;
    } else {
        // === VISTA TABLA (Tu lógica original mejorada visualmente) ===
        // Reutilizamos tu función renderGridAndPaginatorHTML() que ya tienes en main.js
        // Pero primero ponemos el buscador arriba
        contenidoCentral = `
            <div class="mb-3">
                <div class="relative">
                    <i class="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500"></i>
                    <input 
                        type="text" 
                        placeholder="Buscar número (ej: 0429)" 
                        class="w-full bg-gray-900 border border-gray-700 rounded-lg pl-10 pr-4 py-3 text-white focus:border-green-500 outline-none" 
                        value="${searchValue}" 
                        oninput="buscarNumero(this.value)">
                </div>
            </div>
            <div id="grid-paginator-container">
                ${renderGridAndPaginatorHTML()}
            </div>
        `;
    }

    // --- 5. Lista de Píldoras (Seleccionados) ---
    // Solo visible si hay números seleccionados
    let seleccionadosHtml = '';
    if (seleccionadosCount > 0) {
        const listaNumeros = numerosSeleccionados.map(n => 
            `<button onclick="toggleNumero(${n})" class="inline-flex items-center bg-green-500/20 border border-green-500/50 text-green-300 text-xs font-bold px-2 py-1 rounded hover:bg-red-500/20 hover:border-red-500 hover:text-red-300 transition-colors" title="Clic para borrar">
                ${formatTicketNumber(n, total)} <i class="fas fa-times ml-1 opacity-50"></i>
             </button>`
        ).join(' ');
        
        seleccionadosHtml = `
            <div class="mt-4 bg-gray-900/50 p-3 rounded-lg border border-gray-700">
                <div class="flex justify-between items-center mb-2">
                    <span class="text-xs text-gray-400 uppercase font-bold">Tickets seleccionados (${seleccionadosCount})</span>
                    <button onclick="limpiarNumeros()" class="text-red-400 text-xs hover:text-white transition-colors flex items-center gap-1">
                        <i class="fas fa-trash-alt"></i> Limpiar todo
                    </button>
                </div>
                <div class="flex flex-wrap gap-2 max-h-24 overflow-y-auto custom-scrollbar">
                    ${listaNumeros}
                </div>
            </div>
        `;
    }

    // --- 6. HTML FINAL COMPLETO ---
    return `
        <div class="relative h-48 sm:h-64">
            <img src="${rifa.image}" alt="${rifa.title}" class="w-full h-full object-cover">
            <div class="absolute inset-0 bg-gradient-to-t from-gray-900 via-transparent to-transparent"></div>
            <button onclick="cerrarModalSelector()" class="absolute top-4 right-4 bg-black/50 hover:bg-black/80 text-white w-8 h-8 rounded-full flex items-center justify-center transition backdrop-blur-sm z-10">
                <i class="fas fa-times"></i>
            </button>
        </div>

        <div class="p-4 sm:p-6 -mt-6 relative bg-gray-800 rounded-t-3xl min-h-[500px]">
            <h2 class="text-2xl sm:text-3xl font-extrabold text-green-400 mb-2 leading-tight">${rifa.title}</h2>
            <p class="text-gray-400 text-sm mb-4 line-clamp-2">${rifa.description}</p>
            
            ${premiosHtml}

            <div class="grid grid-cols-3 gap-2 mb-6 text-center bg-gray-900 rounded-xl p-2 border border-gray-700/50">
                <div class="p-1">
                    <div class="text-xs text-gray-400 uppercase">Precio</div>
                    <div class="text-green-400 font-bold">${rifa.priceBs} Bs</div>
                </div>
                <div class="p-1 border-l border-gray-700">
                    <div class="text-xs text-gray-400 uppercase">Fecha</div>
                    <div class="text-white font-bold">${rifa.drawDate ? new Date(rifa.drawDate).toLocaleDateString() : 'Pronto'}</div>
                </div>
                <div class="p-1 border-l border-gray-700">
                    <div class="text-xs text-gray-400 uppercase">Disponibles</div>
                    <div class="text-white font-bold">${disponiblesCount}</div>
                </div>
            </div>

            <div class="grid grid-cols-2 gap-3 mb-6">
                <button onclick="cambiarModoVista('random')" 
                    class="flex items-center justify-center gap-2 py-3 rounded-lg font-bold transition-all duration-200 border-2 
                    ${currentViewMode === 'random' ? 'bg-gray-700 border-green-500 text-green-400 shadow-lg' : 'bg-gray-700 border-transparent text-gray-400 hover:bg-gray-700'}">
                    <i class="fas fa-dice"></i> Azar
                </button>
                <button onclick="cambiarModoVista('table')" 
                    class="flex items-center justify-center gap-2 py-3 rounded-lg font-bold transition-all duration-200 border-2 
                    ${currentViewMode === 'table' ? 'bg-gray-700 border-green-500 text-green-400 shadow-lg' : 'bg-gray-700 border-transparent text-gray-400 hover:bg-gray-700'}">
                    <i class="fas fa-th"></i> Tabla
                </button>
            </div>

            <div id="dynamic-content-area" class="min-h-[250px]">
                ${contenidoCentral}
            </div>

            ${seleccionadosHtml}

            <div class="mt-6 pt-4 border-t border-gray-700 sticky bottom-0 bg-gray-800 pb-2">
                <div class="flex justify-between items-center mb-3">
                    <div class="text-sm text-gray-400">Total a pagar:</div>
                    <div class="text-2xl font-bold text-white">${totalPagar} Bs</div>
                </div>
                <button id="btn-continuar-compra" onclick="continuarCompra()" 
                    class="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-black font-extrabold py-4 rounded-xl shadow-lg shadow-green-900/40 transition-all flex items-center justify-center gap-2
                    ${seleccionadosCount === 0 ? 'opacity-50 cursor-not-allowed grayscale' : ''}"
                    ${seleccionadosCount === 0 ? 'disabled' : ''}>
                    <span>Continuar Compra</span>
                    <i class="fas fa-arrow-right"></i>
                </button>
            </div>
        </div>
    `;
}
// --- FIN DE CAMBIO (TAREA 5 - vFinal) ---
// Lógica para seleccionar/deseleccionar número

// --- INICIO DE CAMBIO (TAREA 5 - vFinal) ---
function toggleNumero(num, elementoBoton) {
    const idx = numerosSeleccionados.indexOf(num);
    if (idx >= 0) {
        numerosSeleccionados.splice(idx, 1);
    } else {
        numerosSeleccionados.push(num);
    }

    // 1. Actualizar visualmente el botón que se tocó
    const seleccionado = numerosSeleccionados.includes(num);
    if (elementoBoton) { // elementoBoton es el 'this' que pasamos desde el onclick
        if (seleccionado) {
            elementoBoton.classList.add('bg-green-400', 'text-gray-900', 'border-green-600');
            elementoBoton.classList.remove('bg-gray-700', 'text-gray-200', 'hover:bg-green-400', 'hover:text-gray-900');
        } else {
            elementoBoton.classList.remove('bg-green-400', 'text-gray-900', 'border-green-600');
            elementoBoton.classList.add('bg-gray-700', 'text-gray-200', 'hover:bg-green-400', 'hover:text-gray-900');
        }
    }

// 2. Actualizar la lista de "Seleccionados"
const seleccionadosLabel = document.getElementById('seleccionados-label');
if (seleccionadosLabel) {
    seleccionadosLabel.innerHTML = numerosSeleccionados.length > 0
        ? numerosSeleccionados.map(n =>
            // --- INICIO DE CAMBIO (TAREA "Quitar píldora") ---
            `<button 
                type="button"
                title="Quitar ${n}"
                onclick="toggleNumero(${n}, document.querySelector('.numero-btn[data-numero=\\'${n}\\']'))"
                class="inline-block bg-green-500 text-black font-bold px-3 py-1 rounded-full text-sm hover:bg-red-500 hover:text-white transition-colors cursor-pointer"
            >
                ${formatTicketNumber(n, rifaSeleccionada.totalNumbers)}
            </button>`
            // --- FIN DE CAMBIO ---
        ).join('')
        : '<span class="text-gray-400">Ninguno</span>';
}

    // 3. Actualiza el botón continuar (deshabilitado si no hay nada)
    const btnContinuar = document.getElementById('btn-continuar-compra');
    if (btnContinuar) {
        btnContinuar.disabled = (numerosSeleccionados.length === 0);
        btnContinuar.style.opacity = (numerosSeleccionados.length === 0) ? 0.5 : 1;
    }
}
// --- FIN DE CAMBIO (TAREA 5 - vFinal) ---

// --- INICIO DE CAMBIO (TAREA 5 - vFinal) ---
function buscarNumero(valor) {
    searchValue = valor.trim();
    paginaActual = 1;

    // Ya no redibuja TODO, solo el grid y el paginador
    const container = document.getElementById('grid-paginator-container');
    if (container) {
        container.innerHTML = renderGridAndPaginatorHTML();
    }
}
// --- FIN DE CAMBIO (TAREA 5 - vFinal) ---
function moverPaginas(direccion) {
    // dirección = +1 o -1
    const rifa = rifaSeleccionada;
    const total = rifa.totalNumbers || 100;
    let numerosFiltrados = Array.from({ length: total }, (_, i) => i + 1);
    if (searchValue && searchValue.length > 0) {
        numerosFiltrados = numerosFiltrados.filter(n => n.toString().includes(searchValue));
    }
    const paginasTotales = Math.ceil(numerosFiltrados.length / numerosPorPagina);

    let nuevaPagina = paginaActual + direccion;
    if (nuevaPagina < 1) nuevaPagina = 1;
    if (nuevaPagina > paginasTotales) nuevaPagina = paginasTotales;
    paginaActual = nuevaPagina;
    document.getElementById('selector-content').innerHTML = renderSelectorContent();
}

function moverBloquePaginas(direccion) {
    // dirección = +1 o -1
    const rifa = rifaSeleccionada;
    const total = rifa.totalNumbers || 100;
    let numerosFiltrados = Array.from({ length: total }, (_, i) => i + 1);
    if (searchValue && searchValue.length > 0) {
        numerosFiltrados = numerosFiltrados.filter(n => n.toString().includes(searchValue));
    }
    const paginasTotales = Math.ceil(numerosFiltrados.length / numerosPorPagina);
    let paginasPorBloque = 10;

    let bloqueActual = Math.floor((paginaActual - 1) / paginasPorBloque);
    let nuevoBloque = bloqueActual + direccion;
    let nuevaPagina = nuevoBloque * paginasPorBloque + 1;
    if (nuevaPagina < 1) nuevaPagina = 1;
    if (nuevaPagina > paginasTotales) nuevaPagina = paginasTotales;
    paginaActual = nuevaPagina;
    document.getElementById('selector-content').innerHTML = renderSelectorContent();
}

// Cambiar página en el paginador
// --- INICIO DE CAMBIO (TAREA 5 - vFinal) ---
function irPagina(num) {
    paginaActual = num;
    // Ya no redibuja TODO, solo el grid y el paginador
    const container = document.getElementById('grid-paginator-container');
    if (container) {
        container.innerHTML = renderGridAndPaginatorHTML();
    }
}
// --- FIN DE CAMBIO (TAREA 5 - vFinal) ---
// --- INICIO DE CAMBIO (TAREA 5 - vFinal) ---
function limpiarNumeros() {
    numerosSeleccionados = [];
    searchValue = ''; // <-- Limpiamos la búsqueda también

    // Redibujamos el modal completo para resetear el input de búsqueda
    document.getElementById('selector-content').innerHTML = renderSelectorContent();
}
// --- FIN DE CAMBIO (TAREA 5 - vFinal) ---

// Botón número al azar (solo disponible, nunca repite)
// --- INICIO DE CAMBIO (TAREA 5 - vFinal) ---
function numeroAlAzar() {
    // Si había una búsqueda activa, la limpiamos
    if (searchValue !== '') {
        searchValue = '';
        // Recargamos todo el modal para que 'disponibles' esté completo
        document.getElementById('selector-content').innerHTML = renderSelectorContent();
        // Esperamos que se redibuje ANTES de intentar seleccionar
        setTimeout(_seleccionarNumeroAlAzarInterno, 50);
    } else {
        _seleccionarNumeroAlAzarInterno();
    }
}

// Nueva función interna para no duplicar código
function _seleccionarNumeroAlAzarInterno() {
    const rifa  = rifaSeleccionada;
    const total = rifa.totalNumbers || 100;
    const reservados = Array.isArray(rifa.numbersReserved) ? rifa.numbersReserved : [];
    const vendidos = [...new Set([...(rifa.numbersSold || []), ...reservados])];

    let disponibles = Array.from({ length: total }, (_, i) => i + 1)
        .filter(n => !vendidos.includes(n) && !numerosSeleccionados.includes(n));

    if (disponibles.length === 0) return;

    const random = disponibles[Math.floor(Math.random() * disponibles.length)];

    // Buscamos el botón en el DOM
    const boton = document.querySelector(`.numero-btn[data-numero="${random}"]`);

    // Si el botón no está visible (ej. en otra página), no podemos hacer clic
    // así que llamamos a toggleNumero (sin 'this') y luego recargamos el grid.
    if (!boton) {
        toggleNumero(random); // Solo actualiza el array

        // Recargamos solo el grid para que aparezca seleccionado
        const container = document.getElementById('grid-paginator-container');
        if (container) {
            container.innerHTML = renderGridAndPaginatorHTML();
        }
        // Y actualizamos el label de seleccionados
        const seleccionadosLabel = document.getElementById('seleccionados-label');
        if (seleccionadosLabel) {
            seleccionadosLabel.innerHTML = numerosSeleccionados.map(n =>
                    `<span class="inline-block bg-green-500 text-black font-bold px-3 py-1 rounded-full text-sm">${formatTicketNumber(n, rifaSeleccionada.totalNumbers)}</span>`
                ).join('');
        }
    } else {
        // Si el botón SÍ está visible, llamamos a toggleNumero con 'this'
        toggleNumero(random, boton);
    }
}
// --- FIN DE CAMBIO (TAREA 5 - vFinal) ---
// Botón continuar → muestra modal de resumen/compra
// --- INICIO DE CAMBIO (TAREA 6) ---
function continuarCompra() {
  // Validar el mínimo de tickets
  const min = rifaSeleccionada.minTickets || 1; // El '|| 1' da soporte a rifas viejas
  const seleccionados = numerosSeleccionados.length;

  if (seleccionados < min) {
    // Si no cumple, mostramos el aviso y detenemos la función
    const msg = (min === 1)
      ? 'Debes seleccionar al menos 1 ticket para continuar.'
      : `El mínimo de compra para esta rifa es de ${min} tickets.\n\nHas seleccionado ${seleccionados}. Por favor, selecciona ${min - seleccionados} más.`;

    alert(msg);
    return; // <-- Frena la ejecución aquí
  }

  // Si todo está OK, continúa con el código original:

  // Mostrar modal resumen
  cerrarModalSelector();
  setTimeout(() => {
    const overlayRes = document.getElementById('modal-resumen');
    overlayRes.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    renderResumenContent();
  }, 350);

  // META: InitiateCheckout (con valor estimado)
  try {
    const pagaEnUsd = (metodoPagoSeleccionado === 'binance' || metodoPagoSeleccionado === 'zinli');
    const tieneUsd  = (rifaSeleccionada?.priceUsd || 0) > 0;
    const usarUsd   = pagaEnUsd && tieneUsd;
    const price     = usarUsd ? (rifaSeleccionada?.priceUsd || 0) : (rifaSeleccionada?.priceBs || 0);
    const total     = price * (numerosSeleccionados?.length || 0);
    const moneda    = usarUsd ? '$' : 'Bs';
    metaTrack('InitiateCheckout', { value: total, currency: currencyCodeFrom(moneda) });
  } catch (_) {}
}
// --- FIN DE CAMBIO (TAREA 6) ---


function cerrarModalResumen() {
  const overlay = document.getElementById('modal-resumen');
  overlay.classList.add('hidden');
  document.body.style.overflow = 'auto';
  setTimeout(() => { document.getElementById('resumen-content').innerHTML = ""; }, 300);
}

// ============ 3. MODAL RESUMEN + FORMULARIO DE COMPRA ===============
let metodoPagoSeleccionado = "";

function seleccionarMetodoPago(metodo) {
  metodoPagoSeleccionado = metodo;
  // Visual de seleccion
  document.querySelectorAll('.pago-btn').forEach(btn => btn.classList.remove('border-green-400'));
  const idx = metodo === 'pagoMovil' ? 0 : metodo === 'binance' ? 1 : 2;
  document.querySelectorAll('.pago-btn')[idx].classList.add('border-green-400');

  // Instrucciones dinámicas
  let instrucciones = "";
  if (metodo === "pagoMovil") {
    instrucciones = `
      <div class="bg-gray-700 rounded-lg p-4 mt-2">
        <div class="text-green-400 font-bold mb-1">Instrucciones para pagar con Pago Móvil:</div>
        <div><span class="font-light text-white">Realiza un Pago Móvil a los siguientes datos:<br><br><strong>Teléfono:</strong><br><div style="display: flex; align-items: center; gap: 8px;"><span id="Teléfonopm">04241242291</span><img src="img/copiarweb.png" alt="Copiar" width="30" height="30" onclick="copyToClipboard(\'Teléfonopm\')"><br></div><br><strong>Cédula de identidad:</strong><br><div style="display: flex; align-items: center; gap: 8px;"><span id="CI">31215401</span><img src="img/copiarweb.png" alt="Copiar" width="30" height="30" onclick="copyToClipboard(\'CI\')"><br></div><br><strong>Banco:</strong><br>Bancamiga (0172)</div><br>
        <div class="mt-2"><span class="text-white font-semibold">Total a transferir:</span> <strong> <span id="totalBs" class="text-white font-bold"> </span> </strong> </div>
    `;
  } else if (metodo === "binance") {
    instrucciones = `
      <div class="bg-gray-700 rounded-lg p-4 mt-2">
        <div class="text-green-400 font-bold mb-1">Instrucciones para pagar con Binance:</div>
        <div><span class="font-light text-white">Envía la cantidad de USDT por la red TRX (TRC20) correspondiente a esta dirección:<br><br><strong>Dirección:</strong><br><div style="display: flex; align-items: center; gap: 8px;"><span id="binanceAddress">TLZomJFJQdsemSdhVuJEnuz2sBZSbrZuiz</span><img src="img/copiarweb.png" alt="Copiar" width="30" height="30" onclick="copyToClipboard(\'binanceAddress\')"><br></div><br><strong>Correo Binance:</strong><br><div style="display: flex; align-items: center; gap: 8px;"><span id="binanceEmail">bkfvx8z9v8@privaterelay.appleid.com</span><img src="img/copiarweb.png" alt="Copiar" width="30" height="30" onclick="copyToClipboard(\'binanceEmail\')"></div><br>
        <div class="mt-2"><span class="text-white font-semibold">Total a transferir:</span> <strong> <span id="totalUsd" class="text-white font-bold"> </span> </strong> </div>
    `;
  } else if (metodo === "zinli") {
    instrucciones = `
      <div class="bg-gray-700 rounded-lg p-4 mt-2">
        <div class="text-green-400 font-bold mb-1">Instrucciones para pagar con Zinli:</div>
        <div><span class="font-light text-white">Función en mantenimiento. Por favor, utiliza otro método de pago por ahora.
    `;
  }
  document.getElementById('pago-instrucciones').innerHTML = instrucciones;

  // Actualiza el total en bolívares/dólares según método
  const total = calcularTotalCompra(); // Ajusta para que retorne el total calculado
  if (metodo === "pagoMovil") document.getElementById('totalBs').textContent = total.bs + " Bs";
  else if (metodo === "binance" || metodo === "zinli") document.getElementById('totalUsd').textContent = total.usd + "$";
  
  // Verifica si se puede habilitar el botón
  validarFormularioCompra();
}

function calcularTotalCompra() {
  // Asume que tienes acceso a rifaSeleccionada, numerosSeleccionados, etc.
  // Si tienes el precio en Bs y USD, ajústalo aquí
  let bs = rifaSeleccionada.priceBs * numerosSeleccionados.length;
  let usd = rifaSeleccionada.priceUsd ? (rifaSeleccionada.priceUsd * numerosSeleccionados.length) : (bs / rifaSeleccionada.tasa);
  return { bs, usd: usd.toFixed(2) };
}

// --- INICIO DE CAMBIO (TAREA 4) ---
function isValidPhoneVE(raw) {
  let s = String(raw || '').trim().replace(/[^0-9+]/g, '');

  // 1. Normalizar a 10 dígitos (sin el 0 o el 58)
  // Caso: +58424...
  if (s.startsWith('+58')) {
    s = s.substring(3); // Queda 424...
  }
  // Caso: 58424...
  else if (s.startsWith('58') && s.length === 12) {
    s = s.substring(2); // Queda 424...
  }
  // Caso: 0424...
  else if (s.startsWith('0') && s.length === 11) {
    s = s.substring(1); // Queda 424...
  }

  // 2. Validar que tenga 10 dígitos y sea un prefijo venezolano
  const re = /^(412|414|416|422|424|426)\d{7}$/;
  return re.test(s); // s debe ser '4241234567'
}
// --- FIN DE CAMBIO (TAREA 4) ---
// --- INICIO DE CAMBIO (TAREA 4) ---
function normalizePhoneVE(raw) {
  // 1. Quitar todo lo que no sea dígito, excepto el '+' inicial
  let s = String(raw || '').trim().replace(/[^0-9+]/g, '');

  // 2. Caso: +58424...
  if (s.startsWith('+58')) {
    s = s.substring(3); // Queda 424...
  }
  // 3. Caso: 58424...
  else if (s.startsWith('58') && s.length === 12) {
    s = s.substring(2); // Queda 424...
  }
  // 4. Caso: 0424... (ya está casi bien)
  else if (s.startsWith('0') && s.length === 11) {
    s = s.substring(1); // Queda 424...
  }

  // 5. Si s es 10 dígitos (ej. 4241234567), le añadimos el '0'
  if (s.length === 10) {
    return '0' + s; // Devuelve 04241234567
  }

  // Si algo falló (ej. '424123' o un número inválido), devolvemos el original limpiado
  return String(raw).trim();
}
// --- FIN DE CAMBIO (TAREA 4) ---
function isValidName(x) {
  return /^[A-Za-zÁÉÍÓÚÑáéíóúñ\s]{2,40}$/.test(String(x).trim());
}
function isValidReference(x) {
  // 4–20 caracteres alfanuméricos (algunas referencias incluyen letras)
  return /^[A-Za-z0-9]{4,20}$/.test(String(x).trim());
}

function setInputState(el, ok) {
  if (!el) return;
  el.classList.toggle('ring-2', !ok);
  el.classList.toggle('ring-red-500', !ok);
}

// (Asegúrate de tener esta función de validación de email)
function isValidEmail(email) {
  const re = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;
  return re.test(String(email).toLowerCase());
}

function validarFormularioCompra() {
  const nombreEl   = document.getElementById('first-name');
  const apellidoEl = document.getElementById('last-name');
  const telefonoEl = document.getElementById('phone');
  const emailEl    = document.getElementById('email'); // <-- NUEVO
  const refEl      = document.getElementById('payment-reference');

  const nombreOk   = isValidName(nombreEl.value);
  const apellidoOk = isValidName(apellidoEl.value);
  const telOk      = isValidPhoneVE(telefonoEl.value);
  const emailOk    = isValidEmail(emailEl.value); // <-- NUEVO
  const refOk      = isValidReference(refEl.value);

  setInputState(nombreEl,   nombreOk);
  setInputState(apellidoEl, apellidoOk);
  setInputState(telefonoEl, telOk);
  setInputState(emailEl,    emailOk); // <-- NUEVO
  setInputState(refEl,      refOk);

  const btn = document.getElementById('btn-confirmar-compra');
  // Añadimos emailOk a la condición
  if (nombreOk && apellidoOk && telOk && emailOk && refOk && metodoPagoSeleccionado) {
    btn.removeAttribute('disabled');
  } else {
    btn.setAttribute('disabled', true);
  }
}

// Listeners para validación en vivo
['first-name','last-name','phone','email','payment-reference'].forEach(id=>{
  const el = document.getElementById(id);
  if (!el) return;
  el.addEventListener('input', validarFormularioCompra);
});


['first-name','last-name','phone','email','payment-reference'].forEach(id=>{
  const el = document.getElementById(id);
  if (el) el.addEventListener('input', validarFormularioCompra);
});

// Renderiza el resumen (AJUSTA con tus variables si necesitas)
function renderResumenContent() {
  document.getElementById('resumen-rifa-titulo').textContent = rifaSeleccionada.title;
  document.getElementById('resumen-numeros-lista').textContent = numerosSeleccionados.join(", ");
  //document.getElementById('resumen-numeros-total').textContent = numerosSeleccionados.length;
  document.getElementById('resumen-precio-boleto').textContent = rifaSeleccionada.priceBs + " Bs";
  const total = calcularTotalCompra();
  document.getElementById('resumen-total-pago').textContent = (metodoPagoSeleccionado === "pagoMovil" || !metodoPagoSeleccionado)
    ? total.bs + " Bs" : "$" + total.usd;
  // Puedes retornar un string si lo usas para inyectar innerHTML desde JS
}
function renderResumenContent() {
    const rifa = rifaSeleccionada;
    const numeros = numerosSeleccionados;

    // Asigna el nombre de la rifa
    document.getElementById('resumen-rifa-titulo').textContent = rifa.title;

    // Asigna los números seleccionados (puedes usar .join(', '))
    document.getElementById('resumen-numeros-lista').textContent = numeros.map(n => formatTicketNumber(n, rifa.totalNumbers)).join(', ');

    // Asigna el precio por boleto
    document.getElementById('resumen-precio-boleto').textContent = rifa.priceBs + ' Bs';

    // Asigna el total a pagar
    document.getElementById('resumen-total-pago').textContent = (rifa.priceBs * numeros.length) + ' Bs';
}


// Llama a renderResumenContent() cuando abras el modal de resumen


// Alternar FAQ
function toggleFAQ(id) {
    const content = document.getElementById(`faq-content-${id}`);
    const icon = document.getElementById(`faq-icon-${id}`);
            
    content.classList.toggle('hidden');
    icon.classList.toggle('fa-chevron-down');
    icon.classList.toggle('fa-chevron-up');
}
// Alternar menú móvil
    document.getElementById('mobile-menu-button').addEventListener('click', function() {
        document.getElementById('mobile-menu').classList.toggle('open');
    });

// Cerrar menú al hacer clic en un enlace
    document.querySelectorAll('#mobile-menu a').forEach(link => {
        link.addEventListener('click', () => {
            document.getElementById('mobile-menu').classList.remove('open');
        });
    });
        // Cerrar modales al hacer clic FUERA del contenido (overlay)
        ['modal-selector','modal-resumen','modal-exito'].forEach(id => {
        const overlay = document.getElementById(id);
        if (!overlay) return;
        overlay.addEventListener('click', (e) => {
            if (e.target !== overlay) return;            // Solo si hacen clic en el fondo
            // Si el modal de éxito está abierto, priorizamos cerrarlo
            if (id === 'modal-exito') { cerrarModalExito?.(); return; }
            if (exitoAbierto && id !== 'modal-exito') return;

            if (id === 'modal-selector') cerrarModalSelector?.();
            if (id === 'modal-resumen')  cerrarModalResumen?.();
        });
        });

        // Cerrar modales con tecla Escape
        document.addEventListener('keydown', (e) => {
        if (e.key !== 'Escape') return;

        // Si el modal de Éxito está abierto, ciérralo primero
        if (!document.getElementById('modal-exito')?.classList.contains('hidden')) {
            cerrarModalExito?.(); 
            return;
        }
        // Luego resumen y, si no, selector
        if (!document.getElementById('modal-resumen')?.classList.contains('hidden')) {
            cerrarModalResumen?.(); 
            return;
        }
        if (!document.getElementById('modal-selector')?.classList.contains('hidden')) {
            cerrarModalSelector?.(); 
            return;
        }
        });

        // Cambia el rango visible de páginas (avanza o retrocede de 10 en 10, y actualiza la página activa)
// --- INICIO DE CAMBIO (TAREA 5 - vFinal) ---
function cambiarBloquePaginas(direccion) {
    // dirección = +1 o -1
    const rifa = rifaSeleccionada;
    const total = rifa.totalNumbers || 100;
    let numerosFiltrados = Array.from({ length: total }, (_, i) => i + 1);
    if (searchValue && searchValue.length > 0) {
        numerosFiltrados = numerosFiltrados.filter(n => n.toString().includes(searchValue));
    }
    const paginasTotales = Math.ceil(numerosFiltrados.length / numerosPorPagina);
    let paginasPorBloque = 10;
    let bloqueActual = Math.floor((paginaActual - 1) / paginasPorBloque);

    let nuevoBloque = bloqueActual + direccion;
    if (nuevoBloque < 0) nuevoBloque = 0;
    let inicioNuevoBloque = nuevoBloque * paginasPorBloque + 1;
    if (inicioNuevoBloque > paginasTotales) inicioNuevoBloque = paginasTotales - paginasPorBloque + 1;
    if (inicioNuevoBloque < 1) inicioNuevoBloque = 1;

    paginaActual = inicioNuevoBloque; // Al cambiar de bloque, ir a la primera página del nuevo rango

    // Ya no redibuja TODO, solo el grid y el paginador
    const container = document.getElementById('grid-paginator-container');
    if (container) {
        container.innerHTML = renderGridAndPaginatorHTML();
    }
}
// --- FIN DE CAMBIO (TAREA 5 - vFinal) ---

// Desliza la ventana de páginas 1 hacia adelante o atrás (sin cambiar la página activa si sigue en rango, si no, la mueve al extremo)
function moverRangoPaginas(direccion) {
    const rifa = rifaSeleccionada;
    const total = rifa.totalNumbers || 100;
    let numerosFiltrados = Array.from({ length: total }, (_, i) => i + 1);
    if (searchValue && searchValue.length > 0) {
        numerosFiltrados = numerosFiltrados.filter(n => n.toString().includes(searchValue));
    }
    const paginasTotales = Math.ceil(numerosFiltrados.length / numerosPorPagina);
    let paginasPorBloque = 10;
    let bloqueActual = Math.floor((paginaActual - 1) / paginasPorBloque);
    let inicioBloque = bloqueActual * paginasPorBloque + 1;
    let finBloque = Math.min(inicioBloque + paginasPorBloque - 1, paginasTotales);

    // Si es hacia adelante y se puede, mover el rango 1 página a la derecha
    if (direccion === 1 && finBloque < paginasTotales) {
        inicioBloque += 1;
    }
    // Si es hacia atrás y se puede, mover el rango 1 página a la izquierda
    if (direccion === -1 && inicioBloque > 1) {
        inicioBloque -= 1;
    }
    let finNuevoBloque = Math.min(inicioBloque + paginasPorBloque - 1, paginasTotales);

    // Si la página actual queda fuera del rango, muévete al inicio del rango
    if (paginaActual < inicioBloque || paginaActual > finNuevoBloque) {
        paginaActual = inicioBloque;
    }
    document.getElementById('selector-content').innerHTML = renderSelectorContent();
}
function copyToClipboard(elementId) {
    const text = document.getElementById(elementId).textContent;
    navigator.clipboard.writeText(text).then(() => {
      showToast("¡Copiado!");
    });
  }

  // --- INICIO DE CAMBIO (TAREA "Toast Bonito") ---
  function showToast(message) {
    const toast = document.getElementById("toast");
    if (!toast) return;

    toast.textContent = message;

    // 1. Mostrar (Fade in y pop)
    toast.classList.remove('opacity-0', 'invisible', 'scale-95');
    toast.classList.add('opacity-100', 'visible', 'scale-100');

    // 2. Ocultar después de 1.5 segundos
    setTimeout(() => {
      toast.classList.remove('opacity-100', 'visible', 'scale-100');
      toast.classList.add('opacity-0', 'invisible', 'scale-95');
    }, 1500); // 1500ms = 1.5 segundos. Cambia a 1000 si lo quieres más rápido
  }
  // --- FIN DE CAMBIO ---
  
async function confirmarCompra() {
    // META: el usuario ya está introduciendo/confirmando datos de pago
  metaTrack('AddPaymentInfo');
  const firstName        = document.getElementById('first-name').value.trim();
  const lastName         = document.getElementById('last-name').value.trim();
  const phone            = document.getElementById('phone').value.trim();
  const email            = document.getElementById('email').value.trim(); // <-- NUEVO
  const paymentReference = document.getElementById('payment-reference').value.trim();
  // const proofInput       = document.getElementById('payment-proof'); // <-- ELIMINADO
  // const file             = proofInput.files[0] || null; // <-- ELIMINADO

// // Validar archivo <-- TODO ESTE BLOQUE SE ELIMINA
// let fileOk = file;
// if (!file) {
//   alert("Adjunta el comprobante de pago.");
//   return;
// }
// // Solo imágenes o PDF
// const okTypes = ["image/jpeg","image/png","image/webp","application/pdf"];
// if (!okTypes.includes(file.type)) {
//   alert("Formato no permitido. Sube JPG, PNG, WEBP o PDF.");
//   return;
// }
// // Si es imagen y pasa de 1.2MB, comprimimos a ~0.8 calidad y máx 1600px
// if (file.type.startsWith("image/") && file.size > 1.2 * 1024 * 1024) {
//   fileOk = await compressImageFile(file, {maxW:1600, maxH:1600, quality:0.8});
// }


// Normalizar teléfono (0412...) y guardarlo para "Ver mis números"
const phoneNorm = normalizePhoneVE(document.getElementById('phone').value);
document.getElementById('phone').value = phoneNorm;
window.lastPurchasePhone = phoneNorm; // <-- lo usaremos al abrir "Mis números"


const paymentMethod = metodoPagoSeleccionado; // 'pagoMovil' | 'binance' | 'zinli'

// Validación estricta
if (!isValidName(firstName) || !isValidName(lastName) || !isValidPhoneVE(phone) || !isValidEmail(email) || !isValidReference(paymentReference)) {
  validarFormularioCompra(); // pinta los errores
  alert("Revisa todos los datos: nombre, apellido, teléfono, email y referencia.");
  return;
}

  // 👇 FormData (NO pongas headers Content-Type)
  const formData = new FormData();
  formData.append('raffleId', rifaSeleccionada._id);
  formData.append('numbers', JSON.stringify(numerosSeleccionados));
  formData.append('firstName', firstName);
  formData.append('lastName', lastName);
  formData.append('phone', window.lastPurchasePhone || phone);
  formData.append('email', email); // <-- NUEVO
  formData.append('paymentMethod', paymentMethod);
  formData.append('paymentReference', paymentReference);
  // formData.append('paymentProof', fileOk); // <-- ELIMINADO
  formData.append('contactConsent', window._consentWhatsApp ? 'true' : 'false');

  try {
    const res = await fetch(`${API}/api/purchases`, {
      method: 'POST',
      body: formData
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Error al registrar la compra: ${err}`);
    }
    // === INICIO PIXEL FACEBOOK PRO (Advanced Matching + Purchase) ===
    try {
        // ID de tu Píxel (Lo tomamos del mensaje que me pasaste)
        const PIXEL_ID = '3648115792156539';

        // 1. Preparar datos limpios del usuario
        let telefonoPixel = (window.lastPurchasePhone || phone || '').replace(/\D/g, '');
        if (!telefonoPixel.startsWith('58') && telefonoPixel.length === 10) {
            telefonoPixel = '58' + telefonoPixel; // Agregamos 58 si falta
        }
        const emailPixel = email ? email.trim().toLowerCase() : '';
        const nombrePixel = firstName ? firstName.trim().toLowerCase() : '';
        const apellidoPixel = lastName ? lastName.trim().toLowerCase() : '';

        // 2. Calcular montos
        const precioUnitarioUsd = Number(rifaSeleccionada.priceUsd) || 0;
        const totalUsd = precioUnitarioUsd * (numerosSeleccionados.length || 0);

        if (typeof fbq === 'function') {
            // ---> AQUÍ ESTÁ LA SOLUCIÓN AL ERROR <---
            // Llamamos a 'init' nuevamente CON LOS DATOS para activar Coincidencias Manuales
            fbq('init', PIXEL_ID, {
                em: emailPixel, // Email
                ph: telefonoPixel, // Phone
                fn: nombrePixel, // First Name
                ln: apellidoPixel // Last Name
            });

            // 3. Luego disparamos la compra (ahora el pixel ya sabe quién es el usuario)
            fbq('track', 'Purchase', {
                value: totalUsd,
                currency: 'USD',
                content_name: rifaSeleccionada.title,
                content_ids: [rifaSeleccionada._id],
                content_type: 'product',
                num_items: numerosSeleccionados.length
            });
            
            console.log('✅ Pixel actualizado con Datos de Usuario y Purchase enviado ($' + totalUsd + ')');
        }
    } catch (errPixel) {
        console.warn('Error enviando Pixel:', errPixel);
    }
    // === FIN PIXEL FACEBOOK ===
    // Éxito: lo que ya tienes
    cerrarModalResumen();

    const pagaEnUsd = (metodoPagoSeleccionado === 'binance' || metodoPagoSeleccionado === 'zinli');
    const tieneUsd  = (rifaSeleccionada?.priceUsd || 0) > 0;
    const usarUsd   = pagaEnUsd && tieneUsd;

    const price  = usarUsd ? (rifaSeleccionada.priceUsd || 0) : (rifaSeleccionada.priceBs || 0);
    const total  = price * (numerosSeleccionados?.length || 0);
    const moneda = usarUsd ? '$' : 'Bs';
    const metodoLegible =
      metodoPagoSeleccionado === 'pagoMovil' ? 'Pago Móvil' :
      metodoPagoSeleccionado === 'binance'   ? 'Binance'    :
      metodoPagoSeleccionado === 'zinli'     ? 'Zinli'      : '-';

    mostrarModalExito({
      titulo: rifaSeleccionada?.title,
      numeros: numerosSeleccionados,
      metodo: metodoLegible,
      referencia: paymentReference,
      total,
      moneda
    });

    cargarRifas();
  } catch (error) {
    console.error('Error registrando la compra:', error);
    alert('Hubo un problema al registrar tu compra. Intenta de nuevo.');
  }
}

function mostrarModalExito({ titulo, numeros, metodo, referencia, total, moneda }) {
  // Relleno
  document.getElementById('exito-rifa').textContent = titulo || '-';
  document.getElementById('exito-numeros').textContent =
    Array.isArray(numeros) && numeros.length ? numeros.map(n => formatTicketNumber(n, rifaSeleccionada.totalNumbers)).join(', ') : '-';
  document.getElementById('exito-metodo').textContent = metodo || '-';
  document.getElementById('exito-referencia').textContent = referencia || '-';
  document.getElementById('exito-total').textContent =
    (typeof total !== 'undefined') ? `${moneda}${total}` : '-';

  // Elementos
  const overlay = document.getElementById('modal-exito');
  const card = document.getElementById('exito-card');

  // Evitar cierre por burbujeo
  card.addEventListener('click', (e) => e.stopPropagation());

  // Mostrar overlay
  overlay.classList.remove('hidden');
  overlay.classList.add('flex');

  // 🔒 Bloquear scroll del fondo
  document.body.style.overflow = 'hidden';

  // ✅ Scroll interno del card (móvil/desktop)
  card.style.overflowY = 'auto';
  card.style.webkitOverflowScrolling = 'touch';
  const updateMaxH = () => {
    const vh = window.visualViewport ? window.visualViewport.height : window.innerHeight;
    card.style.maxHeight = Math.max(320, vh - 32) + 'px';
  };
  updateMaxH();
  overlay._onResize = updateMaxH;
  window.addEventListener('resize', overlay._onResize);
  window.addEventListener('orientationchange', overlay._onResize);

  // iOS: bloquear "rubber band" solo fuera del card
  if (!overlay._touchBlock) {
    overlay._touchBlock = (e) => { if (e.target === overlay) e.preventDefault(); };
    overlay.addEventListener('touchmove', overlay._touchBlock, { passive: false });
  }

  // Estado
  exitoAbierto = true;

  // Animación
  card.style.transform = 'scale(0.96)';
  setTimeout(() => { card.style.transform = 'scale(1)'; }, 0);

  // === META: Purchase (cliente + CAPI con deduplicación) ===
  try {
    const eventId  = genEventId();
    const currency = currencyCodeFrom(moneda);
    metaTrack('Purchase', { value: total, currency }, { eventId });
    sendPurchaseToCapi({ value: total, currency, eventId });
  } catch(_) {}
}

function cerrarModalExito() {
  const overlay = document.getElementById('modal-exito');
  const card = document.getElementById('exito-card');

  // Ocultar overlay
  overlay.classList.add('hidden');
  overlay.classList.remove('flex');

  // 🔓 Liberar y limpiar
  exitoAbierto = false;
  document.body.style.overflow = 'auto';

  if (overlay._touchBlock) {
    overlay.removeEventListener('touchmove', overlay._touchBlock);
    delete overlay._touchBlock;
  }
  if (overlay._onResize) {
    window.removeEventListener('resize', overlay._onResize);
    window.removeEventListener('orientationchange', overlay._onResize);
    delete overlay._onResize;
  }

  // Reset estilos
  card.style.overflowY = '';
  card.style.maxHeight = '';
  card.style.webkitOverflowScrolling = '';
}


// ============ INICIALIZAR =====================
window.addEventListener('DOMContentLoaded', () => {
  cargarRifas();

  // META: PageView
  metaTrack('PageView');

  // META: Contact al click del botón de WhatsApp en el modal de éxito
  const waBtn = document.getElementById('exito-join-wa');
  if (waBtn) {
    waBtn.addEventListener('click', () => {
      metaTrack('Contact', { content_name: 'join_whatsapp' });
    });
  }
});

// Envolver el click para mostrar el mini-modal de aceptación
(function wireConfirmarCompra() {
  const btn = document.getElementById('btn-confirmar-compra');
  if (!btn) return;

  // Guardamos el handler original (si existía)
  const originalHandler = btn.onclick ? btn.onclick.bind(btn) : (typeof confirmarCompra === 'function' ? confirmarCompra : null);

  btn.onclick = (e) => {
    e.preventDefault();
    abrirModalAceptar(() => {
      // Cuando aceptan, ejecutamos la acción original
      if (originalHandler) originalHandler();
    });
  };
})();


// ======= MINI-MODAL ACEPTACIÓN T&C =======
let _onAcceptContinue = null;

function abrirModalAceptar(cb) {
  _onAcceptContinue = cb || null;
  const overlay = document.getElementById('modal-aceptar');
  if (!overlay) return;

    // Resetear estado
  const chk = document.getElementById('aceptar-checkbox');
  const chkConsent = document.getElementById('consent-checkbox');   // NUEVO
  const btnOK = document.getElementById('btn-aceptar-confirmar');

  if (chk) chk.checked = false;
  if (chkConsent) chkConsent.checked = false;                        // NUEVO
  if (btnOK) btnOK.disabled = true;

  overlay.classList.remove('hidden');
  document.body.style.overflow = 'hidden';

  // Eventos del modal
  document.getElementById('btn-aceptar-cancelar').onclick = cerrarModalAceptar;
  document.getElementById('aceptar-checkbox').onchange = function() {
    document.getElementById('btn-aceptar-confirmar').disabled = !this.checked;
  };
  document.getElementById('btn-aceptar-confirmar').onclick = () => {
    // NUEVO: persistimos el consentimiento para usarlo en confirmarCompra()
    window._consentWhatsApp = !!document.getElementById('consent-checkbox')?.checked;
    cerrarModalAceptar();
    if (_onAcceptContinue) _onAcceptContinue();
  };

}

function cerrarModalAceptar() {
  const overlay = document.getElementById('modal-aceptar');
  if (!overlay) return;
  overlay.classList.add('hidden');
  // OJO: mantenemos overflow hidden porque probablemente sigue abierto el modal-resumen
  // El overflow se libera cuando cierres el modal-resumen o el selector.
}

// Click fuera del modal → cerrar
['modal-aceptar'].forEach(id => {
  const ov = document.getElementById(id);
  if (!ov) return;
  ov.addEventListener('click', (e) => {
    if (e.target !== ov) return;
    cerrarModalAceptar();
  });
});

// Escape cierra el mini-modal (prioridad alta)
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  const ov = document.getElementById('modal-aceptar');
  if (ov && !ov.classList.contains('hidden')) {
    cerrarModalAceptar();
  }
});

// ===== Utilidad: comprimir imagen (canvas) =====
function loadImageAsBitmap(file) {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = fr.result;
    };
    fr.onerror = reject;
    fr.readAsDataURL(file);
  });
}
async function compressImageFile(file, {maxW=1600, maxH=1600, quality=0.8}={}) {
  const img = await loadImageAsBitmap(file);
  // calcular tamaño destino manteniendo aspecto
  let {width:w, height:h} = img;
  const ratio = Math.min(maxW / w, maxH / h, 1);
  const dw = Math.round(w * ratio);
  const dh = Math.round(h * ratio);

  const canvas = document.createElement('canvas');
  canvas.width = dw; canvas.height = dh;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0, dw, dh);

  const mime = 'image/jpeg'; // salida jpeg
  const dataUrl = canvas.toDataURL(mime, quality);
  const bin = atob(dataUrl.split(',')[1]);
  const buf = new Uint8Array(bin.length);
  for (let i=0;i<bin.length;i++) buf[i] = bin.charCodeAt(i);
  const blob = new Blob([buf], {type:mime});
  return new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), {type:mime, lastModified: Date.now()});
}

function openMisNumeros() {
  document.getElementById('misnumeros-modal')?.classList.remove('hidden');
  setTimeout(() => document.getElementById('mn-phone')?.focus(), 0);
}
function closeMisNumeros() {
  document.getElementById('misnumeros-modal')?.classList.add('hidden');
}

function formatVEPhoneForView(raw = '') {
  // muestra 04xx***xxxx si lo quieres enmascarar; por ahora, lo dejamos tal cual en la cabecera
  return (raw + '').trim();
}

async function buscarMisNumeros() {
  const phone = (document.getElementById('mn-phone')?.value || '').trim();
  const includePending = document.getElementById('mn-include')?.checked ? '1' : '0';
  const resultsEl = document.getElementById('mn-results');

  if (!phone) {
    resultsEl.innerHTML = `<div class="text-red-400">Escribe tu número de teléfono.</div>`;
    return;
  }

  resultsEl.innerHTML = `<div class="text-gray-400">Buscando...</div>`;
  try {
    const url = `${API}/api/tickets/by-phone?phone=${encodeURIComponent(phone)}&includePending=${includePending}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Error de servidor');
    const data = await res.json();

    if (!data.results || data.results.length === 0) {
      resultsEl.innerHTML = `
        <div class="bg-gray-700/50 rounded-lg p-4">
          <div class="text-sm text-gray-400 mb-2">número de teléfono: <span class="text-white font-mono">${formatVEPhoneForView(phone)}</span></div>
          <div class="text-gray-300">No encontramos tickets asociados en rifas activas.</div>
        </div>`;
      return;
    }

    // Render
    let html = `
      <div class="text-sm text-gray-400 mb-2">número de teléfono: <span class="text-white font-mono">${formatVEPhoneForView(phone)}</span></div>
    `;
    for (const r of data.results) {
      html += `
        <div class="bg-gray-700/50 rounded-xl p-4">
          <div class="text-green-400 font-bold text-lg mb-2">rifa: <span class="text-white">${r.raffleTitle || 'Rifa'}</span></div>
          <div class="text-gray-300">números:</div>
          <ul class="mt-2 space-y-1">
            ${
              (r.numbers || []).map(n =>
                `<li class="flex justify-between border-b border-gray-700/60 py-1">
                   <span class="font-mono">#${formatTicketNumber(n.number, r.totalNumbers)}</span>
                   <span class="${n.status === 'Aprobado' ? 'text-green-400' : 'text-yellow-300'} font-semibold">${n.status}</span>
                 </li>`
              ).join('')
            }
          </ul>
        </div>
      `;
    }
    resultsEl.innerHTML = html;

  } catch (e) {
    console.error(e);
    resultsEl.innerHTML = `<div class="text-red-400">No se pudo realizar la búsqueda. Intenta de nuevo.</div>`;
  }
}

// Enganches
document.getElementById('link-mis-numeros')?.addEventListener('click', (e) => { e.preventDefault(); openMisNumeros(); });
document.getElementById('link-mis-numeros-mobile')?.addEventListener('click', (e) => { e.preventDefault(); openMisNumeros(); });
document.getElementById('mn-close')?.addEventListener('click', closeMisNumeros);
document.getElementById('mn-search')?.addEventListener('click', buscarMisNumeros);
document.getElementById('mn-phone')?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') { e.preventDefault(); buscarMisNumeros(); }
});

// Cerrar al hacer click fuera del cuadro
const mnModal = document.getElementById('misnumeros-modal');
mnModal?.addEventListener('mousedown', (e) => {
  // si se hace click en el overlay (no dentro de la tarjeta)
  if (e.target === mnModal) closeMisNumeros();
});

// Cerrar con la tecla Escape
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && mnModal && !mnModal.classList.contains('hidden')) {
    closeMisNumeros();
  }
});
// === Contacto por WhatsApp (sin backend) ===
// Cambia este número si hace falta: en formato internacional SIN "+"
const CONTACT_WA = '584129974035';

function contactToWhatsApp() {
  const nameEl = document.getElementById('name');
  const emailEl = document.getElementById('email');
  const msgEl = document.getElementById('message');

  const name = (nameEl?.value || '').trim() || '(sin nombre)';
  const email = (emailEl?.value || '').trim() || '(sin email)';
  const msg = (msgEl?.value || '').trim();

  // Validación mínima
  if (!msg) {
    alert('Escribe tu mensaje antes de enviarlo por WhatsApp.');
    msgEl?.focus();
    return;
  }

  const text =
    `Hola Doble Cero 👋\n\n` +
    `Mi nombre: ${name}\n` +
    `Correo: ${email}\n\n` +
    `Mensaje:\n${msg}`;

  const url = `https://wa.me/${CONTACT_WA}?text=${encodeURIComponent(text)}`;
  window.open(url, '_blank');
}

// Listeners
document.getElementById('btn-contact-wa')?.addEventListener('click', contactToWhatsApp);
// Si alguien presiona Enter en el form, que también abra WhatsApp
document.getElementById('contact-form')?.addEventListener('submit', (e) => {
  e.preventDefault();
  contactToWhatsApp();
});

// Botón del modal de éxito: "Ver mis números"
document.getElementById('btn-exito-misnumeros')?.addEventListener('click', () => {
  try { cerrarModalExito(); } catch {}
  // Rellena el input del modal "Mis números" con el teléfono usado en la compra
  const input = document.getElementById('mn-phone');
  if (input && window.lastPurchasePhone) {
    input.value = window.lastPurchasePhone;
  }
  // Abre el modal (usa tu función existente)
  if (typeof openMisNumeros === 'function') {
    openMisNumeros();
  } else {
    // fallback mínimo si no tienes helper
    document.getElementById('modal-misnumeros')?.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  }
  // Dispara la búsqueda automáticamente (usa tu función si existe)
  if (typeof buscarMisNumeros === 'function') {
    // pequeño delay para asegurar render
    setTimeout(() => buscarMisNumeros(), 50);
  } else {
    // fallback con click si tienes un botón de buscar
    setTimeout(() => document.getElementById('btn-mn-buscar')?.click(), 50);
  }
});

// --- INICIO DE CAMBIO (TAREA "Seleccionar Todos") ---
/**
 * FUNCIÓN SECRETA DE ADMIN: Selecciona todos los números disponibles.
 * Para usar:
 * 1. Abre el modal de la rifa.
 * 2. Abre la consola del navegador (F12).
 * 3. Escribe: seleccionarTodosDisponibles() y presiona Enter.
 */
function seleccionarTodosDisponibles() {
    if (!rifaSeleccionada) {
        console.error("No hay ninguna rifa seleccionada. Abre el modal de una rifa primero.");
        return "Error: Abre el modal de una rifa primero.";
    }

    console.log(`Seleccionando todos los números disponibles para "${rifaSeleccionada.title}"...`);

    // 1. Obtener todos los números vendidos/reservados
    const total = rifaSeleccionada.totalNumbers || 100;
    const reservados = Array.isArray(rifaSeleccionada.numbersReserved) ? rifaSeleccionada.numbersReserved : [];
    const vendidos = [...new Set([...(rifaSeleccionada.numbersSold || []), ...reservados])];

    // 2. Crear la lista de TODOS los disponibles
    const disponibles = [];
    for (let i = 1; i <= total; i++) {
        if (!vendidos.includes(i)) {
            disponibles.push(i);
        }
    }

    // 3. Asignar esta lista a la selección global
    numerosSeleccionados = disponibles;

    // 4. Forzar un redibujado completo del contenido del modal
    // (Esto es necesario para que las "píldoras" y el grid se actualicen)
    document.getElementById('selector-content').innerHTML = renderSelectorContent();

    const mensaje = `¡Función de Admin!\n\nSe han seleccionado los ${numerosSeleccionados.length} números disponibles.`;
    console.log(mensaje);
    alert(mensaje); // Un pop-up para confirmar
    return `Éxito: ${numerosSeleccionados.length} números seleccionados.`;
}
// --- FIN DE CAMBIO ---

// =========================================================
// === NUEVA LÓGICA VISUAL (FASE 4) - REEMPLAZAR EN MAIN.JS ===
// =========================================================

// Variable de estado para la vista (poner al inicio del archivo o aquí)
// let currentViewMode = 'random'; // Asegúrate de que esta variable exista globalmente

// 1. Renderizado Principal del Modal
function renderSelectorContent() {
    const rifa = rifaSeleccionada;
    if (!rifa) return '';

    // Datos básicos
    const total = rifa.totalNumbers || 100;
    const reservados = Array.isArray(rifa.numbersReserved) ? rifa.numbersReserved : [];
    const vendidos = [...new Set([...(rifa.numbersSold || []), ...reservados])];
    const disponiblesCount = total - vendidos.length;
    
    // HTML de Premios (Corregido el "undefined°")
    let premiosHtml = '';
    if (rifa.prizes && rifa.prizes.length > 0) {
        premiosHtml = `
            <div class="mb-4 bg-gray-900/50 p-3 rounded-lg border border-gray-700">
                <span class="text-green-400 font-bold block mb-2"><i class="fas fa-trophy mr-1"></i> Premios:</span>
                <ul class="space-y-1">
                    ${rifa.prizes.map((p, i) => `
                        <li class="text-gray-300 text-sm flex items-start gap-2">
                            <span class="bg-green-500 text-black text-sm font-bold px-1.5 rounded">
                                ${p.place || (i + 1)}°
                            </span>
                            ${p.description}
                        </li>
                    `).join('')}
                </ul>
            </div>`;
    }

    // Configuración Botones (Backend o Default)
    const btns = rifa.randomButtons && rifa.randomButtons.length > 0 
        ? rifa.randomButtons 
        : [
            { count: 5, label: "Prueba" }, 
            { count: 10, label: "Popular" }, 
            { count: 25, label: "Para ganar" }
        ];

    // --- CONTENIDO CENTRAL (SWITCH) ---
    let contenidoCentral = '';
    
    if (currentViewMode === 'random') {
        // Vista AZAR (Input grande + Botones)
        contenidoCentral = `
            <div class="flex flex-col items-center py-6 animate-fade-in">
                <div class="w-full max-w-xs mb-6">
                    <label class="block text-gray-400 text-sm mb-2 text-center font-bold">Escribe una cantidad</label>
                    <div class="flex gap-2">
                        <input type="number" id="input-cantidad-azar" placeholder="Ej: 50" 
                            class="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-3 text-center text-white text-xl font-bold focus:border-green-500 outline-none transition-colors"
                            onkeydown="if(event.key === 'Enter') agregarDesdeInput()">
                        <button onclick="agregarDesdeInput()" class="bg-gray-700 hover:bg-green-500 hover:text-black text-white px-4 rounded-lg transition-colors shadow-lg">
                            <i class="fas fa-plus"></i>
                        </button>
                    </div>
                </div>

                <div class="w-full mb-4">
                     <p class="text-gray-500 text-xs text-center mb-3 uppercase tracking-wide font-bold">O elige una opción rápida</p>
                     <div class="grid grid-cols-3 gap-3">
                        ${btns.map(btn => `
                            <button onclick="agregarAlAzar(${btn.count})" 
                                class="flex flex-col items-center justify-center bg-gray-800 border-2 border-gray-700 hover:border-green-500 hover:bg-gray-700/80 text-white py-4 rounded-xl transition-all duration-200 active:scale-95 group shadow-md">
                                <span class="text-2xl font-bold text-green-400 group-hover:text-green-300">${btn.count}</span>
                                <span class="text-[10px] text-gray-400 uppercase mt-1 font-bold">${btn.label}</span>
                            </button>
                        `).join('')}
                     </div>
                </div>
            </div>`;
    } else {
        // Vista TABLA (Buscador + Grid existente)
        contenidoCentral = `
            <div class="mb-3 animate-fade-in">
                <div class="relative">
                    <i class="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500"></i>
                    <input type="text" placeholder="Buscar número (ej: 0429)" 
                        class="w-full bg-gray-900 border border-gray-700 rounded-lg pl-10 pr-4 py-3 text-white focus:border-green-500 outline-none shadow-inner" 
                        value="${searchValue}" oninput="buscarNumero(this.value)">
                </div>
            </div>
            <div id="grid-paginator-container">
                ${renderGridAndPaginatorHTML()}
            </div>`;
    }

    // --- HTML FINAL COMPLETO ---
    return `
        <div class="relative h-48 sm:h-64">
            <img src="${rifa.image}" alt="${rifa.title}" class="w-full h-full object-cover">
            <div class="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/60 to-transparent"></div>
            <button onclick="cerrarModalSelector()" class="absolute top-4 right-4 bg-black/60 hover:bg-black text-white w-8 h-8 rounded-full flex items-center justify-center transition backdrop-blur-md z-10 font-bold">
                <i class="fas fa-times"></i>
            </button>
        </div>

        <div class="p-4 sm:p-6 -mt-8 relative bg-gray-800 rounded-t-3xl min-h-[500px] flex flex-col shadow-[0_-5px_20px_rgba(0,0,0,0.5)] border-t border-gray-700">
            
            <h2 class="text-2xl sm:text-3xl font-extrabold text-green-400 mb-2 leading-tight">${rifa.title}</h2>
            <p class="text-gray-400 text-sm mb-4 line-clamp-2">${rifa.description}</p>
            
            ${premiosHtml}

            <div class="grid grid-cols-3 gap-2 mb-6 text-center bg-gray-900 rounded-xl p-3 border border-gray-700/50 shadow-inner">
                <div class="p-1">
                    <div class="text-sm text-gray-500 uppercase font-bold">Precio</div>
                    <div class="text-green-400 font-bold text-base">${rifa.priceBs} Bs</div>
                </div>
                <div class="p-1 border-l border-gray-700">
                    <div class="text-sm text-gray-500 uppercase font-bold">Fecha</div>
                    <div class="text-white font-bold text-base">${rifa.drawDate ? new Date(rifa.drawDate).toLocaleDateString() : 'Pronto'}</div>
                </div>
                <div class="p-1 border-l border-gray-700">
                    <div class="text-sm text-gray-500 uppercase font-bold">Quedan</div>
                    <div class="text-white font-bold text-lg">${disponiblesCount}</div>
                </div>
            </div>

            <div class="grid grid-cols-2 gap-3 mb-6 bg-gray-900/50 p-1 rounded-xl">
                <button onclick="cambiarModoVista('random')" 
                    class="flex items-center justify-center gap-2 py-3 rounded-lg font-bold transition-all duration-200 border-2 
                    ${currentViewMode === 'random' ? 'bg-gray-700 border-green-500 text-green-400 shadow-md' : 'bg-transparent border-transparent text-gray-500 hover:text-gray-300'}">
                    <i class="fas fa-dice"></i> Azar
                </button>
                <button onclick="cambiarModoVista('table')" 
                    class="flex items-center justify-center gap-2 py-3 rounded-lg font-bold transition-all duration-200 border-2 
                    ${currentViewMode === 'table' ? 'bg-gray-700 border-green-500 text-green-400 shadow-md' : 'bg-transparent border-transparent text-gray-500 hover:text-gray-300'}">
                    <i class="fas fa-th"></i> Tabla
                </button>
            </div>

            <div id="dynamic-content-area" class="flex-1">
                ${contenidoCentral}
            </div>

            <div id="seleccionados-footer" class="mt-4">
                ${generarHtmlFooterResumen()}
            </div>
        </div>
    `;
}

// 2. Helper que genera SÓLO la parte de abajo (Píldoras + Total + Botón)
function generarHtmlFooterResumen() {
    const total = rifaSeleccionada.totalNumbers;
    const seleccionadosCount = numerosSeleccionados.length;
    const precio = rifaSeleccionada.priceBs; 
    const totalPagar = (seleccionadosCount * precio).toLocaleString('es-VE');

    // Generar píldoras (chips) con botón de borrar
    let pillsHtml = '';
    if (seleccionadosCount > 0) {
        const numsSorted = [...numerosSeleccionados].sort((a,b) => a-b);
        pillsHtml = `
            <div class="bg-gray-900 p-3 rounded-xl border border-gray-700 mb-4 animate-fade-in-up">
                <div class="flex justify-between items-center mb-2">
                    <span class="text-xs text-gray-400 uppercase font-bold">Tus Tickets (${seleccionadosCount})</span>
                    <button onclick="limpiarNumeros()" class="text-red-400 text-xs hover:text-red-300 font-bold flex items-center gap-1 transition-colors">
                        <i class="fas fa-trash-alt"></i> Borrar todos
                    </button>
                </div>
                <div class="flex flex-wrap gap-2 max-h-32 overflow-y-auto custom-scrollbar">
                    ${numsSorted.map(n => `
                        <button onclick="toggleNumero(${n})" class="group bg-gray-800 border border-green-500/30 text-green-400 hover:bg-red-500/20 hover:border-red-500 hover:text-red-400 text-xs font-bold px-3 py-1.5 rounded-full transition-all duration-200 flex items-center gap-1" title="Clic para eliminar">
                            ${formatTicketNumber(n, total)}
                            <i class="fas fa-times opacity-50 group-hover:opacity-100"></i>
                        </button>
                    `).join('')}
                </div>
            </div>
        `;
    }

    // Botón Continuar
    const disabled = seleccionadosCount === 0;
    const btnClass = disabled 
        ? "bg-gray-700 text-gray-500 cursor-not-allowed opacity-50"
        : "bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-black shadow-lg shadow-green-500/20 transform active:scale-95";

    return `
        ${pillsHtml}
        <div class="pt-2 border-t border-gray-700 sticky bottom-0 bg-gray-800 z-20 pb-2">
            <div class="flex justify-between items-end mb-3 px-1">
                <div class="text-sm text-gray-400 font-medium">Total a pagar:</div>
                <div class="text-2xl font-extrabold text-white tracking-tight">${totalPagar} Bs</div>
            </div>
            <button id="btn-continuar-compra" onclick="continuarCompra()" ${disabled ? 'disabled' : ''}
                class="w-full py-4 rounded-xl font-extrabold text-lg transition-all duration-300 flex items-center justify-center gap-2 ${btnClass}">
                <span>${disabled ? 'Selecciona tickets' : 'Continuar Compra'}</span>
                ${!disabled ? '<i class="fas fa-arrow-right"></i>' : ''}
            </button>
        </div>
    `;
}

// 3. Logic: Toggle Número (Con actualización de footer)
function toggleNumero(num, elementoBoton) {
    // Si no pasaron el botón, intentamos buscarlo en el grid actual
    if (!elementoBoton) {
        elementoBoton = document.querySelector(`.numero-btn[data-numero="${num}"]`);
    }

    const idx = numerosSeleccionados.indexOf(num);
    if (idx >= 0) {
        // Deseleccionar
        numerosSeleccionados.splice(idx, 1);
        if (elementoBoton) {
            elementoBoton.classList.remove('bg-green-400', 'text-gray-900', 'border-green-600');
            elementoBoton.classList.add('bg-gray-700', 'text-gray-200', 'hover:bg-green-400', 'hover:text-gray-900');
        }
    } else {
        // Seleccionar
        numerosSeleccionados.push(num);
        if (elementoBoton) {
            elementoBoton.classList.add('bg-green-400', 'text-gray-900', 'border-green-600');
            elementoBoton.classList.remove('bg-gray-700', 'text-gray-200', 'hover:bg-green-400', 'hover:text-gray-900');
        }
    }

    // Actualizar solo el footer (para no redibujar toda la tabla y perder scroll)
    const footer = document.getElementById('seleccionados-footer');
    if (footer) {
        footer.innerHTML = generarHtmlFooterResumen();
    }
}

// 4. Logic: Agregar al Azar (Con Toast)
function agregarAlAzar(cantidad) {
    const rifa = rifaSeleccionada;
    const total = rifa.totalNumbers || 100;
    const reservados = Array.isArray(rifa.numbersReserved) ? rifa.numbersReserved : [];
    const vendidos = [...new Set([...(rifa.numbersSold || []), ...reservados])];

    const disponibles = [];
    for (let i = 1; i <= total; i++) {
        if (!vendidos.includes(i) && !numerosSeleccionados.includes(i)) {
            disponibles.push(i);
        }
    }

    if (disponibles.length === 0) {
        alert("¡Ya no quedan más números disponibles!");
        return;
    }

    let agregados = cantidad;
    if (disponibles.length < cantidad) {
        agregados = disponibles.length;
    }

    const seleccion = disponibles.sort(() => 0.5 - Math.random()).slice(0, agregados);
    numerosSeleccionados.push(...seleccion);

    // Actualizar Footer
    document.getElementById('seleccionados-footer').innerHTML = generarHtmlFooterResumen();
    
    // Toast de confirmación
    showToast(`¡Se agregaron ${agregados} tickets! 🎟️`);
}

function agregarDesdeInput() {
    const input = document.getElementById('input-cantidad-azar');
    const valor = parseInt(input.value);
    if (valor && valor > 0) {
        agregarAlAzar(valor);
        input.value = '';
    }
}

// 5. Logic: Limpiar y Cambiar Vista
function limpiarNumeros() {
    numerosSeleccionados = [];
    searchValue = '';
    
    // Si estamos en tabla, limpiamos visualmente los botones
    if (currentViewMode === 'table') {
        const btns = document.querySelectorAll('.numero-btn');
        btns.forEach(btn => {
            btn.classList.remove('bg-green-400', 'text-gray-900', 'border-green-600');
            btn.classList.add('bg-gray-700', 'text-gray-200', 'hover:bg-green-400', 'hover:text-gray-900');
        });
    }
    
    document.getElementById('seleccionados-footer').innerHTML = generarHtmlFooterResumen();
}

function cambiarModoVista(modo) {
    currentViewMode = modo;
    document.getElementById('selector-content').innerHTML = renderSelectorContent();
}