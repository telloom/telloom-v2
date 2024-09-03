import { bigint, pgTable, text, timestamp, integer } from "drizzle-orm/pg-core";
import { offeringsTable } from "./offerings";
import { productsTable } from "./products";

export const packagesTable = pgTable("packages", {
  id: bigint("id", { mode: "number" }).primaryKey().notNull(),
  revenuecatId: text("revenuecat_id").notNull(),
  offeringId: bigint("offering_id", { mode: "number" }).references(() => offeringsTable.id),
  productId: bigint("product_id", { mode: "number" }).references(() => productsTable.id),
  lookupKey: text("lookup_key").notNull(),
  displayName: text("display_name").notNull(),
  position: integer("position"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export type InsertPackage = typeof packagesTable.$inferInsert;
export type SelectPackage = typeof packagesTable.$inferSelect;