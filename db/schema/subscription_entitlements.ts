import { bigint, pgTable, timestamp } from "drizzle-orm/pg-core";
import { subscriptionsTable } from "./subscriptions";
import { entitlementsTable } from "./entitlements";

export const subscriptionEntitlementsTable = pgTable("subscription_entitlements", {
  id: bigint("id", { mode: "number" }).primaryKey().notNull(),
  subscriptionId: bigint("subscription_id", { mode: "number" }).notNull().references(() => subscriptionsTable.id),
  entitlementId: bigint("entitlement_id", { mode: "number" }).notNull().references(() => entitlementsTable.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export type InsertSubscriptionEntitlement = typeof subscriptionEntitlementsTable.$inferInsert;
export type SelectSubscriptionEntitlement = typeof subscriptionEntitlementsTable.$inferSelect;