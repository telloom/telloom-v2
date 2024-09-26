"use server";

import { PrismaClient } from '@prisma/client';
import { ActionState } from '../types/action-types';
import { revalidatePath } from "next/cache";

const prisma = new PrismaClient();

/**
 * Create a new prompt response additional file.
 */
export async function createPromptResponseAdditionalFileAction(data: {
  promptResponseId: bigint;
  fileUrl: string;
  fileType: string;
  // Add other fields as necessary
}): Promise<ActionState> {
  try {
    const newFile = await prisma.promptResponseAdditionalFile.create({
      data: data,
    });
    revalidatePath("/prompt-response-additional-files");
    return { status: "success", message: "File created successfully", data: newFile };
  } catch (error) {
    console.error("Failed to create file:", error);
    return { status: "error", message: "Failed to create file" };
  }
}

/**
 * Update an existing prompt response additional file.
 */
export async function updatePromptResponseAdditionalFileAction(id: string, data: Partial<{
  promptResponseId?: bigint;
  fileUrl?: string;
  fileType?: string;
  // Add other fields as necessary
}>): Promise<ActionState> {
  try {
    const updatedFile = await prisma.promptResponseAdditionalFile.update({
      where: { id: id },
      data: data,
    });
    revalidatePath("/prompt-response-additional-files");
    return { status: "success", message: "File updated successfully", data: updatedFile };
  } catch (error) {
    console.error("Failed to update file:", error);
    return { status: "error", message: "Failed to update file" };
  }
}

/**
 * Delete a prompt response additional file.
 */
export async function deletePromptResponseAdditionalFileAction(id: string): Promise<ActionState> {
  try {
    await prisma.promptResponseAdditionalFile.delete({
      where: { id: id },
    });
    revalidatePath("/prompt-response-additional-files");
    return { status: "success", message: "File deleted successfully" };
  } catch (error) {
    console.error("Failed to delete file:", error);
    return { status: "error", message: "Failed to delete file" };
  }
}

/**
 * Get a prompt response additional file by ID.
 */
export async function getPromptResponseAdditionalFileByIdAction(id: string): Promise<ActionState> {
  try {
    const file = await prisma.promptResponseAdditionalFile.findUnique({
      where: { id: id },
    });
    if (file) {
      return { status: "success", message: "File retrieved successfully", data: file };
    } else {
      return { status: "error", message: "File not found" };
    }
  } catch (error) {
    console.error("Failed to retrieve file:", error);
    return { status: "error", message: "Failed to retrieve file" };
  }
}

/**
 * Get all prompt response additional files.
 */
export async function getAllPromptResponseAdditionalFilesAction(): Promise<ActionState> {
  try {
    const files = await prisma.promptResponseAdditionalFile.findMany();
    return { status: "success", message: "Files retrieved successfully", data: files };
  } catch (error) {
    console.error("Failed to retrieve files:", error);
    return { status: "error", message: "Failed to retrieve files" };
  }
}