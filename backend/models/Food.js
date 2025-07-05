const mongoose = require('mongoose');

const foodSchema = new mongoose.Schema({
  name: { type: String, required: true },
  price: { type: Number, required: true },
  description: { type: String },
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
  restaurant: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Food', foodSchema); 