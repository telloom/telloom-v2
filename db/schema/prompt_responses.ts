import { bigserial, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { promptsPrimaryTable } from "./prompts_primary";
import { videosTable } from "./videos";

export const promptResponsesTable = pgTable("prompt_responses", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  userId: uuid("user_id"),
  promptId: bigserial("prompt_id", { mode: "number" }).references(() => promptsPrimaryTable.id),
  videoId: bigserial("video_id", { mode: "number" }).references(() => videosTable.id),
  responseText: text("response_text"),
  privacyLevel: text("privacy_level").default('Private'),
  airtableRecordId: text("airtable_record_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export type InsertPromptResponse = typeof promptResponsesTable.$inferInsert;
export type SelectPromptResponse = typeof promptResponsesTable.$inferSelect;
