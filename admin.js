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

function showLogin() {
  const login = document.getElementById('admin-login');
  const panel = document.getElementById('admin-panel');
  if (login) {
    login.classList.remove('hidden');          // mostramos usando Tailwind
    login.style.removeProperty('display');     // limpiamos inline por si quedó
  }
  if (panel) panel.classList.add('hidden');
}

// --- INICIO DE CAMBIO (TAREA 1) ---
/**
 * Formatea un número de ticket con ceros a la izquierda.
 * Es seguro para compras antiguas que no tengan totalNumbers.
 */
function formatTicketNumber(number, totalNumbers) {
  // Si totalNumbers no está (ej: compra antigua), no rellenamos
  if (totalNumbers == null) {
    return String(number);
  }
  const padding = String(totalNumbers).length;
  return String(number).padStart(padding, '0');
}
// --- FIN DE CAMBIO (TAREA 1) ---
// --- INICIO DE CAMBIO (TAREA 3) ---
// Helper para no ejecutar una función mil veces por segundo
function debounce(fn, wait = 200) {
  let t; return (...args) => { clearTimeout(t); t = setTimeout(() => fn.apply(this, args), wait); };
}
// --- FIN DE CAMBIO (TAREA 3) ---

function showApp() {
  const login = document.getElementById('admin-login');
  const panel = document.getElementById('admin-panel');
  if (login) {
    login.classList.add('hidden');             // ocultamos con Tailwind
    login.style.removeProperty('display');     // aseguramos quitar inline
  }
  if (panel) panel.classList.remove('hidden');
  if (typeof showSection === 'function') showSection('raffles');
}

function isLoggedIn() {
  return !!localStorage.getItem('adminToken');
}

