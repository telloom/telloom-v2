"use server";

import { PrismaClient } from '@prisma/client';

// Create a Prisma client instance
const prisma = new PrismaClient();

export const createPromptCategoryLink = async (data: {
  airtableId?: string | null;
  promptAirtableId?: string | null;
  categoryAirtableId?: string | null;
}) => {
  return prisma.promptCategoryLink.create({
    data: data,
  });
};

export const getPromptCategoryLinkById = async (id: bigint) => {
  return prisma.promptCategoryLink.findUnique({
    where: { id: id },
  });
};

export const getAllPromptCategoryLinks = async () => {
  return prisma.promptCategoryLink.findMany();
};

export const updatePromptCategoryLink = async (id: bigint, data: {
  airtableId?: string | null;
  promptAirtableId?: string | null;
  categoryAirtableId?: string | null;
}) => {
  return prisma.promptCategoryLink.update({
    where: { id: id },
    data: data,
  });
};

export const deletePromptCategoryLink = async (id: bigint) => {
  return prisma.promptCategoryLink.delete({
    where: { id: id },
  });
};
