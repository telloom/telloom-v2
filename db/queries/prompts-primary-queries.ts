"use server";

import { eq } from "drizzle-orm";
import * as schema from "../schema";
import { InsertPromptPrimary } from "../schema/prompts_primary";
import { db } from '../db';
import { cache } from 'react';

export const createPrompt = async (data: InsertPromptPrimary) => {
  const result = await db.insert(schema.promptsPrimaryTable).values(data).returning();
  return result[0];
};

export const getPromptById = async (id: string) => {
  return db.select().from(schema.promptsPrimaryTable).where(eq(schema.promptsPrimaryTable.id, id));
};

export const getAllPrompts = cache(async () => {
  return db.select().from(schema.promptsPrimaryTable);
});

export const updatePrompt = async (id: string, data: Partial<InsertPromptPrimary>) => {
  return db.update(schema.promptsPrimaryTable)
    .set(data)
    .where(eq(schema.promptsPrimaryTable.id, id))
    .returning();
};

export const deletePrompt = async (id: string) => {
  return db.delete(schema.promptsPrimaryTable)
    .where(eq(schema.promptsPrimaryTable.id, id));
};

export const getPromptsByCategory = async (categoryId: number) => {
  return db.select().from(schema.promptsPrimaryTable)
    .where(eq(schema.promptsPrimaryTable.promptCategoryId, categoryId));
};

export const getLatestPrompts = async (limit: number = 10) => {
  return db.select().from(schema.promptsPrimaryTable)
    .orderBy(schema.promptsPrimaryTable.createdAt)
    .limit(limit);
};
