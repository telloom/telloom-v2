"use server";

import { createPrompt, deletePrompt, getAllPrompts, getPromptById, updatePrompt, getPromptsByCategory, getLatestPrompts } from "../db/queries/prompts-primary-queries";
import { ActionState } from "../types";
import { InsertPromptPrimary } from "../db/schema/prompts_primary";
import { revalidatePath } from "next/cache";

export async function createPromptAction(data: InsertPromptPrimary): Promise<ActionState> {
  try {
    const newPrompt = await createPrompt(data);
    revalidatePath("/prompts");
    return { status: "success", message: "Prompt created successfully", data: newPrompt };
  } catch (error) {
    console.error("Error creating prompt:", error);
    return { status: "error", message: "Failed to create prompt" };
  }
}

export async function updatePromptAction(id: string, data: Partial<InsertPromptPrimary>): Promise<ActionState> {
  try {
    const updatedPrompt = await updatePrompt(id, data);
    revalidatePath("/prompts");
    return { status: "success", message: "Prompt updated successfully", data: updatedPrompt };
  } catch (error) {
    console.error("Error updating prompt:", error);
    return { status: "error", message: "Failed to update prompt" };
  }
}

export async function deletePromptAction(id: string): Promise<ActionState> {
  try {
    await deletePrompt(id);
    revalidatePath("/prompts");
    return { status: "success", message: "Prompt deleted successfully" };
  } catch (error) {
    console.error("Error deleting prompt:", error);
    return { status: "error", message: "Failed to delete prompt" };
  }
}

export async function getPromptByIdAction(id: string): Promise<ActionState> {
  try {
    const prompt = await getPromptById(id);
    return { status: "success", message: "Prompt retrieved successfully", data: prompt };
  } catch (error) {
    console.error("Error retrieving prompt:", error);
    return { status: "error", message: "Failed to retrieve prompt" };
  }
}

export async function getAllPromptsAction(): Promise<ActionState> {
  try {
    const prompts = await getAllPrompts();
    return { status: "success", message: "Prompts retrieved successfully", data: prompts };
  } catch (error) {
    console.error("Error retrieving all prompts:", error);
    return { status: "error", message: "Failed to retrieve prompts" };
  }
}

export async function getPromptsByCategoryAction(categoryId: number): Promise<ActionState> {
  try {
    console.log(`Executing getPromptsByCategoryAction for category ${categoryId}...`);
    const prompts = await getPromptsByCategory(categoryId);
    console.log(`Prompts for category ${categoryId}:`, prompts);
    return { status: "success", message: "Prompts retrieved successfully", data: prompts };
  } catch (error) {
    console.error(`Error retrieving prompts for category ${categoryId}:`, error);
    return { status: "error", message: "Failed to retrieve prompts by category", error: String(error) };
  }
}

export async function getLatestPromptsAction(limit: number = 10): Promise<ActionState> {
  try {
    const prompts = await getLatestPrompts(limit);
    return { status: "success", message: "Latest prompts retrieved successfully", data: prompts };
  } catch (error) {
    console.error("Error retrieving latest prompts:", error);
    return { status: "error", message: "Failed to retrieve latest prompts" };
  }
}