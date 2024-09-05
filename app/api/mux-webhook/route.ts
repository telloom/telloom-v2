import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/db';
import { videosTable } from '@/db/schema/videos';
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
  
    // Log the raw request
    const logEntry = `
Timestamp: ${new Date().toISOString()}
Headers: ${JSON.stringify(headers, null, 2)}
Body: ${rawBody}
---------------------
`;
    console.log(logEntry);
  
    // Log to file
    const logDir = path.join(process.cwd(), 'logs');
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir);
    }
    fs.appendFileSync(path.join(logDir, 'mux-webhook-logs.txt'), logEntry);

    const signature = request.headers.get('mux-signature') || '';
    
    if (!verifyMuxSignature(rawBody, signature)) {
      console.error('Invalid signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const webhookData = JSON.parse(rawBody);
    console.log('Received webhook event:', webhookData.type);
    console.log('Webhook data:', JSON.stringify(webhookData, null, 2));

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
  console.log('Handling upload asset created event:', data);
  const { id: uploadId, asset_id: assetId } = data;
  try {
    const [updatedVideo] = await db
      .update(videosTable)
      .set({
        muxAssetId: assetId,
        status: 'processing',
      })
      .where(eq(videosTable.muxUploadId, uploadId))
      .returning();
    console.log('Updated video with asset ID:', updatedVideo);
    return NextResponse.json({ success: true, message: 'Video updated with asset ID' });
  } catch (error) {
    console.error('Failed to update video with asset ID:', error);
    return NextResponse.json({ error: 'Failed to update video' }, { status: 500 });
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
  console.log('Handling asset ready event:', data);
  const { id: assetId, duration, aspect_ratio } = data;
  try {
    const [updatedVideo] = await db
      .update(videosTable)
      .set({
        status: 'ready',
        duration,
        aspectRatio: aspect_ratio,
      })
      .where(eq(videosTable.muxAssetId, assetId))
      .returning();
    console.log('Updated video as ready:', updatedVideo);
    return NextResponse.json({ success: true, message: 'Video marked as ready' });
  } catch (error) {
    console.error('Failed to mark video as ready:', error);
    return NextResponse.json({ error: 'Failed to update video' }, { status: 500 });
  }
}