async function loginAdmin() {
  const username = document.getElementById('admin-username').value.trim();
  const password = document.getElementById('admin-password').value;
  const errorDiv = document.getElementById('login-error');
  if (errorDiv) errorDiv.classList.add('hidden');

  try {
    const r = await fetch(`${API}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    if (!r.ok) { if (errorDiv) errorDiv.classList.remove('hidden'); return; }
    const data = await r.json();
    localStorage.setItem('adminToken', data.token);
    showApp(); // mostrar panel SIN F5
  } catch (e) {
    if (errorDiv) { errorDiv.textContent = 'Error de conexión'; errorDiv.classList.remove('hidden'); }
  }
}

function logoutAdmin() {
  localStorage.removeItem('adminToken');
  showLogin();
}

// Enter para enviar
window.addEventListener('DOMContentLoaded', () => {
  if (isLoggedIn()) showApp(); else showLogin();
  const u = document.getElementById('admin-username');
  const p = document.getElementById('admin-password');
  [u,p].forEach(el => el && el.addEventListener('keydown', e => { if (e.key === 'Enter') loginAdmin(); }));
});

// Helper para peticiones protegidas
async function fetchWithAuth(url, options = {}) {
  const token = localStorage.getItem('adminToken');
  options.headers = options.headers || {};
  if (token) options.headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(url, options);
  if (res.status === 401) { logoutAdmin(); throw new Error('No autorizado'); }
  return res;
}

// === Verificador ===
let paymentsMode = 'table';     // 'table' | 'viewer'
let payments = [];              // todas las compras (según filtro)
let paymentsPending = [];       // ...
let payFilters = { method: '', from: null, to: null, ref: '' }; // NUEVO
let currentIdx = 0;

// === ESTADÍSTICAS (Variables Globales) ===  <-- AÑADE ESTO
let chartVentas = null;
let chartHoras = null;
let chartRifas = null; // <--- NUEVA

// === AUTH ===

function showLogin() {
  const login = document.getElementById('admin-login');
  const panel = document.getElementById('admin-panel');
  if (login) {
    login.classList.remove('hidden');
    login.style.removeProperty('display');
  }
  if (panel) panel.classList.add('hidden');
}
function showApp() {
  const login = document.getElementById('admin-login');
  const panel = document.getElementById('admin-panel');
  if (login) {
    login.classList.add('hidden');
    login.style.removeProperty('display');
  }
  if (panel) panel.classList.remove('hidden');
  if (typeof showSection === 'function') showSection('raffles');
}


function isLoggedIn() {
  return !!localStorage.getItem('adminToken');
}

async function loginAdmin() {
  const username = document.getElementById('admin-username').value.trim();
  const password = document.getElementById('admin-password').value;
  const errorDiv = document.getElementById('login-error');
  if (errorDiv) errorDiv.classList.add('hidden');

  try {
    const r = await fetch(`${API}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    if (!r.ok) { if (errorDiv) errorDiv.classList.remove('hidden'); return; }
    const data = await r.json();
    localStorage.setItem('adminToken', data.token);

    // Mostrar panel sin F5
    showApp();
  } catch (e) {
    if (errorDiv) { errorDiv.textContent = 'Error de conexión'; errorDiv.classList.remove('hidden'); }
  }
}

// Enviar con Enter
window.addEventListener('DOMContentLoaded', () => {
  if (isLoggedIn()) showApp(); else showLogin();
  const u = document.getElementById('admin-username');
  const p = document.getElementById('admin-password');
  [u,p].forEach(el => el && el.addEventListener('keydown', e => {
    if (e.key === 'Enter') loginAdmin();
  }));
});

// Helper para peticiones protegidas
async function fetchWithAuth(url, options = {}) {
  const token = localStorage.getItem('adminToken');
  options.headers = options.headers || {};
  if (token) options.headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(url, options);
  if (res.status === 401) {
    logoutAdmin();
    throw new Error('No autorizado');
  }
  return res;
}


// 1
// Navegación
function showSection(section) {
  const raffles   = document.getElementById('section-raffles');
  const payments  = document.getElementById('section-payments');
  const winners   = document.getElementById('section-winners');
  const contacts  = document.getElementById('section-contacts');
  const stats     = document.getElementById('section-stats'); // NUEVO

  // Mostrar/Ocultar secciones
  if (raffles)  raffles.style.display  = (section === 'raffles')  ? 'block' : 'none';
  if (payments) payments.style.display = (section === 'payments') ? 'block' : 'none';
  if (winners)  winners.style.display  = (section === 'winners')  ? 'block' : 'none';
  if (contacts) contacts.style.display = (section === 'contacts') ? 'block' : 'none'; // NUEVO
  if (stats)    stats.style.display    = (section === 'stats')    ? 'block' : 'none'; // NUEVO

  // Marcar activo en navbar
  const links = {
    raffles:   document.getElementById('nav-raffles'),
    payments:  document.getElementById('nav-payments'),
    winners:   document.getElementById('nav-winners'),
    contacts:  document.getElementById('nav-contacts'), // NUEVO
    stats:     document.getElementById('nav-stats')     // NUEVO
  };
  Object.entries(links).forEach(([key, el]) => {
    if (!el) return;
    // reset
    el.classList.remove('text-green-400','border-green-400');
    el.classList.add('text-gray-300','border-transparent');
    // activo
    if (key === section) {
      el.classList.remove('text-gray-300','border-transparent');
      el.classList.add('text-green-400','border-green-400');
    }
  });

  // Cargas de datos
  if (section === 'raffles')  loadRaffles();
  if (section === 'payments') loadPayments('viewer');
  if (section === 'winners')  loadWinnersInit();
  if (section === 'contacts') loadContacts(); // NUEVO
  if (section === 'stats')    cargarEstadisticas();    // NUEVO

}

// ======== Cargar Rifas desde Backend ========
async function loadRaffles() {
    const wrapper = document.getElementById('raffles-table-wrapper');
    wrapper.innerHTML = '<div class="text-center text-gray-400">Cargando rifas...</div>';
    try {
        const res = await fetch(`${API}/api/raffles`);
        const raffles = await res.json();
        if (raffles.length === 0) {
            wrapper.innerHTML = '<div class="text-center text-gray-400">No hay rifas registradas.</div>';
            return;
        }
        let table = `
            <div class="overflow-x-auto">
            <table class="w-full text-left rounded-lg bg-gray-900 shadow-lg">
                <thead>
                    <tr class="bg-gray-800 text-green-400">
                        <th class="py-2 px-4">Imagen</th>
                        <th class="py-2 px-4">Nombre</th>
                        <th class="py-2 px-4">Precio</th>
                        <th class="py-2 px-4">Fecha</th>
                        <th class="py-2 px-4">Números</th>
                        <th class="py-2 px-4">Estado</th>
                        <th class="py-2 px-4">Acciones</th>
                    </tr>
                </thead>
                <tbody>
        `;
        raffles.forEach(rifa => {
            table += `
                <tr class="border-b border-gray-800 hover:bg-gray-800">
                    <td class="py-2 px-4"><img src="${rifa.image || ''}" alt="Imagen" class="h-12 w-12 rounded object-cover"></td>
                    <td class="py-2 px-4 font-bold">${rifa.title}</td>
                    <td class="py-2 px-4">${rifa.priceBs} Bs</td>
                    <td class="py-2 px-4">${rifa.drawDate ? new Date(rifa.drawDate).toLocaleDateString() : ''}</td>
                    <td class="py-2 px-4">${rifa.totalNumbers}</td>
                    <td class="py-2 px-4">${rifa.status}</td>
                    <td class="py-2 px-4 space-x-2">
                        <button class="bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded text-xs font-bold" onclick="editRaffle('${rifa._id}')">Editar</button>
                        <button class="bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded text-xs font-bold" onclick="deleteRaffle('${rifa._id}')">Eliminar</button>
                    </td>
                </tr>
            `;
        });
        table += '</tbody></table></div>';
        wrapper.innerHTML = table;
    } catch (err) {
        wrapper.innerHTML = '<div class="text-center text-red-400">Error cargando rifas.</div>';
    }
}

// (Los métodos openCreateRaffleForm, editRaffle, deleteRaffle los agregamos luego)
// ========== FORMULARIO MODAL DE RIFA ==========

let editingRaffleId = null;
let currentPrizes = [];

function openCreateRaffleForm() {
    editingRaffleId = null;
    document.getElementById('raffle-form-title').textContent = 'Crear Nueva Rifa';
    document.getElementById('raffle-form').reset();
    document.getElementById('raffle-id').value = '';
    document.getElementById('raffle-minTickets').value = 1; // <-- AÑADIDO (TAREA 6)
    currentPrizes = [];
    renderPrizesList();
    document.getElementById('raffle-form-modal').classList.remove('hidden');
    document.getElementById('raffle-resultImg1').value = '';
    document.getElementById('raffle-resultImg2').value = '';
    document.getElementById('raffle-isFinished').checked = false;
    document.getElementById('raffle-isDelivered').checked = false;
}

function closeRaffleForm() {
    document.getElementById('raffle-form-modal').classList.add('hidden');
}

function addPrizeField(prize = {}) {
    if (currentPrizes.length >= 3) return;
    currentPrizes.push({ 
        place: prize.place || currentPrizes.length + 1, 
        description: prize.description || '', 
        image: prize.image || '' 
    });
    renderPrizesList();
}

function removePrizeField(index) {
    currentPrizes.splice(index, 1);
    renderPrizesList();
}

function renderPrizesList() {
    const prizesList = document.getElementById('prizes-list');
    prizesList.innerHTML = '';
    currentPrizes.forEach((prize, i) => {
        prizesList.innerHTML += `
        <div class="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-2 mb-2">
            <span class="font-bold text-green-400 sm:w-10 sm:text-center">${prize.place}°</span>
            <input type="text" placeholder="Descripción" value="${prize.description}"
                class="w-full sm:flex-1 px-2 py-2 rounded bg-gray-700 text-white"
                onchange="currentPrizes[${i}].description = this.value">
            <input type="url" placeholder="Imagen (opcional)" value="${prize.image || ''}"
                class="w-full sm:flex-1 px-2 py-2 rounded bg-gray-700 text-white"
                onchange="currentPrizes[${i}].image = this.value">
            <button type="button" onclick="removePrizeField(${i})"
                    class="self-start sm:self-auto px-3 py-1 rounded bg-gray-700 hover:bg-gray-600 text-red-300 hover:text-red-400 font-bold">
            &times;
            </button>
        </div>
        `;
    });
}

// ========== CREAR/EDITAR RIFA ==========

async function submitRaffleForm(e) {
    e.preventDefault();
    const id = document.getElementById('raffle-id').value;
    const title = document.getElementById('raffle-title').value;
    const description = document.getElementById('raffle-description').value;
    const image = document.getElementById('raffle-image').value;
    const priceBs = Number(document.getElementById('raffle-priceBs').value);
    const priceUsd = Number(document.getElementById('raffle-priceUsd').value) || 0;
    const drawDate = document.getElementById('raffle-date').value;
    const totalNumbers = Number(document.getElementById('raffle-totalNumbers').value);
    const minTickets = Number(document.getElementById('raffle-minTickets').value) || 1; // <-- AÑADIDO (TAREA 6)
    const status = document.getElementById('raffle-status').value;
    const resultImg1 = document.getElementById('raffle-resultImg1').value;
    const resultImg2 = document.getElementById('raffle-resultImg2').value;
    const isFinished = document.getElementById('raffle-isFinished').checked;
    const isDelivered = document.getElementById('raffle-isDelivered').checked;

    // Metemos las imágenes en un array si existen
    const lotteryResultImages = [];
    if (resultImg1) lotteryResultImages.push(resultImg1);
    if (resultImg2) lotteryResultImages.push(resultImg2);

    const prizes = currentPrizes.map((p, i) => ({
        place: i + 1,
        description: p.description,
        image: p.image
    }));

const data = { title, description, image, priceBs, priceUsd, drawDate, totalNumbers, minTickets, prizes, status, lotteryResultImages, isFinished, isDelivered };

try {
        if (id) {
            // Editar rifa existente
            await fetchWithAuth(`${API}/api/raffles/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
        } else {
            // Crear nueva rifa
            await fetchWithAuth(`${API}/api/raffles`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
        }
        closeRaffleForm();
        loadRaffles();
    } catch (err) {
        alert('Error guardando rifa');
    }
}

// ========== EDITAR Y ELIMINAR RIFA ==========

async function editRaffle(id) {
    try {
        const res = await fetchWithAuth(`${API}/api/raffles/${id}`);
        const raffle = await res.json();
        editingRaffleId = id;
        document.getElementById('raffle-form-title').textContent = 'Editar Rifa';
        document.getElementById('raffle-id').value = raffle._id;
        document.getElementById('raffle-title').value = raffle.title;
        document.getElementById('raffle-description').value = raffle.description;
        document.getElementById('raffle-image').value = raffle.image;
        document.getElementById('raffle-priceBs').value = raffle.priceBs || '';
        document.getElementById('raffle-priceUsd').value = raffle.priceUsd || '';   
        document.getElementById('raffle-date').value = raffle.drawDate ? raffle.drawDate.split('T')[0] : '';
        document.getElementById('raffle-totalNumbers').value = raffle.totalNumbers;
        document.getElementById('raffle-minTickets').value = raffle.minTickets || 1; // <-- AÑADIDO (TAREA 6)
        document.getElementById('raffle-resultImg1').value = raffle.lotteryResultImages?.[0] || '';
        document.getElementById('raffle-resultImg2').value = raffle.lotteryResultImages?.[1] || '';
        document.getElementById('raffle-isFinished').checked = raffle.isFinished || false;
        document.getElementById('raffle-isDelivered').checked = raffle.isDelivered || false;
        document.getElementById('raffle-status').value = raffle.status || 'activa';
        currentPrizes = (raffle.prizes || []).map((p, i) => ({
            place: p.place || (i + 1),
            description: p.description || '',
            image: p.image || ''
        }));
        renderPrizesList();
        document.getElementById('raffle-form-modal').classList.remove('hidden');
    } catch (err) {
        alert('Error cargando datos de la rifa');
    }
}

async function deleteRaffle(id) {
    if (!confirm('¿Seguro que deseas eliminar esta rifa?')) return;
    try {
        await fetchWithAuth(`${API}/api/raffles/${id}`, {
            method: 'DELETE'
        });
        loadRaffles();
    } catch (err) {
        alert('Error eliminando rifa');
    }
}

// =================== PAGOS (Tabla | Visor) ===================

async function loadPayments(mode = paymentsMode) {
  paymentsMode = mode;

  // Botones / contenedores
  const btnTable = document.getElementById('btn-mode-table');
  const btnViewer = document.getElementById('btn-mode-viewer');
  const header = document.getElementById('viewer-header');
  const tableWrapper = document.getElementById('payments-table-wrapper');
  const viewerWrapper = document.getElementById('payments-viewer-wrapper');
  const btnApproveAll = document.getElementById('btn-approve-all'); // <-- AÑADIDO

  // Mostrar/ocultar botón "Aprobar Todos" (solo en tabla)
  if (btnApproveAll) btnApproveAll.style.display = (mode === 'table') ? 'block' : 'none';

  // Toggle active
  btnTable?.classList.toggle('bg-green-600', mode === 'table');
  btnViewer?.classList.toggle('bg-green-600', mode === 'viewer');

  if (mode === 'table') {
    header.classList.add('hidden');
    viewerWrapper.classList.add('hidden');
    tableWrapper.classList.remove('hidden');

    tableWrapper.innerHTML = '<div class="text-center text-gray-400">Cargando pagos...</div>';
    try {
      const res = await fetchWithAuth(`${API}/api/purchases?status=pendiente`); // unificado con auth
      const pagos = await res.json();
      payments = Array.isArray(pagos) ? pagos : [];

      populatePaymentMethodOptions(payments);       // NUEVO
      setupPaymentFilters();                        // NUEVO
      renderPaymentsTable(applyPaymentsFilters(payments)); // NUEVO
    } catch (e) {
      tableWrapper.innerHTML = '<div class="text-center text-red-400">Error cargando pagos.</div>';
    }

  } else {
    tableWrapper.classList.add('hidden');
    viewerWrapper.classList.remove('hidden');
    header.classList.remove('hidden');
    const proofBox = document.getElementById('proof-box');
    proofBox.innerHTML = '<div class="text-gray-400">Cargando...</div>';

    try {
      const res = await fetchWithAuth(`${API}/api/purchases?status=pendiente`); // solo pendientes
      const data = await res.json();
      paymentsPending = Array.isArray(data) ? data : [];
      currentIdx = 0;
      document.getElementById('viewer-pending').textContent = `${paymentsPending.length} pendientes`;

      if (!paymentsPending.length) {
        proofBox.innerHTML = '<div class="text-gray-400">No hay pagos pendientes.</div>';
        document.getElementById('viewer-counter').textContent = '0/0';
        renderViewerDetails(null);
        return;
      }
      renderViewer(currentIdx);
    } catch (e) {
      proofBox.innerHTML = '<div class="text-red-400">Error cargando pendientes.</div>';
      document.getElementById('viewer-counter').textContent = '0/0';
      renderViewerDetails(null);
    }
  }
}

// ----- Tabla -----
function renderPaymentsTable(pagos) {
  const wrapper = document.getElementById('payments-table-wrapper');
  if (!pagos || !pagos.length) {
    wrapper.innerHTML = '<div class="text-center text-gray-400 py-8">No hay pagos.</div>';
    return;
  }

  let table = `
    <div class="overflow-x-auto -mx-2 sm:mx-0">
      <table class="min-w-[920px] w-full text-left rounded-lg bg-gray-900 shadow-lg text-xs sm:text-sm">
        <thead>
            <tr class="bg-gray-800 text-green-400">
                <th class="py-2 px-4">Fecha</th>
                <th class="py-2 px-4">Nombre</th>
                <th class="py-2 px-4">Rifa</th>
                <th class="py-2 px-4">Teléfono</th>
                <th class="py-2 px-4">Números</th>
                <th class="py-2 px-4">Pago</th>
                <th class="py-2 px-4">Referencia</th>
                <th class="py-2 px-4">Monto</th>
                <th class="py-2 px-4">Email</th>
                <th class="py-2 px-4">Acciones</th>
            </tr>
        </thead>
        <tbody>
  `;

  pagos.forEach(pago => {
    const monto = (pago && pago.amount != null && pago.currency)
    ? `${pago.currency}${pago.amount}`
    : '-';
    const rifaNombre = (pago && pago.raffleTitle) ? pago.raffleTitle : '-';
    const email = pago?.email || '-'; // <-- NUEVA VARIABLE

    table += `
    <tr class="border-b border-gray-800 hover:bg-gray-800">
        <td class="py-2 px-4">${pago?.createdAt ? new Date(pago.createdAt).toLocaleString() : '-'}</td>
        <td class="py-2 px-4 font-bold">${(pago?.firstName || '')} ${(pago?.lastName || '')}</td>
        <td class="py-2 px-4">${rifaNombre}</td>
        <td class="py-2 px-4">${pago?.phone || '-'}</td>
        <td class="py-2 px-4">${Array.isArray(pago?.numbers) ? pago.numbers.map(n => formatTicketNumber(n, pago.totalNumbers)).join(', ') : '-'}</td>
        <td class="py-2 px-4">${pago?.paymentMethod || '-'}</td>
        <td class="py-2 px-4">${pago?.paymentReference || '-'}</td>
        <td class="py-2 px-4">${monto}</td>
        <td class="py-2 px-4">${email}</td>
        <td class="py-2 px-4 space-x-2">
        <button class="bg-green-500 hover:bg-green-400 px-3 py-1 rounded font-bold" onclick="approvePayment('${pago?._id}')">Aprobar</button>
        <button class="bg-red-500 hover:bg-red-400 px-3 py-1 rounded font-bold" onclick="rejectPayment('${pago?._id}')">Rechazar</button>
        </td>
    </tr>
    `;


  });

  table += '</tbody></table></div>';
  wrapper.innerHTML = table;
}

// === Filtros de Verificar pagos (Tabla) ===
function debounce(fn, wait = 200) {
  let t; return (...args) => { clearTimeout(t); t = setTimeout(() => fn.apply(this, args), wait); };
}

function populatePaymentMethodOptions(list) {
  const sel = document.getElementById('pay-filter-method');
  if (!sel) return;
  const map = new Map();
  list.forEach(p => {
    const raw = (p?.paymentMethod || '').toString().trim();
    if (!raw) return;
    const key = raw.toLowerCase();
    if (!map.has(key)) map.set(key, raw); // key = valor normalizado, raw = etiqueta original
  });
  const current = sel.value;
  sel.innerHTML = `<option value="">Todos</option>` +
    Array.from(map.entries())
      .sort((a,b) => a[1].localeCompare(b[1]))
      .map(([k, label]) => `<option value="${k}">${label}</option>`)
      .join('');
  if (map.has(current)) sel.value = current;
}

function setupPaymentFilters() {
  const box = document.getElementById('payments-filters');
  if (!box || box.dataset.ready) return; // evitar listeners duplicados
  box.dataset.ready = '1';

  const sel  = document.getElementById('pay-filter-method');
  const ref  = document.getElementById('pay-filter-ref');
  const from = document.getElementById('pay-filter-from');
  const to   = document.getElementById('pay-filter-to');

  const trigger = () => {
    payFilters.method = (sel?.value || '').toLowerCase();
    payFilters.ref    = (ref?.value || '').trim().toLowerCase();
    payFilters.from   = from?.value ? new Date(from.value + 'T00:00:00') : null;
    payFilters.to     = to?.value ? new Date(to.value + 'T23:59:59') : null;
    renderPaymentsTable(applyPaymentsFilters(payments));
  };

  sel?.addEventListener('change', trigger);
  from?.addEventListener('change', trigger);
  to?.addEventListener('change', trigger);
  ref?.addEventListener('input', debounce(trigger, 200));

  document.getElementById('pay-filter-clear')?.addEventListener('click', () => {
    if (sel)  sel.value  = '';
    if (ref)  ref.value  = '';
    if (from) from.value = '';
    if (to)   to.value   = '';
    payFilters = { method: '', from: null, to: null, ref: '' };
    renderPaymentsTable(payments);
  });
}

function applyPaymentsFilters(list) {
  let out = Array.isArray(list) ? list.slice() : [];
  // método
  if (payFilters.method) {
    out = out.filter(p => (p?.paymentMethod || '').toString().trim().toLowerCase() === payFilters.method);
  }
  // referencia (contiene)
  if (payFilters.ref) {
    out = out.filter(p => (p?.reference || '').toString().toLowerCase().includes(payFilters.ref));
  }
  // rango de fecha (usamos createdAt; si no, updatedAt)
  if (payFilters.from || payFilters.to) {
    out = out.filter(p => {
      const d = new Date(p?.createdAt || p?.updatedAt || 0);
      if (Number.isNaN(d.getTime())) return false;
      if (payFilters.from && d < payFilters.from) return false;
      if (payFilters.to && d > payFilters.to) return false;
      return true;
    });
  }
  return out;
}


// ----- Visor -----
function renderViewer(idx) {
  if (!paymentsPending.length) return;
  if (idx < 0) idx = 0;
  if (idx >= paymentsPending.length) idx = paymentsPending.length - 1;
  currentIdx = idx;

  const pago = paymentsPending[currentIdx];
  document.getElementById('viewer-counter').textContent = `${currentIdx + 1}/${paymentsPending.length}`;

  const box = document.getElementById('proof-box');
  
  // Como ya no hay comprobante, mostramos un mensaje en el visor
  box.innerHTML = `
    <div class="flex flex-col items-center justify-center h-full text-gray-400">
        <i class="fas fa-file-invoice-dollar text-6xl mb-4"></i>
        <h3 class="text-2xl font-bold">Sin Comprobante</h3>
        <p class="text-lg">Esta compra se registró sin archivo de comprobante.</p>
    </div>
  `;

  renderViewerDetails(pago);
}

function renderViewerDetails(pago) {
  const set = (id, val='-') => (document.getElementById(id).textContent = val);
  if (!pago) {
    ['v-fecha','v-nombre','v-rifa','v-telefono','v-numeros','v-metodo','v-ref','v-monto'].forEach(id => set(id, '-'));
    return;
  }
  set('v-fecha', new Date(pago.createdAt).toLocaleString());
  set('v-nombre', `${pago.firstName || ''} ${pago.lastName || ''}`.trim() || '-');
  set('v-rifa', pago.raffleTitle || '-');
  set('v-telefono', pago.phone || '-');
  set('v-numeros', (pago.numbers || []).map(n => formatTicketNumber(n, pago.totalNumbers)).join(', ') || '-');
  set('v-metodo', pago.paymentMethod || '-');
  set('v-ref', pago.paymentReference || '-');
  const monto = (pago.amount != null && pago.currency) ? `${pago.currency}${pago.amount}` : '-';
  set('v-monto', monto);
}


// ----- Navegación / botones (espera a que exista el DOM) -----
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('btn-mode-table')?.addEventListener('click', () => loadPayments('table'));
  document.getElementById('btn-mode-viewer')?.addEventListener('click', () => loadPayments('viewer'));
  document.getElementById('prev-payment')?.addEventListener('click', () => { if (paymentsPending.length) renderViewer(Math.max(0, currentIdx - 1)); });
  document.getElementById('next-payment')?.addEventListener('click', () => { if (paymentsPending.length) renderViewer(Math.min(paymentsPending.length - 1, currentIdx + 1)); });
  document.getElementById('btn-approve')?.addEventListener('click', () => { const p = paymentsPending[currentIdx]; if (p) approvePayment(p._id, 'viewer'); });
  document.getElementById('btn-wait')?.addEventListener('click', () => { const p = paymentsPending[currentIdx]; if (p) waitPayment(p._id, 'viewer'); });
  document.getElementById('btn-reject')?.addEventListener('click', () => { const p = paymentsPending[currentIdx]; if (p) rejectPayment(p._id, 'viewer'); });
  // AÑADIDO (TAREA 3)
  document.getElementById('btn-approve-all')?.addEventListener('click', approveAllPending);
});

// ----- Acciones -----
async function approvePayment(id) {
  try {
    const res = await fetchWithAuth(`${API}/api/purchases/${id}/approve`, { method:'PUT' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    await refreshAfterAction();
  } catch (e) {
    console.error('approvePayment error:', e);
    alert('Error aprobando la compra');
  }
}

async function rejectPayment(id) {
  try {
    const res = await fetchWithAuth(`${API}/api/purchases/${id}/reject`,  { method:'PUT' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    await refreshAfterAction();
  } catch (e) {
    console.error('rejectPayment error:', e);
    alert('Error rechazando la compra');
  }
}

// --- INICIO DE CAMBIO (TAREA 3) ---
async function approveAllPending() {
  // 1. Obtenemos solo los pagos que están actualmente en la tabla filtrada
  const paymentsToApprove = applyPaymentsFilters(payments);

  if (!paymentsToApprove || paymentsToApprove.length === 0) {
    alert('No hay pagos pendientes en la vista actual para aprobar.');
    return;
  }

  // 2. Confirmación de seguridad
  if (!confirm(`¿Estás seguro de que deseas aprobar ${paymentsToApprove.length} pagos pendientes?\n\nEsta acción es irreversible.`)) {
    return;
  }

  const btn = document.getElementById('btn-approve-all');
  btn.disabled = true;
  btn.textContent = 'Aprobando...';

  // 3. Creamos una promesa por cada pago a aprobar
  const promises = paymentsToApprove.map(pago =>
    fetchWithAuth(`${API}/api/purchases/${pago._id}/approve`, { method: 'PUT' })
      .then(res => res.ok) // Nos importa si tuvo éxito (true) o no (false)
      .catch(() => false) // Si falla la red, cuenta como error
  );

  // 4. Ejecutamos todas las promesas en paralelo
  const results = await Promise.allSettled(promises);

  const successes = results.filter(r => r.status === 'fulfilled' && r.value === true).length;
  const failures = results.length - successes;

  // 5. Mostramos el resultado
  alert(`Proceso completado:\n- Aprobados: ${successes}\n- Fallidos: ${failures}`);

  btn.disabled = false;
  btn.textContent = 'Aprobar Todos';

  // 6. Recargamos la tabla (que ahora debería estar vacía o con menos pagos)
  await loadPayments('table');
}
// --- FIN DE CAMBIO (TAREA 3) ---

async function waitPayment(id) {
  try {
    const res = await fetchWithAuth(`${API}/api/purchases/${id}/wait`, { method: 'PUT' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    await refreshAfterAction();
  } catch (e) {
    console.error('waitPayment error:', e);
    alert('Error moviendo a espera');
  }
}

// === Helpers de vista ===
function isViewerActive() {
  const viewer = document.getElementById('payments-viewer-wrapper');
  return viewer && !viewer.classList.contains('hidden');
}

async function refreshAfterAction() {
  // Si tienes loadPayments(mode), úsalo; si no, solo loadPayments()
  const mode = isViewerActive() ? 'viewer' : 'table';
  await loadPayments(mode); // o: await loadPayments(mode);

  if (mode === 'viewer') {
    // Reposicionar índice y refrescar contador/detalles
    if (window.paymentsPending && window.paymentsPending.length) {
      window.currentIdx = Math.min(window.currentIdx || 0, window.paymentsPending.length - 1);
      renderViewerDetails(window.paymentsPending[window.currentIdx]);
      document.getElementById('viewer-counter').textContent =
        `${(window.currentIdx || 0) + 1}/${window.paymentsPending.length}`;
      document.getElementById('viewer-pending').textContent =
        `${window.paymentsPending.length} pendientes`;
    } else {
      document.getElementById('viewer-counter').textContent = '0/0';
      document.getElementById('viewer-pending').textContent = '0 pendientes';
      const proofBox = document.getElementById('proof-box');
      if (proofBox) proofBox.innerHTML = '<div class="text-center text-gray-400">No hay pagos pendientes.</div>';
      renderViewerDetails(null);
    }
  }
}
// ==================== WINNERS ====================
let winnersState = {
  raffles: [],
  selectedRaffle: null,
  lastLookup: null,   // respuesta de /lookup-winner
};

async function loadWinnersInit() {
  try {
    const res = await fetch(`${API}/api/raffles`);
    winnersState.raffles = await res.json();

    // llenar select
    const sel = document.getElementById('winners-raffle-select');
    sel.innerHTML = winnersState.raffles.map(r => `<option value="${r._id}">${r.title}</option>`).join('');
    sel.onchange = onChangeRaffleWinners;

    // seleccionar primera rifa (si hay)
    if (winnersState.raffles.length) {
      sel.value = winnersState.raffles[0]._id;
      await onChangeRaffleWinners();
    }

    // botones
  document.getElementById('btn-winner-lookup').onclick = lookupWinner;
  document.getElementById('btn-winner-save').onclick   = saveWinner;
  document.getElementById('btn-winner-clear').onclick  = clearWinner;
  document.getElementById('btn-toggle-phone').onclick  = togglePhoneVisibility;
  } catch (e) {
    console.error(e);
  }
}

async function onChangeRaffleWinners() {
  const id = document.getElementById('winners-raffle-select').value;
  const r = winnersState.raffles.find(x => x._id === id);
  winnersState.selectedRaffle = r || null;

  // Imagen y título
  const img = document.getElementById('winners-image');
  const ph  = document.getElementById('winners-image-ph');
  if (r?.image) {
    img.src = r.image;
    img.classList.remove('hidden');
    ph.classList.add('hidden');
  } else {
    img.classList.add('hidden');
    ph.classList.remove('hidden');
  }
  document.getElementById('winners-title').textContent = r ? r.title : '—';

  // ---- Select de PREMIO según cantidad de premios
  const selPlace  = document.getElementById('winners-place-select');
  const prizesLen = (r && Array.isArray(r.prizes) && r.prizes.length) ? r.prizes.length : 1;

  if (prizesLen === 1) {
    // Un solo premio -> mostrar TÍTULO de la rifa y deshabilitar
    selPlace.innerHTML = `<option value="1">${r?.title || 'Premio único'}</option>`;
    selPlace.disabled = true;
  } else {
    // Varios premios -> 1er/2do/3er...
    const labels = ['1er premio','2do premio','3er premio','4to premio','5to premio'];
    selPlace.innerHTML = Array.from({ length: prizesLen }, (_, i) =>
      `<option value="${i + 1}">${labels[i] || `${i + 1}° premio`}</option>`
    ).join('');
    selPlace.disabled = false;
  }

  // Al cambiar el lugar refrescamos la ficha derecha
  selPlace.onchange = () => setWinnerDetails(null, winnersState.selectedRaffle);

  // Pintar ficha derecha con el estado inicial
  setWinnerDetails(null, winnersState.selectedRaffle);

  // --- INICIO TAREA 3: Mostrar Sección Top ---
    const topSection = document.getElementById('top-buyers-section');
    const topList = document.getElementById('top-buyers-list');
    const topActions = document.getElementById('top-buyers-actions');
    
    if (topSection) {
        topSection.classList.remove('hidden');
        if (topList) topList.innerHTML = '<p class="text-gray-500 italic">Haz clic en "Calcular Automático" para ver el ranking.</p>';
        if (topActions) topActions.classList.add('hidden');
    }
    // --- FIN TAREA 3 ---
}


function setWinnerDetails(lookup, raffle) {
  // Caso especial: se buscó un número y NO hay ganador (no fue vendido)
  if (lookup && lookup._noWinner) {
    // Mostrar mensaje claro en la ficha derecha
    document.getElementById('winners-name').textContent = 'NO HAY GANADOR';
    const phoneEl = document.getElementById('winners-phone');
    phoneEl.textContent = '—';
    phoneEl.dataset.full = '';
    document.getElementById('winners-status').textContent = '—';
    // Mostramos el número consultado como ticket para referencia
    const num = (typeof lookup.ticket !== 'undefined' && lookup.ticket !== null)
      ? lookup.ticket
      : Number(document.getElementById('winners-number-input').value || 0);
    document.getElementById('winners-ticket').textContent = formatTicketNumber(num, raffle ? raffle.totalNumbers : null);
    document.getElementById('winners-date').textContent = '—';

    // El texto del premio se mantiene según la rifa/posición seleccionada
    const place = Number(document.getElementById('winners-place-select')?.value || 1);
    const prizesLen = (raffle && Array.isArray(raffle.prizes) && raffle.prizes.length)
      ? raffle.prizes.length
      : 1;
    const prizeText = (prizesLen === 1)
      ? (raffle?.title || '—')
      : (raffle?.prizes?.[place - 1]?.description || `${place}° premio`);
    document.getElementById('winners-prize').textContent = prizeText;
    return;
  }

  // lookup puede ser null (sin comprador) o un objeto del backend
  const byPlace = () => {
    if (!raffle) return null;
    const place = Number(document.getElementById('winners-place-select').value || 1);
    const w = Array.isArray(raffle.winners) ? raffle.winners.find(x => x.place === place) : null;
    return w || null;
  };

  const src = lookup || byPlace();

  const name = src ? `${src.firstName || ''} ${src.lastName || ''}`.trim() : '—';
  const phone = src ? (src.phone || '') : '';
  const masked = maskPhone(phone);

  document.getElementById('winners-name').textContent   = name || '—';
  document.getElementById('winners-phone').textContent  = masked || '—';
  document.getElementById('winners-phone').dataset.full = phone || '';
  document.getElementById('winners-status').textContent = (src && src.status) ? src.status.toUpperCase() : '—';
  document.getElementById('winners-ticket').textContent = (src && src.ticket) ? formatTicketNumber(src.ticket, raffle ? raffle.totalNumbers : null) : '—';

  const dt = (src && (src.purchasedAt || src.createdAt)) ? formatDateVE(src.purchasedAt || src.createdAt) : '—';
  document.getElementById('winners-date').textContent = dt;

  const place = Number(document.getElementById('winners-place-select')?.value || 1);
  // IMPORTANTE: tratar array vacío como “1 premio” (mismo criterio que onChangeRaffleWinners)
  const prizesLen = (raffle && Array.isArray(raffle.prizes) && raffle.prizes.length)
    ? raffle.prizes.length
    : 1;

  const prizeText = (prizesLen === 1)
    ? (raffle?.title || '—')                               // Un solo premio -> título de la rifa
    : (raffle?.prizes?.[place - 1]?.description || `${place}° premio`);

  document.getElementById('winners-prize').textContent = prizeText;
}


function maskPhone(phone) {
  if (!phone) return '';
  const s = String(phone).replace(/\D/g,'');
  if (s.length <= 4) return '*'.repeat(s.length);
  const head = s.slice(0,4);
  const tail = s.slice(-4);
  return `${head}${'*'.repeat(Math.max(0, s.length-8))}${tail}`;
}

function togglePhoneVisibility() {
  const span = document.getElementById('winners-phone');
  const full = span.dataset.full || '';
  if (!full) return;
  if (span.dataset.visible === '1') {
    span.textContent = maskPhone(full);
    span.dataset.visible = '0';
  } else {
    span.textContent = full;
    span.dataset.visible = '1';
  }
}

function formatDateVE(date) {
  try {
    const d = new Date(date);
    return d.toLocaleString('es-VE', { timeZone: 'America/Caracas', hour12: true });
  } catch { return '—'; }
}

async function lookupWinner() {
  const raffleId = document.getElementById('winners-raffle-select').value;
  const number   = Number(document.getElementById('winners-number-input').value);
  if (!raffleId || !number) { alert('Selecciona la rifa y escribe el número'); return; }

  const res  = await fetch(`${API}/api/raffles/${raffleId}/lookup-winner?number=${number}`);
  const data = await res.json(); // puede ser null

  // Si el número no fue vendido (no hay compra aprobada), marcamos "no hay ganador"
  winnersState.lastLookup = (data === null) ? { _noWinner: true, ticket: number } : data;

  setWinnerDetails(winnersState.lastLookup, winnersState.selectedRaffle);
}

async function saveWinner() {
  const raffleId = document.getElementById('winners-raffle-select').value;
  const place    = Number(document.getElementById('winners-place-select').value);
  const number   = Number(document.getElementById('winners-number-input').value);
  if (!raffleId || !place || !number) { alert('Completa rifa, premio y número'); return; }

  const res = await fetchWithAuth(`${API}/api/raffles/${raffleId}/winners`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ place, number })
  });
  const winners = await res.json();

  // actualizar en memoria la rifa seleccionada
  const idx = winnersState.raffles.findIndex(r => r._id === raffleId);
  if (idx >= 0) winnersState.raffles[idx].winners = winners;
  winnersState.selectedRaffle = winnersState.raffles[idx];

  alert('Ganador guardado.');
  setWinnerDetails(null, winnersState.selectedRaffle);
}

async function clearWinner() {
  const raffleId = document.getElementById('winners-raffle-select').value;
  const place    = Number(document.getElementById('winners-place-select').value);
  if (!raffleId || !place) return;

  if (!confirm('¿Seguro que deseas limpiar este premio?')) return;
  const res = await fetchWithAuth(`${API}/api/raffles/${raffleId}/winners/${place}`, { method: 'DELETE' });
  const { winners } = await res.json();

  const idx = winnersState.raffles.findIndex(r => r._id === raffleId);
  if (idx >= 0) winnersState.raffles[idx].winners = winners;
  winnersState.selectedRaffle = winnersState.raffles[idx];

  setWinnerDetails(null, winnersState.selectedRaffle);
}
function maskPhone(phone) {
  if (!phone) return '';
  const s = String(phone).replace(/\D/g, '');
  if (s.length <= 4) return '*'.repeat(s.length);
  const head = s.slice(0, 4);
  const tail = s.slice(-4);
  return `${head}${'*'.repeat(Math.max(0, s.length - 8))}${tail}`;
}

function togglePhoneVisibility() {
  const span = document.getElementById('winners-phone');
  const eyeOn = document.getElementById('icon-eye');
  const eyeOff = document.getElementById('icon-eye-off');
  const full = span?.dataset?.full || '';
  if (!full) return;

  const visible = span.dataset.visible === '1';
  if (visible) {
    span.textContent = maskPhone(full);
    span.dataset.visible = '0';
    eyeOn.classList.remove('hidden');
    eyeOff.classList.add('hidden');
  } else {
    span.textContent = full;
    span.dataset.visible = '1';
    eyeOn.classList.add('hidden');
    eyeOff.classList.remove('hidden');
  }
}
// ===== Exportar/Compartir ganador (formato vertical 1080x1920) =====
async function exportWinnerImage() {
  try {
    const canvas = await generateWinnerCanvasVertical();
    const dataUrl = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    const date = new Date().toISOString().slice(0,10);
    a.href = dataUrl;
    a.download = `ganador_${date}.png`;
    a.click();
  } catch (e) {
    alert('No se pudo exportar la imagen.');
    console.error(e);
  }
}

async function shareWinnerWhatsApp() {
  try {
    const canvas = await generateWinnerCanvasVertical(); // mismo formato vertical
    const blob = await new Promise(res => canvas.toBlob(res, 'image/png'));
    if (!blob) {
      window.open('https://wa.me/?text=' + encodeURIComponent('Ganador Rifas Doble Cero 🎉'), '_blank');
      return;
    }
    const file = new File([blob], 'ganador.png', { type: 'image/png' });

    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title: 'Ganador Rifas Doble Cero', text: 'Ganador Rifas Doble Cero 🎉' });
    } else {
      window.open('https://wa.me/?text=' + encodeURIComponent('Ganador Rifas Doble Cero 🎉'), '_blank');
    }
  } catch (e) {
    alert('No se pudo compartir.');
    console.error(e);
  }
}

// === NUEVO: generador de imagen vertical para ganadores (1080x1920) ===
async function generateWinnerCanvasVertical() {
  const W = 1080, H = 1920;
  const PAD = 60;

  // Recoger datos de la UI
  const title  = (document.getElementById('winners-title')?.textContent || '').trim();
  const prize  = (document.getElementById('winners-prize')?.textContent || '').trim() || title || '—';

  const name   = (document.getElementById('winners-name')?.textContent || '—').trim();
  const phoneEl = document.getElementById('winners-phone');
  const phoneFull = phoneEl?.dataset?.full || phoneEl?.textContent || '';
  const phoneMasked = (typeof maskPhone === 'function') ? maskPhone(phoneFull) : (phoneFull || '—');

  const status = (document.getElementById('winners-status')?.textContent || '—').trim();
  const ticket = (document.getElementById('winners-ticket')?.textContent || '—').trim();
  const purchaseDate = (document.getElementById('winners-date')?.textContent || '—').trim();


// NUEVO
const logoSrc = (document.querySelector('img[src*="logopngcolorweb2"]')?.src) || 'img/logopngcolorweb2.png';

// Normaliza enlaces comunes de “vista previa” a archivo directo
function normalizeImageURL(raw) {
  try {
    if (!raw) return '';
    // Google Drive: /file/d/ID/view  -> uc?export=view&id=ID
    const m1 = raw.match(/drive\.google\.com\/file\/d\/([^/]+)\//i);
    if (m1) return `https://drive.google.com/uc?export=view&id=${m1[1]}`;
    // Google Drive: open?id=ID  o uc?id=ID
    const m2 = raw.match(/[?&](?:id|fileId)=([^&]+)/i);
    if (m2 && /drive\.google\.com/i.test(raw)) return `https://drive.google.com/uc?export=view&id=${m2[1]}`;
    // Dropbox: dl=0 -> dl=1
    if (/dropbox\.com/i.test(raw)) return raw.replace('dl=0', 'dl=1');
    // GitHub blob -> raw.githubusercontent.com
    if (/github\.com\/.+\/blob\//i.test(raw)) {
      return raw.replace('https://github.com/', 'https://raw.githubusercontent.com/').replace('/blob/', '/');
    }
    return raw;
  } catch { return raw; }
}

async function getRaffleImageSrcRaw() {
  const el = document.getElementById('winners-image');
  if (el && el.src) {
    if (!el.complete) await new Promise(res => el.addEventListener('load', res, { once: true }));
    return el.src;
  }
  if (window.winnersState?.selectedRaffle?.image) return winnersState.selectedRaffle.image;
  return '';
}

// Descarga vía backend y devuelve un objectURL blob:
async function getRaffleImageObjectURL() {
  const raw = normalizeImageURL(await getRaffleImageSrcRaw());
  if (!raw) return '';
  if (/^(data:|blob:)/i.test(raw)) return raw; // ya sirve

  try {
    const res = await fetch(`${API}/api/proxy-image?url=${encodeURIComponent(raw)}`);
    if (!res.ok) throw new Error('proxy error');
    const blob = await res.blob();
    return URL.createObjectURL(blob);
  } catch {
    return '';
  }
}

const [logoImg, raffleImg] = await Promise.all([
  loadImageSafe(logoSrc),
  loadImageSafe(await getRaffleImageObjectURL(), /*isBlob=*/true)
]);

function loadImageSafe(src, isBlob = false) {
  return new Promise(resolve => {
    if (!src) return resolve(null);
    const img = new Image();
    if (!isBlob) { // para blob: no hace falta CORS
      img.crossOrigin = 'anonymous';
      img.referrerPolicy = 'no-referrer';
    }
    img.onload = () => {
      // liberar memoria si viene de blob:
      if (isBlob && /^blob:/.test(src)) {
        setTimeout(() => { try { URL.revokeObjectURL(src); } catch {} }, 0);
      }
      resolve(img);
    };
    img.onerror = () => resolve(null);
    img.src = src;
  });
}


  // Canvas base
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');

  // Colores
  const BG = '#0b1220';
  const PANEL = '#1f2937';
  const ACCENT = '#34d399'; // emerald-400
  const TEXT = '#E5E7EB';   // gray-200

  // Fondo
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, W, H);

  // Header: logo + marca
  const logoSize = 130;
  if (logoImg) {
    ctx.save();
    drawRoundedRect(ctx, PAD, PAD, logoSize, logoSize, 24);
    ctx.clip();
    ctx.drawImage(logoImg, PAD, PAD, logoSize, logoSize);
    ctx.restore();
  }

  ctx.fillStyle = TEXT;
  ctx.font = 'bold 64px Montserrat, Arial, sans-serif';
  ctx.textBaseline = 'top';
  ctx.fillText('DOBLE CERO', PAD + logoSize + 24, PAD + 24);

  // "GANADOR:" + fecha (momento del click)
  const now = new Date();
  const dd = String(now.getDate()).padStart(2,'0');
  const mm = String(now.getMonth()+1).padStart(2,'0');
  const yyyy = now.getFullYear();
  const dateLabel = `${dd}/${mm}/${yyyy}`;

  ctx.fillStyle = ACCENT;
  ctx.font = 'bold 72px Montserrat, Arial, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('GANADOR:', PAD, PAD + logoSize + 40);

  // Fecha a la DERECHA
  ctx.fillStyle = TEXT;
  ctx.font = 'bold 48px Montserrat, Arial, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(dateLabel, W - PAD, PAD + logoSize + 48);
  ctx.textAlign = 'left'; // restaurar por si acaso


  // Imagen principal de la rifa (16:9 en marco redondeado)
  const imgW = W - PAD*2;                 // 960
  const imgH = Math.round(imgW * 9 / 16); // 540
  const imgX = PAD;
  const imgY = PAD + logoSize + 140;

  ctx.save();
  drawRoundedRect(ctx, imgX, imgY, imgW, imgH, 28);
  ctx.clip();
  if (raffleImg) {
    drawImageCover(ctx, raffleImg, imgX, imgY, imgW, imgH);
  } else {
    ctx.fillStyle = '#111827';
    ctx.fillRect(imgX, imgY, imgW, imgH);
    ctx.fillStyle = ACCENT;
    ctx.font = 'bold 48px Montserrat, Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('IMAGEN DE LA RIFA', imgX + imgW/2, imgY + imgH/2 - 24);
    ctx.textAlign = 'left';
  }
  ctx.restore();

  // Título / premio centrado debajo de la imagen
  ctx.fillStyle = TEXT;
  ctx.font = 'bold 44px Montserrat, Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(prize || title || '—', W/2, imgY + imgH + 32);
  ctx.textAlign = 'left';

  // === Panel de detalles (alineación vertical perfecta) ===

  // Filas (primero definimos para calcular alto dinámico)
  const rows = [
    ['NOMBRE:', name || '—'],
    ['TELÉFONO:', phoneMasked || '—'],
    ['ESTATUS:', (status || '—').toUpperCase()],
    ['TICKET:', ticket || '—'],
    ['FECHA DE COMPRA:', purchaseDate || '—'],
    ['PREMIO:', prize || '—']
  ];

  // Geometría del panel
  const panelX = PAD;
  const panelW = W - PAD*2;
  const panelY = imgY + imgH + 160;
  const ROW_LH = 96;         // alto de cada fila
  const PANEL_PAD_Y = 36;    // padding superior/inferior
  const panelH = PANEL_PAD_Y * 2 + ROW_LH * rows.length;

  ctx.fillStyle = PANEL;
  drawRoundedRect(ctx, panelX, panelY, panelW, panelH, 28);
  ctx.fill();

  const labelColor = ACCENT;
  const valueColor = TEXT;
  const leftX  = panelX + 28;
  const rightX = panelX + panelW - 28;

  // Centrado vertical por fila
  ctx.textBaseline = 'middle';
  let y = panelY + PANEL_PAD_Y + ROW_LH / 2;

  for (const [label, valueRaw] of rows) {
    const value = valueRaw ?? '—';

    // Label
    ctx.fillStyle = labelColor;
    ctx.font = 'bold 40px Montserrat, Arial, sans-serif';
    const labelWidth = ctx.measureText(label).width;
    ctx.textAlign = 'left';
    ctx.fillText(label, leftX, y);

    // Value (alineado a la derecha y centrado verticalmente)
    ctx.fillStyle = valueColor;
    ctx.textAlign = 'right';
    const maxWidth = panelW - 56 - labelWidth - 20;

    if (label.startsWith('FECHA DE COMPRA')) {
      // Auto-ajuste más agresivo para fecha larga
      let size = 40;
      while (size > 24) {
        ctx.font = `bold ${size}px Montserrat, Arial, sans-serif`;
        if (ctx.measureText(value).width <= maxWidth) break;
        size -= 2;
      }
      const finalText = (ctx.measureText(value).width <= maxWidth)
        ? value
        : clipText(ctx, value, maxWidth);
      ctx.fillText(finalText, rightX, y);
    } else {
      ctx.font = 'bold 40px Montserrat, Arial, sans-serif';
      const clipped = clipText(ctx, value, maxWidth);
      ctx.fillText(clipped, rightX, y);
    }

    y += ROW_LH;
  }

  // Footer (opcional)
  ctx.textAlign = 'center';
  ctx.fillStyle = '#9CA3AF';
  ctx.font = 'bold 28px Montserrat, Arial, sans-serif';
  ctx.fillText('doblecerove.com', W/2, H - 48);

  return canvas;
}

// Helpers
function drawRoundedRect(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w/2, h/2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function drawImageCover(ctx, img, dx, dy, dWidth, dHeight) {
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  const ir = iw / ih;
  const dr = dWidth / dHeight;

  let sx, sy, sw, sh;
  if (ir > dr) { // más ancha -> recortar lados
    sh = ih; sw = sh * dr; sy = 0; sx = (iw - sw) / 2;
  } else {      // más alta -> recortar arriba/abajo
    sw = iw; sh = sw / dr; sx = 0; sy = (ih - sh) / 2;
  }
  ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dWidth, dHeight);
}

function clipText(ctx, text, maxWidth) {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let out = text;
  while (out.length > 0 && ctx.measureText(out + '…').width > maxWidth) {
    out = out.slice(0, -1);
  }
  return out + '…';
}

function loadImageSafe(src, isBlob = false) {
  return new Promise(resolve => {
    if (!src) return resolve(null);
    const img = new Image();
    if (!isBlob) {                 // Para blob: no hace falta (y algunos navegadores lo ignoran)
      img.crossOrigin = 'anonymous';
      img.referrerPolicy = 'no-referrer';
    }
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

// === Atajos de teclado para el Visor ===
// A: aprobar, R: rechazar, W: mover a espera, ←/→: navegar
document.addEventListener('keydown', (e) => {
  if (!isViewerActive?.() || !window.paymentsPending?.length) return;

  // Evitar interferir cuando se escribe en inputs
  const tag = (e.target && e.target.tagName) || '';
  if (['INPUT','TEXTAREA','SELECT'].includes(tag)) return;

  const p = window.paymentsPending[window.currentIdx || 0];
  if (!p) return;

  if (e.key === 'ArrowRight') { e.preventDefault(); return renderViewer((window.currentIdx || 0) + 1); }
  if (e.key === 'ArrowLeft')  { e.preventDefault(); return renderViewer((window.currentIdx || 0) - 1); }

  const k = e.key.toLowerCase();
  if (k === 'a') { e.preventDefault(); approvePayment(p._id); }
  if (k === 'r') { e.preventDefault(); rejectPayment(p._id); }
  if (k === 'w') { e.preventDefault(); waitPayment(p._id); }
});

// Listeners (solo si los botones existen en esta vista)
window.addEventListener('DOMContentLoaded', () => {
  document.getElementById('btn-export-winner')?.addEventListener('click', exportWinnerImage);
  document.getElementById('btn-share-whatsapp')?.addEventListener('click', shareWinnerWhatsApp);
});

function toWhatsAppInternational(phoneVE) {
  // 04XXXXXXXXX -> 58 4XXXXXXXXX (sin '+', sin espacios para wa.me)
  const s = String(phoneVE || '').replace(/\D/g,'');
  if (!s) return '';
  if (s.startsWith('0')) return '58' + s.slice(1);
  if (s.startsWith('58')) return s;
  return s;
}

async function loadContacts() {
  const box = document.getElementById('contacts-table-wrapper');
  if (!box) return;
  box.innerHTML = '<div class="text-center text-gray-400 py-6">Cargando contactos...</div>';

  try {
    const res = await fetchWithAuth(`${API}/api/contacts`);
    const list = await res.json();

    if (!Array.isArray(list) || !list.length) {
      box.innerHTML = '<div class="text-center text-gray-400 py-6">No hay contactos consentidos todavía.</div>';
      return;
    }

    document.getElementById('btn-contacts-export')?.addEventListener('click', async () => {
      try {
        const res = await fetchWithAuth(`${API}/api/contacts/export`);
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `contacts_${new Date().toISOString().slice(0,10)}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 0);
      } catch (e) {
        console.error(e);
        alert('No se pudo exportar el CSV.');
      }
    });


    // Tabla
    let html = `
      <table class="min-w-[820px] w-full text-left rounded-lg bg-gray-900 shadow-lg text-sm">
        <thead>
          <tr class="bg-gray-800 text-green-400">
            <th class="py-2 px-4">Nombre</th>
            <th class="py-2 px-4">Teléfono</th>
            <th class="py-2 px-4">Email</th>
            <th class="py-2 px-4">Consentimiento</th>
            <th class="py-2 px-4">Fecha consentimiento</th>
            <th class="py-2 px-4">Acciones</th>
          </tr>
        </thead>
        <tbody>
    `;

    list.forEach(c => {
      const fullName = `${c.firstName || ''} ${c.lastName || ''}`.trim() || '—';
      const tel = c.phone || '—';
      const ok  = c.consent ? 'Sí' : 'No';
      const dt  = c.consentAt ? new Date(c.consentAt).toLocaleString('es-VE') : '—';
      const wa  = toWhatsAppInternational(tel);
      const msg = encodeURIComponent(document.getElementById('contacts-msg')?.value || '');

      html += `
        <tr class="border-b border-gray-800 hover:bg-gray-800">
          <td class="py-2 px-4 font-bold">${fullName}</td>
          <td class="py-2 px-4">${tel}</td>
          <td class="py-2 px-4">${c.email || '—'}</td>
          <td class="py-2 px-4">${ok}</td>
          <td class="py-2 px-4">${dt}</td>
          <td class="py-2 px-4">
            <a href="https://wa.me/${wa}?text=${msg}" target="_blank"
               class="inline-block bg-green-600 hover:bg-green-500 text-black px-3 py-1 rounded font-bold">
              WhatsApp
            </a>
          </td>
        </tr>
      `;
    });

    html += '</tbody></table>';
    box.innerHTML = html;
  } catch (e) {
    console.error(e);
    box.innerHTML = '<div class="text-center text-red-400 py-6">Error cargando contactos.</div>';
  }
}

// ==================== TOP COMPRADORES (TAREA 3) ====================

// Variable global para guardar el estado actual del top
let currentTopBuyers = [];

// 1. Función principal: Llamar al backend y renderizar
async function calcularTopCompradores() {
    const raffleId = winnersState.selectedRaffle?._id;
    if (!raffleId) {
        alert("Selecciona una rifa primero.");
        return;
    }

    const listContainer = document.getElementById('top-buyers-list');
    listContainer.innerHTML = '<div class="text-gray-400">Calculando...</div>';

    try {
        // Llamada al nuevo endpoint del backend
        const res = await fetchWithAuth(`${API}/api/raffles/${raffleId}/top-buyers?limit=5`);
        if (!res.ok) throw new Error('Error al calcular');
        
        currentTopBuyers = await res.json();

        if (currentTopBuyers.length === 0) {
            listContainer.innerHTML = '<div class="text-gray-500">No hay compras aprobadas para esta rifa.</div>';
            document.getElementById('top-buyers-actions').classList.add('hidden');
            return;
        }

        renderTopBuyersList();
        document.getElementById('top-buyers-actions').classList.remove('hidden');

    } catch (error) {
        console.error(error);
        listContainer.innerHTML = '<div class="text-red-400">Error al calcular el top.</div>';
    }
}

function renderTopBuyersList() {
    const listContainer = document.getElementById('top-buyers-list');
    listContainer.innerHTML = '';

    // TAREA: Solo mostramos los 5 primeros para que no sea una lista infinita
    const buyersToShow = currentTopBuyers.slice(0, 5);

    buyersToShow.forEach((buyer, index) => {
        const place = index + 1;
        const medalColor = place === 1 ? 'text-yellow-400' : (place === 2 ? 'text-gray-300' : (place === 3 ? 'text-orange-400' : 'text-gray-500'));
        
        listContainer.innerHTML += `
            <div class="bg-gray-800 p-3 rounded-lg flex flex-col sm:flex-row gap-2 items-start sm:items-center border border-gray-700 relative" data-index="${index}">
                <div class="font-bold text-lg ${medalColor} w-8 text-center shrink-0">#${place}</div>
                <div class="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-2 w-full">
                    <input type="text" value="${buyer.firstName} ${buyer.lastName}" 
                        class="bg-gray-900 border border-gray-700 rounded px-2 py-1 text-white text-sm focus:border-green-400 outline-none"
                        onchange="updateTopBuyerData(${index}, 'name', this.value)">
                    <input type="text" value="${buyer.phone}" 
                        class="bg-gray-900 border border-gray-700 rounded px-2 py-1 text-white text-sm focus:border-green-400 outline-none"
                        onchange="updateTopBuyerData(${index}, 'phone', this.value)">
                    <div class="flex items-center">
                         <input type="number" value="${buyer.totalTickets}" min="1"
                            class="bg-gray-900 border border-gray-700 rounded-l px-2 py-1 text-white text-sm focus:border-green-400 outline-none w-full"
                            onchange="updateTopBuyerData(${index}, 'totalTickets', this.value)">
                        <span class="bg-gray-700 border border-gray-700 border-l-0 rounded-r px-2 py-1 text-gray-300 text-sm">Tks</span>
                    </div>
                </div>
                 ${place === 1 ? `
                    <button onclick="guardarTop1ComoGanador()" title="Guardar como Ganador"
                        class="sm:ml-2 bg-green-600 hover:bg-green-500 text-white p-2 rounded-full shadow-lg transition">
                        <i class="fas fa-trophy"></i>
                    </button>
                 ` : ''}
            </div>
        `;
    });
}

// 3. Función para actualizar los datos en memoria cuando editas un input
function updateTopBuyerData(index, field, value) {
    if (field === 'totalTickets') {
        currentTopBuyers[index][field] = Number(value);
    } else if (field === 'name') {
        // Separar nombre y apellido si es posible
        const parts = value.trim().split(' ');
        currentTopBuyers[index].firstName = parts[0] || '';
        currentTopBuyers[index].lastName = parts.slice(1).join(' ') || '';
    } else {
        currentTopBuyers[index][field] = value;
    }
    console.log('Top actualizado:', currentTopBuyers[index]);
}

// 4. Conectar los listeners
document.addEventListener('DOMContentLoaded', () => {
    // Conectar el botón de calcular
    document.getElementById('btn-calc-top')?.addEventListener('click', calcularTopCompradores);
    
    // ... tus otros listeners ...
});

// 1. Guardar Ganador (Corregido)
async function guardarTop1ComoGanador() {
    if (!currentTopBuyers || currentTopBuyers.length === 0) return;
    
    const top1 = currentTopBuyers[0];
    const raffleId = winnersState.selectedRaffle?._id;

    if (!confirm(`¿Deseas guardar a ${top1.firstName} ${top1.lastName} como ganador del 2do Premio?`)) return;

    try {
        const res = await fetchWithAuth(`${API}/api/raffles/${raffleId}/winners`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                place: 2, 
                firstName: top1.firstName,
                lastName: top1.lastName,
                phone: top1.phone,
                number: Number(top1.totalTickets), // Aseguramos que sea un número
                status: 'aprobada'
            })
        });

        if (res.ok) {
            alert('¡Ganador del 2do Premio guardado!');
            await onChangeRaffleWinners(); 
        }
    } catch (e) { alert('Error al guardar'); }
}

// 2. Botón de Imagen (Fijado para que siempre descargue)
document.addEventListener('DOMContentLoaded', () => {
    // Usamos una forma más robusta de conectar el botón
    const btnTopImg = document.getElementById('btn-top-image');
    if (btnTopImg) {
        btnTopImg.onclick = (e) => {
            e.preventDefault();
            generarImagenTop3();
        };
    }
});

// --- GENERADOR DE IMAGEN TOP 3 (DISEÑO FINAL PULIDO) ---
async function generarImagenTop3() {
    if (!currentTopBuyers || currentTopBuyers.length < 1) {
        alert("Primero calcula el top de compradores.");
        return;
    }

    const raffle = winnersState.selectedRaffle;
    const buyers = currentTopBuyers.slice(0, 3); // Tomamos solo el Top 3

    const W = 1080, H = 1920; 
    const PAD = 60;
    const canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d');

    const BG = '#0b1220';
    const PANEL = '#1f2937';
    const ACCENT = '#34d399'; 
    const TEXT = '#E5E7EB';   

    try {
        // 1. FONDO
        ctx.fillStyle = BG;
        ctx.fillRect(0, 0, W, H);

        // 2. CARGAR IMÁGENES (Logo y Rifa)
        const logoImg = new Image();
        logoImg.src = 'img/logopngcolorweb2.png';

        const raffleImg = new Image();
        raffleImg.crossOrigin = "anonymous";
        if (raffle.image && !raffle.image.startsWith('img/')) {
            raffleImg.src = 'https://corsproxy.io/?' + encodeURIComponent(raffle.image);
        } else {
            raffleImg.src = (raffle.image || '') + '?t=' + Date.now();
        }

        await Promise.all([
            new Promise(res => { logoImg.onload = res; logoImg.onerror = res; }),
            new Promise(res => { raffleImg.onload = res; raffleImg.onerror = res; })
        ]);

        // 3. HEADER: Logo + Marca
        const logoSize = 130;
        if (logoImg.complete && logoImg.naturalWidth > 0) {
            ctx.save();
            drawRoundedRect(ctx, PAD, PAD, logoSize, logoSize, 24);
            ctx.clip();
            ctx.drawImage(logoImg, PAD, PAD, logoSize, logoSize);
            ctx.restore();
        }

        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillStyle = TEXT;
        ctx.font = 'bold 64px Montserrat, Arial, sans-serif';
        ctx.fillText('DOBLE CERO', PAD + logoSize + 24, PAD + 24);

        // 4. SUBHEADER: Top + Fecha
        const now = new Date();
        const dateLabel = now.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });

        ctx.fillStyle = ACCENT;
        ctx.font = 'bold 48px Montserrat, Arial, sans-serif';
        ctx.fillText('TOP COMPRADORES:', PAD, PAD + logoSize + 48);

        ctx.textAlign = 'right';
        ctx.fillStyle = TEXT;
        ctx.font = 'bold 48px Montserrat, Arial, sans-serif';
        ctx.fillText(dateLabel, W - PAD, PAD + logoSize + 48);

        // 5. IMAGEN RIFA (16:9)
        const imgW = W - PAD*2;
        const imgH = Math.round(imgW * 9 / 16);
        const imgX = PAD;
        const imgY = PAD + logoSize + 140;

        ctx.save();
        drawRoundedRect(ctx, imgX, imgY, imgW, imgH, 28);
        ctx.clip();
        if (raffleImg.complete && raffleImg.naturalWidth > 0) {
            drawImageCover(ctx, raffleImg, imgX, imgY, imgW, imgH);
        } else {
            ctx.fillStyle = '#111827';
            ctx.fillRect(imgX, imgY, imgW, imgH);
        }
        ctx.restore();

        // 6. PREMIO
        ctx.textAlign = 'center';
        ctx.fillStyle = TEXT;
        ctx.font = 'bold 50px Montserrat, sans-serif';
        const premioDesc = raffle.prizes.find(p => p.place === 2)?.description || "PREMIO TOP COMPRADOR";
        ctx.fillText(`PREMIO: ${premioDesc.toUpperCase()}`, W/2, imgY + imgH + 80);

        // 7. PANEL DE POSICIONES
        const panelY = imgY + imgH + 180;
        const panelH = 650;
        ctx.fillStyle = PANEL;
        drawRoundedRect(ctx, PAD, panelY, imgW, panelH, 30);
        ctx.fill();

        // --- TÍTULO POSICIONES (CENTRADO) ---
        ctx.textAlign = 'center'; // Centramos el texto
        ctx.fillStyle = '#ffffff';
        ctx.font = '900 45px Montserrat, sans-serif';
        ctx.fillText('POSICIONES', W/2, panelY + 70);

        // --- LISTADO DE COMPRADORES ---
        buyers.forEach((b, i) => {
            const rowY = panelY + 170 + (i * 120);
            
            // Lado Izquierdo: N°1: 710 TICKETS (Alineado a la izquierda)
            ctx.textAlign = 'left'; 
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 45px Montserrat, sans-serif';
            const rankingTxt = `N°${i+1}: ${b.totalTickets} TICKETS`;
            ctx.fillText(rankingTxt, PAD + 50, rowY);
            
            // Lado Derecho: NOMBRE (Alineado a la derecha, max 15 chars)
            ctx.textAlign = 'right';
            ctx.fillStyle = ACCENT;
            let fullName = `${b.firstName} ${b.lastName}`.trim().toUpperCase();
            if (fullName.length > 15) {
                fullName = fullName.substring(0, 13) + '..';
            }
            ctx.fillText(fullName, W - PAD - 50, rowY);
        });

        // 8. ÚLTIMA ACTUALIZACIÓN
        ctx.textAlign = 'center';
        ctx.fillStyle = '#6b7280';
        ctx.font = 'italic 32px Montserrat, sans-serif';
        const time = now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
        ctx.fillText(`Última actualización: hoy a las ${time}`, W/2, panelY + panelH - 100);

        // Footer (opcional)
        ctx.textAlign = 'center';
        ctx.fillStyle = '#9CA3AF';
        ctx.font = 'bold 28px Montserrat, Arial, sans-serif';
        ctx.fillText('doblecerove.com', W/2, H - 48);

        // 10. DESCARGAR
        const link = document.createElement('a');
        link.download = `Top3_${Date.now()}.png`;
        link.href = canvas.toDataURL('image/png');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

    } catch (error) {
        console.error("Error:", error);
        alert("Hubo un error al generar la imagen.");
    }
}



// === FUNCIÓN CORREGIDA Y COMPLETA ===
async function cargarEstadisticas() {
    console.log("Iniciando carga de estadísticas..."); 
    try {
        const res = await fetchWithAuth(`${API}/api/admin/stats`);
        if (!res.ok) throw new Error('Error al obtener datos');
        
        const data = await res.json();
        console.log("Datos recibidos:", data); 

        // 1. Gráfico de Línea (Ventas por Día)
        const ctxV = document.getElementById('chart-ventas-dias');
        if (chartVentas) {
            chartVentas.destroy();
        }
        
        const diasLabels = Object.keys(data.ventasPorDia || {}).sort();
        const diasValues = diasLabels.map(label => data.ventasPorDia[label]);

        chartVentas = new Chart(ctxV, {
            type: 'line',
            data: {
                labels: diasLabels.length ? diasLabels : ['Sin datos'],
                datasets: [{
                    label: 'Tickets Vendidos',
                    data: diasValues.length ? diasValues : [0],
                    borderColor: '#34d399', 
                    backgroundColor: 'rgba(52, 211, 153, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: '#ffffff',
                    pointRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false, 
                plugins: { legend: { display: false } },
                scales: {
                    y: { beginAtZero: true, grid: { color: 'rgba(255, 255, 255, 0.1)' }, ticks: { color: '#9ca3af' } },
                    x: { grid: { display: false }, ticks: { color: '#9ca3af' } }
                }
            }
        });

        // 2. Gráfico de Barras (Horas Pico)
        const ctxH = document.getElementById('chart-horas');
        if (chartHoras) {
            chartHoras.destroy();
        }

        const horasLabels = Array.from({length: 24}, (_, i) => `${i}:00`);
        const horasData = Array.isArray(data.horasPico) ? data.horasPico : Array(24).fill(0);
        
        chartHoras = new Chart(ctxH, {
            type: 'bar',
            data: {
                labels: horasLabels,
                datasets: [{
                    label: 'Ventas',
                    data: horasData,
                    backgroundColor: '#fbbf24', 
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    y: { beginAtZero: true, grid: { color: 'rgba(255, 255, 255, 0.1)' }, ticks: { color: '#9ca3af' } },
                    x: { grid: { display: false }, ticks: { color: '#9ca3af', maxTicksLimit: 12 } }
                }
            }
        });

        // 3. NUEVO: Gráfico de Barras Horizontales (Rifas) - ¡AHORA SÍ ESTÁ DENTRO!
        const ctxRifas = document.getElementById('chart-rifas-ranking');
        // Verificamos que el canvas exista en el HTML para evitar errores
        if (ctxRifas) {
            if (chartRifas) {
                chartRifas.destroy();
            }

            // Ordenamos las rifas de mayor a menor venta
            const rifasEntries = Object.entries(data.rifasMasVendidas || {})
                .sort(([,a], [,b]) => b - a); 
            
            const rifasLabels = rifasEntries.map(([key]) => key);
            const rifasValues = rifasEntries.map(([,val]) => val);

            chartRifas = new Chart(ctxRifas, {
                type: 'bar',
                data: {
                    labels: rifasLabels.length ? rifasLabels : ['Sin ventas aún'],
                    datasets: [{
                        label: 'Tickets Vendidos',
                        data: rifasValues.length ? rifasValues : [0],
                        backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'],
                        borderWidth: 0,
                        borderRadius: 4
                    }]
                },
                options: {
                    indexAxis: 'y', // Barras horizontales
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                        x: { beginAtZero: true, grid: { color: 'rgba(255, 255, 255, 0.1)' }, ticks: { color: '#9ca3af' } },
                        y: { grid: { display: false }, ticks: { color: '#e5e7eb', font: { weight: 'bold' } } }
                    }
                }
            });
        }

    } catch (err) {
        console.error("Error en estadísticas:", err);
    }
}