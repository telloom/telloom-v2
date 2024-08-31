import { pgTable, serial, text, timestamp, integer } from "drizzle-orm/pg-core";

export const videoNotes = pgTable("video_notes", {
  id: serial("id").primaryKey(),
  videoId: integer("video_id").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export type InsertVideoNote = typeof videoNotes.$inferInsert;
export type SelectVideoNote = typeof videoNotes.$inferSelect;
