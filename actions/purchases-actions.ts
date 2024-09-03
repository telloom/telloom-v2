"use server";

import { createPurchase, deletePurchase, getAllPurchases, getPurchaseById, updatePurchase } from "@/db/queries/purchases-queries";
import { ActionState } from "@/types";
import { InsertPurchase } from "@/db/schema/purchases"; // Add this import
import { revalidatePath } from "next/cache";

export async function createPurchaseAction(data: InsertPurchase): Promise<ActionState> {
  try {
    const newPurchase = await createPurchase(data);
    revalidatePath("/purchases");
    return { status: "success", message: "Purchase created successfully", data: newPurchase };
  } catch (error) {
    return { status: "error", message: "Failed to create purchase" };
  }
}

export async function updatePurchaseAction(id: bigint, data: Partial<InsertPurchase>): Promise<ActionState> {
  try {
    const updatedPurchase = await updatePurchase(id, data);
    revalidatePath("/purchases");
    return { status: "success", message: "Purchase updated successfully", data: updatedPurchase };
  } catch (error) {
    return { status: "error", message: "Failed to update purchase" };
  }
}

export async function deletePurchaseAction(id: bigint): Promise<ActionState> {
  try {
    await deletePurchase(id);
    revalidatePath("/purchases");
    return { status: "success", message: "Purchase deleted successfully" };
  } catch (error) {
    return { status: "error", message: "Failed to delete purchase" };
  }
}

export async function getPurchaseByIdAction(id: bigint): Promise<ActionState> {
  try {
    const purchase = await getPurchaseById(id);
    return { status: "success", message: "Purchase retrieved successfully", data: purchase };
  } catch (error) {
    return { status: "error", message: "Failed to retrieve purchase" };
  }
}

export async function getAllPurchasesAction(): Promise<ActionState> {
  try {
    const purchases = await getAllPurchases();
    return { status: "success", message: "Purchases retrieved successfully", data: purchases };
  } catch (error) {
    return { status: "error", message: "Failed to retrieve purchases" };
  }
}