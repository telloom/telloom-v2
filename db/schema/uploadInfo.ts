import { pgTable, uuid, text, timestamp, primaryKey } from 'drizzle-orm/pg-core';

export const uploadInfoTable = pgTable('upload_info', {
  muxUploadId: text('mux_upload_id').notNull(),
  userId: uuid('user_id').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  pk: primaryKey({ columns: [table.muxUploadId] })
}));