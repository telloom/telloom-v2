import { bigint, pgTable, text, timestamp, jsonb } from "drizzle-orm/pg-core";
import { offeringsTable } from "./offerings";

export const packagesTable = pgTable("packages", {
  id: bigint("id", { mode: "number" }).primaryKey(),
  offeringId: bigint("offering_id", { mode: "number" }).references(() => offeringsTable.id),
  name: text("name").notNull(),
  description: text("description"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().$onUpdate(() => new Date()),
});

export type InsertPackage = typeof packagesTable.$inferInsert;
export type SelectPackage = typeof packagesTable.$inferSelect;