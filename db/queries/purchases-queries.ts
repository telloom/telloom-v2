"use server";

import { PrismaClient } from '@prisma/client';

// Create a Prisma client instance
const prisma = new PrismaClient();

export const createPurchase = async (data: Omit<Purchase, 'id'>) => {
  return prisma.purchase.create({
    data,
  });
};

export const getPurchaseById = async (id: bigint) => {
  return prisma.purchase.findUnique({
    where: { id },
  });
};

export const getAllPurchases = async () => {
  return prisma.purchase.findMany();
};

export const updatePurchase = async (id: bigint, data: Partial<Omit<Purchase, 'id'>>) => {
  return prisma.purchase.update({
    where: { id },
    data,
  });
};

export const deletePurchase = async (id: bigint) => {
  return prisma.purchase.delete({
    where: { id },
  });
};
