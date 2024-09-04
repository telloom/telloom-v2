import { sql } from '@vercel/postgres';
import { drizzle } from 'drizzle-orm/vercel-postgres';
import * as schema from "../schema";
import { eq } from "drizzle-orm";
import { InsertPromptResponseAdditionalFile, promptResponseAdditionalFilesTable } from "../schema/prompt_response_additional_files";

const db = drizzle(sql, { schema });

export const createPromptResponseAdditionalFile = async (data: InsertPromptResponseAdditionalFile) => {
  const result = await db.insert(promptResponseAdditionalFilesTable).values(data).returning();
  return result[0];
};

export const getPromptResponseAdditionalFileById = async (id: string) => {
  return db.query.promptResponseAdditionalFilesTable.findFirst({
    where: eq(promptResponseAdditionalFilesTable.id, id),
  });
};

export const getAllPromptResponseAdditionalFiles = async () => {
  return db.query.promptResponseAdditionalFilesTable.findMany();
};

export const updatePromptResponseAdditionalFile = async (id: string, data: Partial<InsertPromptResponseAdditionalFile>) => {
  return db.update(promptResponseAdditionalFilesTable)
    .set(data)
    .where(eq(promptResponseAdditionalFilesTable.id, id))
    .returning();
};

export const deletePromptResponseAdditionalFile = async (id: string) => {
  return db.delete(promptResponseAdditionalFilesTable)
    .where(eq(promptResponseAdditionalFilesTable.id, id));
};

export const getPromptResponseAdditionalFilesByUserId = async (userId: string) => {
  return db.query.promptResponseAdditionalFilesTable.findMany({
    where: eq(promptResponseAdditionalFilesTable.userId, userId),
  });
};