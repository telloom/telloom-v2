"use server";

import { PrismaClient } from '@prisma/client';
import { ActionState } from '../types/action-types';
import { revalidatePath } from "next/cache";

const prisma = new PrismaClient();

/**
 * Create a new package.
 */
export async function createPackageAction(data: {
  // Define the required fields based on your Prisma schema
  name: string;
  description?: string;
  // Add other fields as necessary
}): Promise<ActionState> {
  try {
    const newPackage = await prisma.package.create({
      data: data,
    });
    revalidatePath("/packages");
    return { status: "success", message: "Package created successfully", data: newPackage };
  } catch (error) {
    console.error("Failed to create package:", error);
    return { status: "error", message: "Failed to create package" };
  }
}

/**
 * Update an existing package.
 */
export async function updatePackageAction(id: bigint, data: Partial<{
  name: string;
  description?: string;
  // Add other fields as necessary
}>): Promise<ActionState> {
  try {
    const updatedPackage = await prisma.package.update({
      where: { id: id },
      data: data,
    });
    revalidatePath("/packages");
    return { status: "success", message: "Package updated successfully", data: updatedPackage };
  } catch (error) {
    console.error("Failed to update package:", error);
    return { status: "error", message: "Failed to update package" };
  }
}

/**
 * Delete a package.
 */
export async function deletePackageAction(id: bigint): Promise<ActionState> {
  try {
    await prisma.package.delete({
      where: { id: id },
    });
    revalidatePath("/packages");
    return { status: "success", message: "Package deleted successfully" };
  } catch (error) {
    console.error("Failed to delete package:", error);
    return { status: "error", message: "Failed to delete package" };
  }
}

/**
 * Get a package by ID.
 */
export async function getPackageByIdAction(id: bigint): Promise<ActionState> {
  try {
    const packageData = await prisma.package.findUnique({
      where: { id: id },
    });
    if (packageData) {
      return { status: "success", message: "Package retrieved successfully", data: packageData };
    } else {
      return { status: "error", message: "Package not found" };
    }
  } catch (error) {
    console.error("Failed to retrieve package:", error);
    return { status: "error", message: "Failed to retrieve package" };
  }
}

/**
 * Get all packages.
 */
export async function getAllPackagesAction(): Promise<ActionState> {
  try {
    const packages = await prisma.package.findMany();
    return { status: "success", message: "Packages retrieved successfully", data: packages };
  } catch (error) {
    console.error("Failed to retrieve packages:", error);
    return { status: "error", message: "Failed to retrieve packages" };
  }
}