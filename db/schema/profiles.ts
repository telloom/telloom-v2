import { pgTable, uuid, timestamp, text } from "drizzle-orm/pg-core";

export const profilesTable = pgTable("profiles", {
  id: uuid("id").primaryKey().notNull(),
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
  addressStreet: text("address_street"),
  addressUnit: text("address_unit"),
  addressCity: text("address_city"),
  addressState: text("address_state"),
  addressZipcode: text("address_zipcode"),
  executorNameFirst: text("executor_name_first"),
  executorNameLast: text("executor_name_last"),
  executorRelation: text("executor_relation"),
  executorPhone: text("executor_phone"),
  executorEmail: text("executor_email"),
});

export type InsertProfile = typeof profilesTable.$inferInsert;
export type SelectProfile = typeof profilesTable.$inferSelect;
