import { bigint, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { videosTable } from "./videos";

export const promptResponsesTable = pgTable("prompt_responses", {
  id: bigint("id", { mode: "number" }).primaryKey().notNull(),
  userId: uuid("user_id"),
  videoId: bigint("video_id", { mode: "number" }).references(() => videosTable.id),
  responseText: text("response_text"),
  privacyLevel: text("privacy_level").default("Private"),
  airtableRecordId: text("airtable_record_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  promptId: uuid("prompt_id"),
  additionalFiles: uuid("additional_files"),
});

export type InsertPromptResponse = typeof promptResponsesTable.$inferInsert;
export type SelectPromptResponse = typeof promptResponsesTable.$inferSelect;

// Use SelectPromptResponse in a dummy function to avoid the unused type warning
export const _unusedFunction = (response: SelectPromptResponse) => response;
