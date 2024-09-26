"use server";

import { PrismaClient } from '@prisma/client';

// Create a Prisma client instance
const prisma = new PrismaClient();

export const createVideoTranscript = async (data: {
  videoId?: bigint | null;
  transcript: string;
}) => {
  return prisma.videoTranscript.create({
    data: data,
  });
};

export const getVideoTranscriptById = async (id: bigint) => {
  return prisma.videoTranscript.findUnique({
    where: { id: id },
  });
};

export const getAllVideoTranscripts = async () => {
  return prisma.videoTranscript.findMany();
};

export const updateVideoTranscript = async (id: bigint, data: {
  videoId?: bigint | null;
  transcript?: string;
}) => {
  return prisma.videoTranscript.update({
    where: { id: id },
    data: data,
  });
};

export const deleteVideoTranscript = async (id: bigint) => {
  return prisma.videoTranscript.delete({
    where: { id: id },
  });
};
