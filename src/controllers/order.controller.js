const prisma = require('../config/db');

// POST /api/orders — Purchase a product
// @ts-ignore
const createOrder = async (req, res) => {
  const { productId } = req.body;
  const userId = req.user.id;

  if (!productId) {
    return res.status(400).json({ error: 'productId is required' });
  }

  const product = await prisma.product.findUnique({
    where: { id: productId, isActive: true }
  });
  if (!product) {
    return res.status(404).json({ error: 'Product not found or unavailable' });
  }

  try {
    // @ts-ignore
    const result = await prisma.$transaction(async (tx) => {
      const keys = await tx.$queryRaw`
        SELECT id, "licenseKey"
        FROM "keys"
        WHERE "productId" = ${productId}
        AND status = 'AVAILABLE'
        ORDER BY "createdAt" ASC
        LIMIT 1
        FOR UPDATE SKIP LOCKED
      `;

      if (keys.length === 0) throw new Error('OUT_OF_STOCK');

      const key = keys[0];

      await tx.key.update({
        where: { id: key.id },
        data: { status: 'SOLD', assignedTo: userId, assignedAt: new Date() }
      });

      const order = await tx.order.create({
        data: { userId, productId, keyId: key.id, amount: product.price, status: 'COMPLETED' }
      });

      return {
        order: { id: order.id, amount: order.amount, status: order.status, createdAt: order.createdAt },
        product: { id: product.id, name: product.name, slug: product.slug },
        licenseKey: key.licenseKey
      };
    });

    res.status(201).json({ message: 'Purchase successful', ...result });
  } catch (err) {
    // @ts-ignore
    if (err.message === 'OUT_OF_STOCK') {
      return res.status(400).json({ error: 'Out of stock', message: 'No available keys for this product' });
    }
    res.status(500).json({ error: 'Order failed. Please try again.' });
  }
};

// GET /api/orders/me — User's own orders
// @ts-ignore
const getMyOrders = async (req, res) => {
  const userId = req.user.id;

  const orders = await prisma.order.findMany({
    where: { userId },
    include: {
      product: { select: { id: true, name: true, slug: true, imageUrl: true, category: true } },
      key: { select: { licenseKey: true } }
    },
    orderBy: { createdAt: 'desc' }
  });

  // @ts-ignore
  const mapped = orders.map(o => ({
    id: o.id,
    amount: o.amount,
    status: o.status,
    createdAt: o.createdAt,
    product: o.product,
    licenseKey: o.key?.licenseKey || null
  }));

  res.json({ orders: mapped, total: mapped.length });
};

// GET /api/orders/:orderId — Single order detail
// @ts-ignore
const getOrderById = async (req, res) => {
  const { orderId } = req.params;
  const userId = req.user.id;

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      product: { select: { id: true, name: true, slug: true, imageUrl: true, category: true } },
      key: { select: { licenseKey: true } }
    }
  });

  if (!order) return res.status(404).json({ error: 'Order not found' });
  if (order.userId !== userId && req.user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Access denied' });
  }

  res.json({
    order: {
      id: order.id,
      amount: order.amount,
      status: order.status,
      createdAt: order.createdAt,
      product: order.product,
      licenseKey: order.key?.licenseKey || null
    }
  });
};

// GET /api/admin/orders — All orders (admin)
// @ts-ignore
const getAllOrders = async (req, res) => {
  const { status, page = 1, limit = 20 } = req.query;
  const where = status ? { status } : {};
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const take = parseInt(limit);

  const [total, orders] = await Promise.all([
    prisma.order.count({ where }),
    prisma.order.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, email: true } },
        product: { select: { id: true, name: true, slug: true } },
        key: { select: { licenseKey: true } }
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take
    })
  ]);

  res.json({
    orders,
    pagination: { total, page: parseInt(page), limit: take, totalPages: Math.ceil(total / take) }
  });
};

module.exports = { createOrder, getMyOrders, getOrderById, getAllOrders };
