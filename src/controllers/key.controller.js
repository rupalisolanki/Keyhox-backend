// Controller for key inventory operations (Admin only).

const prisma = require('../config/db');

// @ts-ignore
const addKeys = async (req, res) => {
  const { productId } = req.params;
  const { keys } = req.body;

  // Validate input
  if (!Array.isArray(keys) || keys.length === 0) {
    return res.status(400).json({ error: 'Keys must be a non-empty array' });
  }
  const validKeys = keys.filter(k => typeof k === 'string' && k.trim().length > 0);
  if (validKeys.length === 0) {
    return res.status(400).json({ error: 'At least one valid key is required' });
  }
  const uniqueKeys = [...new Set(validKeys)]; // Remove duplicates from input

  try {
    // Check if product exists
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Check for existing keys in DB
    const existingKeys = await prisma.key.findMany({
      where: { licenseKey: { in: uniqueKeys } },
      select: { licenseKey: true }
    });
    const existingKeySet = new Set(existingKeys.map((/** @type {any} */ k) => k.licenseKey));
    const newKeys = uniqueKeys.filter((/** @type {any} */ k) => !existingKeySet.has(k));
    const duplicateKeys = uniqueKeys.filter((/** @type {any} */ k) => existingKeySet.has(k));

    // If all keys are duplicates
    if (newKeys.length === 0) {
      return res.status(409).json({
        error: 'All keys already exist in the system',
        duplicates: duplicateKeys
      });
    }

    // Bulk insert new keys
    await prisma.key.createMany({
      data: newKeys.map(k => ({
        licenseKey: k,
        productId,
        status: 'AVAILABLE'
      })),
      skipDuplicates: true
    });

    res.status(201).json({
      message: 'Keys added successfully',
      summary: {
        submitted: uniqueKeys.length,
        added: newKeys.length,
        skipped: duplicateKeys.length
      },
      skippedKeys: duplicateKeys,
      productId
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

// @ts-ignore
const getKeysByProduct = async (req, res) => {
  const { productId } = req.params;
  const { status } = req.query;

  try {
    // Check if product exists
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Build where clause
    const where = /** @type {any} */ ({ productId });
    if (status) {
      where.status = status;
    }

    // Fetch keys
    const keys = await prisma.key.findMany({
      where,
      select: { id: true, licenseKey: true, status: true, assignedTo: true, assignedAt: true, createdAt: true },
      orderBy: { createdAt: 'asc' }
    });

    // Get counts for all statuses
    const statusCounts = await prisma.key.groupBy({
      by: ['status'],
      where: { productId },
      _count: true
    });
    const counts = {
      available: 0,
      sold: 0,
      reserved: 0,
      total: 0
    };
    statusCounts.forEach((/** @type {any} */ s) => {
      if (s.status === 'AVAILABLE') counts.available = s._count;
      else if (s.status === 'SOLD') counts.sold = s._count;
      else if (s.status === 'RESERVED') counts.reserved = s._count;
      counts.total += s._count;
    });

    res.json({
      productId,
      filter: status || 'ALL',
      counts,
      keys
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

// @ts-ignore
const deleteKey = async (req, res) => {
  const { keyId } = req.params;

  try {
    // Find the key
    const key = await prisma.key.findUnique({ where: { id: keyId } });
    if (!key) {
      return res.status(404).json({ error: 'Key not found' });
    }

    // Check status
    if (key.status === 'SOLD') {
      return res.status(400).json({ error: 'Cannot delete a sold key. It is assigned to a user.' });
    }
    if (key.status === 'RESERVED') {
      return res.status(400).json({ error: 'Cannot delete a reserved key.' });
    }

    // Delete the key
    await prisma.key.delete({ where: { id: keyId } });

    res.json({ message: 'Key deleted successfully', keyId });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

// @ts-ignore
const getInventorySummary = async (req, res) => {
  try {
    // Fetch all products with their key counts
    const products = await prisma.product.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        isActive: true,
        keys: {
          select: { status: true }
        }
      }
    });

    const summary = products.map((/** @type {any} */ product) => {
      const keys = product.keys;
      const availableStock = keys.filter((/** @type {any} */ k) => k.status === 'AVAILABLE').length;
      const soldCount = keys.filter((/** @type {any} */ k) => k.status === 'SOLD').length;
      const totalKeys = keys.length;

      return {
        productId: product.id,
        productName: product.name,
        slug: product.slug,
        isActive: product.isActive,
        availableStock,
        soldCount,
        totalKeys
      };
    });

    // Calculate totals
    const totals = {
      totalProducts: products.length,
      totalKeysInSystem: summary.reduce((/** @type {any} */ sum, /** @type {any} */ p) => sum + p.totalKeys, 0),
      totalAvailable: summary.reduce((/** @type {any} */ sum, /** @type {any} */ p) => sum + p.availableStock, 0),
      totalSold: summary.reduce((/** @type {any} */ sum, /** @type {any} */ p) => sum + p.soldCount, 0)
    };

    res.json({ summary, totals });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = { addKeys, getKeysByProduct, deleteKey, getInventorySummary };