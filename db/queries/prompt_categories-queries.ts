"use server";

import * as schema from "../schema";
import { promptCategoriesTable, InsertPromptCategory } from "../schema/prompt_categories";
import { eq } from "drizzle-orm";
import { sql } from '@vercel/postgres';
import { drizzle } from 'drizzle-orm/vercel-postgres';

// Create a typed database instance
const typedDb = drizzle(sql, { schema });

export const createPromptCategory = async (data: InsertPromptCategory) => {
  return typedDb.insert(promptCategoriesTable).values(data).returning();
};

export const getPromptCategoryById = async (id: bigint) => {
  return typedDb.query.promptCategoriesTable.findFirst({
    where: eq(promptCategoriesTable.id, Number(id)),
  });
};

export const getAllPromptCategories = async () => {
  return typedDb.query.promptCategoriesTable.findMany();
};

export const updatePromptCategory = async (id: bigint, data: Partial<InsertPromptCategory>) => {
  return typedDb.update(promptCategoriesTable).set(data).where(eq(promptCategoriesTable.id, Number(id))).returning();
};

export const deletePromptCategory = async (id: bigint) => {
  return typedDb.delete(promptCategoriesTable).where(eq(promptCategoriesTable.id, Number(id)));
};
