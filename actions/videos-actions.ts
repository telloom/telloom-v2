"use server";

import { db } from "../db/db";
import { videosTable } from "../db/schema/videos";
import { eq, isNull, desc } from "drizzle-orm";
import { createVideo, updateVideo, deleteVideo, getAllVideos, getVideoById } from "../db/queries/videos-queries";
import { ActionState } from "../types/action-types";
import { InsertVideo } from "../db/schema/videos";
import { revalidatePath } from "next/cache";

export async function createVideoAction(data: Omit<InsertVideo, 'id'>): Promise<ActionState> {
  try {
    console.log('Creating/updating video with data:', data);

    if (!data.muxUploadId) {
      throw new Error('muxUploadId is required');
    }

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

export async function createPreliminaryVideoRecord(data: {
  promptId: string;
  userId: string;
  status: 'waiting';
}): Promise<ActionState> {
  try {
    console.log('Creating preliminary video record with data:', JSON.stringify(data, null, 2));
    
    const result = await db.insert(videosTable).values({
      promptId: data.promptId,
      userId: data.userId,
      status: data.status,
    }).returning();
    
    console.log('Preliminary video record created:', JSON.stringify(result, null, 2));
    
    if (result.length === 0) {
      throw new Error('No record was created');
    }
    
    return { status: "success", message: "Preliminary video record created", data: result[0] };
  } catch (error) {
    console.error("Failed to create preliminary video record:", error);
    return { status: "error", message: `Failed to create preliminary video record: ${error instanceof Error ? error.message : 'Unknown error'}` };
  }
}

export async function updateVideoWithMuxInfo(muxUploadId: string, data: Partial<InsertVideo>): Promise<ActionState> {
  try {
    console.log('Updating video with Mux info:', muxUploadId, data);
    
    // First, try to find the video by muxUploadId
    const existingVideo = await db
      .select()
      .from(videosTable)
      .where(eq(videosTable.muxUploadId, muxUploadId))
      .limit(1);

    let result;
    if (existingVideo.length > 0) {
      // Update existing video
      result = await db
        .update(videosTable)
        .set({
          ...data,
          userId: data.userId || existingVideo[0].userId,
          promptId: data.promptId || existingVideo[0].promptId
        })
        .where(eq(videosTable.muxUploadId, muxUploadId))
        .returning();
    } else {
      // If not found by muxUploadId, try to find the most recent video without a muxUploadId
      const recentVideo = await db
        .select()
        .from(videosTable)
        .where(isNull(videosTable.muxUploadId))
        .orderBy(desc(videosTable.createdAt))
        .limit(1);

      if (recentVideo.length > 0) {
        // Update the recent video with the new data
        result = await db
          .update(videosTable)
          .set({ 
            ...data, 
            muxUploadId, 
            userId: data.userId || recentVideo[0].userId,
            promptId: data.promptId || recentVideo[0].promptId
          })
          .where(eq(videosTable.id, recentVideo[0].id))
          .returning();
      } else {
        // If no video found, create a new one (this should not happen in normal flow)
        console.warn('No existing video found to update. This is unexpected.');
        result = await db
          .insert(videosTable)
          .values({ ...data, muxUploadId })
          .returning();
      }
    }

    console.log('Update result:', result);

    if (result.length === 0) {
      throw new Error('No matching video found to update');
    }

    return { status: "success", message: "Video updated with Mux info", data: result[0] };
  } catch (error) {
    console.error("Failed to update video with Mux info:", error);
    return { status: "error", message: "Failed to update video with Mux info" };
  }
}

export async function createSimpleVideoRecord(data: {
  promptId: string;
  userId: string;
  status: 'waiting';
}): Promise<ActionState> {
  try {
    console.log('Creating simple video record with data:', JSON.stringify(data, null, 2));
    
    const result = await db.insert(videosTable).values({
      promptId: data.promptId,
      userId: data.userId,
      status: data.status,
    }).returning();
    
    console.log('Simple video record created:', JSON.stringify(result, null, 2));
    
    if (result.length === 0) {
      throw new Error('No record was created');
    }
    
    return { status: "success", message: "Simple video record created", data: result[0] };
  } catch (error) {
    console.error("Failed to create simple video record:", error);
    return { status: "error", message: `Failed to create simple video record: ${error instanceof Error ? error.message : 'Unknown error'}` };
  }
}