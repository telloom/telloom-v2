import { bigint, pgTable, timestamp, jsonb } from "drizzle-orm/pg-core";
import { profilesTable } from "./profiles";
import { productsTable } from "./products";

export const purchasesTable = pgTable("purchases", {
  id: bigint("id", { mode: "number" }).primaryKey(),
  userId: bigint("user_id", { mode: "number" }).references(() => profilesTable.id),
  productId: bigint("product_id", { mode: "number" }).references(() => productsTable.id),
  transactionDetails: jsonb("transaction_details"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().$onUpdate(() => new Date()),
});

export type InsertPurchase = typeof purchasesTable.$inferInsert;
export type SelectPurchase = typeof purchasesTable.$inferSelect;