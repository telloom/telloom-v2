import { NextRequest, NextResponse } from 'next/server';
import { getAsset } from '@/utils/muxClient';
import { db } from '@/db/db';
import { videosTable } from '@/db/schema/videos';
import { promptResponsesTable } from '@/db/schema/prompt_responses';

export async function POST(request: NextRequest) {
  const { assetId, promptId, userId } = await request.json();

  try {
    const asset = await getAsset(assetId);

    // Insert video information
    const [video] = await db.insert(videosTable).values({
      userId,
      muxAssetId: assetId,
      muxPlaybackId: asset.playbackId,
      status: 'ready',
    }).returning();

    // Create prompt response
    const [promptResponse] = await db.insert(promptResponsesTable).values({
      userId,
      promptId,
      videoId: video.id,
    }).returning();

    return NextResponse.json({ success: true, promptResponseId: promptResponse.id });
  } catch (error) {
    console.error('Failed to create video and prompt response:', error);
    return NextResponse.json({ error: 'Failed to process upload' }, { status: 500 });
  }
}