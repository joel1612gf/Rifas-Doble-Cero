// main.js - Rifas Doble Cero (Premium, 2024)

let rifasGlobal = [];
let rifaSeleccionada = null;
let numerosSeleccionados = [];
let paginaActual = 1;
let numerosPorPagina = 100; // Ajusta este número para mostrar más o menos en el grid
let searchValue = "";
let exitoAbierto = false; // ← Candado para evitar cierres accidentales

// Base de API automática: local (desarrollo) vs producción (Render)
const API_BASE =
  (location.hostname.includes('localhost') || location.hostname.includes('127.0.0.1'))
    ? 'http://localhost:4000'
    : 'https://doble-cero.onrender.com';

// ============ 1. CARGAR RIFAS DINÁMICAMENTE ===============
async function cargarRifas() {
    const rifasContainer = document.getElementById('rifas-container');
    rifasContainer.innerHTML = `<div class="text-center text-gray-400">Cargando rifas...</div>`;
    try {
        const res = await fetch(`${API_BASE}/api/raffles`);
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

function renderSelectorContent() {
    const rifa = rifaSeleccionada;
    // Info y resumen de premios
    let premiosHtml = '';
    if (rifa.prizes && rifa.prizes.length > 0) {
        premiosHtml = `
            <div class="mb-3 mt-2">
                <span class="text-lg text-green-300 font-bold">Premios:</span>
                <ul class="list-disc list-inside ml-4">
                    ${rifa.prizes.map(p => `
                        <li class="text-green-200 text-sm"><b>${p.place}°:</b> ${p.description}</li>
                    `).join('')}
                </ul>
            </div>
        `;
    }

    // CONFIGURACIÓN
// CONFIGURACIÓN
    const total = rifa.totalNumbers || 100;
    const reservados = Array.isArray(rifa.numbersReserved) ? rifa.numbersReserved : [];
    const vendidos = [...new Set([...(rifa.numbersSold || []), ...reservados])];
    const numerosPorPagina = 100;
    const columnas = 10;

    // Búsqueda y paginador
    let numerosFiltrados = Array.from({ length: total }, (_, i) => i + 1);
    if (searchValue && searchValue.length > 0) {
        numerosFiltrados = numerosFiltrados.filter(n => n.toString().includes(searchValue));
    }
    const paginas = Math.ceil(numerosFiltrados.length / numerosPorPagina);
    const startIdx = (paginaActual - 1) * numerosPorPagina;
    const endIdx = startIdx + numerosPorPagina;
    const numerosPaginados = numerosFiltrados.slice(startIdx, endIdx);

// CUADRÍCULA RESPONSIVA 5x10
let gridHtml = `<div class="grid grid-cols-5 sm:grid-cols-10 gap-2">`;
for (let i = 0; i < numerosPaginados.length; i++) {
    const n = numerosPaginados[i];
    const vendido = vendidos.includes(n);
    const seleccionado = numerosSeleccionados.includes(n);
    gridHtml += `
        <button type="button"
            class="numero-btn h-12 w-18 rounded-md font-bold text-lg border border-gray-700 transition
            ${vendido ? 'bg-red-500 text-white cursor-not-allowed' : (seleccionado ? 'bg-green-400 text-gray-900 border-green-600' : 'bg-gray-700 text-gray-200 hover:bg-green-400 hover:text-gray-900')}"
            ${vendido ? 'disabled' : ''}
            onclick="toggleNumero(${n}, this)"
            data-numero="${n}">
            ${n}
        </button>
    `;
}
gridHtml += `</div>`;

let paginasTotales = Math.ceil(numerosFiltrados.length / numerosPorPagina);
let paginasPorBloque = 10;
let bloqueActual = Math.floor((paginaActual - 1) / paginasPorBloque);
let inicioBloque = bloqueActual * paginasPorBloque + 1;
let finBloque = Math.min(inicioBloque + paginasPorBloque - 1, paginasTotales);

let paginadorHtml = '';
if (paginasTotales > 1) {
    paginadorHtml += `<div class="flex justify-center items-center mt-3 gap-2 flex-wrap">`;
    // << Flecha Doble Izquierda
    paginadorHtml += `
        <button onclick="cambiarBloquePaginas(-1)" ${bloqueActual === 0 ? 'disabled style="opacity:.5;cursor:not-allowed"' : ''}
            class="px-2 py-1 rounded bg-gray-600 text-white hover:bg-gray-500 transition" title="Anterior 10">
            &#171;
        </button>
    `;
   
    // Números de página del rango actual
    for (let i = inicioBloque; i <= finBloque; i++) {
        paginadorHtml += `
            <button onclick="irPagina(${i})"
                class="px-3 py-1 rounded ${i === paginaActual ? 'bg-green-400 text-black font-bold' : 'bg-gray-700 text-gray-300 hover:bg-green-300 hover:text-black'} transition">
                ${i}
            </button>
        `;
    }

    // >> Flecha Doble Derecha
    paginadorHtml += `
        <button onclick="cambiarBloquePaginas(1)" ${finBloque === paginasTotales ? 'disabled style="opacity:.5;cursor:not-allowed"' : ''}
            class="px-2 py-1 rounded bg-gray-600 text-white hover:bg-gray-500 transition" title="Siguiente 10">
            &#187;
        </button>
    `;
    paginadorHtml += `</div>`;
}

// Cambiar página en el paginador
function irPagina(num) {
    paginaActual = num;
    document.getElementById('selector-content').innerHTML = renderSelectorContent();
}

    // RESTO DEL MODAL
    let disponibles = Array.from({ length: total }, (_, i) => i + 1).filter(n => !vendidos.includes(n));
    // Dentro de renderSelectorContent
    let seleccionadosHtml = '';
    if (numerosSeleccionados.length > 0) {
    seleccionadosHtml = numerosSeleccionados.map(n =>
        `<span class="inline-block rounded-full bg-green-500 text-black px-4 py-1 text-lg font-bold mx-1 mb-2">${n}</span>`
    ).join('');
    } else {
    seleccionadosHtml = '<span class="text-gray-300 px-2 py-1">Ninguno</span>';
    }

    return `
        <div class="rounded-t-2xl overflow-hidden">
            <img src="${rifa.image}" alt="${rifa.title}" class="w-full h-56 object-cover">
        </div>
        <div class="p-6 pt-4">
            <h2 class="text-3xl font-extrabold text-green-400 mb-1">${rifa.title}</h2>
            <div class="mb-3">
                <span class="text-gray-400 text-base">${rifa.description}</span>
            </div>
            ${premiosHtml}
            <div class="flex flex-wrap gap-4 mb-4">
                <div class="flex-1 min-w-[120px] bg-gray-900 rounded-xl px-4 py-3 text-center">
                    <div class="text-xs text-gray-400">Precio por boleto</div>
                    <div class="text-lg text-green-400 font-bold">${rifa.priceBs} Bs</div>
                </div>
                <div class="flex-1 min-w-[120px] bg-gray-900 rounded-xl px-4 py-3 text-center">
                    <div class="text-xs text-gray-400">Fecha del sorteo</div>
                    <div class="text-lg text-green-400 font-bold">${rifa.drawDate ? new Date(rifa.drawDate).toLocaleDateString() : '-'}</div>
                </div>
                <div class="flex-1 min-w-[120px] bg-gray-900 rounded-xl px-4 py-3 text-center">
                    <div class="text-xs text-gray-400">Disponibles</div>
                    <div class="text-lg text-green-400 font-bold">${disponibles.length} / ${total} (${Math.round((disponibles.length / total) * 100)}%)</div>
                </div>
            </div>
            <div class="mb-2">
                <label class="block text-lg font-semibold text-green-400 mb-2">Selecciona tus números</label>
                <div class="flex flex-col md:flex-row md:items-center gap-2">
                    <input 
                        type="text" 
                        placeholder="Buscar..." 
                        class="rounded bg-gray-900 px-8 py-4 text-white outline-none w-full md:w-40 text-s" 
                        value="${searchValue}" 
                        oninput="buscarNumero(this.value)">
                    <button type="button" class="bg-gray-700 hover:bg-green-600 hover:text-black text-white text-s px-5 py-4 rounded flex items-center gap-1" onclick="numeroAlAzar()">
                        <i class="fas fa-dice"></i> Número al azar
                    </button>
                    <button type="button" class="bg-gray-600 hover:bg-green-600 hover:text-black text-white text-s px-6 py-4 rounded flex items-center gap-1" onclick="limpiarNumeros()">
                        <i class="fas fa-trash-alt"></i> Limpiar
                    </button>
                </div>
                <div class="mt-3 mb-2">
                    <span class="text-base text-white font-medium">Seleccionados:</span>
                    <div id="seleccionados-label" class="flex flex-wrap gap-1 mt-1">
                        ${numerosSeleccionados.length > 0
                            ? numerosSeleccionados.map(n =>
                                `<span class="inline-block bg-green-500 text-black font-bold px-3 py-1 rounded-full text-sm">${n}</span>`
                            ).join('')
                            : '<span class="text-gray-400">Ninguno</span>'
                        }
                    </div>
                </div>


            <div id="numeros-grid" class="mb-2 mt-2">${gridHtml}</div>
            ${paginadorHtml}
            <div class="flex justify-end mt-4">
                <button class="bg-green-500 hover:bg-green-600 text-black font-bold py-2 px-6 rounded text-center transition duration-300" onclick="continuarCompra()"
                    ${numerosSeleccionados.length === 0 ? 'disabled style="opacity:0.5;"' : ''}>
                    Continuar <i class="fas fa-arrow-right ml-2"></i>
                </button>
            </div>
        </div>
    `;
}
// Lógica para seleccionar/deseleccionar número

function toggleNumero(num) {
    const idx = numerosSeleccionados.indexOf(num);
    if (idx >= 0) {
        numerosSeleccionados.splice(idx, 1);
    } else {
        numerosSeleccionados.push(num);
    }
    // Siempre redibuja el grid y todo el contenido para que el botón "Continuar" se active/desactive correctamente
    document.getElementById('selector-content').innerHTML = renderSelectorContent();

    // Actualiza el botón continuar (deshabilitado si no hay nada)
    document.querySelector('.bg-green-500')?.removeAttribute('disabled');
    if (numerosSeleccionados.length === 0) {
        document.querySelector('.bg-green-500')?.setAttribute('disabled', true);
        document.querySelector('.bg-green-500').style.opacity = 0.5;
    } else {
        document.querySelector('.bg-green-500').style.opacity = 1;
    }
}

// Buscar número por input
function buscarNumero(valor) {
    searchValue = valor.trim();
    paginaActual = 1;
    document.getElementById('selector-content').innerHTML = renderSelectorContent();
}

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
function irPagina(num) {
    paginaActual = num;
    document.getElementById('selector-content').innerHTML = renderSelectorContent();
}
// Botón limpiar selección
function limpiarNumeros() {
    numerosSeleccionados = [];
    // Esto fuerza a que se regenere TODO el selector desde cero
    document.getElementById('selector-content').innerHTML = renderSelectorContent();
}

// Botón número al azar (solo disponible, nunca repite)
function numeroAlAzar() {
    const rifa  = rifaSeleccionada;
    const total = rifa.totalNumbers || 100;
    const reservados = Array.isArray(rifa.numbersReserved) ? rifa.numbersReserved : [];
    const vendidos = [...new Set([...(rifa.numbersSold || []), ...reservados])];
    let disponibles = Array.from({ length: total }, (_, i) => i + 1)
        .filter(n => !vendidos.includes(n) && !numerosSeleccionados.includes(n));
    if (disponibles.length === 0) return;
    const random = disponibles[Math.floor(Math.random() * disponibles.length)];
    toggleNumero(random, document.querySelector(`.numero-btn[data-numero="${random}"]`));
}
// Botón continuar → muestra modal de resumen/compra
function continuarCompra() {
    cerrarModalSelector();
    setTimeout(() => {
        const overlayRes = document.getElementById('modal-resumen');
        overlayRes.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
        renderResumenContent();
        }, 350);
}

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

// Valida todo el form (puedes hacer más validaciones si quieres)
function isValidPhoneVE(raw) {
  const s = String(raw).replace(/\s+/g, '');
  // Acepta 0412..., 0424..., 0414..., 0416..., 0426... (10-11 dígitos) o +58 412...
  const reLocal = /^(0)?(412|414|416|422|424|426)\d{7}$/;
  const reIntl  = /^\+?58(412|414|416|422|424|426)\d{7}$/;
  return reLocal.test(s) || reIntl.test(s);
}
function normalizePhoneVE(raw) {
  let s = String(raw).replace(/\s+/g, '');
  if (/^\+?58/.test(s)) s = '0' + s.replace(/^\+?58/, '');
  return s;
}
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

function validarFormularioCompra() {
  const nombreEl   = document.getElementById('first-name');
  const apellidoEl = document.getElementById('last-name');
  const telefonoEl = document.getElementById('phone');
  const refEl      = document.getElementById('payment-reference');

  const nombreOk   = isValidName(nombreEl.value);
  const apellidoOk = isValidName(apellidoEl.value);
  const telOk      = isValidPhoneVE(telefonoEl.value);
  const refOk      = isValidReference(refEl.value);

  setInputState(nombreEl,   nombreOk);
  setInputState(apellidoEl, apellidoOk);
  setInputState(telefonoEl, telOk);
  setInputState(refEl,      refOk);

  const btn = document.getElementById('btn-confirmar-compra');
  if (nombreOk && apellidoOk && telOk && refOk && metodoPagoSeleccionado) {
    btn.removeAttribute('disabled');
  } else {
    btn.setAttribute('disabled', true);
  }
}

// Listeners para validación en vivo
['first-name','last-name','phone','payment-reference'].forEach(id=>{
  const el = document.getElementById(id);
  if (!el) return;
  el.addEventListener('input', validarFormularioCompra);
});


['first-name','last-name','phone','payment-reference'].forEach(id => {
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
    document.getElementById('resumen-numeros-lista').textContent = numeros.join(', ');

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
function cambiarBloquePaginas(direccion) {
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
    document.getElementById('selector-content').innerHTML = renderSelectorContent();
}

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

  function showToast(message) {
    const toast = document.getElementById("toast");
    toast.textContent = message;
    toast.style.display = "block";
    setTimeout(() => {
      toast.style.display = "none";
    }, 2000);
  }

async function confirmarCompra() {
  const firstName        = document.getElementById('first-name').value.trim();
  const lastName         = document.getElementById('last-name').value.trim();
  const phone            = document.getElementById('phone').value.trim();
  const paymentReference = document.getElementById('payment-reference').value.trim();
  const proofInput       = document.getElementById('payment-proof');
  const file             = proofInput.files[0] || null;

// Validar archivo
let fileOk = file;
if (!file) {
  alert("Adjunta el comprobante de pago.");
  return;
}
// Solo imágenes o PDF
const okTypes = ["image/jpeg","image/png","image/webp","application/pdf"];
if (!okTypes.includes(file.type)) {
  alert("Formato no permitido. Sube JPG, PNG, WEBP o PDF.");
  return;
}
// Si es imagen y pasa de 1.2MB, comprimimos a ~0.8 calidad y máx 1600px
if (file.type.startsWith("image/") && file.size > 1.2 * 1024 * 1024) {
  fileOk = await compressImageFile(file, {maxW:1600, maxH:1600, quality:0.8});
}


// Normalizar teléfono (0412...) y guardarlo para "Ver mis números"
const phoneNorm = normalizePhoneVE(document.getElementById('phone').value);
document.getElementById('phone').value = phoneNorm;
window.lastPurchasePhone = phoneNorm; // <-- lo usaremos al abrir "Mis números"


const paymentMethod = metodoPagoSeleccionado; // 'pagoMovil' | 'binance' | 'zinli'

    // Validación estricta
    if (!isValidName(firstName) || !isValidName(lastName) || !isValidPhoneVE(phone) || !isValidReference(paymentReference) || !file) {
    validarFormularioCompra(); // pinta los errores
    alert("Revisa los datos: nombre/apellido (solo letras), teléfono VE y referencia (6–20).");
    return;
    }

  // 👇 FormData (NO pongas headers Content-Type)
  const formData = new FormData();
  formData.append('raffleId', rifaSeleccionada._id);
  formData.append('numbers', JSON.stringify(numerosSeleccionados));
  formData.append('firstName', firstName);
  formData.append('lastName', lastName);
  formData.append('phone', window.lastPurchasePhone || phone);
  formData.append('paymentMethod', paymentMethod);
  formData.append('paymentReference', paymentReference);
  formData.append('paymentProof', fileOk);
  formData.append('contactConsent', window._consentWhatsApp ? 'true' : 'false'); // NUEVO

  try {
    const res = await fetch(`${API_BASE}/api/purchases`, {
      method: 'POST',
      body: formData
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Error al registrar la compra: ${err}`);
    }

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

const proofInput = document.getElementById('payment-proof');
const labelSpan = document.getElementById('file-name');
if (proofInput && labelSpan) {
  proofInput.value = '';
  labelSpan.textContent = labelSpan.dataset.default || 'Ningún archivo seleccionado';
  labelSpan.classList.remove('text-green-400');
  labelSpan.classList.add('text-gray-400');
}

function mostrarModalExito({ titulo, numeros, metodo, referencia, total, moneda }) {
  // Relleno
  document.getElementById('exito-rifa').textContent = titulo || '-';
  document.getElementById('exito-numeros').textContent =
    Array.isArray(numeros) && numeros.length ? numeros.join(', ') : '-';
  document.getElementById('exito-metodo').textContent = metodo || '-';
  document.getElementById('exito-referencia').textContent = referencia || '-';
  document.getElementById('exito-total').textContent =
    (typeof total !== 'undefined') ? `${moneda}${total}` : '-';

  // Elementos
  const overlay = document.getElementById('modal-exito');
  const card = document.getElementById('exito-card');

  // Evitar que clics dentro de la tarjeta cierren el modal
  card.addEventListener('click', (e) => e.stopPropagation());

  // Mostrar overlay
  overlay.classList.remove('hidden');
  overlay.classList.add('flex');

  // 🔒 Bloquear scroll del fondo
  document.body.style.overflow = 'hidden';

  // ✅ Permitir scroll dentro de la tarjeta (móvil/desktop)
  card.style.overflowY = 'auto';
  card.style.webkitOverflowScrolling = 'touch'; // iOS suave

  // Altura máxima dinámica = alto de viewport - padding del overlay (p-4 → 32px)
  const updateMaxH = () => {
    const vh = window.visualViewport ? window.visualViewport.height : window.innerHeight;
    card.style.maxHeight = Math.max(320, vh - 32) + 'px';
  };
  updateMaxH();

  // Guardamos para limpiar al cerrar
  overlay._onResize = updateMaxH;
  window.addEventListener('resize', overlay._onResize);
  window.addEventListener('orientationchange', overlay._onResize);

  // 🛡️ iOS: evitar “rubber-band” SOLO cuando el gesto es en el overlay (fuera del card)
  if (!overlay._touchBlock) {
    overlay._touchBlock = (e) => {
      if (e.target === overlay) e.preventDefault(); // dentro del card: se permite scroll
    };
    overlay.addEventListener('touchmove', overlay._touchBlock, { passive: false });
  }

  // Estado
  exitoAbierto = true;

  // Animación de entrada
  card.style.transform = 'scale(0.96)';
  setTimeout(() => { card.style.transform = 'scale(1)'; }, 0);
}

function cerrarModalExito() {
  const overlay = document.getElementById('modal-exito');
  const card = document.getElementById('exito-card');

  // Ocultar overlay
  overlay.classList.add('hidden');
  overlay.classList.remove('flex');

  // 🔓 Liberar candado y limpiar estilos/handlers
  exitoAbierto = false;
  document.body.style.overflow = 'auto';

  // Quitar listeners dinámicos
  if (overlay._touchBlock) {
    overlay.removeEventListener('touchmove', overlay._touchBlock);
    delete overlay._touchBlock;
  }
  if (overlay._onResize) {
    window.removeEventListener('resize', overlay._onResize);
    window.removeEventListener('orientationchange', overlay._onResize);
    delete overlay._onResize;
  }

  // Reset estilos del card por si acaso
  card.style.overflowY = '';
  card.style.maxHeight = '';
  card.style.webkitOverflowScrolling = '';
}


// ============ INICIALIZAR =====================
window.addEventListener('DOMContentLoaded', () => {
  cargarRifas();

  const input = document.getElementById('payment-proof');
  const labelSpan = document.getElementById('file-name');
  if (!input || !labelSpan) return;

  const DEFAULT_TEXT = labelSpan.dataset.default || 'Ningún archivo seleccionado';

  input.addEventListener('change', () => {
    if (input.files && input.files.length) {
      // Opción 2 por defecto: mostrar el nombre del archivo
      const file = input.files[0];
      labelSpan.textContent = file.name;
      labelSpan.classList.remove('text-gray-400');
      labelSpan.classList.add('text-green-400'); // verde cuando hay archivo
    } else {
      // Si el usuario cancela la selección
      labelSpan.textContent = DEFAULT_TEXT;
      labelSpan.classList.remove('text-green-400');
      labelSpan.classList.add('text-gray-400');
    }
  });
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
    const url = `${API_BASE}/api/tickets/by-phone?phone=${encodeURIComponent(phone)}&includePending=${includePending}`;
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
                   <span class="font-mono">#${n.number}</span>
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
