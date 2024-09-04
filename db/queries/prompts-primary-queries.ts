"use server";

import { sql } from '@vercel/postgres';
import { drizzle } from 'drizzle-orm/vercel-postgres';
import * as schema from "../schema";
import { eq } from "drizzle-orm";
import { InsertPromptPrimary, PromptPrimary } from "../schema/prompts_primary";

// Create a typed database instance
const typedDb = drizzle(sql, { schema });

export const createPrompt = async (data: InsertPromptPrimary) => {
  const result = await typedDb.insert(schema.promptsPrimaryTable).values(data).returning();
  return result[0];
};

export const getPromptById = async (id: string) => {
  return typedDb.query.promptsPrimaryTable.findFirst({
    where: eq(schema.promptsPrimaryTable.id, id),
  });
};

export const getAllPrompts = async () => {
  return typedDb.query.promptsPrimaryTable.findMany();
};

export const updatePrompt = async (id: string, data: Partial<InsertPromptPrimary>) => {
  return typedDb.update(schema.promptsPrimaryTable)
    .set(data)
    .where(eq(schema.promptsPrimaryTable.id, id))
    .returning();
};

export const deletePrompt = async (id: string) => {
  return typedDb.delete(schema.promptsPrimaryTable)
    .where(eq(schema.promptsPrimaryTable.id, id));
};

// New function to get prompts by category
export const getPromptsByCategory = async (categoryId: number) => {
  return typedDb.query.promptsPrimaryTable.findMany({
    where: eq(schema.promptsPrimaryTable.promptCategoryId, categoryId),
  });
};

// New function to get latest prompts
export const getLatestPrompts = async (limit: number = 10) => {
  return typedDb.query.promptsPrimaryTable.findMany({
    orderBy: (prompts, { desc }) => [desc(prompts.createdAt)],
    limit: limit,
  });
};
