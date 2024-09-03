"use server";

import { createVideoTranscript, deleteVideoTranscript, getAllVideoTranscripts, getVideoTranscriptById, updateVideoTranscript } from "@/db/queries/video_transcripts-queries";
import { ActionState } from "@/types";
import { InsertVideoTranscript } from "@/db/schema/video_transcripts"; // Add this import
import { revalidatePath } from "next/cache";

export async function createVideoTranscriptAction(data: InsertVideoTranscript): Promise<ActionState> {
  try {
    const newVideoTranscript = await createVideoTranscript(data);
    revalidatePath("/video-transcripts");
    return { status: "success", message: "Video transcript created successfully", data: newVideoTranscript };
  } catch (error) {
    return { status: "error", message: "Failed to create video transcript" };
  }
}

export async function updateVideoTranscriptAction(id: bigint, data: Partial<InsertVideoTranscript>): Promise<ActionState> {
  try {
    const updatedVideoTranscript = await updateVideoTranscript(id, data);
    revalidatePath("/video-transcripts");
    return { status: "success", message: "Video transcript updated successfully", data: updatedVideoTranscript };
  } catch (error) {
    return { status: "error", message: "Failed to update video transcript" };
  }
}

export async function deleteVideoTranscriptAction(id: bigint): Promise<ActionState> {
  try {
    await deleteVideoTranscript(id);
    revalidatePath("/video-transcripts");
    return { status: "success", message: "Video transcript deleted successfully" };
  } catch (error) {
    return { status: "error", message: "Failed to delete video transcript" };
  }
}

export async function getVideoTranscriptByIdAction(id: bigint): Promise<ActionState> {
  try {
    const videoTranscript = await getVideoTranscriptById(id);
    return { status: "success", message: "Video transcript retrieved successfully", data: videoTranscript };
  } catch (error) {
    return { status: "error", message: "Failed to retrieve video transcript" };
  }
}

export async function getAllVideoTranscriptsAction(): Promise<ActionState> {
  try {
    const videoTranscripts = await getAllVideoTranscripts();
    return { status: "success", message: "Video transcripts retrieved successfully", data: videoTranscripts };
  } catch (error) {
    return { status: "error", message: "Failed to retrieve video transcripts" };
  }
}