"use server";

import { sql } from '@vercel/postgres';
import { drizzle } from 'drizzle-orm/vercel-postgres';
import { eq } from "drizzle-orm";
import * as schema from "../schema";
import { promptCategoryLinksTable } from "../schema";
import { InsertPromptCategoryLink, SelectPromptCategoryLink } from "../schema/prompt_category_links";

// Create a typed database instance
const typedDb = drizzle(sql, { schema });

export const createPromptCategoryLink = async (data: InsertPromptCategoryLink) => {
  return typedDb.insert(promptCategoryLinksTable).values(data).returning();
};

export const getPromptCategoryLinkById = async (id: bigint) => {
  return typedDb.query.promptCategoryLinksTable.findFirst({
    where: eq(promptCategoryLinksTable.id, Number(id)),
  });
};

export const getAllPromptCategoryLinks = async () => {
  return typedDb.query.promptCategoryLinksTable.findMany();
};

export const updatePromptCategoryLink = async (id: bigint, data: Partial<InsertPromptCategoryLink>) => {
  return typedDb.update(promptCategoryLinksTable).set(data).where(eq(promptCategoryLinksTable.id, Number(id))).returning();
};

export const deletePromptCategoryLink = async (id: bigint) => {
  return typedDb.delete(promptCategoryLinksTable).where(eq(promptCategoryLinksTable.id, Number(id)));
};
