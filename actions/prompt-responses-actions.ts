"use server";

import { createPromptResponse, deletePromptResponse, getAllPromptResponses, getPromptResponseById, updatePromptResponse } from "@/db/queries/prompt_responses-queries";
import { ActionState } from "@/types";
import { revalidatePath } from "next/cache";

export async function createPromptResponseAction(data: InsertPromptResponse): Promise<ActionState> {
  try {
    const newPromptResponse = await createPromptResponse(data);
    revalidatePath("/prompt-responses");
    return { status: "success", message: "Prompt response created successfully", data: newPromptResponse };
  } catch (error) {
    return { status: "error", message: "Failed to create prompt response" };
  }
}

export async function updatePromptResponseAction(id: bigint, data: Partial<InsertPromptResponse>): Promise<ActionState> {
  try {
    const updatedPromptResponse = await updatePromptResponse(id, data);
    revalidatePath("/prompt-responses");
    return { status: "success", message: "Prompt response updated successfully", data: updatedPromptResponse };
  } catch (error) {
    return { status: "error", message: "Failed to update prompt response" };
  }
}

export async function deletePromptResponseAction(id: bigint): Promise<ActionState> {
  try {
    await deletePromptResponse(id);
    revalidatePath("/prompt-responses");
    return { status: "success", message: "Prompt response deleted successfully" };
  } catch (error) {
    return { status: "error", message: "Failed to delete prompt response" };
  }
}

export async function getPromptResponseByIdAction(id: bigint): Promise<ActionState> {
  try {
    const promptResponse = await getPromptResponseById(id);
    return { status: "success", message: "Prompt response retrieved successfully", data: promptResponse };
  } catch (error) {
    return { status: "error", message: "Failed to retrieve prompt response" };
  }
}

export async function getAllPromptResponsesAction(): Promise<ActionState> {
  try {
    const promptResponses = await getAllPromptResponses();
    return { status: "success", message: "Prompt responses retrieved successfully", data: promptResponses };
  } catch (error) {
    return { status: "error", message: "Failed to retrieve prompt responses" };
  }
}