import { bigint, pgTable, timestamp, text } from "drizzle-orm/pg-core";

export const promptCategoryLinksTable = pgTable("prompt_category_links", {
  id: bigint("id", { mode: "number" }).primaryKey().notNull(),
  airtableId: text("airtable_id"),
  promptAirtableId: text("prompt_airtable_id"),
  categoryAirtableId: text("category_airtable_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export type InsertPromptCategoryLink = typeof promptCategoryLinksTable.$inferInsert;
export type SelectPromptCategoryLink = typeof promptCategoryLinksTable.$inferSelect;