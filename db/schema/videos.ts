import { pgTable, uuid, text, timestamp, bigserial, doublePrecision, pgEnum, numeric } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { promptsPrimaryTable } from './prompts_primary';
import { profilesTable } from './profiles';

export const videoStatusEnum = pgEnum('video_status', ['waiting', 'preparing', 'asset_created', 'ready', 'errored']);

export const videosTable = pgTable('videos', {
  id: bigserial('id', { mode: 'number' }).primaryKey().unique(),
  userId: uuid('user_id').default(sql`auth.uid()`).references(() => profilesTable.id, { onUpdate: 'cascade', onDelete: 'restrict' }),
  muxAssetId: text('mux_asset_id').unique(),
  muxUploadId: text('mux_upload_id').unique(), // Remove .notNull()
  muxPlaybackId: text('mux_playback_id').unique(),
  status: videoStatusEnum('status').default('waiting'),
  duration: doublePrecision('duration'),
  aspectRatio: text('aspect_ratio'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  airtableRecordId: text('airtable_record_id'),
  promptId: uuid('prompt_id').references(() => promptsPrimaryTable.id, { onUpdate: 'cascade' }),
  videoQuality: text('video_quality'),
  maxWidth: numeric('max_width'),
  maxHeight: numeric('max_height'),
  maxFrameRate: numeric('max_frame_rate'),
  languageCode: text('language_code'),
  resolutionTier: text('resolution_tier'),
});

export type InsertVideo = typeof videosTable.$inferInsert;
