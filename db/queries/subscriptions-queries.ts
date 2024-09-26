"use server";

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const createSubscription = async (data: Omit<Subscription, 'id'>) => {
  return prisma.subscription.create({
    data,
  });
};

export const getSubscriptionById = async (id: bigint) => {
  return prisma.subscription.findUnique({
    where: { id },
  });
};

export const getAllSubscriptions = async () => {
  return prisma.subscription.findMany();
};

export const updateSubscription = async (id: bigint, data: Partial<Omit<Subscription, 'id'>>) => {
  return prisma.subscription.update({
    where: { id },
    data,
  });
};

export const deleteSubscription = async (id: bigint) => {
  return prisma.subscription.delete({
    where: { id },
  });
};
