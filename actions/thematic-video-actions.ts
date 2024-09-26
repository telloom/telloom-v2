"use server";

import { PrismaClient } from '@prisma/client';
import { ActionState } from '../types/action-types';
import { revalidatePath } from "next/cache";

const prisma = new PrismaClient();

/**
 * Create a new thematic video.
 */
export async function createThematicVideoAction(data: {
  title: string;
  description?: string;
  videoUrl: string;
  // Add other fields as necessary
}): Promise<ActionState> {
  try {
    const newThematicVideo = await prisma.thematicVideo.create({
      data: data,
    });
    revalidatePath("/thematic-videos");
    return { status: "success", message: "Thematic video created successfully", data: newThematicVideo };
  } catch (error) {
    console.error("Failed to create thematic video:", error);
    return { status: "error", message: "Failed to create thematic video" };
  }
}

/**
 * Update an existing thematic video.
 */
export async function updateThematicVideoAction(id: bigint, data: Partial<{
  title?: string;
  description?: string;
  videoUrl?: string;
  // Add other fields as necessary
}>): Promise<ActionState> {
  try {
    const updatedThematicVideo = await prisma.thematicVideo.update({
      where: { id: id },
      data: data,
    });
    revalidatePath("/thematic-videos");
    return { status: "success", message: "Thematic video updated successfully", data: updatedThematicVideo };
  } catch (error) {
    console.error("Failed to update thematic video:", error);
    return { status: "error", message: "Failed to update thematic video" };
  }
}

/**
 * Delete a thematic video.
 */
export async function deleteThematicVideoAction(id: bigint): Promise<ActionState> {
  try {
    await prisma.thematicVideo.delete({
      where: { id: id },
    });
    revalidatePath("/thematic-videos");
    return { status: "success", message: "Thematic video deleted successfully" };
  } catch (error) {
    console.error("Failed to delete thematic video:", error);
    return { status: "error", message: "Failed to delete thematic video" };
  }
}

/**
 * Get a thematic video by ID.
 */
export async function getThematicVideoByIdAction(id: bigint): Promise<ActionState> {
  try {
    const thematicVideo = await prisma.thematicVideo.findUnique({
      where: { id: id },
    });
    if (thematicVideo) {
      return { status: "success", message: "Thematic video retrieved successfully", data: thematicVideo };
    } else {
      return { status: "error", message: "Thematic video not found" };
    }
  } catch (error) {
    console.error("Failed to retrieve thematic video:", error);
    return { status: "error", message: "Failed to retrieve thematic video" };
  }
}

/**
 * Get all thematic videos.
 */
export async function getAllThematicVideosAction(): Promise<ActionState> {
  try {
    const thematicVideos = await prisma.thematicVideo.findMany();
    return { status: "success", message: "Thematic videos retrieved successfully", data: thematicVideos };
  } catch (error) {
    console.error("Failed to retrieve thematic videos:", error);
    return { status: "error", message: "Failed to retrieve thematic videos" };
  }
}