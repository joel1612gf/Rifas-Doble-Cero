const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const express   = require('express');
const cors      = require('cors');
const mongoose  = require('mongoose');
const fs        = require('fs');
const fileUpload= require('express-fileupload');
const jwt       = require('jsonwebtoken');
const bcrypt    = require('bcrypt');
const rateLimit = require('express-rate-limit');

process.env.MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI || process.env.DATABASE_URL;
const JWT_SECRET = process.env.JWT_SECRET || 'da72d1531c24df76a5ce4fa60070b25cec6bce3db41558040b2fc0e3a12fcd593768f0ada05e3062881403267d456ab7';

// Normaliza nombre de la variable de conexión si cambia
process.env.MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI || process.env.DATABASE_URL;

const Purchase = require('./Purchase');
const Raffle = require('./Raffle');

const app = express();
app.use(cors());

// Parseo estándar
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// === UPLOADS: carpeta y estáticos ===
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

// Activar manejo de archivos con express-fileupload (5MB máx)
app.use(fileUpload({
  limits: { fileSize: 5 * 1024 * 1024 },
  abortOnLimit: true,
  useTempFiles: false
}));

// Servir los archivos subidos
app.use('/uploads', express.static(uploadDir));

// === BÚSQUEDA DE NÚMEROS POR TELÉFONO (solo rifas ACTIVAS) ===
const phoneLookupLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 60,                   // hasta 60 consultas/hora por IP
  standardHeaders: true,
  legacyHeaders: false
});

function normalizePhoneVE(raw = '') {
  const digits = (raw + '').replace(/\D+/g, '');
  // Canon: 0 + 10 dígitos (ej: 04241234567)
  if (digits.length === 11 && digits.startsWith('0')) return digits;
  if (digits.length === 12 && digits.startsWith('58')) return '0' + digits.slice(-10);
  if (digits.length === 10) return '0' + digits;
  // si viene +58..., quitamos + y normalizamos
  if (raw.startsWith('+58') && digits.length >= 12) return '0' + digits.slice(-10);
  return digits; // fallback
}
function variantsForPhone(raw = '') {
  const canon = normalizePhoneVE(raw); // 0xxxxxxxxxx
  if (!/^0\d{10}$/.test(canon)) return [raw.trim()];
  const intl = '+58' + canon.slice(1); // +58xxxxxxxxxx
  const intl2 = '58' + canon.slice(1); // 58xxxxxxxxxx
  return Array.from(new Set([canon, intl, intl2]));
}

app.get('/api/tickets/by-phone', phoneLookupLimiter, async (req, res) => {
  try {
    const { phone = '', includePending = '1' } = req.query;
    const variants = variantsForPhone(phone);
    if (!variants.length) return res.json({ phone, results: [] });

    const statuses = includePending === '1' ? ['aprobada', 'pendiente'] : ['aprobada'];

    // Compras por teléfono (aprobadas o con pendiente opcional)
    const purchases = await Purchase.find({
      phone: { $in: variants },
      status: { $in: statuses }
    }).lean();

    if (!purchases.length) return res.json({ phone, results: [] });

    // Filtrar por rifas ACTIVAS
    const raffleIds = Array.from(new Set(purchases.map(p => p.raffleId).filter(Boolean)));
    const activeRaffles = await Raffle.find({ _id: { $in: raffleIds }, status: 'activa' })
      .select('_id title status')
      .lean();
    const activeSet = new Set(activeRaffles.map(r => String(r._id)));
    const titleById = Object.fromEntries(activeRaffles.map(r => [String(r._id), r.title || 'Rifa']));

    // Agrupar por rifa
    const byRaffle = new Map();
    for (const p of purchases) {
      if (!activeSet.has(String(p.raffleId))) continue; // solo activas
      const key = String(p.raffleId);
      if (!byRaffle.has(key)) byRaffle.set(key, []);
      // Expandir números con su estatus
      const arr = byRaffle.get(key);
      for (const n of (p.numbers || [])) {
        arr.push({
          number: n,
          status: (p.status === 'aprobada') ? 'Aprobado' : (p.status === 'pendiente' ? 'En revisión' : p.status),
          createdAt: p.createdAt
        });
      }
    }

    // Armar respuesta final ordenada
    const results = [];
    for (const [raffleId, entries] of byRaffle.entries()) {
      entries.sort((a, b) => a.number - b.number);
      results.push({
        raffleId,
        raffleTitle: titleById[raffleId] || '',
        numbers: entries
      });
    }
    // ordenar por título de rifa
    results.sort((a, b) => (a.raffleTitle || '').localeCompare(b.raffleTitle || ''));

    res.json({ phone, includePending: includePending === '1', results });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Error buscando números', error: e.message });
  }
});

