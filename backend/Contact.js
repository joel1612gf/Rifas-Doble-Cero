const mongoose = require('mongoose');

const contactSchema = new mongoose.Schema({
  phone:   { type: String, required: true, unique: true, index: true },
  firstName: String,
  lastName:  String,
  consent:   { type: Boolean, default: false },
  consentAt: Date,
  source:    { type: String, default: 'purchase' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

contactSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('Contact', contactSchema);
