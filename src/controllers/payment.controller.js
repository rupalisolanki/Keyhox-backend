const prisma = require('../config/db');
const stripe = require('../config/stripe');
const { getResend } = require('../config/email');
const { orderSuccessEmail } = require('../utils/emailTemplates');

// POST /api/payments/create-intent
const createPaymentIntent = async (/** @type {any} */ req, /** @type {any} */ res) => {
  const { productId, couponCode } = req.body;
  const userId = req.user.id;

  if (!productId) return res.status(400).json({ error: 'productId is required' });

  const product = await prisma.product.findUnique({ where: { id: productId, isActive: true } });
  if (!product) return res.status(404).json({ error: 'Product not found or unavailable' });

  // Race-condition-safe key reservation
  const available = await prisma.$queryRaw`
    SELECT id FROM "keys"
    WHERE "productId" = ${productId}
    AND status = 'AVAILABLE'
    LIMIT 1
    FOR UPDATE SKIP LOCKED
  `;
  if (available.length === 0) return res.status(400).json({ error: 'Out of stock' });

  let finalAmount = Number(product.price);
  // Coupon logic placeholder — extend as needed
  if (couponCode) {
    // Apply discount if coupon is valid (extend with DB lookup as needed)
  }

  const paymentIntent = await stripe.paymentIntents.create({
    amount: Math.round(finalAmount * 100),
    currency: 'usd',
    metadata: { productId, userId, keyId: available[0].id, couponCode: couponCode || '' }
  });

  // Reserve key + create pending order
  await Promise.all([
    prisma.key.update({
      where: { id: available[0].id },
      data: { status: 'RESERVED' }
    }),
    prisma.order.create({
      data: {
        userId,
        productId,
        keyId: available[0].id,
        amount: finalAmount,
        status: 'PENDING',
        stripePaymentIntentId: paymentIntent.id
      }
    })
  ]);

  const order = await prisma.order.findFirst({ where: { stripePaymentIntentId: paymentIntent.id } });

  res.json({
    clientSecret: paymentIntent.client_secret,
    paymentIntentId: paymentIntent.id,
    amount: finalAmount,
    product: { id: product.id, name: product.name, price: product.price },
    orderId: order.id
  });
};

// POST /api/payments/webhook
const handleWebhook = async (/** @type {any} */ req, /** @type {any} */ res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return res.status(400).json({ error: 'Webhook signature failed' });
  }

  if (event.type === 'payment_intent.succeeded') {
    const { userId, keyId } = event.data.object.metadata;
    const paymentIntentId = event.data.object.id;

    try {
      const order = await prisma.order.findFirst({ where: { stripePaymentIntentId: paymentIntentId } });
      if (!order) throw new Error('Order not found');

      await prisma.$transaction([
        prisma.order.update({ where: { id: order.id }, data: { status: 'COMPLETED' } }),
        prisma.key.update({
          where: { id: keyId },
          data: { status: 'SOLD', assignedTo: userId, assignedAt: new Date() }
        })
      ]);

      const [fullOrder, user] = await Promise.all([
        prisma.order.findUnique({
          where: { id: order.id },
          include: { product: true, key: true }
        }),
        prisma.user.findUnique({ where: { id: userId } })
      ]);

      try {
        await getResend().emails.send({
          ...orderSuccessEmail({
            name: user.name,
            email: user.email,
            productName: fullOrder.product.name,
            licenseKey: fullOrder.key.licenseKey,
            orderId: fullOrder.id,
            amount: fullOrder.amount
          }),
          text: `Order ${fullOrder.id} completed. License key: ${fullOrder.key.licenseKey}`
        });
        console.log('Order completed + email sent:', fullOrder.id);
      } catch (emailErr) {
        console.error('Email failed (non-critical):', /** @type {any} */ (emailErr).message);
      }
    } catch (err) {
      console.error('Webhook processing error:', /** @type {any} */ (err).message);
    }
  }

  if (event.type === 'payment_intent.payment_failed') {
    const paymentIntentId = event.data.object.id;

    try {
      const order = await prisma.order.findFirst({ where: { stripePaymentIntentId: paymentIntentId } });
      if (order) {
        await prisma.$transaction([
          prisma.order.update({ where: { id: order.id }, data: { status: 'FAILED' } }),
          prisma.key.update({
            where: { id: order.keyId },
            data: { status: 'AVAILABLE', assignedTo: null, assignedAt: null }
          })
        ]);
        console.log('Payment failed, key returned to inventory:', order.keyId);
      }
    } catch (err) {
      console.error('Webhook failure handling error:', /** @type {any} */ (err).message);
    }
  }

  res.json({ received: true });
};

// GET /api/payments/status/:paymentIntentId
const getPaymentStatus = async (/** @type {any} */ req, /** @type {any} */ res) => {
  const { paymentIntentId } = req.params;

  const [paymentIntent, order] = await Promise.all([
    stripe.paymentIntents.retrieve(paymentIntentId),
    prisma.order.findFirst({ where: { stripePaymentIntentId: paymentIntentId } })
  ]);

  res.json({
    stripeStatus: paymentIntent.status,
    orderStatus: order?.status || 'NOT_FOUND',
    orderId: order?.id || null
  });
};

module.exports = { createPaymentIntent, handleWebhook, getPaymentStatus };
