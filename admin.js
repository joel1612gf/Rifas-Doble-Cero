// Credenciales básicas (puedes mejorarlo con backend más adelante)
const ADMIN_USER = 'a';
const ADMIN_PASS = 'a';

// === Verificador ===
let paymentsMode = 'table';     // 'table' | 'viewer'
let payments = [];              // todas las compras (según filtro)
let paymentsPending = [];       // solo pendientes (para visor)
let currentIdx = 0;

// Login simple (solo frontend por ahora)
function loginAdmin() {
    const user = document.getElementById('admin-username').value.trim();
    const pass = document.getElementById('admin-password').value.trim();
    const errorDiv = document.getElementById('login-error');
    if (user === ADMIN_USER && pass === ADMIN_PASS) {
        document.getElementById('admin-login').classList.add('hidden');
        document.getElementById('admin-panel').classList.remove('hidden');
        loadRaffles();
    } else {
        errorDiv.classList.remove('hidden');
    }
}
function logoutAdmin() {
    document.getElementById('admin-panel').classList.add('hidden');
    document.getElementById('admin-login').classList.remove('hidden');
    document.getElementById('admin-username').value = '';
    document.getElementById('admin-password').value = '';
    document.getElementById('login-error').classList.add('hidden');
}
// 1
// Navegación
function showSection(section) {
  const raffles = document.getElementById('section-raffles');
  const payments = document.getElementById('section-payments');

  raffles.style.display  = (section === 'raffles')  ? 'block' : 'none';
  payments.style.display = (section === 'payments') ? 'block' : 'none';

  if (section === 'raffles')  loadRaffles();
  if (section === 'payments') loadPayments('viewer'); // ← visor por defecto
}

// ======== Cargar Rifas desde Backend ========
async function loadRaffles() {
    const wrapper = document.getElementById('raffles-table-wrapper');
    wrapper.innerHTML = '<div class="text-center text-gray-400">Cargando rifas...</div>';
    try {
        const res = await fetch('http://localhost:4000/api/raffles');
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
    currentPrizes = [];
    renderPrizesList();
    document.getElementById('raffle-form-modal').classList.remove('hidden');
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
    const status = document.getElementById('raffle-status').value;

    const prizes = currentPrizes.map((p, i) => ({
        place: i + 1,
        description: p.description,
        image: p.image
    }));

    const data = { title, description, image, priceBs, priceUsd, drawDate, totalNumbers, prizes, status };

    try {
        if (id) {
            // Editar rifa existente
            await fetch(`http://localhost:4000/api/raffles/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
        } else {
            // Crear nueva rifa
            await fetch('http://localhost:4000/api/raffles', {
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
        const res = await fetch(`http://localhost:4000/api/raffles/${id}`);
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
        await fetch(`http://localhost:4000/api/raffles/${id}`, {
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

  // Toggle active
  btnTable?.classList.toggle('bg-green-600', mode === 'table');
  btnViewer?.classList.toggle('bg-green-600', mode === 'viewer');

  if (mode === 'table') {
    header.classList.add('hidden');
    viewerWrapper.classList.add('hidden');
    tableWrapper.classList.remove('hidden');

    tableWrapper.innerHTML = '<div class="text-center text-gray-400">Cargando pagos...</div>';
    try {
      const res = await fetch('http://localhost:4000/api/purchases?status=pendiente'); // todos
      const pagos = await res.json();
      payments = Array.isArray(pagos) ? pagos : [];
      renderPaymentsTable(payments);
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
      const res = await fetch('http://localhost:4000/api/purchases?status=pendiente'); // solo pendientes
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
                <th class="py-2 px-4">Comprobante</th>
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
    const comp = (pago && pago.paymentProof)
    ? `<a href="${pago.paymentProof}" target="_blank" class="underline text-blue-400">Ver</a>`
    : '-';

    table += `
    <tr class="border-b border-gray-800 hover:bg-gray-800">
        <td class="py-2 px-4">${pago?.createdAt ? new Date(pago.createdAt).toLocaleString() : '-'}</td>
        <td class="py-2 px-4 font-bold">${(pago?.firstName || '')} ${(pago?.lastName || '')}</td>
        <td class="py-2 px-4">${rifaNombre}</td>
        <td class="py-2 px-4">${pago?.phone || '-'}</td>
        <td class="py-2 px-4">${Array.isArray(pago?.numbers) ? pago.numbers.join(', ') : '-'}</td>
        <td class="py-2 px-4">${pago?.paymentMethod || '-'}</td>
        <td class="py-2 px-4">${pago?.paymentReference || '-'}</td>
        <td class="py-2 px-4">${monto}</td>
        <td class="py-2 px-4">${comp}</td>
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


// ----- Visor -----
function renderViewer(idx) {
  if (!paymentsPending.length) return;
  if (idx < 0) idx = 0;
  if (idx >= paymentsPending.length) idx = paymentsPending.length - 1;
  currentIdx = idx;

  const pago = paymentsPending[currentIdx];
  document.getElementById('viewer-counter').textContent = `${currentIdx + 1}/${paymentsPending.length}`;

  const box = document.getElementById('proof-box');
  const url = pago.paymentProof || '';
  if (/\.(pdf)(\?|$)/i.test(url)) {
    box.innerHTML = `<iframe src="${url}" class="w-full h-full" frameborder="0"></iframe>`;
  } else {
    box.innerHTML = `<img src="${url}" class="max-w-full max-h-full object-contain" alt="Comprobante">`;
  }

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
  set('v-numeros', (pago.numbers || []).join(', ') || '-');
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
});

// ----- Acciones -----
async function approvePayment(id) {
  try {
    const res = await fetch(`http://localhost:4000/api/purchases/${id}/approve`, { method: 'PUT' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    await refreshAfterAction();
  } catch (e) {
    console.error('approvePayment error:', e);
    alert('Error aprobando la compra');
  }
}

async function rejectPayment(id) {
  try {
    const res = await fetch(`http://localhost:4000/api/purchases/${id}/reject`, { method: 'PUT' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    await refreshAfterAction();
  } catch (e) {
    console.error('rejectPayment error:', e);
    alert('Error rechazando la compra');
  }
}

async function waitPayment(id) {
  try {
    const res = await fetch(`http://localhost:4000/api/purchases/${id}/wait`, { method: 'PUT' });
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
