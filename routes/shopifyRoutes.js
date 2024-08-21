const express = require('express');
const router = express.Router();
const shopifyController = require('../controllers/shopifyController');

// Route to fetch orders from Shopify and save them to the database
router.get('/orders', shopifyController.fetchOrders);

// Route to fetch customers from Shopify and save them to the database
router.get('/customers', shopifyController.fetchCustomers);

// Route to handle Shopify webhooks
router.post('/webhook', shopifyController.handleWebhook);

module.exports = router;
