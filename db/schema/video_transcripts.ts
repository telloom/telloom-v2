import { pgTable, text, timestamp, bigserial } from "drizzle-orm/pg-core";
import { videosTable } from "./videos";

export const videoTranscriptsTable = pgTable("video_transcripts", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  videoId: bigserial("video_id", { mode: "number" }).references(() => videosTable.id),
  transcript: text("transcript").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().$onUpdate(() => new Date()),
});

export type InsertVideoTranscript = typeof videoTranscriptsTable.$inferInsert;
export type SelectVideoTranscript = typeof videoTranscriptsTable.$inferSelect;
