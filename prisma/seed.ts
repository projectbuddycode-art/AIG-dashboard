import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = (process.env.ADMIN_EMAIL ?? "admin@aig.local").toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME ?? "AIG Administrator";
  
  if (!password || password.length < 8) {
    console.warn("[Seed] ADMIN_PASSWORD not set or too short, skipping seed");
    return;
  }

  try {
    const passwordHash = await hash(password, 10);
    const result = await prisma.admin.upsert({
      where: { email },
      update: { name, passwordHash, status: "ACTIVE", role: "SUPER_ADMIN" },
      create: { name, email, passwordHash, status: "ACTIVE", role: "SUPER_ADMIN" },
    });

    console.log(`[Seed] Administrator seeded: ${result.email}`);
  } catch (error) {
    console.error("[Seed] Error:", error);
    throw error;
  }
}

main()
  .catch((error) => {
    console.error("[Seed] Fatal error:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
