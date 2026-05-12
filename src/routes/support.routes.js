const express = require('express');
const { getSupportPolicy, submitTicket, getAllTickets, updateTicketStatus } = require('../controllers/support.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const requireRole = require('../middlewares/role.middleware');

const router = express.Router();

router.get('/support-policy', getSupportPolicy);
router.post('/support/ticket', submitTicket);
router.get('/admin/support/tickets', authMiddleware, requireRole('ADMIN'), getAllTickets);
router.patch('/admin/support/tickets/:id', authMiddleware, requireRole('ADMIN'), updateTicketStatus);

module.exports = router;
