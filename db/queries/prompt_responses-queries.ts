"use server";

import { sql } from '@vercel/postgres';
import { drizzle } from 'drizzle-orm/vercel-postgres';
import * as schema from "../schema";
import { eq } from "drizzle-orm";
import { InsertPromptResponse, SelectPromptResponse } from "../schema/prompt_responses";

// Create a typed database instance
const typedDb = drizzle(sql, { schema });

export const createPromptResponse = async (data: InsertPromptResponse) => {
  return typedDb.insert(schema.promptResponsesTable).values(data).returning();
};

export const getPromptResponseById = async (id: bigint) => {
  return typedDb.query.promptResponsesTable.findFirst({
    where: eq(schema.promptResponsesTable.id, Number(id)),
  });
};

export const getAllPromptResponses = async () => {
  return typedDb.query.promptResponsesTable.findMany();
};

export const updatePromptResponse = async (id: bigint, data: Partial<InsertPromptResponse>) => {
  return typedDb.update(schema.promptResponsesTable).set(data).where(eq(schema.promptResponsesTable.id, Number(id))).returning();
};

export const deletePromptResponse = async (id: bigint) => {
  return typedDb.delete(schema.promptResponsesTable).where(eq(schema.promptResponsesTable.id, Number(id)));
};
