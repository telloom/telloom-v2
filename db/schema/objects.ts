import { bigint, pgTable, text, timestamp, jsonb } from "drizzle-orm/pg-core";
import { objectCategoriesTable } from "./object_categories";

export const objectsTable = pgTable("objects", {
  id: bigint("id", { mode: "number" }).primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  categoryId: bigint("category_id", { mode: "number" }).references(() => objectCategoriesTable.id),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().$onUpdate(() => new Date()),
});
export type InsertObject = typeof objectsTable.$inferInsert;
export type SelectObject = typeof objectsTable.$inferSelect;

