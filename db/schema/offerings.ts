import { bigserial, pgTable, text, timestamp, boolean } from "drizzle-orm/pg-core";

export const offeringsTable = pgTable("offerings", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  revenuecatId: text("revenuecat_id").notNull(),
  lookupKey: text("lookup_key").notNull(),
  displayName: text("display_name").notNull(),
  isCurrent: boolean("is_current").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export type InsertOffering = typeof offeringsTable.$inferInsert;
export type SelectOffering = typeof offeringsTable.$inferSelect;