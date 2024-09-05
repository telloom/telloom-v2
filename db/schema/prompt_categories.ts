import { pgTable, bigint, text, timestamp } from 'drizzle-orm/pg-core';

export const promptCategoriesTable = pgTable('prompt_categories', {
  id: bigint('id', { mode: 'number' }).primaryKey(),
  category: text('category'),
  description: text('description'),
  airtableId: text('airtable_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export type PromptCategory = typeof promptCategoriesTable.$inferSelect;
export type InsertPromptCategory = typeof promptCategoriesTable.$inferInsert;
