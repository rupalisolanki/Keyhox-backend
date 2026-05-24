const express = require('express');
const router = express.Router();
const { createPaymentIntent, handleWebhook, getPaymentStatus } = require('../controllers/payment.controller');
const authMiddleware = require('../middlewares/auth.middleware');

// Webhook FIRST — raw body required for Stripe signature verification
router.post('/payments/webhook', express.raw({ type: 'application/json' }), handleWebhook);

router.post('/payments/create-intent', authMiddleware, createPaymentIntent);
router.get('/payments/status/:paymentIntentId', authMiddleware, getPaymentStatus);

module.exports = router;
