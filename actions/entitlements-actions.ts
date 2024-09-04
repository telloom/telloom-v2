"use server";

import { createEntitlement, deleteEntitlement, getAllEntitlements, getEntitlementById, updateEntitlement } from "../db/queries/entitlements-queries";
import { ActionState } from "../types";
import { InsertEntitlement } from "../db/schema/entitlements"; // Adjust this import path if necessary
import { revalidatePath } from "next/cache";

export async function createEntitlementAction(data: InsertEntitlement): Promise<ActionState> {
  try {
    const newEntitlement = await createEntitlement(data);
    revalidatePath("/entitlements");
    return { status: "success", message: "Entitlement created successfully", data: newEntitlement };
  } catch (error) {
    return { status: "error", message: "Failed to create entitlement" };
  }
}

export async function updateEntitlementAction(id: bigint, data: Partial<InsertEntitlement>): Promise<ActionState> {
  try {
    const updatedEntitlement = await updateEntitlement(id, data);
    revalidatePath("/entitlements");
    return { status: "success", message: "Entitlement updated successfully", data: updatedEntitlement };
  } catch (error) {
    return { status: "error", message: "Failed to update entitlement" };
  }
}

export async function deleteEntitlementAction(id: bigint): Promise<ActionState> {
  try {
    await deleteEntitlement(id);
    revalidatePath("/entitlements");
    return { status: "success", message: "Entitlement deleted successfully" };
  } catch (error) {
    return { status: "error", message: "Failed to delete entitlement" };
  }
}

export async function getEntitlementByIdAction(id: bigint): Promise<ActionState> {
  try {
    const entitlement = await getEntitlementById(id);
    return { status: "success", message: "Entitlement retrieved successfully", data: entitlement };
  } catch (error) {
    return { status: "error", message: "Failed to retrieve entitlement" };
  }
}

export async function getAllEntitlementsAction(): Promise<ActionState> {
  try {
    const entitlements = await getAllEntitlements();
    return { status: "success", message: "Entitlements retrieved successfully", data: entitlements };
  } catch (error) {
    return { status: "error", message: "Failed to retrieve entitlements" };
  }
}