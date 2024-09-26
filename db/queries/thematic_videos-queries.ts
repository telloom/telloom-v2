"use server";

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const createThematicVideo = async (data: {
  title: string;
  description?: string | null;
  url: string;
  metadata?: any | null;
}) => {
  return prisma.thematicVideo.create({
    data: data,
  });
};

export const getThematicVideoById = async (id: bigint) => {
  return prisma.thematicVideo.findUnique({
    where: { id: id },
  });
};

export const getAllThematicVideos = async () => {
  return prisma.thematicVideo.findMany();
};

export const updateThematicVideo = async (id: bigint, data: {
  title?: string;
  description?: string | null;
  url?: string;
  metadata?: any | null;
}) => {
  return prisma.thematicVideo.update({
    where: { id: id },
    data: data,
  });
};

export const deleteThematicVideo = async (id: bigint) => {
  return prisma.thematicVideo.delete({
    where: { id: id },
  });
};