// Conexión a MongoDB Atlas
mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
.then(() => console.log('🟢 Conectado a MongoDB Atlas'))
.catch(err => console.error('Error conectando a MongoDB:', err));

app.get('/', (req, res) => {
    res.send('¡Hola, mundo desde el backend!');
});
function requireAdmin(req, res, next) {
  try {
    const h = req.headers.authorization || '';
    const token = h.startsWith('Bearer ') ? h.slice(7) : null;
    if (!token) return res.status(401).json({ message: 'No autorizado' });

    const payload = jwt.verify(token, JWT_SECRET);
    if (!payload || payload.role !== 'admin') return res.status(401).json({ message: 'No autorizado' });

    req.admin = { user: payload.user };
    next();
  } catch {
    return res.status(401).json({ message: 'No autorizado' });
  }
}
// Proxy simple para imágenes externas (evita CORS en canvas)
app.get('/api/proxy-image', async (req, res) => {
  try {
    const { url } = req.query;
    if (!url) return res.status(400).send('Missing url');

    const r = await fetch(url, {
      headers: {
        // Algunos hosts requieren un UA “real”
        'User-Agent': 'Mozilla/5.0',
        'Accept': 'image/*,*/*'
      }
    });

    if (!r.ok) return res.status(r.status).send('Fetch failed');

    const ct = r.headers.get('content-type') || 'image/jpeg';
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Content-Type', ct);

    const buf = Buffer.from(await r.arrayBuffer());
    res.send(buf);
  } catch (e) {
    res.status(500).send('proxy error');
  }
});

// Protección global para métodos sensibles en /api, excepto compra pública
app.use((req, res, next) => {
  const isApi = req.path.startsWith('/api/');
  const isSensitive = ['POST','PUT','PATCH','DELETE'].includes(req.method);
  const isPublicPurchase = req.method === 'POST' && req.path === '/api/purchases';
  const isLogin = req.method === 'POST' && req.path === '/api/auth/login';

  if (isApi && isSensitive && !isPublicPurchase && !isLogin) {
    return requireAdmin(req, res, next);
  }
  next();
});
// CREAR una nueva rifa
app.post('/api/raffles', async (req, res) => {
    try {
        const raffle = new Raffle(req.body);
        await raffle.save();
        res.status(201).json({ message: 'Rifa creada exitosamente', raffle });
    } catch (error) {
        res.status(500).json({ message: 'Error creando rifa', error: error.message });
    }
});

// OBTENER todas las rifas
app.get('/api/raffles', async (req, res) => {
    try {
        const raffles = await Raffle.find().sort({ createdAt: -1 });
        res.json(raffles);
    } catch (error) {
        res.status(500).json({ message: 'Error obteniendo rifas', error: error.message });
    }
});

// OBTENER una rifa por ID
app.get('/api/raffles/:id', async (req, res) => {
    try {
        const raffle = await Raffle.findById(req.params.id);
        if (!raffle) return res.status(404).json({ message: 'Rifa no encontrada' });
        res.json(raffle);
    } catch (error) {
        res.status(500).json({ message: 'Error obteniendo rifa', error: error.message });
    }
});

// EDITAR una rifa por ID
app.put('/api/raffles/:id', async (req, res) => {
    try {
        const raffle = await Raffle.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!raffle) return res.status(404).json({ message: 'Rifa no encontrada' });
        res.json({ message: 'Rifa actualizada', raffle });
    } catch (error) {
        res.status(500).json({ message: 'Error actualizando rifa', error: error.message });
    }
});

