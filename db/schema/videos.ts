import { bigserial, pgTable, text, timestamp, uuid, doublePrecision } from "drizzle-orm/pg-core";

export const videosTable = pgTable("videos", {
  id: bigserial("id", { mode: "number" }).primaryKey(),  // Added the mode as 'number'
  userId: uuid("user_id"),
  muxAssetId: text("mux_asset_id").notNull(),
  muxPlaybackId: text("mux_playback_id").notNull(),
  status: text("status"),
  duration: doublePrecision("duration"),
  aspectRatio: text("aspect_ratio"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  airtableRecordId: text("airtable_record_id"),
});

export type InsertVideo = typeof videosTable.$inferInsert;
export type SelectVideo = typeof videosTable.$inferSelect;
