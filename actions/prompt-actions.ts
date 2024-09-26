"use server";

import { PrismaClient } from '@prisma/client';
import { ActionState } from '../types/action-types';
import { revalidatePath } from "next/cache";

const prisma = new PrismaClient();

/**
 * Create a new prompt.
 */
export async function createPromptAction(data: {
  prompt: string;
  promptCategoryId?: number;
  promptType: string;
  contextEstablishingQuestion: boolean;
}): Promise<ActionState> {
  try {
    const newPrompt = await prisma.promptPrimary.create({
      data: data,
    });
    revalidatePath("/prompts");
    return { status: "success", message: "Prompt created successfully", data: newPrompt };
  } catch (error) {
    console.error("Failed to create prompt:", error);
    return { status: "error", message: "Failed to create prompt" };
  }
}

/**
 * Update an existing prompt.
 */
export async function updatePromptAction(id: string, data: Partial<{
  prompt?: string;
  promptCategoryId?: number;
  promptType?: string;
  contextEstablishingQuestion?: boolean;
}>): Promise<ActionState> {
  try {
    const updatedPrompt = await prisma.promptPrimary.update({
      where: { id: id },
      data: data,
    });
    revalidatePath("/prompts");
    return { status: "success", message: "Prompt updated successfully", data: updatedPrompt };
  } catch (error) {
    console.error("Failed to update prompt:", error);
    return { status: "error", message: "Failed to update prompt" };
  }
}

/**
 * Delete a prompt.
 */
export async function deletePromptAction(id: string): Promise<ActionState> {
  try {
    await prisma.promptPrimary.delete({
      where: { id: id },
    });
    revalidatePath("/prompts");
    return { status: "success", message: "Prompt deleted successfully" };
  } catch (error) {
    console.error("Failed to delete prompt:", error);
    return { status: "error", message: "Failed to delete prompt" };
  }
}

/**
 * Get a prompt by ID.
 */
export async function getPromptByIdAction(id: string): Promise<ActionState> {
  try {
    const prompt = await prisma.promptPrimary.findUnique({
      where: { id: id },
    });
    if (prompt) {
      return { status: "success", message: "Prompt retrieved successfully", data: prompt };
    } else {
      return { status: "error", message: "Prompt not found" };
    }
  } catch (error) {
    console.error("Failed to retrieve prompt:", error);
    return { status: "error", message: "Failed to retrieve prompt" };
  }
}

/**
 * Get all prompts.
 */
export async function getAllPromptsAction(): Promise<ActionState> {
  try {
    console.log('Fetching all prompts...');
    const prompts = await prisma.promptPrimary.findMany({
      orderBy: { createdAt: 'desc' },
    });
    console.log('Prompts fetched successfully');
    return { status: "success", message: "Prompts retrieved successfully", data: prompts };
  } catch (error) {
    console.error("Failed to retrieve prompts:", error);
    return { status: "error", message: "Failed to retrieve prompts" };
  }
}

/**
 * Get prompts by category.
 */
export async function getPromptsByCategoryAction(categoryId: number): Promise<ActionState> {
  try {
    console.log(`Fetching prompts for category ID: ${categoryId}`);
    const prompts = await prisma.promptPrimary.findMany({
      where: { promptCategoryId: categoryId },
    });
    console.log(`Prompts for category ${categoryId}:`, prompts);
    return { status: "success", message: "Prompts retrieved successfully", data: prompts };
  } catch (error) {
    console.error(`Failed to retrieve prompts for category ${categoryId}:`, error);
    return { status: "error", message: "Failed to retrieve prompts by category" };
  }
}

/**
 * Get the latest prompts.
 */
export async function getLatestPromptsAction(limit: number = 10): Promise<ActionState> {
  try {
    const prompts = await prisma.promptPrimary.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    return { status: "success", message: "Latest prompts retrieved successfully", data: prompts };
  } catch (error) {
    console.error("Failed to retrieve latest prompts:", error);
    return { status: "error", message: "Failed to retrieve latest prompts" };
  }
}