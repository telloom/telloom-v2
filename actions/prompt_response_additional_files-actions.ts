"use server";

import { revalidatePath } from "next/cache";
import { ActionState } from "../types/action-types";
import { InsertPromptResponseAdditionalFile } from "../db/schema/prompt_response_additional_files";
import {
  createPromptResponseAdditionalFile,
  deletePromptResponseAdditionalFile,
  getAllPromptResponseAdditionalFiles,
  getPromptResponseAdditionalFileById,
  updatePromptResponseAdditionalFile
} from "../db/queries/prompt_response_additional_files-queries";

export async function createPromptResponseAdditionalFileAction(data: InsertPromptResponseAdditionalFile): Promise<ActionState> {
  try {
    const newFile = await createPromptResponseAdditionalFile(data);
    revalidatePath("/prompt-response-additional-files");
    return { status: "success", message: "File created successfully", data: newFile };
  } catch (error) {
    console.error("Failed to create file:", error);
    return { status: "error", message: "Failed to create file" };
  }
}

export async function updatePromptResponseAdditionalFileAction(id: string, data: Partial<InsertPromptResponseAdditionalFile>): Promise<ActionState> {
  try {
    const updatedFile = await updatePromptResponseAdditionalFile(id, data);
    revalidatePath("/prompt-response-additional-files");
    return { status: "success", message: "File updated successfully", data: updatedFile };
  } catch (error) {
    return { status: "error", message: "Failed to update file" };
  }
}

export async function deletePromptResponseAdditionalFileAction(id: string): Promise<ActionState> {
  try {
    await deletePromptResponseAdditionalFile(id);
    revalidatePath("/prompt-response-additional-files");
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