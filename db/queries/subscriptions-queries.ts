"use server";

import { sql } from '@vercel/postgres';
import { drizzle } from 'drizzle-orm/vercel-postgres';
import * as schema from "../schema";
import { eq } from "drizzle-orm";
import { InsertSubscription, SelectSubscription } from "../schema/subscriptions";

// Create a typed database instance
const typedDb = drizzle(sql, { schema });

export const createSubscription = async (data: InsertSubscription) => {
  return typedDb.insert(schema.subscriptionsTable).values(data).returning();
};

export const getSubscriptionById = async (id: bigint) => {
  return typedDb.query.subscriptionsTable.findFirst({
    where: eq(schema.subscriptionsTable.id, Number(id)),
  });
};

export const getAllSubscriptions = async () => {
  return typedDb.query.subscriptionsTable.findMany();
};

export const updateSubscription = async (id: bigint, data: Partial<InsertSubscription>) => {
  return typedDb.update(schema.subscriptionsTable).set(data).where(eq(schema.subscriptionsTable.id, Number(id))).returning();
};

export const deleteSubscription = async (id: bigint) => {
  return typedDb.delete(schema.subscriptionsTable).where(eq(schema.subscriptionsTable.id, Number(id)));
};
