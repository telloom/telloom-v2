import { bigint, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const promptCategoriesTable = pgTable("prompt_categories", {
  id: bigint("id", { mode: "number" }).primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().$onUpdate(() => new Date()),
});

export type InsertPromptCategory = typeof promptCategoriesTable.$inferInsert;
export type SelectPromptCategory = typeof promptCategoriesTable.$inferSelect;
