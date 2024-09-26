"use server";

import { PrismaClient } from '@prisma/client';
import { ActionState } from '../types/action-types';
import { revalidatePath } from "next/cache";

const prisma = new PrismaClient();

/**
 * Create a new object category.
 */
export async function createObjectCategoryAction(data: {
  name: string;
  description?: string;
  // Add other fields as necessary
}): Promise<ActionState> {
  try {
    const newObjectCategory = await prisma.objectCategory.create({
      data: data,
    });
    revalidatePath("/object-categories");
    return { status: "success", message: "Object category created successfully", data: newObjectCategory };
  } catch (error) {
    console.error("Failed to create object category:", error);
    return { status: "error", message: "Failed to create object category" };
  }
}

/**
 * Update an existing object category.
 */
export async function updateObjectCategoryAction(id: bigint, data: Partial<{
  name?: string;
  description?: string;
  // Add other fields as necessary
}>): Promise<ActionState> {
  try {
    const updatedObjectCategory = await prisma.objectCategory.update({
      where: { id: id },
      data: data,
    });
    revalidatePath("/object-categories");
    return { status: "success", message: "Object category updated successfully", data: updatedObjectCategory };
  } catch (error) {
    console.error("Failed to update object category:", error);
    return { status: "error", message: "Failed to update object category" };
  }
}

/**
 * Delete an object category.
 */
export async function deleteObjectCategoryAction(id: bigint): Promise<ActionState> {
  try {
    await prisma.objectCategory.delete({
      where: { id: id },
    });
    revalidatePath("/object-categories");
    return { status: "success", message: "Object category deleted successfully" };
  } catch (error) {
    console.error("Failed to delete object category:", error);
    return { status: "error", message: "Failed to delete object category" };
  }
}

/**
 * Get an object category by ID.
 */
export async function getObjectCategoryByIdAction(id: bigint): Promise<ActionState> {
  try {
    const objectCategory = await prisma.objectCategory.findUnique({
      where: { id: id },
    });
    if (objectCategory) {
      return { status: "success", message: "Object category retrieved successfully", data: objectCategory };
    } else {
      return { status: "error", message: "Object category not found" };
    }
  } catch (error) {
    console.error("Failed to retrieve object category:", error);
    return { status: "error", message: "Failed to retrieve object category" };
  }
}

/**
 * Get all object categories.
 */
export async function getAllObjectCategoriesAction(): Promise<ActionState> {
  try {
    const objectCategories = await prisma.objectCategory.findMany();
    return { status: "success", message: "Object categories retrieved successfully", data: objectCategories };
  } catch (error) {
    console.error("Failed to retrieve object categories:", error);
    return { status: "error", message: "Failed to retrieve object categories" };
  }
}