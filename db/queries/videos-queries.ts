"use server";

import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

export const createVideo = async (data: Omit<Prisma.VideoCreateInput, 'id'>) => {
  return prisma.video.create({
    data: data,
  });
};

export const getVideoById = async (id: bigint) => {
  return prisma.video.findUnique({
    where: { id: id },
  });
};

export const getAllVideos = async () => {
  return prisma.video.findMany();
};

export const updateVideo = async (id: bigint, data: Partial<Prisma.VideoUpdateInput>) => {
  return prisma.video.update({
    where: { id: id },
    data: data,
  });
};

export const deleteVideo = async (id: bigint) => {
  return prisma.video.delete({
    where: { id: id },
  });
};

export const getVideoByMuxUploadId = async (muxUploadId: string) => {
  return prisma.video.findFirst({
    where: { muxUploadId: muxUploadId },
  });
};
