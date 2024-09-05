"use server";

import { sql } from '@vercel/postgres';
import { drizzle } from 'drizzle-orm/vercel-postgres';
import * as schema from "../schema";
import { eq } from "drizzle-orm";
import { InsertPromptResponse, SelectPromptResponse, promptResponsesTable } from "../schema/prompt_responses";
import { PromptPrimary } from "../schema/prompts_primary";
import { Video } from "../schema/videos";

const typedDb = drizzle(sql, { schema });

export const createPromptResponse = async (data: InsertPromptResponse) => {
  console.log('Inserting prompt response:', data);
  if (!data.userId || !data.promptId || !data.videoId) {
    throw new Error('userId, promptId, and videoId are required');
  }
  const result = await typedDb.insert(promptResponsesTable).values(data).returning();
  console.log('Inserted prompt response:', result);
  return result[0];
};

// ... other existing queries ...

export const getPromptResponseById = async (id: bigint): Promise<(SelectPromptResponse & { prompt: PromptPrimary | null, video: Video | null }) | null> => {
  const result = await typedDb.query.promptResponsesTable.findFirst({
    where: eq(schema.promptResponsesTable.id, Number(id)),
    with: {
      prompt: true,
      video: true,
    },
  });

  return result ?? null;
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
