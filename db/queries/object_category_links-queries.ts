"use server";

import { sql } from '@vercel/postgres';
import { drizzle } from 'drizzle-orm/vercel-postgres';
import * as schema from "../schema";
import { eq } from "drizzle-orm";
import { InsertObjectCategoryLink, SelectObjectCategoryLink } from "../schema/object_category_links";

// Create a typed database instance
const typedDb = drizzle(sql, { schema });

export const createObjectCategoryLink = async (data: InsertObjectCategoryLink) => {
  return typedDb.insert(schema.objectCategoryLinksTable).values(data).returning();
};

export const getObjectCategoryLinkById = async (id: bigint) => {
  return typedDb.query.objectCategoryLinksTable.findFirst({
    where: eq(schema.objectCategoryLinksTable.id, Number(id)),
  });
};

export const getAllObjectCategoryLinks = async () => {
  return typedDb.query.objectCategoryLinksTable.findMany();
};

export const updateObjectCategoryLink = async (id: bigint, data: Partial<InsertObjectCategoryLink>) => {
  return typedDb.update(schema.objectCategoryLinksTable).set(data).where(eq(schema.objectCategoryLinksTable.id, Number(id))).returning();
};

export const deleteObjectCategoryLink = async (id: bigint) => {
  return typedDb.delete(schema.objectCategoryLinksTable).where(eq(schema.objectCategoryLinksTable.id, Number(id)));
};
