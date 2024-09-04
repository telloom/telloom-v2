"use server";

import { createPromptResponse as dbCreatePromptResponse } from "../db/queries/prompt-responses-queries";
import { ActionState } from "../types";
import { revalidatePath } from "next/cache";

interface CreatePromptResponseData {
  userId: string;
  promptId: string;
  videoId: string;
  muxPlaybackId: string;
}

export async function createPromptResponse(data: CreatePromptResponseData): Promise<ActionState> {
  try {
    console.log('Creating prompt response with data:', data);
    if (!data.userId || !data.promptId || !data.videoId || !data.muxPlaybackId) {
      throw new Error('Missing required fields for creating prompt response');
    }
    const newPromptResponse = await dbCreatePromptResponse({
      userId: data.userId,
      promptId: data.promptId,
      videoId: BigInt(data.videoId), // Convert string to BigInt
      muxPlaybackId: data.muxPlaybackId,
    });
    console.log('Prompt response created:', newPromptResponse);
    revalidatePath("/prompt-responses");
    return { status: "success", message: "Prompt response created successfully", data: newPromptResponse };
  } catch (error) {
    console.error("Failed to create prompt response:", error);
    return { status: "error", message: `Failed to create prompt response: ${error instanceof Error ? error.message : String(error)}` };
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