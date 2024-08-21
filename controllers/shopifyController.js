const axios = require('axios');
const Order = require('../models/orderModel');
const Customer = require('../models/customerModel');

// Environment variables
const shopifyAPIUrl = `https://${process.env.SHOPIFY_STORE_NAME}.myshopify.com/admin/api/2024-07`;
const accessToken = process.env.SHOPIFY_ACCESS_TOKEN;

// Fetch orders from Shopify and save them to MongoDB
exports.fetchOrders = async (req, res) => {
    try {
        const response = await axios.get(`${shopifyAPIUrl}/orders.json`, {
            headers: {
                'X-Shopify-Access-Token': accessToken
            }
        });
        const orders = response.data.orders;

        // Log the fetched orders to verify the data

        // Save orders to MongoDB
        await Promise.all(orders.map(async (order) => {
            await Order.findOneAndUpdate(
                { shopifyId: order.id },
                {
                    shopifyId: order.id,
                    email: order.email,
                    total_price: order.total_price,
                    line_items: order.line_items,
                    created_at: order.created_at,
                    updated_at: order.updated_at,
                    fulfillment_status: order.fulfillment_status || 'Unfulfilled', // Default to 'Unfulfilled'
                    cancellation_status: order.cancellation_status || 'Not Cancelled' // Default to 'Not Cancelled'
                },
                { upsert: true }
            );
        }));

        res.status(200).json({ orders });
    } catch (error) {
        console.error('Error fetching orders:', error.response?.data || error.message);
        res.status(500).json({ error: error.message });
    }
};


// Fetch customers from Shopify and save them to MongoDB
exports.fetchCustomers = async (req, res) => {
    try {
        const response = await axios.get(`${shopifyAPIUrl}/customers.json`, {
            headers: {
                'X-Shopify-Access-Token': accessToken
            }
        });
        const customers = response.data.customers;

        // Save customers to MongoDB
        await Promise.all(customers.map(async (customer) => {
            await Customer.findOneAndUpdate(
                { shopifyId: customer.id },
                {
                    shopifyId: customer.id,
                    email: customer.email,
                    first_name: customer.first_name,
                    last_name: customer.last_name,
                    orders_count: customer.orders_count,
                    total_spent: customer.total_spent,
                    created_at: customer.created_at,
                    updated_at: customer.updated_at
                },
                { upsert: true }
            );
        }));

        res.status(200).json({ customers });
    } catch (error) {
        console.error('Error fetching customers:', error.response?.data || error.message);
        res.status(500).json({ error: error.message });
    }
};

// Handle Shopify webhooks
exports.handleWebhook = async (req, res) => {
    const event = req.headers['x-shopify-topic'];
    try {
        if (event === 'orders/create' || event === 'orders/updated' || event === 'orders/fulfilled' || event === 'orders/cancelled') {
            await exports.fetchOrders(req, res);
        } else if (event === 'customers/create' || event === 'customers/update') {
            await exports.fetchCustomers(req, res);
        } else {
            console.log(`Unhandled event type: ${event}`);
        }

        res.status(200).send('Webhook handled');
    } catch (error) {
        console.error('Error handling webhook:', error.message);
        res.status(500).send('Error handling webhook');
    }
};
