import { pgTable, bigserial, text, timestamp } from "drizzle-orm/pg-core";
import { objectsTable } from "./objects";
import { promptsPrimaryTable } from "./prompts_primary";

export const objectPromptResponsesTable = pgTable("object_prompt_responses", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  objectId: bigserial("object_id", { mode: "number" }).references(() => objectsTable.id),
  promptId: bigserial("prompt_id", { mode: "number" }).references(() => promptsPrimaryTable.id),
  responseText: text("response_text"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export type InsertObjectPromptResponse = typeof objectPromptResponsesTable.$inferInsert;
export type SelectObjectPromptResponse = typeof objectPromptResponsesTable.$inferSelect;