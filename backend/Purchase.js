const mongoose = require('mongoose');

const purchaseSchema = new mongoose.Schema({
  raffleId: String,
  raffleTitle: String,     // ← NUEVO: nombre de la rifa (denormalizado)
  numbers: [Number],
  firstName: String,
  lastName: String,
  phone: String,
  paymentMethod: String,
  paymentReference: String,
  paymentProof: String,
  amount: Number,
  currency: String,
  status: { type: String, default: "pendiente" },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Purchase', purchaseSchema);
