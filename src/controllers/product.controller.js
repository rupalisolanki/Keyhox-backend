// Controller for product operations (Admin CRUD + Public read).

const prisma = require('../config/db');
const { generateUniqueSlug } = require('../utils/slugify');

// Helper to flatten metadata fields onto product object
const flattenProduct = (product) => {
  const meta = product.metadata || {};
  return {
    ...product,
    subtitle: meta.subtitle || null,
    oldPrice: meta.oldPrice || null,
    logo: meta.logo || null,
    imageColor: meta.imageColor || null,
    activationGuide: meta.activationGuide || null,
    systemRequirements: meta.systemRequirements || null,
  };
};

// Create product (Admin only)
// @ts-ignore
const createProduct = async (req, res) => {
  const { name, description, price, category, subtitle, oldPrice, logo, imageColor, activationGuide, systemRequirements } = req.body;

  if (!name || price === undefined || !category) {
    return res.status(400).json({ error: 'Name, price, and category are required' });
  }

  const parsedPrice = parseFloat(price);
  if (isNaN(parsedPrice) || parsedPrice <= 0) {
    return res.status(400).json({ error: 'Price must be a positive number' });
  }

  // description can be object {bullets, sections} or string
  const descString = typeof description === 'object' ? JSON.stringify(description) : (description || '');

  const metadata = {
    subtitle: subtitle || null,
    oldPrice: oldPrice ? parseFloat(oldPrice) : null,
    logo: logo || null,
    imageColor: imageColor || null,
    activationGuide: activationGuide ? (typeof activationGuide === 'string' ? JSON.parse(activationGuide) : activationGuide) : null,
    systemRequirements: systemRequirements ? (typeof systemRequirements === 'string' ? JSON.parse(systemRequirements) : systemRequirements) : null,
  };

  // Use uploaded file path or nothing
  const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;

  try {
    const slug = await generateUniqueSlug(name, prisma);
    const product = await prisma.product.create({
      data: { name, slug, description: descString, price: parsedPrice, category, imageUrl, metadata, isActive: true }
    });

    res.status(201).json({ message: 'Product created successfully', product: flattenProduct(product) });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get all active products (Public)
// @ts-ignore
const getAllProducts = async (req, res) => {
  try {
    const products = await prisma.product.findMany({
      where: { isActive: true },
      include: {
        _count: {
          select: {
            keys: { where: { status: 'AVAILABLE' } }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const formatted = products.map((/** @type {any} */ p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      description: p.description,
      price: p.price,
      category: p.category,
      imageUrl: p.imageUrl,
      stock: p._count.keys,
      createdAt: p.createdAt
    }));

    res.json({ products: formatted, total: formatted.length });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get single product by slug (Public)
// @ts-ignore
const getProductBySlug = async (req, res) => {
  const { slug } = req.params;

  try {
    const product = await prisma.product.findUnique({
      where: { slug, isActive: true },
      include: {
        _count: {
          select: {
            keys: { where: { status: 'AVAILABLE' } }
          }
        }
      }
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const meta = /** @type {any} */ (product.metadata) || {};
    res.json({
      product: {
        id: product.id,
        name: product.name,
        slug: product.slug,
        description: product.description,
        price: product.price,
        category: product.category,
        imageUrl: product.imageUrl,
        subtitle: meta.subtitle || null,
        oldPrice: meta.oldPrice || null,
        logo: meta.logo || null,
        imageColor: meta.imageColor || null,
        activationGuide: meta.activationGuide || null,
        systemRequirements: meta.systemRequirements || null,
        stock: product._count.keys,
        createdAt: product.createdAt
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Update product (Admin only)
// @ts-ignore
const updateProduct = async (req, res) => {
  const { id } = req.params;
  const { name, description, price, category, imageUrl, isActive, subtitle, oldPrice, logo, imageColor, activationGuide, systemRequirements } = req.body;

  try {
    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Product not found' });
    }

    let slug = existing.slug;
    if (name && name !== existing.name) {
      slug = await generateUniqueSlug(name, prisma, id);
    }

    // @ts-ignore
    const data = /** @type {Record<string, any>} */ ({});
    if (name !== undefined) data.name = name;
    if (slug !== undefined) data.slug = slug;
    if (description !== undefined) {
      data.description = typeof description === 'object' ? JSON.stringify(description) : description;
    }
    if (price !== undefined) {
      const parsed = parseFloat(price);
      if (isNaN(parsed) || parsed <= 0) {
        return res.status(400).json({ error: 'Price must be a positive number' });
      }
      data.price = parsed;
    }
    if (category !== undefined) data.category = category;
    if (req.file) data.imageUrl = `/uploads/${req.file.filename}`;
    if (isActive !== undefined) data.isActive = isActive;

    // Merge metadata fields
    const existingMeta = /** @type {any} */ (existing.metadata) || {};
    const newMeta = {
      subtitle: subtitle !== undefined ? subtitle : existingMeta.subtitle,
      oldPrice: oldPrice !== undefined ? (oldPrice ? parseFloat(oldPrice) : null) : existingMeta.oldPrice,
      logo: logo !== undefined ? logo : existingMeta.logo,
      imageColor: imageColor !== undefined ? imageColor : existingMeta.imageColor,
      activationGuide: activationGuide !== undefined ? activationGuide : existingMeta.activationGuide,
      systemRequirements: systemRequirements !== undefined ? systemRequirements : existingMeta.systemRequirements,
    };
    data.metadata = newMeta;

    const updated = await prisma.product.update({ where: { id }, data });

    res.json({ message: 'Product updated successfully', product: flattenProduct(updated) });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Delete product (Admin only)
// @ts-ignore
const deleteProduct = async (req, res) => {
  const { id } = req.params;

  try {
    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const keyCount = await prisma.key.count({ where: { productId: id } });
    if (keyCount > 0) {
      return res.status(400).json({ error: 'Cannot delete product with existing keys. Deactivate it instead.' });
    }

    await prisma.product.delete({ where: { id } });
    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get all products for admin (includes inactive and key counts)
// @ts-ignore
const getAdminProducts = async (req, res) => {
  try {
    const products = await prisma.product.findMany({
      orderBy: { createdAt: 'desc' }
    });

    const productsWithCounts = await Promise.all(products.map(async (/** @type {any} */ product) => {
      const available = await prisma.key.count({ where: { productId: product.id, status: 'AVAILABLE' } });
      const sold = await prisma.key.count({ where: { productId: product.id, status: 'SOLD' } });
      const total = await prisma.key.count({ where: { productId: product.id } });
      const meta = product.metadata || {};
      return {
        ...product,
        subtitle: meta.subtitle || null,
        oldPrice: meta.oldPrice || null,
        logo: meta.logo || null,
        imageColor: meta.imageColor || null,
        activationGuide: meta.activationGuide || null,
        systemRequirements: meta.systemRequirements || null,
        stock: available,
        soldCount: sold,
        totalKeys: total
      };
    }));

    res.json({ products: productsWithCounts });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  createProduct,
  getAllProducts,
  getProductBySlug,
  updateProduct,
  deleteProduct,
  getAdminProducts
};