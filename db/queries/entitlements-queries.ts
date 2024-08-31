"use server";

import { sql } from '@vercel/postgres';
import { drizzle } from 'drizzle-orm/vercel-postgres';
import { entitlementsTable } from "../schema";
import { eq } from "drizzle-orm";
import { InsertEntitlement, SelectEntitlement } from "../schema/entitlements";
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import * as schema from "../schema";

// Create a typed database instance
const typedDb = drizzle(sql, { schema });

export const createUentitlements = async (data: InsertEntitlement) => {
  return typedDb.insert(entitlementsTable).values(data).returning();
};

export const getUentitlementsById = async (id: bigint) => {
  return typedDb.query.entitlementsTable.findFirst({
    where: eq(entitlementsTable.id, Number(id)),
  });
};

export const getAllUentitlementss = async () => {
  return typedDb.query.entitlementsTable.findMany();
};

export const updateUentitlements = async (id: bigint, data: Partial<InsertEntitlement>) => {
  return typedDb.update(entitlementsTable).set(data).where(eq(entitlementsTable.id, Number(id))).returning();
};

export const deleteUentitlements = async (id: bigint) => {
  return typedDb.delete(entitlementsTable).where(eq(entitlementsTable.id, Number(id)));
};
