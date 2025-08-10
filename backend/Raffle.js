const mongoose = require('mongoose');

const prizeSchema = new mongoose.Schema({
    place: Number, // 1 = primer premio, 2 = segundo, etc
    description: String,
    image: String // Opcional, si quieres mostrar imagen para cada premio
});

const raffleSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: String,
    image: String,
    priceBs: { type: Number, required: true },      // <<<< NUEVO
    priceUsd: { type: Number, default: 0 },         // <<<< NUEVO
    drawDate: Date,
    totalNumbers: { type: Number, required: true },
    numbersSold: [Number],
    numbersReserved: [Number],   // ← NUEVO
    prizes: [prizeSchema],
    status: { type: String, default: 'activa' },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});


module.exports = mongoose.model('Raffle', raffleSchema);
