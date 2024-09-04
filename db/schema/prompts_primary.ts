import { pgTable, uuid, text, varchar, boolean, integer, timestamp } from 'drizzle-orm/pg-core';

export const promptsPrimaryTable = pgTable('prompts_primary', {
  id: uuid('id').primaryKey().defaultRandom(),
  prompt: text('prompt').notNull(),
  promptType: varchar('prompt_type', { length: 255 }).default('default'),
  contextEstablishingQuestion: boolean('context_establishing_question').default(false),
  categoryId: integer('category_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow()
});

export type PromptPrimary = typeof promptsPrimaryTable.$inferSelect;
export type InsertPromptPrimary = typeof promptsPrimaryTable.$inferInsert;