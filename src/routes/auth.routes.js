// Routes for authentication.

const express = require('express');
const { register, login, getMe } = require('../controllers/auth.controller');
const authMiddleware = require('../middlewares/auth.middleware');

const router = express.Router();

router.post('/auth/register', register);
router.post('/auth/login', login);
router.get('/users/me', authMiddleware, getMe);

module.exports = router;