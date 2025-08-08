// main.js - Rifas Doble Cero (Premium, 2024)

let rifasGlobal = [];
let rifaSeleccionada = null;
let numerosSeleccionados = [];
let paginaActual = 1;
let numerosPorPagina = 100; // Ajusta este número para mostrar más o menos en el grid
let searchValue = "";

// ============ 1. CARGAR RIFAS DINÁMICAMENTE ===============
async function cargarRifas() {
    const rifasContainer = document.getElementById('rifas-container');
    rifasContainer.innerHTML = `<div class="text-center text-gray-400">Cargando rifas...</div>`;
    try {
        const res = await fetch('http://localhost:4000/api/raffles');
        let rifas = await res.json();
        rifas = rifas.filter(r => r.status === 'activa');
        rifasGlobal = rifas;

        if (rifas.length === 0) {
            rifasContainer.innerHTML = `<div class="text-center text-gray-400">No hay rifas activas en este momento.</div>`;
            return;
        }

        // Centrado pro para 1 o 2 rifas
        if (rifas.length === 1) {
            rifasContainer.className = "w-full flex justify-center";
        } else if (rifas.length === 2) {
            rifasContainer.className = "w-full flex justify-center gap-8";
        } else {
            rifasContainer.className = "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8";
        }

        let html = '';
        rifas.forEach((rifa, idx) => {
            html += `
                <div class="bg-gray-800 rounded-lg overflow-hidden shadow-lg hover:shadow-xl transition duration-300 mb-6 w-full max-w-2xl">
                    <div class="h-56 bg-gray-700 flex items-center justify-center">
                        <img src="${rifa.image || ''}" alt="${rifa.title}" class="h-full w-full object-cover">
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
    document.getElementById('modal-selector').classList.remove('hidden');
}

function cerrarModalSelector() {
    document.getElementById('modal-selector').classList.add('hidden');
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
    const total = rifa.totalNumbers || 100;
    const vendidos = rifa.numbersSold || [];
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
    const rifa = rifaSeleccionada;
    const total = rifa.totalNumbers || 100;
    const vendidos = rifa.numbersSold || [];
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
        //document.getElementById('resumen-content').innerHTML = renderResumenContent();
        document.getElementById('modal-resumen').classList.remove('hidden');
        renderResumenContent();
    }, 350);
}

function cerrarModalResumen() {
    document.getElementById('modal-resumen').classList.add('hidden');
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
function validarFormularioCompra() {
  const nombre     = document.getElementById('first-name').value.trim();
  const apellido   = document.getElementById('last-name').value.trim();
  const telefono   = document.getElementById('phone').value.trim();
  const referencia = document.getElementById('payment-reference').value.trim();
  const btn = document.getElementById('btn-confirmar-compra');
  if (nombre && apellido && telefono && referencia && metodoPagoSeleccionado) btn.removeAttribute('disabled');
  else btn.setAttribute('disabled', true);
}

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

// Envía el formulario
function enviarCompra(e) {
  e.preventDefault();
  // Aquí tu lógica de envío, con todos los datos completos
  alert('¡Compra enviada!');
  cerrarModalResumen();
}


// ============ 4. ENVÍO AL BACKEND DE LA COMPRA ============
async function enviarCompra(e) {
    e.preventDefault();
    const form = document.getElementById('form-compra');
    const formData = new FormData(form);
    // Agrega datos de la rifa y números seleccionados
    formData.append('raffleId', rifaSeleccionada._id);
    formData.append('numbers', JSON.stringify(numerosSeleccionados));
    formData.append('priceBs', rifaSeleccionada.priceBs);

    // Muestra loader o desactiva botón
    const btn = form.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.textContent = "Enviando...";

    try {
        const res = await fetch('http://localhost:4000/api/purchases', {
            method: 'POST',
            mode: 'cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(compraData)
        });

        if (!res.ok) throw new Error("No se pudo registrar la compra");
        // Éxito
        cerrarModalResumen();
        setTimeout(() => {
            alert("¡Compra registrada! Te contactaremos para confirmar tu participación. Gracias por confiar en Doble Cero.");
        }, 300);
        cargarRifas(); // refresca para actualizar números vendidos
    } catch (err) {
        alert("Error al registrar tu compra. Intenta de nuevo.");
        btn.disabled = false;
        btn.textContent = "Enviar compra";
    }
}
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
// Cerrar modales al hacer clic fuera del contenido
    document.querySelectorAll('[id$="-modal"]').forEach(modal => {
        modal.addEventListener('click', function(e) {
            if (e.target === this) {
                if (modal.id === 'modal-selector') closeModal();
                if (modal.id === 'payment-modal') closePaymentModal();
                if (modal.id === 'confirmation-modal') closeConfirmationModal();
                if (modal.id === 'modal-resumen') {
                    modal.classList.add('hidden');
                document.body.style.overflow = 'auto';
            }
        }
    });
    })
    // Cerrar modales con Escape
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            if (!document.getElementById('modal-selector').classList.contains('hidden')) closeModal();
            if (!document.getElementById('payment-modal').classList.contains('hidden')) closePaymentModal();
            if (!document.getElementById('confirmation-modal').classList.contains('hidden')) closeConfirmationModal();
            if (!document.getElementById('admin-login-modal').classList.contains('hidden')) {
                document.getElementById('modal-resumen').classList.add('hidden');
                document.body.style.overflow = 'auto';
            }
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
    // IDs reales del HTML
    const firstName        = document.getElementById('first-name').value.trim();
    const lastName         = document.getElementById('last-name').value.trim();
    const phone            = document.getElementById('phone').value.trim();
    const paymentReference = document.getElementById('payment-reference').value.trim();
    const proofInput       = document.getElementById('payment-proof');
    const paymentProof     = proofInput.files[0] ? proofInput.files[0].name : '';

    // Tu método de pago actual se guarda aquí:
    const paymentMethod = metodoPagoSeleccionado; // 'pagoMovil' | 'binance' | 'zinli'

    if (!firstName || !lastName || !phone || !paymentMethod || !paymentReference || !paymentProof) {
        alert("Por favor, completa todos los campos y selecciona un método de pago.");
        return;
    }

    const compraData = {
        raffleId: rifaSeleccionada._id,
        numbers: numerosSeleccionados,
        firstName,
        lastName,
        phone,
        paymentMethod,
        paymentReference,
        paymentProof
    };

    try {
    const res = await fetch('http://localhost:4000/api/purchases', {
        method: 'POST',
        mode: 'cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(compraData)
    });

    if (!res.ok) throw new Error("Error al registrar la compra");

    // Si todo bien: cerrar y mostrar éxito
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
        referencia: paymentReference, // variable definida arriba en la función
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
  Array.isArray(numeros) && numeros.length ? numeros.join(', ') : '-';
  document.getElementById('exito-metodo').textContent = metodo || '-';
  document.getElementById('exito-referencia').textContent = referencia || '-';
  document.getElementById('exito-total').textContent = (typeof total !== 'undefined') ? `${moneda}${total}` : '-';

  // Mostrar + pequeña animación
  const overlay = document.getElementById('modal-exito');
  const card = document.getElementById('exito-card');
  overlay.classList.remove('hidden');
  overlay.classList.add('flex');
  card.style.transform = 'scale(0.96)';
  setTimeout(() => { card.style.transform = 'scale(1)'; }, 0);
}

function cerrarModalExito() {
  const overlay = document.getElementById('modal-exito');
  overlay.classList.add('hidden');
  overlay.classList.remove('flex');
}

// ============ INICIALIZAR =====================
window.addEventListener('DOMContentLoaded', cargarRifas);

