"use server";

import { sql } from '@vercel/postgres';
import { drizzle } from 'drizzle-orm/vercel-postgres';
import * as schema from "../schema";
import { eq } from "drizzle-orm";
import { InsertPromptPrimary } from "../schema/prompts_primary";

// Create a typed database instance
const typedDb = drizzle(sql, { schema });

export const createPrompt = async (data: InsertPromptPrimary) => {
  const result = await typedDb.insert(schema.promptsPrimaryTable).values(data).returning();
  return result[0];
};

export const getPromptById = async (id: bigint) => {
  return typedDb.query.promptsPrimaryTable.findFirst({
    where: eq(schema.promptsPrimaryTable.id, Number(id)),
  });
};

export const getAllPrompts = async () => {
  return typedDb.query.promptsPrimaryTable.findMany();
};

export const updatePrompt = async (id: bigint, data: Partial<InsertPromptPrimary>) => {
  return typedDb.update(schema.promptsPrimaryTable).set(data).where(eq(schema.promptsPrimaryTable.id, Number(id))).returning();
};

export const deletePrompt = async (id: bigint) => {
  return typedDb.delete(schema.promptsPrimaryTable).where(eq(schema.promptsPrimaryTable.id, Number(id)));
};
