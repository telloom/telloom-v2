import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/db';
import { videosTable } from '@/db/schema/videos';
import { uploadInfoTable } from '@/db/schema/uploadInfo';
import crypto from 'crypto';
import { eq } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';

const MUX_WEBHOOK_SECRET = process.env.MUX_WEBHOOK_SECRET;

function verifyMuxSignature(rawBody: string, signature: string): boolean {
  if (!MUX_WEBHOOK_SECRET) {
    console.error('MUX_WEBHOOK_SECRET is not set');
    return false;
  }

  const [timestamp, v1sig] = signature.split(',');
  const [, timestampValue] = timestamp.split('=');
  const [, v1sigValue] = v1sig.split('=');

  const hash = crypto
    .createHmac('sha256', MUX_WEBHOOK_SECRET)
    .update(`${timestampValue}.${rawBody}`)
    .digest('hex');

  console.log('Calculated hash:', hash);
  console.log('Received signature:', v1sigValue);

  return hash === v1sigValue;
}

export async function POST(request: NextRequest) {
  console.log('Received webhook request in mux-webhook route');
  try {
    const rawBody = await request.text();
    const headers = Object.fromEntries(request.headers.entries());
    const signature = request.headers.get('mux-signature') || '';

    // Log the raw request
    const logEntry = `
Timestamp: ${new Date().toISOString()}
Headers: ${JSON.stringify(headers, null, 2)}
Body: ${rawBody}
Mux signature: ${signature}
---------------------
`;
    console.log(logEntry);

    // Log to file
    const logDir = path.join(process.cwd(), 'logs');
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir);
    }
    fs.appendFileSync(path.join(logDir, 'mux-webhook-logs.txt'), logEntry);

    console.log('Received webhook data:', rawBody);
    console.log('Webhook headers:', JSON.stringify(headers, null, 2));
    console.log('Mux signature:', signature);

    if (!verifyMuxSignature(rawBody, signature)) {
      console.error('Invalid signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const webhookData = JSON.parse(rawBody);
    console.log('Parsed webhook data:', JSON.stringify(webhookData, null, 2));

    // Process the webhook data
    switch (webhookData.type) {
      case 'video.upload.created':
        return handleUploadCreated(webhookData.data);
      case 'video.upload.asset_created':
        return handleUploadAssetCreated(webhookData.data);
      case 'video.asset.created':
        return handleAssetCreated(webhookData.data);
      case 'video.asset.ready':
        return handleAssetReady(webhookData.data);
      default:
        console.log('Unhandled event type:', webhookData.type);
        return NextResponse.json({ success: true, message: 'Event received but not processed' });
    }
  } catch (error) {
    console.error('Unexpected error in Mux webhook handler:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function handleUploadCreated(data: any) {
  console.log('Handling upload created event:', data);
  // This event occurs when the upload is initiated
  // We don't need to update the database at this stage, as we've already created the video entry
  return NextResponse.json({ success: true, message: 'Upload creation logged' });
}

async function handleUploadAssetCreated(data: any) {
  console.log('Handling upload asset created event:', JSON.stringify(data, null, 2));
  const { id: uploadId, asset_id: assetId } = data;
  try {
    // Retrieve the stored user ID
    const [uploadInfo] = await db
      .select()
      .from(uploadInfoTable)
      .where(eq(uploadInfoTable.muxUploadId, uploadId));

    if (!uploadInfo) {
      console.error('No upload info found for uploadId:', uploadId);
      return NextResponse.json({ error: 'Upload info not found' }, { status: 404 });
    }

    console.log('Updating video with uploadId:', uploadId);
    const updateResult = await db
      .update(videosTable)
      .set({
        muxAssetId: assetId,
        status: 'processing',
      })
      .where(eq(videosTable.muxUploadId, uploadId))
      .returning();
    console.log('Update result:', updateResult);

    if (updateResult.length === 0) {
      console.log('No video found with uploadId:', uploadId);
      console.log('Attempting to insert new video record');
      const insertResult = await db
        .insert(videosTable)
        .values({
          muxUploadId: uploadId,
          muxAssetId: assetId,
          status: 'processing',
          userId: uploadInfo.userId,
        })
        .returning();
      console.log('Insert result:', insertResult);
    }

    // Delete the upload info as it's no longer needed
    await db
      .delete(uploadInfoTable)
      .where(eq(uploadInfoTable.muxUploadId, uploadId));

    return NextResponse.json({ success: true, message: 'Video updated or created' });
  } catch (error) {
    console.error('Error in handleUploadAssetCreated:', error);
    return NextResponse.json({ error: 'Failed to update or create video' }, { status: 500 });
  }
}

async function handleAssetCreated(data: any) {
  console.log('Handling asset created event:', data);
  const { id: assetId, playback_ids } = data;
  try {
    const [updatedVideo] = await db
      .update(videosTable)
      .set({
        muxPlaybackId: playback_ids[0]?.id,
        status: 'processing',
      })
      .where(eq(videosTable.muxAssetId, assetId))
      .returning();
    console.log('Updated video with playback ID:', updatedVideo);
    return NextResponse.json({ success: true, message: 'Video updated with playback ID' });
  } catch (error) {
    console.error('Failed to update video with playback ID:', error);
    return NextResponse.json({ error: 'Failed to update video' }, { status: 500 });
  }
}

async function handleAssetReady(data: any) {
  console.log('Handling asset ready event:', JSON.stringify(data, null, 2));
  const { id: assetId, duration, aspect_ratio, upload_id } = data;
  try {
    console.log('Updating video with assetId:', assetId);
    const updateResult = await db
      .update(videosTable)
      .set({
        status: 'ready',
        duration,
        aspectRatio: aspect_ratio,
      })
      .where(eq(videosTable.muxAssetId, assetId))
      .returning();
    console.log('Update result:', updateResult);

    if (updateResult.length === 0) {
      console.log('No video found with assetId:', assetId);
      console.log('Attempting to find video by upload_id:', upload_id);
      const selectResult = await db
        .select()
        .from(videosTable)
        .where(eq(videosTable.muxUploadId, upload_id));
      console.log('Select result:', selectResult);

      if (selectResult.length > 0) {
        console.log('Video found by upload_id. Updating...');
        const updateByUploadIdResult = await db
          .update(videosTable)
          .set({
            status: 'ready',
            duration,
            aspectRatio: aspect_ratio,
            muxAssetId: assetId,
          })
          .where(eq(videosTable.muxUploadId, upload_id))
          .returning();
        console.log('Update by upload_id result:', updateByUploadIdResult);
      } else {
        console.log('No video found with upload_id:', upload_id);
      }
    }

    return NextResponse.json({ success: true, message: 'Video processed' });
  } catch (error) {
    console.error('Error in handleAssetReady:', error);
    return NextResponse.json({ error: 'Failed to update video' }, { status: 500 });
  }
}