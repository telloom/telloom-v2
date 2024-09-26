"use server";

import { PrismaClient } from '@prisma/client';
import { cache } from 'react';

const prisma = new PrismaClient();

export const createPrompt = async (data: Omit<Prompt, 'id' | 'createdAt' | 'updatedAt'>) => {
  return prisma.prompt.create({
    data,
  });
};

export const getPromptById = async (id: string) => {
  return prisma.prompt.findUnique({
    where: { id },
  });
};

export const getAllPrompts = cache(async () => {
  return prisma.prompt.findMany();
});

export const updatePrompt = async (id: string, data: Partial<Omit<Prompt, 'id' | 'createdAt' | 'updatedAt'>>) => {
  return prisma.prompt.update({
    where: { id },
    data,
  });
};

export const deletePrompt = async (id: string) => {
  return prisma.prompt.delete({
    where: { id },
  });
};

export const getPromptsByCategory = async (categoryId: bigint) => {
  return prisma.prompt.findMany({
    where: { promptCategoryId: categoryId },
  });
};

export const getLatestPrompts = async (limit: number = 10) => {
  return prisma.prompt.findMany({
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
};
