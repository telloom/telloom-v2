
import { videosTable } from "./videos";
import { relations } from "drizzle-orm";
import { profilesTable } from "./profiles";
import { promptsPrimaryTable } from "./prompts_primary";
import { promptResponseAdditionalFilesTable } from "./prompt_response_additional_files";
import { PromptPrimary } from "./prompts_primary";
import { Video } from "./videos";
import { pgTable, bigint, uuid, text, timestamp } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const promptResponsesTable = pgTable("prompt_responses", {
  id: bigint("id", { mode: "number" }).primaryKey().notNull().default(sql`nextval('prompt_responses_id_seq')`),
  userId: uuid("user_id").references(() => profilesTable.id, { onUpdate: "cascade", onDelete: "restrict" }),
  videoId: bigint("video_id", { mode: "number" }).references(() => videosTable.id),
  responseText: text("response_text"),
  privacyLevel: text("privacy_level", { enum: ['Private', 'Shared', 'Public'] }).default("Private").notNull(),
  airtableRecordId: text("airtable_record_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  promptId: uuid("prompt_id").references(() => promptsPrimaryTable.id, { onUpdate: "cascade", onDelete: "restrict" }),
  additionalFiles: uuid("additional_files").references(() => promptResponseAdditionalFilesTable.id, { onUpdate: "cascade", onDelete: "set null" }),
});

export const promptResponsesRelations = relations(promptResponsesTable, ({ one }) => ({
  user: one(profilesTable, {
    fields: [promptResponsesTable.userId],
    references: [profilesTable.id],
  }),
  prompt: one(promptsPrimaryTable, {
    fields: [promptResponsesTable.promptId],
    references: [promptsPrimaryTable.id],
  }),
  video: one(videosTable, {
    fields: [promptResponsesTable.videoId],
    references: [videosTable.id],
  }),
  additionalFile: one(promptResponseAdditionalFilesTable, {
    fields: [promptResponsesTable.additionalFiles],
    references: [promptResponseAdditionalFilesTable.id],
  }),
}));

export type InsertPromptResponse = typeof promptResponsesTable.$inferInsert;
export type SelectPromptResponse = typeof promptResponsesTable.$inferSelect & {
  prompt?: PromptPrimary | null;
  video?: Video | null;
};

// Remove or rename conflicting export
// export const _unusedFunction2 = () => {
//   // function implementation
// };
