"use server";

import { createPromptCategory, deletePromptCategory, getAllPromptCategories, getPromptCategoryById, updatePromptCategory } from "@/db/queries/prompt_categories-queries";
import { ActionState } from "@/types";
import { revalidatePath } from "next/cache";

export async function createPromptCategoryAction(data: InsertPromptCategory): Promise<ActionState> {
  try {
    const newPromptCategory = await createPromptCategory(data);
    revalidatePath("/prompt-categories");
    return { status: "success", message: "Prompt category created successfully", data: newPromptCategory };
  } catch (error) {
    return { status: "error", message: "Failed to create prompt category" };
  }
}

export async function updatePromptCategoryAction(id: bigint, data: Partial<InsertPromptCategory>): Promise<ActionState> {
  try {
    const updatedPromptCategory = await updatePromptCategory(id, data);
    revalidatePath("/prompt-categories");
    return { status: "success", message: "Prompt category updated successfully", data: updatedPromptCategory };
  } catch (error) {
    return { status: "error", message: "Failed to update prompt category" };
  }
}

export async function deletePromptCategoryAction(id: bigint): Promise<ActionState> {
  try {
    await deletePromptCategory(id);
    revalidatePath("/prompt-categories");
    return { status: "success", message: "Prompt category deleted successfully" };
  } catch (error) {
    return { status: "error", message: "Failed to delete prompt category" };
  }
}

export async function getPromptCategoryByIdAction(id: bigint): Promise<ActionState> {
  try {
    const promptCategory = await getPromptCategoryById(id);
    return { status: "success", message: "Prompt category retrieved successfully", data: promptCategory };
  } catch (error) {
    return { status: "error", message: "Failed to retrieve prompt category" };
  }
}

export async function getAllPromptCategoriesAction(): Promise<ActionState> {
  try {
    const promptCategories = await getAllPromptCategories();
    return { status: "success", message: "Prompt categories retrieved successfully", data: promptCategories };
  } catch (error) {
    return { status: "error", message: "Failed to retrieve prompt categories" };
  }
}