// Routes for key inventory operations (Admin only).

const express = require('express');
const { addKeys, getKeysByProduct, deleteKey, getInventorySummary } = require('../controllers/key.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const requireRole = require('../middlewares/role.middleware');

const router = express.Router();

// Bulk add keys for a product
router.post('/products/:productId/keys', authMiddleware, requireRole('ADMIN'), addKeys);

// Get keys for a product (with optional status filter)
router.get('/products/:productId/keys', authMiddleware, requireRole('ADMIN'), getKeysByProduct);

// Delete a single key
router.delete('/keys/:keyId', authMiddleware, requireRole('ADMIN'), deleteKey);

// Get inventory summary for all products
router.get('/admin/inventory', authMiddleware, requireRole('ADMIN'), getInventorySummary);

module.exports = router;