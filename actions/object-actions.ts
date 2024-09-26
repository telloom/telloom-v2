"use server";

import { PrismaClient } from '@prisma/client';
import { ActionState } from '../types/action-types';
import { revalidatePath } from "next/cache";

const prisma = new PrismaClient();

/**
 * Create a new object.
 */
export async function createObjectAction(data: {
  name: string;
  description?: string;
  // Add other fields as necessary
}): Promise<ActionState> {
  try {
    const newObject = await prisma.object.create({
      data: data,
    });
    revalidatePath("/objects");
    return { status: "success", message: "Object created successfully", data: newObject };
  } catch (error) {
    console.error("Failed to create object:", error);
    return { status: "error", message: "Failed to create object" };
  }
}

/**
 * Update an existing object.
 */
export async function updateObjectAction(id: bigint, data: Partial<{
  name: string;
  description?: string;
  // Add other fields as necessary
}>): Promise<ActionState> {
  try {
    const updatedObject = await prisma.object.update({
      where: { id: id },
      data: data,
    });
    revalidatePath("/objects");
    return { status: "success", message: "Object updated successfully", data: updatedObject };
  } catch (error) {
    console.error("Failed to update object:", error);
    return { status: "error", message: "Failed to update object" };
  }
}

/**
 * Delete an object.
 */
export async function deleteObjectAction(id: bigint): Promise<ActionState> {
  try {
    await prisma.object.delete({
      where: { id: id },
    });
    revalidatePath("/objects");
    return { status: "success", message: "Object deleted successfully" };
  } catch (error) {
    console.error("Failed to delete object:", error);
    return { status: "error", message: "Failed to delete object" };
  }
}

/**
 * Get an object by ID.
 */
export async function getObjectByIdAction(id: bigint): Promise<ActionState> {
  try {
    const object = await prisma.object.findUnique({
      where: { id: id },
    });
    if (object) {
      return { status: "success", message: "Object retrieved successfully", data: object };
    } else {
      return { status: "error", message: "Object not found" };
    }
  } catch (error) {
    console.error("Failed to retrieve object:", error);
    return { status: "error", message: "Failed to retrieve object" };
  }
}

/**
 * Get all objects.
 */
export async function getAllObjectsAction(): Promise<ActionState> {
  try {
    const objects = await prisma.object.findMany();
    return { status: "success", message: "Objects retrieved successfully", data: objects };
  } catch (error) {
    console.error("Failed to retrieve objects:", error);
    return { status: "error", message: "Failed to retrieve objects" };
  }
}