"use server";

import { sql } from '@vercel/postgres';
import { drizzle } from 'drizzle-orm/vercel-postgres';
import * as schema from "../schema";
import { eq } from "drizzle-orm";
import { InsertPromptResponse } from "../schema/prompt_responses";

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