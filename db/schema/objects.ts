import { pgTable, bigint, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const objectsTable = pgTable("objects", {
  id: bigint("id", { mode: "number" }).primaryKey().notNull(),
  userId: uuid("user_id"),
  objectName: text("object_name").notNull(),
  objectDescription: text("object_description"),
  airtableRecordId: text("airtable_record_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export type InsertObject = typeof objectsTable.$inferInsert;
export type SelectObject = typeof objectsTable.$inferSelect;

