import { pgTable, uuid, varchar, timestamp } from 'drizzle-orm/pg-core';

export const uploadInfoTable = pgTable('upload_info', {
  muxUploadId: varchar('mux_upload_id', { length: 255 }).primaryKey(),
  userId: uuid('user_id').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});