"use server";

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const createPromptCategory = async (data: { category?: string, description?: string, airtableId?: string }) => {
  return prisma.promptCategory.create({
    data: data
  });
};

export const getPromptCategoryById = async (id: bigint) => {
  return prisma.promptCategory.findUnique({
    where: { id: id }
  });
};

export const getAllPromptCategories = async () => {
  try {
    console.log('Executing getAllPromptCategories query...');
    const result = await prisma.promptCategory.findMany();
    console.log('Query executed successfully');
    console.log('getAllPromptCategories result:', result);
    return result;
  } catch (error) {
    console.error('Error in getAllPromptCategories:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    throw error;
  }
};

export const updatePromptCategory = async (id: bigint, data: { category?: string, description?: string, airtableId?: string }) => {
  return prisma.promptCategory.update({
    where: { id: id },
    data: data
  });
};

export const deletePromptCategory = async (id: bigint) => {
  return prisma.promptCategory.delete({
    where: { id: id }
  });
};

export const testDatabaseConnection = async () => {
  try {
    const result = await prisma.promptCategory.findFirst();
    console.log('Test query result:', result);
    return true;
  } catch (error) {
    console.error('Test query failed:', error);
    return false;
  }
};
