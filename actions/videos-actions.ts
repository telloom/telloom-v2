"use server";

import { createVideo, deleteVideo, getAllVideos, getVideoById, updateVideo } from "@/db/queries/videos-queries";
import { ActionState } from "@/types";
import { revalidatePath } from "next/cache";

export async function createVideoAction(data: InsertVideo): Promise<ActionState> {
  try {
    const newVideo = await createVideo(data);
    revalidatePath("/videos");
    return { status: "success", message: "Video created successfully", data: newVideo };
  } catch (error) {
    return { status: "error", message: "Failed to create video" };
  }
}

export async function updateVideoAction(id: bigint, data: Partial<InsertVideo>): Promise<ActionState> {
  try {
    const updatedVideo = await updateVideo(id, data);
    revalidatePath("/videos");
    return { status: "success", message: "Video updated successfully", data: updatedVideo };
  } catch (error) {
    return { status: "error", message: "Failed to update video" };
  }
}

export async function deleteVideoAction(id: bigint): Promise<ActionState> {
  try {
    await deleteVideo(id);
    revalidatePath("/videos");
    return { status: "success", message: "Video deleted successfully" };
  } catch (error) {
    return { status: "error", message: "Failed to delete video" };
  }
}

export async function getVideoByIdAction(id: bigint): Promise<ActionState> {
  try {
    const video = await getVideoById(id);
    return { status: "success", message: "Video retrieved successfully", data: video };
  } catch (error) {
    return { status: "error", message: "Failed to retrieve video" };
  }
}

export async function getAllVideosAction(): Promise<ActionState> {
  try {
    const videos = await getAllVideos();
    return { status: "success", message: "Videos retrieved successfully", data: videos };
  } catch (error) {
    return { status: "error", message: "Failed to retrieve videos" };
  }
}