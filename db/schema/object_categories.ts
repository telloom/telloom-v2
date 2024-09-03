import { pgTable, bigserial, text, timestamp } from "drizzle-orm/pg-core";

export const objectCategoriesTable = pgTable("object_categories", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  categoryName: text("category_name").notNull(),
  description: text("description"),
  airtableRecordId: text("airtable_record_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export type InsertObjectCategory = typeof objectCategoriesTable.$inferInsert;
export type SelectObjectCategory = typeof objectCategoriesTable.$inferSelect;
