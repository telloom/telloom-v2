"use server";

import { PrismaClient } from '@prisma/client';
import { ActionState } from '../types/action-types';
import { revalidatePath } from "next/cache";

const prisma = new PrismaClient();

/**
 * Create a new entitlement.
 */
export async function createEntitlementAction(data: {
  userId: string;
  productId: bigint;
  // Add other fields as necessary
}): Promise<ActionState> {
  try {
    const newEntitlement = await prisma.entitlement.create({
      data: data,
    });
    revalidatePath("/entitlements");
    return { status: "success", message: "Entitlement created successfully", data: newEntitlement };
  } catch (error) {
    console.error("Failed to create entitlement:", error);
    return { status: "error", message: "Failed to create entitlement" };
  }
}

/**
 * Update an existing entitlement.
 */
export async function updateEntitlementAction(id: bigint, data: Partial<{
  productId?: bigint;
  // Add other fields as necessary
}>): Promise<ActionState> {
  try {
    const updatedEntitlement = await prisma.entitlement.update({
      where: { id: id },
      data: data,
    });
    revalidatePath("/entitlements");
    return { status: "success", message: "Entitlement updated successfully", data: updatedEntitlement };
  } catch (error) {
    console.error("Failed to update entitlement:", error);
    return { status: "error", message: "Failed to update entitlement" };
  }
}

/**
 * Delete an entitlement.
 */
export async function deleteEntitlementAction(id: bigint): Promise<ActionState> {
  try {
    await prisma.entitlement.delete({
      where: { id: id },
    });
    revalidatePath("/entitlements");
    return { status: "success", message: "Entitlement deleted successfully" };
  } catch (error) {
    console.error("Failed to delete entitlement:", error);
    return { status: "error", message: "Failed to delete entitlement" };
  }
}

/**
 * Get an entitlement by ID.
 */
export async function getEntitlementByIdAction(id: bigint): Promise<ActionState> {
  try {
    const entitlement = await prisma.entitlement.findUnique({
      where: { id: id },
    });
    if (entitlement) {
      return { status: "success", message: "Entitlement retrieved successfully", data: entitlement };
    } else {
      return { status: "error", message: "Entitlement not found" };
    }
  } catch (error) {
    console.error("Failed to retrieve entitlement:", error);
    return { status: "error", message: "Failed to retrieve entitlement" };
  }
}

/**
 * Get all entitlements.
 */
export async function getAllEntitlementsAction(): Promise<ActionState> {
  try {
    const entitlements = await prisma.entitlement.findMany();
    return { status: "success", message: "Entitlements retrieved successfully", data: entitlements };
  } catch (error) {
    console.error("Failed to retrieve entitlements:", error);
    return { status: "error", message: "Failed to retrieve entitlements" };
  }
}