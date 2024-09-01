"use server";

import { sql } from '@vercel/postgres';
import { drizzle } from 'drizzle-orm/vercel-postgres';
import * as schema from "../schema";
import { eq } from "drizzle-orm";
import { InsertEntitlement, SelectEntitlement } from "../schema/entitlements";

// Create a typed database instance
const typedDb = drizzle(sql, { schema });

export const createEntitlement = async (data: InsertEntitlement) => {
  return typedDb.insert(schema.entitlementsTable).values(data).returning();
};

export const getEntitlementById = async (id: bigint) => {
  return typedDb.query.entitlementsTable.findFirst({
    where: eq(schema.entitlementsTable.id, Number(id)),
  });
};

export const getAllEntitlements = async () => {
  return typedDb.query.entitlementsTable.findMany();
};

export const updateEntitlement = async (id: bigint, data: Partial<InsertEntitlement>) => {
  return typedDb.update(schema.entitlementsTable).set(data).where(eq(schema.entitlementsTable.id, Number(id))).returning();
};

export const deleteEntitlement = async (id: bigint) => {
  return typedDb.delete(schema.entitlementsTable).where(eq(schema.entitlementsTable.id, Number(id)));
};
