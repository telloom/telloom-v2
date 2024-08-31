"use server";

import { sql } from '@vercel/postgres';
import { drizzle } from 'drizzle-orm/vercel-postgres';
import * as schema from "../schema";
import { eq } from "drizzle-orm";
import { InsertSubscriptionEntitlement, SelectSubscriptionEntitlement } from "../schema/subscription_entitlements";

// Create a typed database instance
const typedDb = drizzle(sql, { schema });

export const createSubscriptionEntitlement = async (data: InsertSubscriptionEntitlement) => {
  return typedDb.insert(schema.subscriptionEntitlementsTable).values(data).returning();
};

export const getSubscriptionEntitlementById = async (id: bigint) => {
  return typedDb.query.subscriptionEntitlementsTable.findFirst({
    where: eq(schema.subscriptionEntitlementsTable.id, Number(id)),
  });
};

export const getAllSubscriptionEntitlements = async () => {
  return typedDb.query.subscriptionEntitlementsTable.findMany();
};

export const updateSubscriptionEntitlement = async (id: bigint, data: Partial<InsertSubscriptionEntitlement>) => {
  return typedDb.update(schema.subscriptionEntitlementsTable).set(data).where(eq(schema.subscriptionEntitlementsTable.id, Number(id))).returning();
};

export const deleteSubscriptionEntitlement = async (id: bigint) => {
  return typedDb.delete(schema.subscriptionEntitlementsTable).where(eq(schema.subscriptionEntitlementsTable.id, Number(id)));
};
