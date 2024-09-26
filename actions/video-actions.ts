"use server";

import { PrismaClient } from '@prisma/client';
import { ActionState } from '../types/action-types';
import Mux from '@mux/mux-node';
import { v4 as uuid } from 'uuid';

const prisma = new PrismaClient();

// Configure Mux with token ID and secret
Mux.config({ tokenId: process.env.MUX_TOKEN_ID!, tokenSecret: process.env.MUX_TOKEN_SECRET! });
const { Video } = new Mux();

/**
 * Creates a Mux upload and a corresponding video record in the database.
 * @param userId - The ID of the user creating the upload.
 * @param promptId - The ID of the prompt associated with the upload.
 * @param supabase - The Supabase client instance.
 * @returns The upload URL for the Mux uploader.
 */
export async function createUploadUrl(promptId: string, userId: string) {
  const passthrough = uuid(); // Generate a unique passthrough identifier

  // Use Video.Uploads.create to create a new upload URL
  const upload = await mux.Video.Uploads.create({
    new_asset_settings: {
      playback_policy: ['public'], // Ensure the video is public
      encoding_tier: 'baseline',   // Set the encoding tier
      passthrough,                 // Add passthrough UUID to track the video
    },
    cors_origin: process.env.NEXT_PUBLIC_APP_URL || '*'  // Set the CORS origin (use * for testing)
  });

  // Insert the new video record in the database with 'waiting' status
  await prisma.video.create({
    data: {
      status: 'waiting',
      passthrough: passthrough,
      muxUploadId: upload.id,
      userId: userId,
      promptId: promptId
    }
  });

  return { uploadUrl: upload.url, uploadId: upload.id };
}

// Define VideoStatus type based on the enum values in the schema
type VideoStatus = 'waiting' | 'processing' | 'ready' | 'error'; // Adjust these values based on your Prisma schema

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
    // Insert the video record into the database
    const video = await prisma.video.create({
      data: {
        muxUploadId: data.muxUploadId,
        userId: data.userId,
        promptId: data.promptId,
        status: data.status,
      }
    });
    return { status: 'success', data: video, message: 'Video record created successfully' };
  } catch (error) {
    console.error('Error creating Mux upload:', error);
    throw error;
  }
}

/**
 * Finalizes a Mux upload (if needed) and updates the video record in the database.
 * @param uploadId - The Mux upload ID.
 * @returns The finalized asset ID.
 */
export async function updateVideoWithMuxInfo(muxUploadId: string, data: Partial<{
  status: VideoStatus;
  muxPlaybackId?: string;
  muxAssetId?: string;
}>): Promise<ActionState> {
  try {
    // Update the video record in the database with new Mux info
    const updatedVideo = await prisma.video.update({
      where: { muxUploadId: muxUploadId },
      data: data
    });

    return { status: 'success', data: updatedVideo, message: 'Video record updated successfully' };
  } catch (error) {
    console.error('Error finalizing video upload:', error);
    throw error;
  }
}
