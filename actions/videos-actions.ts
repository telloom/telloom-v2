"use server";

import { db } from "../db/db";
import { videosTable } from "../db/schema/videos";
import { eq } from "drizzle-orm";
import { createVideo, updateVideo, deleteVideo, getAllVideos, getVideoById } from "../db/queries/videos-queries";
import { ActionState } from "../types/action-types";
import { InsertVideo } from "../db/schema/videos";
import { revalidatePath } from "next/cache";


export async function createVideoAction(data: Omit<InsertVideo, 'id'>): Promise<ActionState> {
  try {
    console.log('Creating/updating video with data:', data);

    // Check if a video with this muxUploadId already exists
    const existingVideo = await db.select().from(videosTable).where(eq(videosTable.muxUploadId, data.muxUploadId)).execute();

    let result;
    if (existingVideo.length > 0) {
      // Update existing video
      result = await updateVideo(BigInt(existingVideo[0].id), data);
      console.log('Updated existing video:', result);
    } else {
      // Create new video
      result = await createVideo(data);
      console.log('Created new video:', result);
    }

    revalidatePath("/videos");
    return { status: "success", message: "Video created/updated successfully", data: result };
  } catch (error) {
    console.error("Failed to create/update video:", error);
    return { status: "error", message: "Failed to create/update video" };
  }
}

export async function updateVideoAction(id: bigint, data: Partial<InsertVideo>): Promise<ActionState> {
  try {
    const updatedVideo = await updateVideo(id, data);
    revalidatePath("/videos");
    return { status: "success", message: "Video updated successfully", data: updatedVideo };
  } catch (error) {
    console.error("Failed to update video:", error);
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