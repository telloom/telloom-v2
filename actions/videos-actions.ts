"use server";

import { db } from '@/db/db';
import { videosTable as videos, InsertVideo, videoStatusEnum } from '@/db/schema/videos';
import { eq } from 'drizzle-orm';
import { ActionState } from '../types/action-types';
import Mux from '@mux/mux-node';  // Import the Mux SDK correctly
import { v4 as uuid } from 'uuid';

// Instantiate Mux with no arguments (as of v8.0)
const mux = new Mux();

/**
 * Create a direct upload URL for users to upload their videos.
 * Uses the Mux Video API to generate a direct upload URL.
 */
export async function createUploadUrl(promptId: string, userId: string) {
  const passthrough = uuid();  // Generate a unique passthrough identifier

  // Use mux.Video.Uploads.create to create a new upload URL
  const upload = await mux.Video.Uploads.create({
    new_asset_settings: {
      playback_policy: ['public'], // Ensure the video is public
      encoding_tier: 'baseline',   // Set the encoding tier
      passthrough,                 // Add passthrough UUID to track the video
    },
    cors_origin: process.env.NEXT_PUBLIC_APP_URL || '*'  // Set the CORS origin (use * for testing)
  });

  // Insert the new video record in the database with 'waiting' status
  await db.insert(videos).values({
    status: 'waiting',
    passthrough: passthrough,
    muxUploadId: upload.id,
    userId: userId,
    promptId: promptId
  });

  return { uploadUrl: upload.url, uploadId: upload.id };
}

// Define VideoStatus type based on the enum values in the schema
type VideoStatus = (typeof videoStatusEnum.enumValues)[number];

/**
 * Create a preliminary video record in the database with provided information.
 */
export async function createPreliminaryVideoRecord(data: {
  muxUploadId: string;
  userId: string;
  promptId: string;
  status: VideoStatus;
}): Promise<ActionState> {
  try {
    // Convert the input data to match the InsertVideo type
    const insertData: InsertVideo = {
      muxUploadId: data.muxUploadId,
      userId: data.userId,
      promptId: data.promptId,
      status: data.status,
    };

    // Insert the video record into the database
    const [video] = await db.insert(videos).values(insertData).returning();
    return { status: 'success', data: video, message: 'Video record created successfully' };
  } catch (error) {
    console.error('Failed to create preliminary video record:', error);
    return { status: 'error', message: 'Failed to create video record' };
  }
}

/**
 * Update an existing video record with new Mux information in the database.
 */
export async function updateVideoWithMuxInfo(muxUploadId: string, data: Partial<InsertVideo>): Promise<ActionState> {
  try {
    // Update the video record in the database with new Mux info
    const [updatedVideo] = await db
      .update(videos)
      .set(data)
      .where(eq(videos.muxUploadId, muxUploadId))
      .returning();

    return { status: 'success', data: updatedVideo, message: 'Video record updated successfully' };
  } catch (error) {
    console.error('Failed to update video with Mux info:', error);
    return { status: 'error', message: 'Failed to update video record' };
  }
}
