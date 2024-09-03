import { pgTable, bigserial, text, integer, timestamp, varchar, boolean } from 'drizzle-orm/pg-core';
import { InferModel } from 'drizzle-orm';

export const promptsPrimaryTable = pgTable('prompts_primary', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  prompt: text('prompt').notNull(),
  promptType: varchar('prompt_type', { length: 255 }),
  contextEstablishingQuestion: boolean('context_establishing_question').default(false),
  airtableId: text('airtable_id'),
  categoryId: integer('category_id'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export type PromptPrimary = InferModel<typeof promptsPrimaryTable>;
export type InsertPromptPrimary = InferModel<typeof promptsPrimaryTable, 'insert'>;