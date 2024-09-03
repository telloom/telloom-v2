"use server";

import { createPrompt, deletePrompt, getAllPrompts, getPromptById, updatePrompt } from "@/db/queries/prompts-queries";
import { ActionState } from "@/types";
import { InsertPromptPrimary } from "@/db/schema/prompts_primary";
import { revalidatePath } from "next/cache";

export async function createPromptAction(data: InsertPromptPrimary): Promise<ActionState> {
  try {
    const newPrompt = await createPrompt(data);
    revalidatePath("/prompts");
    return { status: "success", message: "Prompt created successfully", data: newPrompt };
  } catch (error) {
    return { status: "error", message: "Failed to create prompt" };
  }
}

export async function updatePromptAction(id: bigint, data: Partial<InsertPromptPrimary>): Promise<ActionState> {
  try {
    const updatedPrompt = await updatePrompt(id, data);
    revalidatePath("/prompts");
    return { status: "success", message: "Prompt updated successfully", data: updatedPrompt };
  } catch (error) {
    return { status: "error", message: "Failed to update prompt" };
  }
}

export async function deletePromptAction(id: bigint): Promise<ActionState> {
  try {
    await deletePrompt(id);
    revalidatePath("/prompts");
    return { status: "success", message: "Prompt deleted successfully" };
  } catch (error) {
    return { status: "error", message: "Failed to delete prompt" };
  }
}

export async function getPromptByIdAction(id: bigint): Promise<ActionState> {
  try {
    const prompt = await getPromptById(id);
    return { status: "success", message: "Prompt retrieved successfully", data: prompt };
  } catch (error) {
    return { status: "error", message: "Failed to retrieve prompt" };
  }
}

export async function getAllPromptsAction(): Promise<ActionState> {
  try {
    const prompts = await getAllPrompts();
    return { status: "success", message: "Prompts retrieved successfully", data: prompts };
  } catch (error) {
    return { status: "error", message: "Failed to retrieve prompts" };
  }
}