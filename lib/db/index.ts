import { PrismaClient } from '@prisma/client';
import { withAccelerate } from '@prisma/extension-accelerate';

// Use a global singleton to avoid exhausting database connections in serverless
// environments (like Vercel) during cold starts and parallel invocations.
// Optionally leverage Prisma Accelerate if PRISMA_ACCELERATE_URL is provided.

declare global {
  // eslint-disable-next-line no-var
  var prisma: any | undefined;
}

function createPrismaClient() {
  try {
    if (process.env.PRISMA_ACCELERATE_URL) {
      // When using Accelerate, set the datasourceUrl to the Accelerate URL
      // so queries are proxied via Prisma's edge-friendly pool.
      return new PrismaClient({
        datasourceUrl: process.env.PRISMA_ACCELERATE_URL,
      }).$extends(withAccelerate());
    }
    return new PrismaClient();
  } catch (err) {
    // Re-throw after logging for better diagnostics in serverless logs
    console.error('Failed to create PrismaClient:', err);
    throw err;
  }
}

export const prisma = globalThis.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalThis.prisma = prisma;
}

export default prisma;