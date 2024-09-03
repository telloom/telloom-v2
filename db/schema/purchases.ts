import { bigserial, pgTable, timestamp, text, numeric, uuid } from "drizzle-orm/pg-core";
import { productsTable } from "./products";

export const purchasesTable = pgTable("purchases", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  revenuecatId: text("revenuecat_id").notNull(),
  userId: uuid("user_id"),
  productId: bigserial("product_id", { mode: "number" }).references(() => productsTable.id),
  purchasedAt: timestamp("purchased_at", { withTimezone: true }).notNull(),
  store: text("store").notNull(),
  revenueInUsd: numeric("revenue_in_usd").notNull(),
  status: text("status").notNull(),
  environment: text("environment").notNull(),
  storePurchaseIdentifier: text("store_purchase_identifier"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export type InsertPurchase = typeof purchasesTable.$inferInsert;
export type SelectPurchase = typeof purchasesTable.$inferSelect;