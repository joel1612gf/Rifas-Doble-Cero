// Credenciales básicas (puedes mejorarlo con backend más adelante)
const ADMIN_USER = 'a';
const ADMIN_PASS = 'a';

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
    document.getElementById('section-raffles').style.display = (section === 'raffles') ? 'block' : 'none';
    document.getElementById('section-payments').style.display = (section === 'payments') ? 'block' : 'none';
    // (Las otras secciones se agregan luego)
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
            <div class="flex space-x-2 items-center mb-2">
                <span class="font-bold text-green-400">${prize.place}°</span>
                <input type="text" placeholder="Descripción" value="${prize.description}" class="flex-1 px-2 py-1 rounded bg-gray-700 text-white" 
                    onchange="currentPrizes[${i}].description = this.value">
                <input type="url" placeholder="Imagen (opcional)" value="${prize.image || ''}" class="flex-1 px-2 py-1 rounded bg-gray-700 text-white" 
                    onchange="currentPrizes[${i}].image = this.value">
                <button type="button" onclick="removePrizeField(${i})" class="text-red-400 hover:text-red-600 font-bold text-xl">&times;</button>
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

// pagos

// ====== Cargar Compras Pendientes ======
async function loadPayments() {
    const wrapper = document.getElementById('payments-table-wrapper');
    wrapper.innerHTML = '<div class="text-center text-gray-400">Cargando pagos...</div>';
    try {
        const res = await fetch('http://localhost:4000/api/purchases');
        let payments = await res.json();

        // Solo pendientes
        payments = payments.filter(p => p.status === "pendiente");

        if (payments.length === 0) {
            wrapper.innerHTML = '<div class="text-center text-gray-400">No hay pagos pendientes.</div>';
            return;
        }
        let table = `
            <div class="overflow-x-auto">
            <table class="w-full text-left rounded-lg bg-gray-900 shadow-lg">
                <thead>
                    <tr class="bg-gray-800 text-green-400">
                        <th class="py-2 px-4">Fecha</th>
                        <th class="py-2 px-4">Nombre</th>
                        <th class="py-2 px-4">Teléfono</th>
                        <th class="py-2 px-4">Números</th>
                        <th class="py-2 px-4">Pago</th>
                        <th class="py-2 px-4">Referencia</th>
                        <th class="py-2 px-4">Comprobante</th>
                        <th class="py-2 px-4">Acciones</th>
                    </tr>
                </thead>
                <tbody>
        `;
        payments.forEach(pago => {
            table += `
                <tr class="border-b border-gray-800 hover:bg-gray-800">
                    <td class="py-2 px-4">${new Date(pago.createdAt).toLocaleString()}</td>
                    <td class="py-2 px-4 font-bold">${pago.firstName} ${pago.lastName}</td>
                    <td class="py-2 px-4">${pago.phone}</td>
                    <td class="py-2 px-4">${(pago.numbers || []).join(', ')}</td>
                    <td class="py-2 px-4">${pago.paymentMethod}</td>
                    <td class="py-2 px-4">${pago.paymentReference}</td>
                    <td class="py-2 px-4">
                        ${pago.paymentProof ? `<a href="${pago.paymentProof}" target="_blank" class="underline text-blue-400">Ver</a>` : '-'}
                    </td>
                    <td class="py-2 px-4 space-x-2">
                        <button class="bg-green-500 hover:bg-green-600 text-white px-2 py-1 rounded text-xs font-bold" onclick="approvePayment('${pago._id}')">Aprobar</button>
                        <button class="bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded text-xs font-bold" onclick="rejectPayment('${pago._id}')">Rechazar</button>
                    </td>
                </tr>
            `;
        });
        table += '</tbody></table></div>';
        wrapper.innerHTML = table;
    } catch (err) {
        wrapper.innerHTML = '<div class="text-center text-red-400">Error cargando pagos.</div>';
    }
}

// Llamar a esta función cuando entres a la sección
document.querySelectorAll('.nav-link').forEach(btn => {
    btn.addEventListener('click', e => {
        if (e.target.textContent.includes('Verificar pagos')) loadPayments();
    });
});

// ====== Aprobar y Rechazar ======
async function approvePayment(id) {
    if (!confirm('¿Seguro que quieres aprobar este pago?')) return;
    try {
        await fetch(`http://localhost:4000/api/purchases/${id}/approve`, { method: 'PUT' });
        loadPayments();
        loadRaffles(); // Para refrescar números vendidos, si lo deseas
    } catch (err) {
        alert('Error aprobando pago');
    }
}
async function rejectPayment(id) {
    if (!confirm('¿Seguro que quieres rechazar este pago?')) return;
    try {
        await fetch(`http://localhost:4000/api/purchases/${id}/reject`, { method: 'PUT' });
        loadPayments();
    } catch (err) {
        alert('Error rechazando pago');
    }
}
