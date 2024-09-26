"use server";

import { PrismaClient } from '@prisma/client';

// Create a Prisma client instance
const prisma = new PrismaClient();

export const createEntitlement = async (data: Omit<Entitlement, 'id' | 'createdAt' | 'updatedAt'>) => {
  return prisma.entitlement.create({
    data,
  });
};

export const getEntitlementById = async (id: bigint) => {
  return prisma.entitlement.findUnique({
    where: { id },
  });
};

export const getAllEntitlements = async () => {
  return prisma.entitlement.findMany();
};

export const updateEntitlement = async (id: bigint, data: Partial<Omit<Entitlement, 'id' | 'createdAt' | 'updatedAt'>>) => {
  return prisma.entitlement.update({
    where: { id },
    data,
  });
};

export const deleteEntitlement = async (id: bigint) => {
  return prisma.entitlement.delete({
    where: { id },
  });
};
