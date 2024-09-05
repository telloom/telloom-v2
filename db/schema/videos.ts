import { pgTable, bigint, uuid, text, doublePrecision, timestamp } from 'drizzle-orm/pg-core';

export const videosTable = pgTable("videos", {
  id: bigint("id", { mode: "number" }).primaryKey().notNull(),
  userId: uuid("user_id").notNull(),
  muxAssetId: text("mux_asset_id").notNull(),
  muxPlaybackId: text("mux_playback_id").notNull(),
  status: text("status", { enum: ['preparing', 'ready', 'errored'] }).notNull(),
  duration: doublePrecision("duration"),
  aspectRatio: text("aspect_ratio"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  airtableRecordId: text("airtable_record_id"),
});

export type InsertVideo = {
  userId: string;
  muxAssetId: string;
  muxPlaybackId: string;
  status: 'preparing' | 'ready' | 'errored';
  duration?: number;
  aspectRatio?: string;
  airtableRecordId?: string;
};

export type SelectVideo = typeof videosTable.$inferSelect;
export type Video = typeof videosTable.$inferSelect;
