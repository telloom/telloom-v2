"use server";

import { PrismaClient } from '@prisma/client';

// Create a Prisma client instance
const prisma = new PrismaClient();

export const createSubscriptionEntitlement = async (data: {
  subscriptionId: bigint;
  entitlementId: bigint;
}) => {
  return prisma.subscriptionEntitlement.create({
    data: data,
  });
};

export const getSubscriptionEntitlementById = async (id: bigint) => {
  return prisma.subscriptionEntitlement.findUnique({
    where: { id: id },
  });
};

export const getAllSubscriptionEntitlements = async () => {
  return prisma.subscriptionEntitlement.findMany();
};

export const updateSubscriptionEntitlement = async (id: bigint, data: {
  subscriptionId?: bigint;
  entitlementId?: bigint;
}) => {
  return prisma.subscriptionEntitlement.update({
    where: { id: id },
    data: data,
  });
};

export const deleteSubscriptionEntitlement = async (id: bigint) => {
  return prisma.subscriptionEntitlement.delete({
    where: { id: id },
  });
};
