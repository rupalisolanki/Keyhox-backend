// Database configuration for Keyhox. Sets up PostgreSQL connection using Prisma Client.

const { PrismaClient } = require('@prisma/client');

const prisma = global.prisma || new PrismaClient();

if (process.env.NODE_ENV !== 'production') global.prisma = prisma;

module.exports = prisma;