import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function runMigrations() {
  try {
    await prisma.$migrate.deploy()
    console.log("Migrations applied successfully.");
  } catch (error) {
    console.error("Failed to apply migrations:", error);
  } finally {
    await prisma.$disconnect()
  }
}

runMigrations();