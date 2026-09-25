import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

// Ensure database is initialized
export async function initializeDatabase() {
  try {
    // Test the connection
    await prisma.$queryRaw`SELECT 1`;
    
    // Check if admin user exists, if not seed it
    const adminCount = await prisma.admin.count();
    if (adminCount === 0) {
      const { hash } = await import("bcryptjs");
      const email = (process.env.ADMIN_EMAIL ?? "admin@aig.local").toLowerCase();
      const password = process.env.ADMIN_PASSWORD ?? "change-me";
      const name = process.env.ADMIN_NAME ?? "AIG Administrator";
      
      const passwordHash = await hash(password, 10);
      await prisma.admin.create({
        data: {
          name,
          email,
          passwordHash,
          status: "ACTIVE",
          role: "SUPER_ADMIN",
        },
      });
      console.log(`[Database] Initialized with admin user: ${email}`);
    }
  } catch (error) {
    console.error("[Database] Initialization error:", error);
  }
}

