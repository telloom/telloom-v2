"use server";

import { PrismaClient } from '@prisma/client';

// Create a Prisma client instance
const prisma = new PrismaClient();

export const createProfile = async (data: Omit<Profile, 'id'>) => {
  return prisma.profile.create({
    data,
  });
};

export const getProfileById = async (id: string) => {
  return prisma.profile.findUnique({
    where: { id },
  });
};

export const getAllProfiles = async () => {
  return prisma.profile.findMany();
};

export const updateProfile = async (id: string, data: Partial<Omit<Profile, 'id'>>) => {
  return prisma.profile.update({
    where: { id },
    data,
  });
};

export const deleteProfile = async (id: string) => {
  return prisma.profile.delete({
    where: { id },
  });
};
