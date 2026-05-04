// Database configuration for Keyhox. Sets up PostgreSQL connection using Prisma Client.

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

prisma.$connect()
  .then(() => {
    console.log('PostgreSQL connected via Prisma');
  })
  // @ts-ignore
  .catch((error) => {
    console.error('Failed to connect to PostgreSQL:', error);
    process.exit(1);
  });

module.exports = prisma;