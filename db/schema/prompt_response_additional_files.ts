import { pgTable, uuid, text, timestamp, bigint } from "drizzle-orm/pg-core";

export const promptResponseAdditionalFilesTable = pgTable("prompt_response_additional_files", {
  id: uuid("id").defaultRandom().primaryKey(),
  fileName: text("file_name").notNull(),
  fileUrl: text("file_url").notNull(),
  uploadedAt: timestamp("uploaded_at", { withTimezone: true }).defaultNow().notNull(),
  userId: uuid("user_id"),
  fileSize: bigint("file_size", { mode: "number" }),
  fileType: text("file_type"),
});

export type InsertPromptResponseAdditionalFile = typeof promptResponseAdditionalFilesTable.$inferInsert;
export type SelectPromptResponseAdditionalFile = typeof promptResponseAdditionalFilesTable.$inferSelect;