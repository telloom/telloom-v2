"use server";

import { createPromptResponseAdditionalFile, deletePromptResponseAdditionalFile, getAllPromptResponseAdditionalFiles, getPromptResponseAdditionalFileById, updatePromptResponseAdditionalFile, getPromptResponseAdditionalFilesByUserId } from "@/db/queries/prompt_response_additional_files-queries";
import { ActionState } from "@/types";
import { InsertPromptResponseAdditionalFile } from "@/db/schema/prompt_response_additional_files";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth"; // Assuming you have an auth helper

export async function createPromptResponseAdditionalFileAction(data: InsertPromptResponseAdditionalFile): Promise<ActionState> {
  try {
    const session = await auth();
    if (!session) {
      return { status: "error", message: "Not authenticated" };
    }
    
    const newFile = await createPromptResponseAdditionalFile({ ...data, userId: session.user.id });
    revalidatePath("/prompt-responses");
    return { status: "success", message: "File uploaded successfully", data: newFile };
  } catch (error) {
    return { status: "error", message: "Failed to upload file" };
  }
}

export async function updatePromptResponseAdditionalFileAction(id: string, data: Partial<InsertPromptResponseAdditionalFile>): Promise<ActionState> {
  try {
    const session = await auth();
    if (!session) {
      return { status: "error", message: "Not authenticated" };
    }
    
    const file = await getPromptResponseAdditionalFileById(id);
    if (file?.userId !== session.user.id) {
      return { status: "error", message: "Not authorized to update this file" };
    }
    
    const updatedFile = await updatePromptResponseAdditionalFile(id, data);
    revalidatePath("/prompt-responses");
    return { status: "success", message: "File updated successfully", data: updatedFile };
  } catch (error) {
    return { status: "error", message: "Failed to update file" };
  }
}

export async function deletePromptResponseAdditionalFileAction(id: string): Promise<ActionState> {
  try {
    const session = await auth();
    if (!session) {
      return { status: "error", message: "Not authenticated" };
    }
    
    const file = await getPromptResponseAdditionalFileById(id);
    if (file?.userId !== session.user.id) {
      return { status: "error", message: "Not authorized to delete this file" };
    }
    
    await deletePromptResponseAdditionalFile(id);
    revalidatePath("/prompt-responses");
    return { status: "success", message: "File deleted successfully" };
  } catch (error) {
    return { status: "error", message: "Failed to delete file" };
  }
}

export async function getPromptResponseAdditionalFileByIdAction(id: string): Promise<ActionState> {
  try {
    const file = await getPromptResponseAdditionalFileById(id);
    return { status: "success", message: "File retrieved successfully", data: file };
  } catch (error) {
    return { status: "error", message: "Failed to retrieve file" };
  }
}

export async function getAllPromptResponseAdditionalFilesAction(): Promise<ActionState> {
  try {
    const files = await getAllPromptResponseAdditionalFiles();
    return { status: "success", message: "Files retrieved successfully", data: files };
  } catch (error) {
    return { status: "error", message: "Failed to retrieve files" };
  }
}

export async function getPromptResponseAdditionalFilesByUserIdAction(): Promise<ActionState> {
  try {
    const session = await auth();
    if (!session) {
      return { status: "error", message: "Not authenticated" };
    }
    
    const files = await getPromptResponseAdditionalFilesByUserId(session.user.id);
    return { status: "success", message: "User files retrieved successfully", data: files };
  } catch (error) {
    return { status: "error", message: "Failed to retrieve user files" };
  }
}