// ELIMINAR (o desactivar) una rifa por ID
app.delete('/api/raffles/:id', async (req, res) => {
    try {
        await Raffle.findByIdAndDelete(req.params.id);
        res.json({ message: 'Rifa eliminada' });
    } catch (error) {
        res.status(500).json({ message: 'Error eliminando rifa', error: error.message });
    }
});

// === REGISTRAR COMPRA (con archivo real) ===
// === REGISTRAR COMPRA + RESERVAR NÚMEROS ===
app.post('/api/purchases', async (req, res) => {
  try {
    // Body puede venir como strings (FormData)
    let { raffleId, numbers, firstName, lastName, phone, paymentMethod, paymentReference } = req.body || {};
    if (typeof numbers === 'string') {
      try { numbers = JSON.parse(numbers); } catch { numbers = []; }
    }

    if (!raffleId || !Array.isArray(numbers) || numbers.length === 0) {
      return res.status(400).json({ message: 'Datos incompletos en la compra.' });
    }

    // 1) Intentar RESERVAR atómicamente: si alguno ya está vendido o reservado, falla
    const reserved = await Raffle.findOneAndUpdate(
      { _id: raffleId, numbersSold: { $nin: numbers }, numbersReserved: { $nin: numbers } },
      { $addToSet: { numbersReserved: { $each: numbers } } },
      { new: true }
    );

    if (!reserved) {
      // Alguien se adelantó: devolvemos cuáles están ocupados
      const r = await Raffle.findById(raffleId).lean();
      const ocupados = numbers.filter(n =>
        (r?.numbersSold || []).includes(n) || (r?.numbersReserved || []).includes(n)
      );
      return res.status(409).json({ message: 'Algunos números ya no están disponibles', ocupados });
    }

    // (Opcional) calcular monto/moneda según método de pago y rifa
    let amount = undefined, currency = undefined, raffleTitle = '';
    const rifa = await Raffle.findById(raffleId).lean();
    if (rifa) {
    raffleTitle = rifa.title || rifa.name || '';
    const pagaEnUsd = (paymentMethod === 'binance' || paymentMethod === 'zinli') && (rifa.priceUsd || 0) > 0;
    const unitPrice  = pagaEnUsd ? (rifa.priceUsd || 0) : (rifa.priceBs || 0);
    amount   = unitPrice * numbers.length;
    currency = pagaEnUsd ? '$' : 'Bs';
    }


    // 2) Guardar la compra en PENDIENTE (aquí ya tendrás tu paymentProof si usas express-fileupload)
// 2) Tomar y guardar el comprobante (OBLIGATORIO)
const file = req.files && req.files.paymentProof ? req.files.paymentProof : null;
if (!file) {
  return res.status(400).json({ message: 'Falta el comprobante (paymentProof).' });
}

// Nombre seguro y guardado físico
const ext = path.extname(file.name).toLowerCase();
const safeName = Date.now() + '-' + Math.random().toString(36).slice(2) + ext;
const finalPath = path.join(uploadDir, safeName);
await file.mv(finalPath);

// URL pública para verlo en admin (tabla/visor)
const proofUrl = `${req.protocol}://${req.get('host')}/uploads/${safeName}`;

// 3) Guardar la compra en PENDIENTE con la URL del comprobante
const purchase = new Purchase({
  raffleId,
  raffleTitle,
  numbers,
  firstName,
  lastName,
  phone,
  paymentMethod,
  paymentReference,
  paymentProof: proofUrl,   // ← AHORA guardamos la URL real
  amount,
  currency
});

await purchase.save();
return res.status(201).json({ message: 'Compra registrada y números reservados', purchase });

  } catch (error) {
    console.error('Error en /api/purchases:', error);
    return res.status(500).json({ message: 'Error registrando la compra', error: error.message });
  }
});

// Obtener todas las compras (para el admin)
app.get('/api/purchases', async (req, res) => {
  try {
    const { status } = req.query;
    const filter = status ? { status } : {};
    const purchases = await Purchase.find(filter).sort({ createdAt: -1 });
    res.json(purchases);
  } catch (error) {
    res.status(500).json({ message: 'Error obteniendo compras', error: error.message });
  }
});


