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
  ticketPrice: { type: Number, required: true },
  drawDate: Date,
  imageURL: String,
  totalNumbers: { type: Number, required: true },

  // ✅ NUEVO: Estado de la rifa (activa, inactiva, finalizada)
  status: { 
    type: String, 
    enum: ['activa', 'inactiva', 'finalizada'], 
    default: 'activa' 
  },

  // ✅ NUEVO: Mínimo de tickets para comprar
  minTickets: { type: Number, default: 1 },

  // --- Configuración de botones aleatorios (Ya lo tienes) ---
  randomButtons: {
    type: [{
        count: Number,
        label: String,
        highlight: String
    }],
    default: [
        { count: 5, label: "Prueba suerte" },
        { count: 10, label: "Más popular" },
        { count: 25, label: "Experto" }
    ]
  },
  // --------------------------------------------------

  prizes: [{
    title: String,
    description: String,
    imageURL: String
  }],
  numbersSold: [Number], 
  numbersReserved: [Number],
  createdAt: { type: Date, default: Date.now }
});


module.exports = mongoose.model('Raffle', raffleSchema);
