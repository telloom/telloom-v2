"use server";

import { PrismaClient } from '@prisma/client';
import { ActionState } from "../types";
import { revalidatePath } from "next/cache";

const prisma = new PrismaClient();

interface CreatePromptResponseData {
  userId: string;
  promptId: string;
  videoId: number;
}

export async function createPromptResponse(data: CreatePromptResponseData): Promise<ActionState> {
  try {
    console.log('Creating prompt response with data:', data);
    if (!data.userId || !data.promptId || !data.videoId) {
      throw new Error('Missing required fields for creating prompt response');
    }
    const newPromptResponse = await prisma.promptResponse.create({
      data: {
        userId: data.userId,
        promptId: data.promptId,
        videoId: data.videoId,
      },
    });
    console.log('Prompt response created:', newPromptResponse);
    revalidatePath("/prompt-responses");
    return { status: "success", message: "Prompt response created successfully", data: newPromptResponse };
  } catch (error) {
    console.error("Failed to create prompt response:", error);
    return { status: "error", message: `Failed to create prompt response: ${error instanceof Error ? error.message : String(error)}` };
  }
}

export async function updatePromptResponseAction(id: number, data: Partial<CreatePromptResponseData>): Promise<ActionState> {
  try {
    const updatedPromptResponse = await prisma.promptResponse.update({
      where: { id },
      data,
    });
    revalidatePath("/prompt-responses");
    return { status: "success", message: "Prompt response updated successfully", data: updatedPromptResponse };
  } catch (error) {
    return { status: "error", message: "Failed to update prompt response" };
  }
}

export async function deletePromptResponseAction(id: number): Promise<ActionState> {
  try {
    await prisma.promptResponse.delete({
      where: { id },
    });
    revalidatePath("/prompt-responses");
    return { status: "success", message: "Prompt response deleted successfully" };
  } catch (error) {
    return { status: "error", message: "Failed to delete prompt response" };
  }
}

export async function getPromptResponseByIdAction(id: number): Promise<ActionState> {
  try {
    const promptResponse = await prisma.promptResponse.findUnique({
      where: { id },
    });
    return { status: "success", message: "Prompt response retrieved successfully", data: promptResponse };
  } catch (error) {
    return { status: "error", message: "Failed to retrieve prompt response" };
  }
}

export async function getAllPromptResponsesAction(): Promise<ActionState> {
  try {
    const promptResponses = await prisma.promptResponse.findMany();
    return { status: "success", message: "Prompt responses retrieved successfully", data: promptResponses };
  } catch (error) {
    return { status: "error", message: "Failed to retrieve prompt responses" };
  }
}

export async function createPromptResponseAction(data: CreatePromptResponseData): Promise<ActionState> {
  try {
    const newPromptResponse = await prisma.promptResponse.create({
      data,
    });
    return { status: "success", message: "Prompt response created successfully", data: newPromptResponse };
  } catch (error) {
    console.error("Failed to create prompt response:", error);
    return { status: "error", message: `Failed to create prompt response: ${error instanceof Error ? error.message : String(error)}` };
  }
}