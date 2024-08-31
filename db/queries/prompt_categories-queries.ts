"use server";

import { db } from "../db";
import * as schema from "../schema";
import { promptCategoriesTable } from "../schema";
import { eq } from "drizzle-orm";
import { InsertPromptCategory, SelectPromptCategory } from "../schema/prompt_categories";

// Update the db import to include the schema
import { sql } from '@vercel/postgres';
import { drizzle } from 'drizzle-orm/vercel-postgres';

// Create a typed database instance
const typedDb = drizzle(sql, { schema });

export const createPromptCategory = async (data: InsertPromptCategory) => {
  return typedDb.insert(promptCategoriesTable).values(data).returning();
};

export const getUpromptUcategoriesById = async (id: bigint) => {
  return typedDb.query.promptCategoriesTable.findFirst({
    where: eq(promptCategoriesTable.id, Number(id)),
  });
};

export const getAllUpromptUcategoriess = async () => {
  return typedDb.query.promptCategoriesTable.findMany();
};

export const updateUpromptUcategories = async (id: bigint, data: Partial<InsertPromptCategory>) => {
  return typedDb.update(promptCategoriesTable).set(data).where(eq(promptCategoriesTable.id, Number(id))).returning();
};

export const deleteUpromptUcategories = async (id: bigint) => {
  return typedDb.delete(promptCategoriesTable).where(eq(promptCategoriesTable.id, Number(id)));
};
