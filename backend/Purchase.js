const mongoose = require('mongoose');

const purchaseSchema = new mongoose.Schema({
    raffleId: String,             // ID de la rifa (para identificar cuál rifa es)
    numbers: [Number],            // Array con los números que compró
    firstName: String,
    lastName: String,
    phone: String,
    paymentMethod: String,        // Ejemplo: "pago-movil", "binance"
    paymentReference: String,
    paymentProof: String,         // Ruta o nombre del archivo comprobante (lo haremos simple al inicio)
    status: {                     // Estado de la compra (pendiente, aprobada, rechazada)
        type: String,
        default: "pendiente"
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Purchase', purchaseSchema);
