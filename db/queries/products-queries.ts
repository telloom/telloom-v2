"use server";

import { sql } from '@vercel/postgres';
import { drizzle } from 'drizzle-orm/vercel-postgres';
import * as schema from "../schema";
import { eq } from "drizzle-orm";
import { InsertProduct, SelectProduct } from "../schema/products";

// Create a typed database instance
const typedDb = drizzle(sql, { schema });

export const createProduct = async (data: InsertProduct) => {
  return typedDb.insert(schema.productsTable).values(data).returning();
};

export const getProductById = async (id: bigint) => {
  return typedDb.query.productsTable.findFirst({
    where: eq(schema.productsTable.id, Number(id)),
  });
};

export const getAllProducts = async () => {
  return typedDb.query.productsTable.findMany();
};

export const updateProduct = async (id: bigint, data: Partial<InsertProduct>) => {
  return typedDb.update(schema.productsTable).set(data).where(eq(schema.productsTable.id, Number(id))).returning();
};

export const deleteProduct = async (id: bigint) => {
  return typedDb.delete(schema.productsTable).where(eq(schema.productsTable.id, Number(id)));
};
