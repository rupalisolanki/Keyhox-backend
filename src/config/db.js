// Database configuration for Keyhox. Sets up PostgreSQL connection using Prisma Client.

const { PrismaClient } = require('@prisma/client');

const g = /** @type {any} */ (global);
const prisma = g.prisma || new PrismaClient();

if (process.env.NODE_ENV !== 'production') g.prisma = prisma;

module.exports = prisma;