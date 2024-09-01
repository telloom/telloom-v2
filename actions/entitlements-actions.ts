"use server";

import { createEntitlement, deleteEntitlement, getAllEntitlements, getEntitlementById, updateEntitlement } from "@/db/queries/entitlements-queries";
import { ActionState } from "@/types";
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

// Other actions like updateEntitlementAction, deleteEntitlementAction, etc.