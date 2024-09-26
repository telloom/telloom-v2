"use server";

import { revalidatePath } from "next/cache";
import { ActionState } from "../types/action-types";
import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

export async function createPromptResponseAdditionalFileAction(data: Prisma.PromptResponseAdditionalFileCreateInput): Promise<ActionState> {
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

export async function updatePromptResponseAdditionalFileAction(id: string, data: Prisma.PromptResponseAdditionalFileUpdateInput): Promise<ActionState> {
  try {
    const updatedFile = await prisma.promptResponseAdditionalFile.update({
      where: { id: id },
      data: data,
    });
    revalidatePath("/prompt-response-additional-files");
    return { status: "success", message: "File updated successfully", data: updatedFile };
  } catch (error) {
    return { status: "error", message: "Failed to update file" };
  }
}

export async function deletePromptResponseAdditionalFileAction(id: string): Promise<ActionState> {
  try {
    await prisma.promptResponseAdditionalFile.delete({
      where: { id: id },
    });
    revalidatePath("/prompt-response-additional-files");
    return { status: "success", message: "File deleted successfully" };
  } catch (error) {
    return { status: "error", message: "Failed to delete file" };
  }
}

export async function getPromptResponseAdditionalFileByIdAction(id: string): Promise<ActionState> {
  try {
    const file = await prisma.promptResponseAdditionalFile.findUnique({
      where: { id: id },
    });
    return { status: "success", message: "File retrieved successfully", data: file };
  } catch (error) {
    return { status: "error", message: "Failed to retrieve file" };
  }
}

export async function getAllPromptResponseAdditionalFilesAction(): Promise<ActionState> {
  try {
    const files = await prisma.promptResponseAdditionalFile.findMany();
    return { status: "success", message: "Files retrieved successfully", data: files };
  } catch (error) {
    return { status: "error", message: "Failed to retrieve files" };
  }
}