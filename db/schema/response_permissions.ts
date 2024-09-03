import { bigint, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { promptResponsesTable } from "./prompt_responses";

export const responsePermissionsTable = pgTable("response_permissions", {
  id: bigint("id", { mode: "number" }).primaryKey().notNull(),
  responseId: bigint("response_id", { mode: "number" }).references(() => promptResponsesTable.id),
  userId: uuid("user_id"),
  permissionLevel: text("permission_level").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export type InsertResponsePermission = typeof responsePermissionsTable.$inferInsert;
export type SelectResponsePermission = typeof responsePermissionsTable.$inferSelect;