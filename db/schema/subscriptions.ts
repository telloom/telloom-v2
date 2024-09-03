import { bigint, pgTable, text, timestamp, boolean, uuid } from "drizzle-orm/pg-core";
import { productsTable } from "./products";

export const subscriptionsTable = pgTable("subscriptions", {
  id: bigint("id", { mode: "number" }).primaryKey().notNull(),
  revenuecatId: text("revenuecat_id").notNull(),
  userId: uuid("user_id"),
  productId: bigint("product_id", { mode: "number" }).references(() => productsTable.id),
  startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
  currentPeriodStartsAt: timestamp("current_period_starts_at", { withTimezone: true }).notNull(),
  currentPeriodEndsAt: timestamp("current_period_ends_at", { withTimezone: true }),
  givesAccess: boolean("gives_access").notNull(),
  autoRenewalStatus: text("auto_renewal_status"),
  status: text("status").notNull(),
  store: text("store").notNull(),
  environment: text("environment").notNull(),
  storeSubscriptionIdentifier: text("store_subscription_identifier"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export type InsertSubscription = typeof subscriptionsTable.$inferInsert;
export type SelectSubscription = typeof subscriptionsTable.$inferSelect;
