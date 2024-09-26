"use server";

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const createPromptResponse = async (data: {
  userId: string;
  promptId: string;
  videoId: bigint;
  responseText?: string;
  privacyLevel?: string;
  airtableRecordId?: string;
  additionalFilesId?: string;
}) => {
  console.log('Inserting prompt response:', data);
  if (!data.userId || !data.promptId || !data.videoId) {
    throw new Error('userId, promptId, and videoId are required');
  }
  const result = await prisma.promptResponse.create({
    data: {
      userId: data.userId,
      promptId: data.promptId,
      videoId: data.videoId,
      responseText: data.responseText,
      privacyLevel: data.privacyLevel,
      airtableRecordId: data.airtableRecordId,
      additionalFilesId: data.additionalFilesId,
    },
  });
  console.log('Inserted prompt response:', result);
  return result;
};

export const getPromptResponseById = async (id: bigint) => {
  const result = await prisma.promptResponse.findUnique({
    where: { id },
    include: {
      prompt: true,
      video: true,
    },
  });

  return result;
};

export const getAllPromptResponses = async () => {
  return prisma.promptResponse.findMany();
};

export const updatePromptResponse = async (id: bigint, data: {
  responseText?: string;
  privacyLevel?: string;
  airtableRecordId?: string;
  additionalFilesId?: string;
}) => {
  return prisma.promptResponse.update({
    where: { id },
    data,
  });
};

export const deletePromptResponse = async (id: bigint) => {
  return prisma.promptResponse.delete({
    where: { id },
  });
};
