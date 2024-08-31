"use server";

import { sql } from '@vercel/postgres';
import { drizzle } from 'drizzle-orm/vercel-postgres';
import * as schema from "../schema";
import { eq } from "drizzle-orm";
import { InsertPrompt, SelectPrompt } from "../schema/prompts";

// Create a typed database instance
const typedDb = drizzle(sql, { schema });

export const createPrompt = async (data: InsertPrompt) => {
  return typedDb.insert(schema.promptsTable).values(data).returning();
};

export const getPromptById = async (id: bigint) => {
  return typedDb.query.promptsTable.findFirst({
    where: eq(schema.promptsTable.id, Number(id)),
  });
};

export const getAllPrompts = async () => {
  return typedDb.query.promptsTable.findMany();
};

export const updatePrompt = async (id: bigint, data: Partial<InsertPrompt>) => {
  return typedDb.update(schema.promptsTable).set(data).where(eq(schema.promptsTable.id, Number(id))).returning();
};

export const deletePrompt = async (id: bigint) => {
  return typedDb.delete(schema.promptsTable).where(eq(schema.promptsTable.id, Number(id)));
};
