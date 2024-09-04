import { bigint, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { videosTable } from "./videos";
import { promptsPrimaryTable } from "./prompts_primary";

export const promptResponsesTable = pgTable("prompt_responses", {
  id: bigint("id", { mode: "number" }).primaryKey().notNull(),
  userId: uuid("user_id").notNull(),
  promptId: uuid("prompt_id").notNull().references(() => promptsPrimaryTable.id),
  videoId: bigint("video_id", { mode: "number" }).notNull().references(() => videosTable.id),
  muxPlaybackId: text("mux_playback_id").notNull(),
  responseText: text("response_text"),
  privacyLevel: text("privacy_level").default('Private'),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export type InsertPromptResponse = typeof promptResponsesTable.$inferInsert;
export type SelectPromptResponse = typeof promptResponsesTable.$inferSelect;

// Use SelectPromptResponse in a dummy function to avoid the unused type warning
export const _unusedFunction = (response: SelectPromptResponse) => response;
