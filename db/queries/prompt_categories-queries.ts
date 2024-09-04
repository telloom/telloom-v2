"use server";

import { sql } from '@vercel/postgres';
import { drizzle } from 'drizzle-orm/vercel-postgres';
import { eq } from "drizzle-orm";
import * as schema from "../schema";
import { promptCategoriesTable, InsertPromptCategory } from '../schema/prompt_categories';
import { db } from '../db';

// Create a typed database instance
const typedDb = drizzle(sql, { schema });

export const createPromptCategory = async (data: InsertPromptCategory) => {
  return typedDb.insert(promptCategoriesTable).values(data).returning();
};

export const getPromptCategoryById = async (id: number) => {
  return db.select().from(schema.promptCategoriesTable).where(eq(schema.promptCategoriesTable.id, id));
};

export const getAllPromptCategories = async () => {
  try {
    console.log('Executing getAllPromptCategories query...');
    const result = await db.select().from(schema.promptCategoriesTable);
    console.log('getAllPromptCategories result:', result);
    return result;
  } catch (error) {
    console.error('Error in getAllPromptCategories:', error);
    throw error;
  }
};

export const updatePromptCategory = async (id: number, data: Partial<InsertPromptCategory>) => {
  return db.update(promptCategoriesTable).set(data).where(eq(promptCategoriesTable.id, id)).returning();
};

export const deletePromptCategory = async (id: number) => {
  return db.delete(promptCategoriesTable).where(eq(promptCategoriesTable.id, id));
};
