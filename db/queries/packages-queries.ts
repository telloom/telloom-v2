"use server";

import { sql } from '@vercel/postgres';
import { drizzle } from 'drizzle-orm/vercel-postgres';
import * as schema from "../schema";
import { eq } from "drizzle-orm";
import { InsertPackage, SelectPackage } from "../schema/packages";

// Create a typed database instance
const typedDb = drizzle(sql, { schema });

export const createPackage = async (data: InsertPackage) => {
  return typedDb.insert(schema.packagesTable).values(data).returning();
};

export const getPackageById = async (id: bigint) => {
  return typedDb.query.packagesTable.findFirst({
    where: eq(schema.packagesTable.id, Number(id)),
  });
};

export const getAllPackages = async () => {
  return typedDb.query.packagesTable.findMany();
};

export const updatePackage = async (id: bigint, data: Partial<InsertPackage>) => {
  return typedDb.update(schema.packagesTable).set(data).where(eq(schema.packagesTable.id, Number(id))).returning();
};

export const deletePackage = async (id: bigint) => {
  return typedDb.delete(schema.packagesTable).where(eq(schema.packagesTable.id, Number(id)));
};
