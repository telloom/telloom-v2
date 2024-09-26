"use server";

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const createObjectCategoryLink = async (data: {
  objectId?: bigint | null;
  categoryId?: bigint | null;
  airtableRecordId?: string | null;
}) => {
  return prisma.objectCategoryLink.create({
    data: data,
  });
};

export const getObjectCategoryLinkById = async (id: bigint) => {
  return prisma.objectCategoryLink.findUnique({
    where: { id: id },
  });
};

export const getAllObjectCategoryLinks = async () => {
  return prisma.objectCategoryLink.findMany();
};

export const updateObjectCategoryLink = async (id: bigint, data: {
  objectId?: bigint | null;
  categoryId?: bigint | null;
  airtableRecordId?: string | null;
}) => {
  return prisma.objectCategoryLink.update({
    where: { id: id },
    data: data,
  });
};

export const deleteObjectCategoryLink = async (id: bigint) => {
  return prisma.objectCategoryLink.delete({
    where: { id: id },
  });
};
