"use server";

import { PrismaClient } from '@prisma/client';
import { ActionState } from '../types/action-types';
import { revalidatePath } from "next/cache";

const prisma = new PrismaClient();

/**
 * Create a new offering.
 */
export async function createOfferingAction(data: {
  title: string;
  description?: string;
  price: number;
  // Add other fields as necessary
}): Promise<ActionState> {
  try {
    const newOffering = await prisma.offering.create({
      data: data,
    });
    revalidatePath("/offerings");
    return { status: "success", message: "Offering created successfully", data: newOffering };
  } catch (error) {
    console.error("Failed to create offering:", error);
    return { status: "error", message: "Failed to create offering" };
  }
}

/**
 * Update an existing offering.
 */
export async function updateOfferingAction(id: bigint, data: Partial<{
  title?: string;
  description?: string;
  price?: number;
  // Add other fields as necessary
}>): Promise<ActionState> {
  try {
    const updatedOffering = await prisma.offering.update({
      where: { id: id },
      data: data,
    });
    revalidatePath("/offerings");
    return { status: "success", message: "Offering updated successfully", data: updatedOffering };
  } catch (error) {
    console.error("Failed to update offering:", error);
    return { status: "error", message: "Failed to update offering" };
  }
}

/**
 * Delete an offering.
 */
export async function deleteOfferingAction(id: bigint): Promise<ActionState> {
  try {
    await prisma.offering.delete({
      where: { id: id },
    });
    revalidatePath("/offerings");
    return { status: "success", message: "Offering deleted successfully" };
  } catch (error) {
    console.error("Failed to delete offering:", error);
    return { status: "error", message: "Failed to delete offering" };
  }
}

/**
 * Get an offering by ID.
 */
export async function getOfferingByIdAction(id: bigint): Promise<ActionState> {
  try {
    const offering = await prisma.offering.findUnique({
      where: { id: id },
    });
    if (offering) {
      return { status: "success", message: "Offering retrieved successfully", data: offering };
    } else {
      return { status: "error", message: "Offering not found" };
    }
  } catch (error) {
    console.error("Failed to retrieve offering:", error);
    return { status: "error", message: "Failed to retrieve offering" };
  }
}

/**
 * Get all offerings.
 */
export async function getAllOfferingsAction(): Promise<ActionState> {
  try {
    const offerings = await prisma.offering.findMany();
    return { status: "success", message: "Offerings retrieved successfully", data: offerings };
  } catch (error) {
    console.error("Failed to retrieve offerings:", error);
    return { status: "error", message: "Failed to retrieve offerings" };
  }
}