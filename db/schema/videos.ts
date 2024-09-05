import { pgTable, bigint, uuid, text, doublePrecision, timestamp } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const videosTable = pgTable("videos", {
  id: bigint("id", { mode: "number" }).primaryKey().notNull().default(sql`nextval('videos_id_seq')`),
  userId: uuid("user_id").notNull(),
  muxUploadId: text("mux_upload_id").notNull(),
  muxAssetId: text("mux_asset_id"),
  muxPlaybackId: text("mux_playback_id"),
  status: text("status", { enum: ['processing', 'ready', 'errored'] }).notNull(),
  duration: doublePrecision("duration"),
  aspectRatio: text("aspect_ratio"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  airtableRecordId: text("airtable_record_id"),
  promptId: uuid("prompt_id").notNull(), // Add this line
});

export type InsertVideo = {
  id?: bigint;  // Make id optional
  userId: string;
  muxUploadId: string;
  muxAssetId?: string;
  muxPlaybackId?: string;
  status: 'processing' | 'ready' | 'errored';
  duration?: number;
  aspectRatio?: string;
  airtableRecordId?: string;
  promptId: string; // Add this line
};

export type SelectVideo = typeof videosTable.$inferSelect;
export type Video = typeof videosTable.$inferSelect;
