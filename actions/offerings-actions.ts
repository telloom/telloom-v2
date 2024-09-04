"use server";

import { createOffering, deleteOffering, getAllOfferings, getOfferingById, updateOffering } from "../db/queries/offerings-queries";
import { ActionState } from "../types";
import { InsertOffering } from "../db/schema/offerings";
import { revalidatePath } from "next/cache";

export async function createOfferingAction(data: InsertOffering): Promise<ActionState> {
  try {
    const newOffering = await createOffering(data);
    revalidatePath("/offerings");
    return { status: "success", message: "Offering created successfully", data: newOffering };
  } catch (error) {
    return { status: "error", message: "Failed to create offering" };
  }
}

export async function updateOfferingAction(id: bigint, data: Partial<InsertOffering>): Promise<ActionState> {
  try {
    const updatedOffering = await updateOffering(id, data);
    revalidatePath("/offerings");
    return { status: "success", message: "Offering updated successfully", data: updatedOffering };
  } catch (error) {
    return { status: "error", message: "Failed to update offering" };
  }
}

export async function deleteOfferingAction(id: bigint): Promise<ActionState> {
  try {
    await deleteOffering(id);
    revalidatePath("/offerings");
    return { status: "success", message: "Offering deleted successfully" };
  } catch (error) {
    return { status: "error", message: "Failed to delete offering" };
  }
}

export async function getOfferingByIdAction(id: bigint): Promise<ActionState> {
  try {
    const offering = await getOfferingById(id);
    return { status: "success", message: "Offering retrieved successfully", data: offering };
  } catch (error) {
    return { status: "error", message: "Failed to retrieve offering" };
  }
}

export async function getAllOfferingsAction(): Promise<ActionState> {
  try {
    const offerings = await getAllOfferings();
    return { status: "success", message: "Offerings retrieved successfully", data: offerings };
  } catch (error) {
    return { status: "error", message: "Failed to retrieve offerings" };
  }
}