// Utility functions for generating unique slugs for products.

const slugify = require('slugify');

// Generate a base slug from a product name.
// Example: "Windows 11 Pro" → "windows-11-pro"
const generateSlug = (/** @type {string} */ name) => {
  return slugify(name, { lower: true, strict: true, trim: true });
};

// Generate a unique slug by appending a counter if necessary.
// excludeId: when updating, skip this product's own slug in uniqueness checks.
const generateUniqueSlug = async (/** @type {string} */ name, /** @type {any} */ prisma, excludeId = null) => {
  let base = generateSlug(name);
  let slug = base;
  let counter = 1;

  while (true) {
    const existing = await prisma.product.findUnique({ where: { slug } });
    if (!existing) break;
    if (excludeId && existing.id === excludeId) break;
    slug = `${base}-${counter}`;
    counter++;
  }

  return slug;
};

module.exports = {
  generateSlug,
  generateUniqueSlug
};