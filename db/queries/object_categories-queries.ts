"use server";

import { sql } from '@vercel/postgres';
import { drizzle } from 'drizzle-orm/vercel-postgres';
import * as schema from "../schema";
import { eq } from "drizzle-orm";
import { InsertObjectCategory, SelectObjectCategory } from "../schema/object_categories";

// Create a typed database instance
const typedDb = drizzle(sql, { schema });

export const createUobjectUcategories = async (data: InsertObjectCategory) => {
  return typedDb.insert(schema.objectCategoriesTable).values(data).returning();
};

export const getUobjectUcategoriesById = async (id: bigint) => {
  return typedDb.query.objectCategoriesTable.findFirst({
    where: eq(schema.objectCategoriesTable.id, Number(id)),
  });
};

export const getAllUobjectUcategoriess = async () => {
  return typedDb.query.objectCategoriesTable.findMany();
};

export const updateUobjectUcategories = async (id: bigint, data: Partial<InsertObjectCategory>) => {
  return typedDb.update(schema.objectCategoriesTable).set(data).where(eq(schema.objectCategoriesTable.id, Number(id))).returning();
};

export const deleteUobjectUcategories = async (id: bigint) => {
  return typedDb.delete(schema.objectCategoriesTable).where(eq(schema.objectCategoriesTable.id, Number(id)));
};
