import { bigint, pgTable, text, timestamp, boolean } from "drizzle-orm/pg-core";
import { profilesTable } from "./profiles";
import { entitlementsTable } from "./entitlements";

export const subscriptionsTable = pgTable("subscriptions", {
  id: bigint("id", { mode: "number" }).primaryKey(),
  userId: bigint("user_id", { mode: "number" }).references(() => profilesTable.id),
  entitlementId: bigint("entitlement_id", { mode: "number" }).references(() => entitlementsTable.id),
  status: text("status").notNull(),
  isActive: boolean("is_active").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().$onUpdate(() => new Date()),
});

export type InsertSubscription = typeof subscriptionsTable.$inferInsert;
export type SelectSubscription = typeof subscriptionsTable.$inferSelect;
