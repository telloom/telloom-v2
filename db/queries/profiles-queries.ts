"use server";

import { sql } from '@vercel/postgres';
import { drizzle } from 'drizzle-orm/vercel-postgres';
import * as schema from "../schema";
import { eq } from "drizzle-orm";
import { InsertProfile, SelectProfile } from "../schema/profiles";

// Create a typed database instance
const typedDb = drizzle(sql, { schema });

export const createProfile = async (data: InsertProfile) => {
  return typedDb.insert(schema.profilesTable).values(data).returning();
};

export const getProfileById = async (id: string) => {
  return typedDb.query.profilesTable.findFirst({
    where: eq(schema.profilesTable.id, id),
  });
};

export const getAllProfiles = async () => {
  return typedDb.query.profilesTable.findMany();
};

export const updateProfile = async (id: string, data: Partial<InsertProfile>) => {
  return typedDb.update(schema.profilesTable).set(data).where(eq(schema.profilesTable.id, id)).returning();
};

export const deleteProfile = async (id: string) => {
  return typedDb.delete(schema.profilesTable).where(eq(schema.profilesTable.id, id));
};
