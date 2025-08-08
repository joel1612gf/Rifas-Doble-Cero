require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const Purchase = require('./Purchase');
const Raffle = require('./Raffle');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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
app.post('/api/purchases', async (req, res) => {
    try {
        const body = req.body || {};
        const { raffleId, numbers, firstName, lastName, phone, paymentMethod, paymentReference, paymentProof } = body;

        if (!raffleId || !Array.isArray(numbers) || numbers.length === 0) {
            return res.status(400).json({ message: 'Datos incompletos en la compra.' });
        }

        const purchase = new Purchase({
            raffleId,
            numbers,
            firstName,
            lastName,
            phone,
            paymentMethod,
            paymentReference,
            paymentProof
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

