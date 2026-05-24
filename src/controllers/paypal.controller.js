const paypal = require('@paypal/checkout-server-sdk');
const getPayPalClient = require('../config/paypal');
const prisma = require('../config/db');
const { getResend } = require('../config/email');
const { orderSuccessEmail } = require('../utils/emailTemplates');

// POST /api/payments/paypal/create
const createPayPalOrder = async (/** @type {any} */ req, /** @type {any} */ res) => {
  const { productId, couponCode } = req.body;
  const userId = req.user.id;

  if (!productId) return res.status(400).json({ error: 'productId is required' });

  const product = await prisma.product.findUnique({ where: { id: productId, isActive: true } });
  if (!product) return res.status(404).json({ error: 'Product not found or unavailable' });

  let keyId;
  try {
    await prisma.$transaction(async (/** @type {any} */ tx) => {
      const keys = await tx.$queryRaw`
        SELECT id FROM "keys"
        WHERE "productId" = ${productId}
        AND status = 'AVAILABLE'
        LIMIT 1
        FOR UPDATE SKIP LOCKED
      `;
      if (keys.length === 0) throw new Error('OUT_OF_STOCK');
      keyId = keys[0].id;
      await tx.key.update({ where: { id: keyId }, data: { status: 'RESERVED' } });
    });
  } catch (err) {
    if (/** @type {any} */ (err).message === 'OUT_OF_STOCK')
      return res.status(400).json({ error: 'Out of stock' });
    throw err;
  }

  let finalAmount = Number(product.price);
  if (couponCode) {
    const coupon = await prisma.coupon.findUnique({ where: { code: couponCode, isActive: true } }).catch(() => null);
    if (coupon) {
      finalAmount = coupon.discountType === 'PERCENTAGE'
        ? finalAmount * (1 - coupon.discountValue / 100)
        : Math.max(0, finalAmount - coupon.discountValue);
    }
  }

  const client = getPayPalClient();
  const request = new paypal.orders.OrdersCreateRequest();
  request.prefer('return=representation');
  request.requestBody({
    intent: 'CAPTURE',
    purchase_units: [{
      amount: { currency_code: 'USD', value: finalAmount.toFixed(2) },
      description: `Keyhox - ${product.name}`,
      custom_id: JSON.stringify({ productId, userId, keyId })
    }],
    application_context: {
      brand_name: 'Keyhox',
      landing_page: 'BILLING',
      user_action: 'PAY_NOW',
      return_url: `${process.env.FRONTEND_URL}/payment/success`,
      cancel_url: `${process.env.FRONTEND_URL}/payment/cancel`
    }
  });

  const paypalOrder = await client.execute(request);

  const dbOrder = await prisma.order.create({
    data: {
      userId,
      productId,
      keyId,
      amount: finalAmount,
      status: 'PENDING',
      stripePaymentIntentId: paypalOrder.result.id  // reused field for PayPal order ID
    }
  });

  const approvalUrl = paypalOrder.result.links.find((/** @type {any} */ l) => l.rel === 'approve').href;

  res.status(201).json({
    paypalOrderId: paypalOrder.result.id,
    approvalUrl,
    amount: finalAmount,
    product: { id: product.id, name: product.name },
    orderId: dbOrder.id
  });
};

// POST /api/payments/paypal/capture
const capturePayPalOrder = async (/** @type {any} */ req, /** @type {any} */ res) => {
  const { paypalOrderId } = req.body;
  if (!paypalOrderId) return res.status(400).json({ error: 'paypalOrderId is required' });

  const order = await prisma.order.findFirst({
    where: { stripePaymentIntentId: paypalOrderId, status: 'PENDING' },
    include: { product: true, key: true, user: true }
  });
  if (!order) return res.status(404).json({ error: 'Order not found' });
  if (order.status !== 'PENDING') return res.status(400).json({ error: 'Order already processed' });

  const client = getPayPalClient();
  const request = new paypal.orders.OrdersCaptureRequest(paypalOrderId);
  request.requestBody(/** @type {any} */ ({}));

  let captureResponse;
  try {
    captureResponse = await client.execute(request);
  } catch (err) {
    await prisma.key.update({
      where: { id: order.keyId },
      data: { status: 'AVAILABLE', assignedTo: null, assignedAt: null }
    });
    await prisma.order.update({ where: { id: order.id }, data: { status: 'FAILED' } });
    return res.status(400).json({ error: 'Payment capture failed', message: /** @type {any} */ (err).message });
  }

  if (captureResponse.result.status !== 'COMPLETED') {
    return res.status(400).json({ error: 'Payment not completed', status: captureResponse.result.status });
  }

  await prisma.$transaction([
    prisma.key.update({
      where: { id: order.keyId },
      data: { status: 'SOLD', assignedTo: order.userId, assignedAt: new Date() }
    }),
    prisma.order.update({ where: { id: order.id }, data: { status: 'COMPLETED' } })
  ]);

  try {
    await getResend().emails.send(orderSuccessEmail({
      name: order.user.name,
      email: order.user.email,
      productName: order.product.name,
      licenseKey: order.key.licenseKey,
      orderId: order.id,
      amount: order.amount
    }));
    console.log('Email sent to:', order.user.email);
  } catch (emailErr) {
    console.error('Email failed (non-critical):', /** @type {any} */ (emailErr).message);
  }

  res.json({
    message: 'Payment successful',
    order: { id: order.id, amount: order.amount, status: 'COMPLETED', createdAt: order.createdAt },
    product: { id: order.product.id, name: order.product.name, slug: order.product.slug },
    licenseKey: order.key.licenseKey
  });
};

// POST /api/payments/paypal/cancel
const cancelPayPalOrder = async (/** @type {any} */ req, /** @type {any} */ res) => {
  const { paypalOrderId } = req.body;
  if (!paypalOrderId) return res.status(400).json({ error: 'paypalOrderId is required' });

  const order = await prisma.order.findFirst({ where: { stripePaymentIntentId: paypalOrderId } });
  if (!order) return res.status(404).json({ error: 'Order not found' });

  await prisma.$transaction([
    prisma.key.update({
      where: { id: order.keyId },
      data: { status: 'AVAILABLE', assignedTo: null, assignedAt: null }
    }),
    prisma.order.update({ where: { id: order.id }, data: { status: 'FAILED' } })
  ]);

  res.json({ message: 'Payment cancelled', keyReturnedToInventory: true });
};

// GET /api/payments/paypal/status/:paypalOrderId
const getPayPalOrderStatus = async (/** @type {any} */ req, /** @type {any} */ res) => {
  const { paypalOrderId } = req.params;

  const client = getPayPalClient();
  const request = new paypal.orders.OrdersGetRequest(paypalOrderId);
  const response = await client.execute(request);

  const dbOrder = await prisma.order.findFirst({ where: { stripePaymentIntentId: paypalOrderId } });

  res.json({
    paypalStatus: response.result.status,
    orderStatus: dbOrder?.status,
    orderId: dbOrder?.id
  });
};

module.exports = { createPayPalOrder, capturePayPalOrder, cancelPayPalOrder, getPayPalOrderStatus };
