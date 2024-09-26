"use server";

import { PrismaClient } from '@prisma/client';

// Create a Prisma client instance
const prisma = new PrismaClient();

export const createObject = async (data: Omit<Object, 'id' | 'createdAt' | 'updatedAt'>) => {
  return prisma.object.create({
    data: data,
  });
};

export const getObjectById = async (id: bigint) => {
  return prisma.object.findUnique({
    where: { id: id },
  });
};

export const getAllObjects = async () => {
  return prisma.object.findMany();
};

export const updateObject = async (id: bigint, data: Partial<Omit<Object, 'id' | 'createdAt' | 'updatedAt'>>) => {
  return prisma.object.update({
    where: { id: id },
    data: data,
  });
};

export const deleteObject = async (id: bigint) => {
  return prisma.object.delete({
    where: { id: id },
  });
};
