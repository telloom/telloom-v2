"use server";

import { sql } from '@vercel/postgres';
import { drizzle } from 'drizzle-orm/vercel-postgres';
import * as schema from "../schema";
import { eq } from "drizzle-orm";
import { InsertObjectCategory, SelectObjectCategory } from "../schema/object_categories";

// Create a typed database instance
const typedDb = drizzle(sql, { schema });

export const createObjectCategory = async (data: InsertObjectCategory) => {
  return typedDb.insert(schema.objectCategoriesTable).values(data).returning();
};

export const getObjectCategoryById = async (id: bigint) => {
  return typedDb.query.objectCategoriesTable.findFirst({
    where: eq(schema.objectCategoriesTable.id, Number(id)),
  });
};

export const getAllObjectCategories = async () => {
  return typedDb.query.objectCategoriesTable.findMany();
};

export const updateObjectCategory = async (id: bigint, data: Partial<InsertObjectCategory>) => {
  return typedDb.update(schema.objectCategoriesTable).set(data).where(eq(schema.objectCategoriesTable.id, Number(id))).returning();
};

export const deleteObjectCategory = async (id: bigint) => {
  return typedDb.delete(schema.objectCategoriesTable).where(eq(schema.objectCategoriesTable.id, Number(id)));
};
