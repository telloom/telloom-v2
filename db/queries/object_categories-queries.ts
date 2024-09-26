"use server";

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const createObjectCategory = async (data: Omit<ObjectCategory, 'id'>) => {
  return prisma.objectCategory.create({
    data,
  });
};

export const getObjectCategoryById = async (id: bigint) => {
  return prisma.objectCategory.findUnique({
    where: { id },
  });
};

export const getAllObjectCategories = async () => {
  return prisma.objectCategory.findMany();
};

export const updateObjectCategory = async (id: bigint, data: Partial<Omit<ObjectCategory, 'id'>>) => {
  return prisma.objectCategory.update({
    where: { id },
    data,
  });
};

export const deleteObjectCategory = async (id: bigint) => {
  return prisma.objectCategory.delete({
    where: { id },
  });
};
