import { bigint, pgTable, text, timestamp, jsonb } from "drizzle-orm/pg-core";

export const offeringsTable = pgTable("offerings", {
  id: bigint("id", { mode: "number" }).primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().$onUpdate(() => new Date()),
});

export type InsertOffering = typeof offeringsTable.$inferInsert;
export type SelectOffering = typeof offeringsTable.$inferSelect;