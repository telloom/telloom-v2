import { config } from "dotenv";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

config({ path: ".env.local" });

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set in the environment variables");
}

console.log("Attempting to connect to database...");

const client = postgres(connectionString, {
  max: 1,
  connect_timeout: 60, // Increase connection timeout to 60 seconds
  idle_timeout: 30,
});

// Remove the explicit connect call
export const db = drizzle(client);

// Optional: If you want to log connection status
client`SELECT 1`
  .then(() => console.log("Database connected successfully"))
  .catch((err) => console.error("Failed to connect to database:", err));
