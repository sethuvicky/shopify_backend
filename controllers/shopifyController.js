const axios = require('axios');
const Order = require('../models/orderModel');
const Customer = require('../models/customerModel');

const shopifyAPIUrl = `https://${process.env.SHOPIFY_STORE_NAME}.myshopify.com/admin/api/2024-07`;
const accessToken = process.env.SHOPIFY_ACCESS_TOKEN;

// Fetch orders from Shopify and save them to MongoDB
exports.fetchOrders = async (req, res) => {
    try {
        const response = await axios.get(`${shopifyAPIUrl}/orders.json?status=any`, {
            headers: {
                'X-Shopify-Access-Token': accessToken
            }
        });

        if (!response.data || !response.data.orders) {
            throw new Error('Invalid response from Shopify when fetching orders.');
        }

        const orders = response.data.orders;

        // Save orders to MongoDB
        await Promise.all(orders.map(async (order) => {
            const cancellationStatus = order.cancelled_at ? 'Cancelled' : 'Not Cancelled';
            
            // Logging the order's cancellation status for debugging
            console.log(`Order ID ${order.id}: Cancellation Status - ${cancellationStatus}`);

            await Order.findOneAndUpdate(
                { shopifyId: order.id },
                {
                    shopifyId: order.id,
                    email: order.email,
                    total_price: order.total_price,
                    line_items: order.line_items,
                    created_at: order.created_at,
                    updated_at: order.updated_at,
                    fulfillment_status: order.fulfillment_status || 'Unfulfilled',
                    cancellation_status: cancellationStatus,
                    status: determineOrderStatus(order)
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

        if (!response.data || !response.data.customers) {
            throw new Error('Invalid response from Shopify when fetching customers.');
        }

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
    const body = req.body;

    try {
        const orderId = body.id;

        if (!orderId) {
            throw new Error('Order ID missing in the webhook body');
        }

        // Fetch the latest order details
        const response = await axios.get(`${shopifyAPIUrl}/orders/${orderId}.json`, {
            headers: { 'X-Shopify-Access-Token': accessToken }
        });

        const order = response.data.order;

        const cancellationStatus = order.cancelled_at ? 'Cancelled' : 'Not Cancelled';
        console.log(`Webhook event: ${event}, Order ID: ${order.id}, Cancellation Status: ${cancellationStatus}`);

        // Update the order in the database
        await Order.findOneAndUpdate(
            { shopifyId: order.id },
            {
                shopifyId: order.id,
                email: order.email,
                total_price: order.total_price,
                line_items: order.line_items,
                created_at: order.created_at,
                updated_at: order.updated_at,
                fulfillment_status: order.fulfillment_status || 'Unfulfilled',
                cancellation_status: cancellationStatus,
                status: determineOrderStatus(order)
            },
            { upsert: true }
        );

        res.status(200).send('Webhook handled');
    } catch (error) {
        console.error('Error handling webhook:', error.message);
        res.status(500).send('Error handling webhook');
    }
};

// Helper function to determine the overall order status
function determineOrderStatus(order) {
    if (order.cancelled_at) return 'Cancelled';
    if (order.fulfillment_status === 'fulfilled') return 'Fulfilled';
    return 'Pending';
}
