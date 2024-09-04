import { pgTable, uuid, varchar, boolean, timestamp, bigint } from 'drizzle-orm/pg-core';
import { promptCategoriesTable } from './prompt_categories';

export const promptsPrimaryTable = pgTable('prompts_primary', {
  id: uuid('id').defaultRandom().primaryKey(),
  prompt: varchar('prompt', { length: 255 }).notNull(),
  promptType: varchar('prompt_type', { length: 255 }).default('default'),
  contextEstablishingQuestion: boolean('context_establishing_question').default(false),
  promptCategoryId: bigint('prompt_category_id', { mode: 'number' }).references(() => promptCategoriesTable.id),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  airtableId: varchar('airtable_id'),
  categoryAirtableId: varchar('category_airtable_id'),
  objectPrompt: boolean('object_prompt'),
});

export type PromptPrimary = typeof promptsPrimaryTable.$inferSelect;
export type InsertPromptPrimary = typeof promptsPrimaryTable.$inferInsert;