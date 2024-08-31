"use server";

import { sql } from '@vercel/postgres';
import { drizzle } from 'drizzle-orm/vercel-postgres';
import * as schema from "../schema";
import { eq } from "drizzle-orm";
import { InsertObject, SelectObject } from "../schema/objects";

// Create a typed database instance
const typedDb = drizzle(sql, { schema });

export const createObject = async (data: InsertObject) => {
  return typedDb.insert(schema.objectsTable).values(data).returning();
};

export const getObjectById = async (id: bigint) => {
  return typedDb.query.objectsTable.findFirst({
    where: eq(schema.objectsTable.id, Number(id)),
  });
};

export const getAllObjects = async () => {
  return typedDb.query.objectsTable.findMany();
};

export const updateObject = async (id: bigint, data: Partial<InsertObject>) => {
  return typedDb.update(schema.objectsTable).set(data).where(eq(schema.objectsTable.id, Number(id))).returning();
};

export const deleteObject = async (id: bigint) => {
  return typedDb.delete(schema.objectsTable).where(eq(schema.objectsTable.id, Number(id)));
};
