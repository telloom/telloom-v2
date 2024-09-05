"use server";

import { db } from "../db/db"; // Change this import
import { createVideo, deleteVideo, getAllVideos, getVideoById, updateVideo } from "../db/queries/videos-queries";
import { ActionState } from "../types/action-types";
import { InsertVideo } from "../db/schema/videos";
import { revalidatePath } from "next/cache";
import { createAsset } from "../utils/muxClient";
import { videosTable } from "../db/schema/videos";
import { v4 as uuidv4 } from 'uuid';

export async function createVideoAction(data: Omit<InsertVideo, 'id'>): Promise<ActionState> {
  try {
    // Generate a unique numeric ID
    const numericId = parseInt(uuidv4().replace(/-/g, '').slice(0, 15), 16);
    
    const newVideo = await createVideo({
      ...data,
      id: numericId,
    });
    return { status: "success", message: "Video created successfully", data: newVideo[0] };
  } catch (error) {
    console.error("Failed to create video:", error);
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