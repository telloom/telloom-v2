import { bigint, pgTable, timestamp } from "drizzle-orm/pg-core";
import { promptsTable } from "./prompts";
import { promptCategoriesTable } from "./prompt_categories";

export const promptCategoryLinksTable = pgTable("prompt_category_links", {
  id: bigint("id", { mode: "number" }).primaryKey(),
  promptId: bigint("prompt_id", { mode: "number" }).references(() => promptsTable.id),
  categoryId: bigint("category_id", { mode: "number" }).references(() => promptCategoriesTable.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().$onUpdate(() => new Date()),
});

export type InsertPromptCategoryLink = typeof promptCategoryLinksTable.$inferInsert;
export type SelectPromptCategoryLink = typeof promptCategoryLinksTable.$inferSelect;