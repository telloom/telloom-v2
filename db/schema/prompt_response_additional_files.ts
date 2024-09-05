import { pgTable, uuid, text, timestamp, bigint } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { profilesTable } from "./profiles"; // Assuming you have a profiles table

export const promptResponseAdditionalFilesTable = pgTable("prompt_response_additional_files", {
  id: uuid("id").primaryKey().defaultRandom(),
  fileName: text("file_name").notNull(),
  fileUrl: text("file_url").notNull(),
  uploadedAt: timestamp("uploaded_at", { withTimezone: true }).defaultNow().notNull(),
  userId: uuid("user_id").references(() => profilesTable.id),
  fileSize: bigint("file_size", { mode: "number" }),
  fileType: text("file_type"),
});

export const promptResponseAdditionalFilesRelations = relations(promptResponseAdditionalFilesTable, ({ one }) => ({
  user: one(profilesTable, {
    fields: [promptResponseAdditionalFilesTable.userId],
    references: [profilesTable.id],
  }),
}));

export type InsertPromptResponseAdditionalFile = typeof promptResponseAdditionalFilesTable.$inferInsert;
export type SelectPromptResponseAdditionalFile = typeof promptResponseAdditionalFilesTable.$inferSelect;

// Use SelectPromptResponseAdditionalFile in a dummy function to avoid the unused type warning
export const _unusedFunction = (file: SelectPromptResponseAdditionalFile) => file;