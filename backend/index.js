require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
const fileUpload = require('express-fileupload');

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

// === RUTA NUEVA PARA REGISTRAR COMPRAS ===
// === RUTA NUEVA PARA REGISTRAR COMPRAS (con archivo) ===
app.post('/api/purchases', async (req, res) => {
  try {
    // En FormData, "numbers" llega como string JSON. Lo normalizamos.
    let { raffleId, numbers, firstName, lastName, phone, paymentMethod, paymentReference } = req.body;
    try { if (typeof numbers === 'string') numbers = JSON.parse(numbers); } catch { numbers = []; }

    // Tomamos el archivo del comprobante (campo "paymentProof")
    const file = req.files && req.files.paymentProof ? req.files.paymentProof : null;

    if (!raffleId || !Array.isArray(numbers) || numbers.length === 0 || !file) {
      return res.status(400).json({ message: 'Datos incompletos en la compra.' });
    }

    // Guardar el archivo en /uploads con nombre único
    const ext = path.extname(file.name).toLowerCase();
    const safeName = Date.now() + '-' + Math.random().toString(36).slice(2) + ext;
    const finalPath = path.join(uploadDir, safeName);

    await file.mv(finalPath); // mover archivo

    // URL pública para el admin
    const proofUrl = `${req.protocol}://${req.get('host')}/uploads/${safeName}`;

    const purchase = new Purchase({
      raffleId,
      numbers,
      firstName,
      lastName,
      phone,
      paymentMethod,
      paymentReference,
      paymentProof: proofUrl
    });

    await purchase.save();
    return res.status(201).json({ message: 'Compra registrada exitosamente', purchase });
  } catch (error) {
    console.error('Error en /api/purchases:', error);
    return res.status(500).json({ message: 'Error registrando la compra', error: error.message });
  }
});


// Obtener todas las compras (para el admin)
app.get('/api/purchases', async (req, res) => {
    try {
        const purchases = await Purchase.find().sort({ createdAt: -1 });
        res.json(purchases);
    } catch (error) {
        res.status(500).json({ message: 'Error obteniendo compras', error: error.message });
    }
});

// Aprobar compra
app.put('/api/purchases/:id/approve', async (req, res) => {
    try {
        const purchase = await Purchase.findByIdAndUpdate(req.params.id, { status: "aprobada" }, { new: true });
        res.json({ message: "Compra aprobada", purchase });
    } catch (error) {
        res.status(500).json({ message: 'Error aprobando compra', error: error.message });
    }
});

// Rechazar compra
app.put('/api/purchases/:id/reject', async (req, res) => {
    try {
        const purchase = await Purchase.findByIdAndUpdate(req.params.id, { status: "rechazada" }, { new: true });
        res.json({ message: "Compra rechazada", purchase });
    } catch (error) {
        res.status(500).json({ message: 'Error rechazando compra', error: error.message });
    }
});



const PORT = 4000;
app.listen(PORT, () => {
    console.log(`Servidor backend escuchando en http://localhost:${PORT}`);
});

