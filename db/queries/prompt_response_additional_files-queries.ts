"use server";

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const createPromptResponseAdditionalFile = async (data: {
  fileName: string;
  fileUrl: string;
  userId?: string;
  fileSize?: bigint;
  fileType?: string;
}) => {
  return prisma.promptResponseAdditionalFile.create({
    data,
  });
};

export const getPromptResponseAdditionalFileById = async (id: string) => {
  return prisma.promptResponseAdditionalFile.findUnique({
    where: { id },
  });
};

export const getAllPromptResponseAdditionalFiles = async () => {
  return prisma.promptResponseAdditionalFile.findMany();
};

export const updatePromptResponseAdditionalFile = async (id: string, data: {
  fileName?: string;
  fileUrl?: string;
  userId?: string;
  fileSize?: bigint;
  fileType?: string;
}) => {
  return prisma.promptResponseAdditionalFile.update({
    where: { id },
    data,
  });
};

export const deletePromptResponseAdditionalFile = async (id: string) => {
  return prisma.promptResponseAdditionalFile.delete({
    where: { id },
  });
};

export const getPromptResponseAdditionalFilesByUserId = async (userId: string) => {
  return prisma.promptResponseAdditionalFile.findMany({
    where: { userId },
  });
};