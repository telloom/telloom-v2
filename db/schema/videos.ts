import { bigint, pgTable, text, timestamp, jsonb } from "drizzle-orm/pg-core";
import { promptResponsesTable } from "./prompt_responses";
import { profilesTable } from "./profiles";

export const videosTable = pgTable("videos", {
  id: bigint("id", { mode: "number" }).primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  url: text("url").notNull(),
  userId: bigint("user_id", { mode: "number" }).references(() => profilesTable.id),
  promptResponseId: bigint("prompt_response_id", { mode: "number" }).references(() => promptResponsesTable.id),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().$onUpdate(() => new Date()),
});

export type InsertVideo = typeof videosTable.$inferInsert;
export type SelectVideo = typeof videosTable.$inferSelect;
