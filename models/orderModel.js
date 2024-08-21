const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
    shopifyId: String,
    email: String,
    total_price: String,
    line_items: Array,
    created_at: Date,
    updated_at: Date
});

module.exports = mongoose.model('Order', orderSchema);
