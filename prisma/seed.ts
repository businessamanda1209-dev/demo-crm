import { PrismaClient } from "@prisma/client";
import { runSeed } from "../src/lib/seed";

const prisma = new PrismaClient();

async function main() {
  const userId = process.env.SEED_USER_ID;

  if (!userId) {
    throw new Error("Set SEED_USER_ID to the Supabase auth user id that should receive demo data.");
  }

  console.log("Seeding database...");
  const counts = await runSeed(prisma, userId);
  console.log("Seed complete:", counts);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
