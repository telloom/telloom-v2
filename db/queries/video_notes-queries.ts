"use server";

import { PrismaClient } from '@prisma/client';

// Create a Prisma client instance
const prisma = new PrismaClient();

export const createVideoNote = async (data: {
  videoId: number;
  content: string;
}) => {
  return prisma.videoNote.create({
    data: data,
  });
};

export const getVideoNoteById = async (id: number) => {
  return prisma.videoNote.findUnique({
    where: { id: id },
  });
};

export const getAllVideoNotes = async () => {
  return prisma.videoNote.findMany();
};

export const updateVideoNote = async (id: number, data: {
  content?: string;
}) => {
  return prisma.videoNote.update({
    where: { id: id },
    data: data,
  });
};

export const deleteVideoNote = async (id: number) => {
  return prisma.videoNote.delete({
    where: { id: id },
  });
};
