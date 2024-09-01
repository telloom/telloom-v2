"use server";

import { createPackage, deletePackage, getAllPackages, getPackageById, updatePackage } from "@/db/queries/packages-queries";
import { ActionState } from "@/types";
import { revalidatePath } from "next/cache";

export async function createPackageAction(data: InsertPackage): Promise<ActionState> {
  try {
    const newPackage = await createPackage(data);
    revalidatePath("/packages");
    return { status: "success", message: "Package created successfully", data: newPackage };
  } catch (error) {
    return { status: "error", message: "Failed to create package" };
  }
}

export async function updatePackageAction(id: bigint, data: Partial<InsertPackage>): Promise<ActionState> {
  try {
    const updatedPackage = await updatePackage(id, data);
    revalidatePath("/packages");
    return { status: "success", message: "Package updated successfully", data: updatedPackage };
  } catch (error) {
    return { status: "error", message: "Failed to update package" };
  }
}

export async function deletePackageAction(id: bigint): Promise<ActionState> {
  try {
    await deletePackage(id);
    revalidatePath("/packages");
    return { status: "success", message: "Package deleted successfully" };
  } catch (error) {
    return { status: "error", message: "Failed to delete package" };
  }
}

export async function getPackageByIdAction(id: bigint): Promise<ActionState> {
  try {
    const package = await getPackageById(id);
    return { status: "success", message: "Package retrieved successfully", data: package };
  } catch (error) {
    return { status: "error", message: "Failed to retrieve package" };
  }
}

export async function getAllPackagesAction(): Promise<ActionState> {
  try {
    const packages = await getAllPackages();
    return { status: "success", message: "Packages retrieved successfully", data: packages };
  } catch (error) {
    return { status: "error", message: "Failed to retrieve packages" };
  }
}