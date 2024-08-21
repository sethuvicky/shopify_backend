const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema({
    shopifyId: String,
    email: String,
    first_name: String,
    last_name: String,
    orders_count: Number,
    total_spent: String,
    created_at: Date,
    updated_at: Date
});

module.exports = mongoose.model('Customer', customerSchema);
