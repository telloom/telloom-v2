import { bigint, pgTable, text, timestamp, jsonb } from "drizzle-orm/pg-core";
import { promptsTable } from "./prompts";
import { profilesTable } from "./profiles";

export const promptResponsesTable = pgTable("prompt_responses", {
  id: bigint("id", { mode: "number" }).primaryKey(),
  promptId: bigint("prompt_id", { mode: "number" }).references(() => promptsTable.id),
  userId: bigint("user_id", { mode: "number" }).references(() => profilesTable.id),
  response: text("response").notNull(),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().$onUpdate(() => new Date()),
});

export type InsertPromptResponse = typeof promptResponsesTable.$inferInsert;
export type SelectPromptResponse = typeof promptResponsesTable.$inferSelect;
