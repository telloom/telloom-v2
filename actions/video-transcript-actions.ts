"use server";

import { PrismaClient } from '@prisma/client';
import { ActionState } from '../types/action-types';
import { revalidatePath } from "next/cache";

const prisma = new PrismaClient();

/**
 * Create a new video transcript.
 */
export async function createVideoTranscriptAction(data: {
  videoId: bigint;
  transcript: string;
  language: string;
  // Add other fields as necessary
}): Promise<ActionState> {
  try {
    const newVideoTranscript = await prisma.videoTranscript.create({
      data: data,
    });
    revalidatePath("/video-transcripts");
    return { status: "success", message: "Video transcript created successfully", data: newVideoTranscript };
  } catch (error) {
    console.error("Failed to create video transcript:", error);
    return { status: "error", message: "Failed to create video transcript" };
  }
}

/**
 * Update an existing video transcript.
 */
export async function updateVideoTranscriptAction(id: bigint, data: Partial<{
  transcript?: string;
  language?: string;
  // Add other fields as necessary
}>): Promise<ActionState> {
  try {
    const updatedVideoTranscript = await prisma.videoTranscript.update({
      where: { id: id },
      data: data,
    });
    revalidatePath("/video-transcripts");
    return { status: "success", message: "Video transcript updated successfully", data: updatedVideoTranscript };
  } catch (error) {
    console.error("Failed to update video transcript:", error);
    return { status: "error", message: "Failed to update video transcript" };
  }
}

/**
 * Delete a video transcript.
 */
export async function deleteVideoTranscriptAction(id: bigint): Promise<ActionState> {
  try {
    await prisma.videoTranscript.delete({
      where: { id: id },
    });
    revalidatePath("/video-transcripts");
    return { status: "success", message: "Video transcript deleted successfully" };
  } catch (error) {
    console.error("Failed to delete video transcript:", error);
    return { status: "error", message: "Failed to delete video transcript" };
  }
}

/**
 * Get a video transcript by ID.
 */
export async function getVideoTranscriptByIdAction(id: bigint): Promise<ActionState> {
  try {
    const videoTranscript = await prisma.videoTranscript.findUnique({
      where: { id: id },
    });
    if (videoTranscript) {
      return { status: "success", message: "Video transcript retrieved successfully", data: videoTranscript };
    } else {
      return { status: "error", message: "Video transcript not found" };
    }
  } catch (error) {
    console.error("Failed to retrieve video transcript:", error);
    return { status: "error", message: "Failed to retrieve video transcript" };
  }
}

/**
 * Get all video transcripts.
 */
export async function getAllVideoTranscriptsAction(): Promise<ActionState> {
  try {
    const videoTranscripts = await prisma.videoTranscript.findMany();
    return { status: "success", message: "Video transcripts retrieved successfully", data: videoTranscripts };
  } catch (error) {
    console.error("Failed to retrieve video transcripts:", error);
    return { status: "error", message: "Failed to retrieve video transcripts" };
  }
}