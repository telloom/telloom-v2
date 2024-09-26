"use server";

import { PrismaClient } from '@prisma/client';
import { ActionState } from '../types/action-types';
import { revalidatePath } from "next/cache";

const prisma = new PrismaClient();

/**
 * Create a new prompt category.
 */
export async function createPromptCategoryAction(data: {
  name: string;
  description?: string;
  // Add other fields as necessary
}): Promise<ActionState> {
  try {
    const newPromptCategory = await prisma.promptCategory.create({
      data: data,
    });
    revalidatePath("/prompt-categories");
    return { status: "success", message: "Prompt category created successfully", data: newPromptCategory };
  } catch (error) {
    console.error("Failed to create prompt category:", error);
    return { status: "error", message: "Failed to create prompt category" };
  }
}

/**
 * Update an existing prompt category.
 */
export async function updatePromptCategoryAction(id: bigint, data: Partial<{
  name?: string;
  description?: string;
  // Add other fields as necessary
}>): Promise<ActionState> {
  try {
    const updatedPromptCategory = await prisma.promptCategory.update({
      where: { id: id },
      data: data,
    });
    revalidatePath("/prompt-categories");
    return { status: "success", message: "Prompt category updated successfully", data: updatedPromptCategory };
  } catch (error) {
    console.error("Failed to update prompt category:", error);
    return { status: "error", message: "Failed to update prompt category" };
  }
}

/**
 * Delete a prompt category.
 */
export async function deletePromptCategoryAction(id: bigint): Promise<ActionState> {
  try {
    await prisma.promptCategory.delete({
      where: { id: id },
    });
    revalidatePath("/prompt-categories");
    return { status: "success", message: "Prompt category deleted successfully" };
  } catch (error) {
    console.error("Failed to delete prompt category:", error);
    return { status: "error", message: "Failed to delete prompt category" };
  }
}

/**
 * Get a prompt category by ID.
 */
export async function getPromptCategoryByIdAction(id: bigint): Promise<ActionState> {
  try {
    const promptCategory = await prisma.promptCategory.findUnique({
      where: { id: id },
    });
    if (promptCategory) {
      return { status: "success", message: "Prompt category retrieved successfully", data: promptCategory };
    } else {
      return { status: "error", message: "Prompt category not found" };
    }
  } catch (error) {
    console.error("Failed to retrieve prompt category:", error);
    return { status: "error", message: "Failed to retrieve prompt category" };
  }
}

/**
 * Get all prompt categories.
 */
export async function getAllPromptCategoriesAction(): Promise<ActionState> {
  try {
    const promptCategories = await prisma.promptCategory.findMany();
    return { status: "success", message: "Prompt categories retrieved successfully", data: promptCategories };
  } catch (error) {
    console.error("Failed to retrieve prompt categories:", error);
    return { status: "error", message: "Failed to retrieve prompt categories" };
  }
}