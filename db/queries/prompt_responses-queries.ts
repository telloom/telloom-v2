"use server";

import { sql } from '@vercel/postgres';
import { drizzle } from 'drizzle-orm/vercel-postgres';
import * as schema from "../schema";
import { eq } from "drizzle-orm";
import { InsertPromptResponse } from "../schema/prompt_responses";
import { SelectPromptResponse } from "../schema/prompt_responses";
import { Prompt } from "../schema/prompts";
import { Video } from "../schema/videos";

// Create a typed database instance
const typedDb = drizzle(sql, { schema });

export const createPromptResponse = async (data: InsertPromptResponse) => {
  console.log('Inserting prompt response:', data);
  if (!data.userId || !data.promptId) {
    throw new Error('userId and promptId are required');
  }
  const result = await typedDb.insert(schema.promptResponsesTable).values(data).returning();
  console.log('Inserted prompt response:', result);
  return result[0];
};

// ... other existing queries ...

export const getPromptResponseById = async (id: bigint): Promise<(SelectPromptResponse & { prompt: Prompt | null, video: Video | null }) | null> => {
  return typedDb.query.promptResponsesTable.findFirst({
    where: eq(schema.promptResponsesTable.id, Number(id)),
    with: {
      prompt: true,
      video: true,
    },
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
