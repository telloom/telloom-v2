import { bigint, pgTable, text, timestamp, jsonb } from "drizzle-orm/pg-core";
import { packagesTable } from "./packages";

export const productsTable = pgTable("products", {
  id: bigint("id", { mode: "number" }).primaryKey(),
  packageId: bigint("package_id", { mode: "number" }).references(() => packagesTable.id),
  name: text("name").notNull(),
  description: text("description"),
  price: jsonb("price").notNull(),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().$onUpdate(() => new Date()),
});

export type InsertProduct = typeof productsTable.$inferInsert;
export type SelectProduct = typeof productsTable.$inferSelect;