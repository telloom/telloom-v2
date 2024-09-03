import { pgTable, text, timestamp, jsonb, bigint } from "drizzle-orm/pg-core";

export const thematicVideosTable = pgTable("thematic_videos", {
  id: bigint("id", { mode: "number" }).primaryKey().notNull(),
  title: text("title").notNull(),
  description: text("description"),
  url: text("url").notNull(),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().$onUpdate(() => new Date()),
});

export type InsertThematicVideo = typeof thematicVideosTable.$inferInsert;
export type SelectThematicVideo = typeof thematicVideosTable.$inferSelect;
