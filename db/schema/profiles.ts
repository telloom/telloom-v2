import { pgTable, uuid, timestamp, text, boolean } from "drizzle-orm/pg-core";

export const profilesTable = pgTable("profiles", {
  id: uuid("id").primaryKey(),
  updatedAt: timestamp("updated_at", { withTimezone: true }),
  username: text("username"),
  fullName: text("full_name"),
  avatarUrl: text("avatar_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  email: text("email"),
  passwordHash: text("password_hash"),
  firstName: text("first_name"),
  lastName: text("last_name"),
  phone: text("phone"),
  revenuecatAppUserId: text("revenuecat_app_user_id"),
  status: text("status"),
  airtableRecordId: text("airtable_record_id"),
});

export type InsertProfile = typeof profilesTable.$inferInsert;
export type SelectProfile = typeof profilesTable.$inferSelect;
