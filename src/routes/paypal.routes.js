const express = require('express');
const router = express.Router();
const { createPayPalOrder, capturePayPalOrder, cancelPayPalOrder, getPayPalOrderStatus } = require('../controllers/paypal.controller');
const authMiddleware = require('../middlewares/auth.middleware');

router.post('/payments/paypal/create', authMiddleware, createPayPalOrder);
router.post('/payments/paypal/capture', authMiddleware, capturePayPalOrder);
router.post('/payments/paypal/cancel', authMiddleware, cancelPayPalOrder);
router.get('/payments/paypal/status/:paypalOrderId', authMiddleware, getPayPalOrderStatus);

module.exports = router;
