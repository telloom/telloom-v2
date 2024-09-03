import { bigint, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const entitlementsTable = pgTable("entitlements", {
  id: bigint("id", { mode: "number" }).primaryKey().notNull(),
  revenuecatId: text("revenuecat_id").notNull(),
  lookupKey: text("lookup_key").notNull(),
  displayName: text("display_name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export type InsertEntitlement = typeof entitlementsTable.$inferInsert;
export type SelectEntitlement = typeof entitlementsTable.$inferSelect;
