import { bigint, pgTable, timestamp } from "drizzle-orm/pg-core";
import { objectsTable } from "./objects";
import { objectCategoriesTable } from "./object_categories";

export const objectCategoryLinksTable = pgTable("object_category_links", {
  id: bigint("id", { mode: "number" }).primaryKey(),
  objectId: bigint("object_id", { mode: "number" }).references(() => objectsTable.id),
  categoryId: bigint("category_id", { mode: "number" }).references(() => objectCategoriesTable.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().$onUpdate(() => new Date()),
});

export type InsertObjectCategoryLink = typeof objectCategoryLinksTable.$inferInsert;
export type SelectObjectCategoryLink = typeof objectCategoryLinksTable.$inferSelect;