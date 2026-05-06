// Routes for product operations.

// @ts-ignore
const express = require('express');
// @ts-ignore
const authMiddleware = require('../middlewares/auth.middleware');
// @ts-ignore
const requireRole = require('../middlewares/role.middleware');
// @ts-ignore
const {
  createProduct,
  getAllProducts,
  getProductBySlug,
  updateProduct,
  deleteProduct,
  getAdminProducts
} = require('../controllers/product.controller');

const router = express.Router();

// Public routes
router.get('/products', getAllProducts);
router.get('/products/:slug', getProductBySlug);

// Admin routes
router.post('/products', authMiddleware, requireRole('ADMIN'), createProduct);
router.put('/products/:id', authMiddleware, requireRole('ADMIN'), updateProduct);
router.delete('/products/:id', authMiddleware, requireRole('ADMIN'), deleteProduct);
router.get('/admin/products', authMiddleware, requireRole('ADMIN'), getAdminProducts);

module.exports = router;