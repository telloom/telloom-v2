"use server";

import { db } from '@/db/db';
import { videosTable } from '@/db/schema/videos';
import { v4 as uuidv4 } from 'uuid';
import Mux from '@mux/mux-node';
import { eq } from 'drizzle-orm';

// Initialize Mux and log the object
const muxClient = new Mux();

// Log the initialized muxClient object to see its properties
console.log(muxClient);  // <-- This will log the entire Mux client object

// Try to destructure 'Video' after confirming it exists
const { Video } = muxClient;

export async function createUploadUrl(promptId: string, userId: string) {
  try {
    const upload = await Video.Uploads.create({
      new_asset_settings: {
        playback_policy: 'public',
        passthrough: uuidv4()
      },
      cors_origin: '*'
    });

    const [video] = await db.insert(videosTable).values({
      userId,
      promptId,
      muxUploadId: upload.id,
      passthrough: upload.new_asset_settings.passthrough
    }).returning();

    return {
      uploadUrl: upload.url,
      uploadId: video.id
    };
  } catch (error) {
    console.error('Error creating upload URL:', error);
    throw new Error('Failed to create upload URL');
  }
}

export async function finalizeVideoUpload(uploadId: string) {
  try {
    const [video] = await db
      .select()
      .from(videosTable)
      .where(eq(videosTable.id, parseInt(uploadId, 10)));

    if (!video) {
      throw new Error('Video not found');
    }

    const asset = await Video.Assets.get(video.muxAssetId);

    await db
      .update(videosTable)
      .set({
        muxAssetId: asset.id,
        muxPlaybackId: asset.playback_ids[0].id,
        status: asset.status,
        duration: asset.duration,
        aspectRatio: asset.aspect_ratio,
        videoQuality: asset.max_stored_resolution,
        maxWidth: asset.max_stored_frame_width,
        maxHeight: asset.max_stored_frame_height,
        maxFrameRate: asset.max_stored_frame_rate,
        languageCode: asset.language_code,
        resolutionTier: asset.resolution_tier
      })
      .where(eq(videosTable.id, uploadId));

    return { status: 'success' };
  } catch (error) {
    console.error('Error finalizing video upload:', error);
    return { status: 'error', message: 'Failed to finalize video upload' };
  }
}
