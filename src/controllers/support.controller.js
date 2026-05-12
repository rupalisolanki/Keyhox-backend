const prisma = require('../config/db');

// Static support policy content (matches frontend SupportPolicy.tsx shape)
const SUPPORT_POLICY = {
  title: 'Help & Support',
  subtitle: 'We\'re here to help you with any issues related to your purchases, license keys, and account.',
  lastUpdated: 'January 1, 2025',
  description: 'At Keyhox, we are committed to providing excellent customer support. Our team is available to assist you with any questions or issues you may encounter with your digital product purchases.',
  contact: {
    title: 'Contact Support',
    content: 'For any support inquiries, please reach out to us via email. We aim to respond to all queries promptly.',
    email: 'support@keyhox.com'
  },
  hours: {
    title: 'Support Hours',
    days: 'Monday – Saturday',
    time: '9:00 AM – 6:00 PM IST'
  },
  responseTime: {
    title: 'Response Time',
    items: [
      'Email support: Within 24 hours',
      'Urgent issues: Within 4–6 hours'
    ]
  },
  supportCovers: {
    title: 'What We Cover',
    items: [
      'Invalid or non-working license keys',
      'Duplicate key delivery issues',
      'Account access and login problems',
      'Order and payment related queries',
      'Product activation assistance'
    ]
  },
  doesNotCover: {
    title: 'What We Don\'t Cover',
    items: [
      'Issues caused by incompatible hardware or OS',
      'Third-party software conflicts',
      'Keys already activated by the customer',
      'Refunds after key activation',
      'Issues outside our product scope'
    ]
  }
};

// GET /api/support-policy
// @ts-ignore
const getSupportPolicy = (req, res) => {
  res.json(SUPPORT_POLICY);
};

// POST /api/support/ticket — public ticket submission
// @ts-ignore
const submitTicket = async (req, res) => {
  const { name, email, subject, message, type } = req.body;

  if (!name || !email || !subject || !message) {
    return res.status(400).json({ error: 'name, email, subject, and message are required' });
  }

  const ticket = await prisma.supportTicket.create({
    data: {
      name,
      email,
      subject,
      message,
      type: type || 'SUPPORT'
    }
  });

  res.status(201).json({ message: 'Ticket submitted successfully', ticketId: ticket.id });
};

// GET /api/admin/support/tickets — list all tickets (admin)
// @ts-ignore
const getAllTickets = async (req, res) => {
  const { status, type, page = 1, limit = 20 } = req.query;
  const where = {};
  if (status) where.status = status;
  if (type) where.type = type;

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const take = parseInt(limit);

  const [total, tickets] = await Promise.all([
    prisma.supportTicket.count({ where }),
    prisma.supportTicket.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take
    })
  ]);

  res.json({ tickets, pagination: { total, page: parseInt(page), limit: take, totalPages: Math.ceil(total / take) } });
};

// PATCH /api/admin/support/tickets/:id — update ticket status (admin)
// @ts-ignore
const updateTicketStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const validStatuses = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];
  if (!status || !validStatuses.includes(status)) {
    return res.status(400).json({ error: `status must be one of: ${validStatuses.join(', ')}` });
  }

  const ticket = await prisma.supportTicket.findUnique({ where: { id } });
  if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

  const updated = await prisma.supportTicket.update({
    where: { id },
    data: { status }
  });

  res.json({ message: 'Ticket updated', ticket: updated });
};

module.exports = { getSupportPolicy, submitTicket, getAllTickets, updateTicketStatus };
