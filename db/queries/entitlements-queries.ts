"use server";

import { db } from "../db";
import { entitlementsTable } from "../schema/entitlements";
import { eq } from "drizzle-orm";

export const createEntitlement = async (data: InsertEntitlement) => {
  return db.insert(entitlementsTable).values(data).returning();
};

export const getEntitlementById = async (id: bigint) => {
  return db.query.entitlementsTable.findFirst({
    where: eq(entitlementsTable.id, id),
  });
};

export const getAllEntitlements = async () => {
  return db.query.entitlementsTable.findMany();
};

export const updateEntitlement = async (id: bigint, data: Partial<InsertEntitlement>) => {
  return db.update(entitlementsTable).set(data).where(eq(entitlementsTable.id, id)).returning();
};

export const deleteEntitlement = async (id: bigint) => {
  return db.delete(entitlementsTable).where(eq(entitlementsTable.id, id));
};