// Aprobar compra
app.put('/api/purchases/:id/approve', async (req, res) => {
  try {
    const purchase = await Purchase.findById(req.params.id);
    if (!purchase) return res.status(404).json({ message: 'Compra no encontrada' });

    // mover: reserved -> sold
    await Raffle.updateOne(
      { _id: purchase.raffleId },
      {
        $pullAll: { numbersReserved: purchase.numbers },
        $addToSet: { numbersSold: { $each: purchase.numbers } }
      }
    );

    const updated = await Purchase.findByIdAndUpdate(
      req.params.id,
      { status: "aprobada" },
      { new: true }
    );
    res.json({ message: "Compra aprobada", purchase: updated });
  } catch (error) {
    res.status(500).json({ message: 'Error aprobando compra', error: error.message });
  }
});

// Rechazar compra
app.put('/api/purchases/:id/reject', async (req, res) => {
  try {
    const purchase = await Purchase.findById(req.params.id);
    if (!purchase) return res.status(404).json({ message: 'Compra no encontrada' });

    // liberar: quitar de reserved
    await Raffle.updateOne(
      { _id: purchase.raffleId },
      { $pullAll: { numbersReserved: purchase.numbers } }
    );

    const updated = await Purchase.findByIdAndUpdate(
      req.params.id,
      { status: "rechazada" },
      { new: true }
    );
    res.json({ message: "Compra rechazada", purchase: updated });
  } catch (error) {
    res.status(500).json({ message: 'Error rechazando compra', error: error.message });
  }
});


// Poner compra en "espera"
app.put('/api/purchases/:id/wait', async (req, res) => {
  try {
    const purchase = await Purchase.findByIdAndUpdate(
      req.params.id,
      { status: "espera" },
      { new: true }
    );
    res.json({ message: "Compra en espera", purchase });
  } catch (error) {
    res.status(500).json({ message: 'Error poniendo compra en espera', error: error.message });
  }
});


// ====== GANADORES (MANUAL) ======

// 1) Lookup: trae datos del comprador APROBADO por número
app.get('/api/raffles/:id/lookup-winner', async (req, res) => {
  try {
    const { id } = req.params;
    const number = Number(req.query.number);
    if (!number && number !== 0) return res.status(400).json({ message: 'Falta number' });

    const purchase = await Purchase.findOne({
      raffleId: id,
      status: 'aprobada',
      numbers: number
    }).sort({ createdAt: 1 });

    if (!purchase) return res.json(null);

    res.json({
      purchaseId: purchase._id,
      firstName: purchase.firstName,
      lastName: purchase.lastName,
      phone: purchase.phone,
      ticket: number,
      status: purchase.status,
      createdAt: purchase.createdAt
    });
  } catch (error) {
    res.status(500).json({ message: 'Error buscando ganador', error: error.message });
  }
});

// 2) Guardar/actualizar ganador de un lugar (place) con un número
app.put('/api/raffles/:id/winners', async (req, res) => {
  try {
    const { id } = req.params;
    const { place, number } = req.body;
    if (!place || !number) return res.status(400).json({ message: 'place y number son requeridos' });

    const raffle = await Raffle.findById(id);
    if (!raffle) return res.status(404).json({ message: 'Rifa no encontrada' });

    // buscar compra aprobada para ese número
    const purchase = await Purchase.findOne({
      raffleId: id,
      status: 'aprobada',
      numbers: Number(number)
    }).sort({ createdAt: 1 });

    let winnerData;
    if (purchase) {
      winnerData = {
        place: Number(place),
        number: Number(number),
        purchaseId: purchase._id,
        firstName: purchase.firstName,
        lastName: purchase.lastName,
        phone: purchase.phone,
        ticket: Number(number),
        status: 'aprobada',
        purchasedAt: purchase.createdAt,
        drawnAt: new Date()
      };
    } else {
      // Permitir guardar SIN COMPRADOR para documentar que el número no tenía dueño
      winnerData = {
        place: Number(place),
        number: Number(number),
        purchaseId: null,
        firstName: '',
        lastName: '',
        phone: '',
        ticket: Number(number),
        status: 'sin_comprador',
        purchasedAt: null,
        drawnAt: new Date()
      };
    }

    // upsert por place
    raffle.winners = (raffle.winners || []).filter(w => w.place !== Number(place));
    raffle.winners.push(winnerData);
    await raffle.save();

    res.json(raffle.winners);
  } catch (error) {
    res.status(500).json({ message: 'Error guardando ganador', error: error.message });
  }
});

