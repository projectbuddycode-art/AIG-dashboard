import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = (process.env.ADMIN_EMAIL ?? "admin@aig.local").toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME ?? "AIG Administrator";
  if (!password || password.length < 8) {
    throw new Error("ADMIN_PASSWORD must be set to at least 8 characters before seeding.");
  }

  const passwordHash = await hash(password, 10);
  await prisma.admin.upsert({
    where: { email },
    update: { name, passwordHash, status: "ACTIVE", role: "SUPER_ADMIN" },
    create: { name, email, passwordHash, status: "ACTIVE", role: "SUPER_ADMIN" },
  });

  console.log(`Seeded administrator ${email}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
