import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config();

const runMigration = async () => {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set in the environment variables");
  }

  const sql = postgres(process.env.DATABASE_URL, { max: 1 });
  const db = drizzle(sql);

  console.log("Running migrations...");

  try {
    await migrate(db, { migrationsFolder: "db/migrations" });
    console.log("Migrations completed successfully");
  } catch (error) {
    console.error("Error during migration:", error);
    process.exit(1);
  }

  await sql.end();
  process.exit(0);
};

runMigration();