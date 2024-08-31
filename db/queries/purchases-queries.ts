"use server";

import { sql } from '@vercel/postgres';
import { drizzle } from 'drizzle-orm/vercel-postgres';
import * as schema from "../schema";
import { eq } from "drizzle-orm";
import { InsertPurchase, SelectPurchase } from "../schema/purchases";

// Create a typed database instance
const typedDb = drizzle(sql, { schema });

export const createPurchase = async (data: InsertPurchase) => {
  return typedDb.insert(schema.purchasesTable).values(data).returning();
};

export const getPurchaseById = async (id: bigint) => {
  return typedDb.query.purchasesTable.findFirst({
    where: eq(schema.purchasesTable.id, Number(id)),
  });
};

export const getAllPurchases = async () => {
  return typedDb.query.purchasesTable.findMany();
};

export const updatePurchase = async (id: bigint, data: Partial<InsertPurchase>) => {
  return typedDb.update(schema.purchasesTable).set(data).where(eq(schema.purchasesTable.id, Number(id))).returning();
};

export const deletePurchase = async (id: bigint) => {
  return typedDb.delete(schema.purchasesTable).where(eq(schema.purchasesTable.id, Number(id)));
};
