import { bigserial, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const productsTable = pgTable("products", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  revenuecatId: text("revenuecat_id").notNull(),
  storeIdentifier: text("store_identifier").notNull(),
  type: text("type").notNull(),
  displayName: text("display_name"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export type InsertProduct = typeof productsTable.$inferInsert;
export type SelectProduct = typeof productsTable.$inferSelect;