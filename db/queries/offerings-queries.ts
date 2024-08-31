"use server";

import { sql } from '@vercel/postgres';
import { drizzle } from 'drizzle-orm/vercel-postgres';
import * as schema from "../schema";
import { eq } from "drizzle-orm";
import { InsertOffering, SelectOffering } from "../schema/offerings";

// Create a typed database instance
const typedDb = drizzle(sql, { schema });

export const createOffering = async (data: InsertOffering) => {
  return typedDb.insert(schema.offeringsTable).values(data).returning();
};

export const getOfferingById = async (id: bigint) => {
  return typedDb.query.offeringsTable.findFirst({
    where: eq(schema.offeringsTable.id, Number(id)),
  });
};

export const getAllOfferings = async () => {
  return typedDb.query.offeringsTable.findMany();
};

export const updateOffering = async (id: bigint, data: Partial<InsertOffering>) => {
  return typedDb.update(schema.offeringsTable).set(data).where(eq(schema.offeringsTable.id, Number(id))).returning();
};

export const deleteOffering = async (id: bigint) => {
  return typedDb.delete(schema.offeringsTable).where(eq(schema.offeringsTable.id, Number(id)));
};
