import { migrate } from "drizzle-orm/postgres-js";
import { db } from "./db";

async function runMigrations() {
  try {
    await migrate(db, { migrationsFolder: "./db/migrations" });
    console.log("Migrations applied successfully.");
  } catch (error) {
    console.error("Failed to apply migrations:", error);
  }
}

runMigrations();