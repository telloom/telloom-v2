import { pgTable, bigserial, text, timestamp } from "drizzle-orm/pg-core";
import { objectsTable } from "./objects";
import { objectCategoriesTable } from "./object_categories";

export const objectCategoryLinksTable = pgTable("object_category_links", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  objectId: bigserial("object_id", { mode: "number" }).references(() => objectsTable.id),
  categoryId: bigserial("category_id", { mode: "number" }).references(() => objectCategoriesTable.id),
  airtableRecordId: text("airtable_record_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export type InsertObjectCategoryLink = typeof objectCategoryLinksTable.$inferInsert;
export type SelectObjectCategoryLink = typeof objectCategoryLinksTable.$inferSelect;