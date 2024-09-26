"use server";

import { PrismaClient } from '@prisma/client';

// Create a Prisma client instance
const prisma = new PrismaClient();

export const createOffering = async (data: Omit<Offering, 'id'>) => {
  return prisma.offering.create({
    data,
  });
};

export const getOfferingById = async (id: bigint) => {
  return prisma.offering.findUnique({
    where: { id },
  });
};

export const getAllOfferings = async () => {
  return prisma.offering.findMany();
};

export const updateOffering = async (id: bigint, data: Partial<Omit<Offering, 'id'>>) => {
  return prisma.offering.update({
    where: { id },
    data,
  });
};

export const deleteOffering = async (id: bigint) => {
  return prisma.offering.delete({
    where: { id },
  });
};
