"use server";

import { PrismaClient } from '@prisma/client';

// Create a Prisma client instance
const prisma = new PrismaClient();

export const createPackage = async (data: Omit<Package, 'id'>) => {
  return prisma.package.create({
    data,
  });
};

export const getPackageById = async (id: bigint) => {
  return prisma.package.findUnique({
    where: { id },
  });
};

export const getAllPackages = async () => {
  return prisma.package.findMany();
};

export const updatePackage = async (id: bigint, data: Partial<Omit<Package, 'id'>>) => {
  return prisma.package.update({
    where: { id },
    data,
  });
};

export const deletePackage = async (id: bigint) => {
  return prisma.package.delete({
    where: { id },
  });
};
