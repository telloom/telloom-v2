"use server";

import { eq } from "drizzle-orm";
import * as schema from "../schema";
import { InsertPromptResponseAdditionalFile } from "../schema/prompt_response_additional_files";
import { db } from '../db';

export const createPromptResponseAdditionalFile = async (data: InsertPromptResponseAdditionalFile) => {
  const result = await db.insert(schema.promptResponseAdditionalFilesTable).values(data).returning();
  return result[0];
};

export const getPromptResponseAdditionalFileById = async (id: string) => {
  return db.select().from(schema.promptResponseAdditionalFilesTable).where(eq(schema.promptResponseAdditionalFilesTable.id, id));
};

export const getAllPromptResponseAdditionalFiles = async () => {
  return db.select().from(schema.promptResponseAdditionalFilesTable);
};

export const updatePromptResponseAdditionalFile = async (id: string, data: Partial<InsertPromptResponseAdditionalFile>) => {
  return db.update(schema.promptResponseAdditionalFilesTable)
    .set(data)
    .where(eq(schema.promptResponseAdditionalFilesTable.id, id))
    .returning();
};

export const deletePromptResponseAdditionalFile = async (id: string) => {
  return db.delete(schema.promptResponseAdditionalFilesTable)
    .where(eq(schema.promptResponseAdditionalFilesTable.id, id));
};

export const getPromptResponseAdditionalFilesByUserId = async (userId: string) => {
  return db.select().from(schema.promptResponseAdditionalFilesTable)
    .where(eq(schema.promptResponseAdditionalFilesTable.userId, userId));
};