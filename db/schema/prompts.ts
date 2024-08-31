import { bigint, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { promptCategoriesTable } from "./prompt_categories";

export const promptsTable = pgTable("prompts", {
  id: bigint("id", { mode: "number" }).primaryKey(),
  text: text("text").notNull(),
  categoryId: bigint("category_id", { mode: "number" }).references(() => promptCategoriesTable.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().$onUpdate(() => new Date()),
});

export type InsertPrompt = typeof promptsTable.$inferInsert;
export type SelectPrompt = typeof promptsTable.$inferSelect;
