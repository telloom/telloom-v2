"use server";

import { eq } from "drizzle-orm";
import * as schema from "../schema";
import { promptCategoriesTable, InsertPromptCategory } from '../schema/prompt_categories';
import { db, supabase } from '../db';

export const createPromptCategory = async (data: InsertPromptCategory) => {
  return db.insert(promptCategoriesTable).values(data).returning();
};

export const getPromptCategoryById = async (id: number) => {
  return db.select().from(schema.promptCategoriesTable).where(eq(schema.promptCategoriesTable.id, id));
};

export const getAllPromptCategories = async () => {
  try {
    console.log('Executing getAllPromptCategories query...');
    const result = await db.select().from(schema.promptCategoriesTable);
    console.log('Query executed successfully');
    console.log('getAllPromptCategories result:', result);
    return result;
  } catch (error) {
    console.error('Error in getAllPromptCategories:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    throw error;
  }
};

export const updatePromptCategory = async (id: number, data: Partial<InsertPromptCategory>) => {
  return db.update(promptCategoriesTable).set(data).where(eq(promptCategoriesTable.id, id)).returning();
};

export const deletePromptCategory = async (id: number) => {
  return db.delete(promptCategoriesTable).where(eq(promptCategoriesTable.id, id));
};

export const testDatabaseConnection = async () => {
  try {
    const { data, error } = await supabase
      .from('prompt_categories')
      .select('*')
      .limit(1);
    
    if (error) throw error;
    
    console.log('Test query result:', data);
    return true;
  } catch (error) {
    console.error('Test query failed:', error);
    return false;
  }
};
