import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/db';
import { videosTable } from '@/db/schema/videos';
import { promptResponsesTable } from '@/db/schema/prompt_responses';

export async function POST(request: NextRequest) {
  const { uploadId, promptId, userId } = await request.json();
  console.log('Received request:', { uploadId, promptId, userId });

  try {
    console.log('Inserting video into database...');
    const [video] = await db.insert(videosTable).values({
      userId,
      muxUploadId: uploadId,
      status: 'processing',
    }).returning();
    console.log('Inserted video:', video);

    console.log('Creating prompt response...');
    const [promptResponse] = await db.insert(promptResponsesTable).values({
      userId,
      promptId,
      videoId: video.id,
    }).returning();
    console.log('Created prompt response:', promptResponse);

    return NextResponse.json({ success: true, promptResponseId: promptResponse.id });
  } catch (error) {
    console.error('Failed to create video and prompt response:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    return NextResponse.json({ error: 'Failed to process upload', details: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}