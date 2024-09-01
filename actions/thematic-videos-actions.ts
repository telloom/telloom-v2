"use server";

import { createThematicVideo, deleteThematicVideo, getAllThematicVideos, getThematicVideoById, updateThematicVideo } from "@/db/queries/thematic_videos-queries";
import { ActionState } from "@/types";
import { revalidatePath } from "next/cache";

export async function createThematicVideoAction(data: InsertThematicVideo): Promise<ActionState> {
  try {
    const newThematicVideo = await createThematicVideo(data);
    revalidatePath("/thematic-videos");
    return { status: "success", message: "Thematic video created successfully", data: newThematicVideo };
  } catch (error) {
    return { status: "error", message: "Failed to create thematic video" };
  }
}

export async function updateThematicVideoAction(id: bigint, data: Partial<InsertThematicVideo>): Promise<ActionState> {
  try {
    const updatedThematicVideo = await updateThematicVideo(id, data);
    revalidatePath("/thematic-videos");
    return { status: "success", message: "Thematic video updated successfully", data: updatedThematicVideo };
  } catch (error) {
    return { status: "error", message: "Failed to update thematic video" };
  }
}

export async function deleteThematicVideoAction(id: bigint): Promise<ActionState> {
  try {
    await deleteThematicVideo(id);
    revalidatePath("/thematic-videos");
    return { status: "success", message: "Thematic video deleted successfully" };
  } catch (error) {
    return { status: "error", message: "Failed to delete thematic video" };
  }
}

export async function getThematicVideoByIdAction(id: bigint): Promise<ActionState> {
  try {
    const thematicVideo = await getThematicVideoById(id);
    return { status: "success", message: "Thematic video retrieved successfully", data: thematicVideo };
  } catch (error) {
    return { status: "error", message: "Failed to retrieve thematic video" };
  }
}

export async function getAllThematicVideosAction(): Promise<ActionState> {
  try {
    const thematicVideos = await getAllThematicVideos();
    return { status: "success", message: "Thematic videos retrieved successfully", data: thematicVideos };
  } catch (error) {
    return { status: "error", message: "Failed to retrieve thematic videos" };
  }
}