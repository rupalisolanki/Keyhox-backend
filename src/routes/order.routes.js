const express = require('express');
const { createOrder, getMyOrders, getOrderById, getAllOrders } = require('../controllers/order.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const requireRole = require('../middlewares/role.middleware');

const router = express.Router();

router.post('/orders', authMiddleware, createOrder);
router.get('/orders/me', authMiddleware, getMyOrders);
router.get('/orders/:orderId', authMiddleware, getOrderById);
router.get('/admin/orders', authMiddleware, requireRole('ADMIN'), getAllOrders);

module.exports = router;
