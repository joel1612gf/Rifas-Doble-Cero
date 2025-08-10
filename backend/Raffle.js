const mongoose = require('mongoose');

const prizeSchema = new mongoose.Schema({
    place: Number, // 1 = primer premio, 2 = segundo, etc
    description: String,
    image: String // Opcional, si quieres mostrar imagen para cada premio
});
const winnerSchema = new mongoose.Schema({
  place: { type: Number, required: true },        // 1, 2, 3...
  number: { type: Number, required: true },       // ticket ganador (número)
  purchaseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Purchase', default: null },
  firstName: String,
  lastName: String,
  phone: String,
  ticket: Number,                                  // redundante = number (útil para consultas)
  status: { type: String, default: 'aprobada' },   // 'aprobada' | 'sin_comprador'
  purchasedAt: Date,
  drawnAt: { type: Date, default: Date.now }
}, { _id: false });

const raffleSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: String,
  image: String,
  priceBs: { type: Number, required: true },
  priceUsd: { type: Number, default: 0 },
  drawDate: Date,
  totalNumbers: { type: Number, required: true },
  numbersSold: [Number],
  numbersReserved: [Number],
  prizes: [prizeSchema],
  winners: [winnerSchema],                   // ← NUEVO
  status: { type: String, default: 'activa' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});


module.exports = mongoose.model('Raffle', raffleSchema);
