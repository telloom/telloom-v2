"use server";

import { PrismaClient } from '@prisma/client';

// Create a Prisma client instance
const prisma = new PrismaClient();

export const createProduct = async (data: Omit<Product, 'id'>) => {
  return prisma.product.create({
    data,
  });
};

export const getProductById = async (id: bigint) => {
  return prisma.product.findUnique({
    where: { id },
  });
};

export const getAllProducts = async () => {
  return prisma.product.findMany();
};

export const updateProduct = async (id: bigint, data: Partial<Omit<Product, 'id'>>) => {
  return prisma.product.update({
    where: { id },
    data,
  });
};

export const deleteProduct = async (id: bigint) => {
  return prisma.product.delete({
    where: { id },
  });
};