// 3) Listar ganadores de una rifa
app.get('/api/raffles/:id/winners', async (req, res) => {
  try {
    const raffle = await Raffle.findById(req.params.id);
    if (!raffle) return res.status(404).json({ message: 'Rifa no encontrada' });
    res.json(raffle.winners || []);
  } catch (error) {
    res.status(500).json({ message: 'Error listando ganadores', error: error.message });
  }
});

// 4) Limpiar ganador de un lugar (eliminar un place)
app.delete('/api/raffles/:id/winners/:place', async (req, res) => {
  try {
    const { id, place } = req.params;
    const raffle = await Raffle.findById(id);
    if (!raffle) return res.status(404).json({ message: 'Rifa no encontrada' });

    const before = (raffle.winners || []).length;
    raffle.winners = (raffle.winners || []).filter(w => w.place !== Number(place));
    await raffle.save();

    res.json({ removed: before - (raffle.winners || []).length, winners: raffle.winners || [] });
  } catch (error) {
    res.status(500).json({ message: 'Error limpiando ganador', error: error.message });
  }
});
// ====== AUTH (LOGIN ADMIN) ======
const ADMIN_USER       = process.env.ADMIN_USER || 'admin';
const ADMIN_PASS_HASH  = process.env.ADMIN_PASS_HASH || '';
const ADMIN_PASS_PLAIN = process.env.ADMIN_PASS || '';

const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, standardHeaders: true, legacyHeaders: false });

app.post('/api/auth/login', loginLimiter, async (req, res) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) return res.status(400).json({ message: 'Faltan credenciales' });
    if (username !== ADMIN_USER) return res.status(401).json({ message: 'Credenciales inválidas' });

    let ok = false;
    if (ADMIN_PASS_HASH && ADMIN_PASS_HASH.startsWith('$2')) {
      ok = await bcrypt.compare(password, ADMIN_PASS_HASH);
    } else if (ADMIN_PASS_PLAIN) {
      ok = password === ADMIN_PASS_PLAIN; // fallback temporal
    }
    if (!ok) return res.status(401).json({ message: 'Credenciales inválidas' });

    const token = jwt.sign({ sub: 'admin-001', user: ADMIN_USER, role: 'admin' }, JWT_SECRET, { expiresIn: '12h' });
    res.json({ token, user: ADMIN_USER, expiresIn: 12 * 60 * 60 });
  } catch (err) {
    res.status(500).json({ message: 'Error en login', error: err.message });
  }
});

app.post('/api/auth/login', loginLimiter, async (req, res) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) return res.status(400).json({ message: 'Faltan credenciales' });

    if (username !== ADMIN_USER) {
      // Mensaje genérico (no decimos si falló user o pass)
      return res.status(401).json({ message: 'Credenciales inválidas' });
    }

    let ok = false;
    if (ADMIN_PASS_HASH && ADMIN_PASS_HASH.startsWith('$2')) {
      ok = await bcrypt.compare(password, ADMIN_PASS_HASH);
    } else if (ADMIN_PASS_PLAIN) {
      ok = password === ADMIN_PASS_PLAIN; // ⚠️ Fallback temporal
    }

    if (!ok) return res.status(401).json({ message: 'Credenciales inválidas' });

    const token = jwt.sign({ sub: 'admin-001', user: ADMIN_USER, role: 'admin' }, JWT_SECRET, { expiresIn: '12h' });
    res.json({ token, user: ADMIN_USER, expiresIn: 12 * 60 * 60 });
  } catch (err) {
    res.status(500).json({ message: 'Error en login', error: err.message });
  }
});
const PORT = 4000;
app.listen(PORT, () => {
  console.log(`Servidor backend escuchando en http://localhost:${PORT}`);
});

