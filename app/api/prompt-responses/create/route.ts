import { NextRequest, NextResponse } from 'next/server';
import { createAsset } from '@/utils/muxClient';
import { db } from '@/db/db';
import { promptResponsesTable } from '@/db/schema/prompt_responses';
import { videosTable } from '@/db/schema/videos';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  const { uploadId, promptId } = await request.json();

  try {
    const asset = await createAsset(uploadId);
    
    // Get the user ID from the session
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user.id;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Insert video information into the database
    const [video] = await db.insert(videosTable).values({
      userId,
      muxAssetId: asset.id,
      muxPlaybackId: asset.playback_ids[0].id,
      status: 'processing',
    }).returning();

    // Create prompt response
    const [promptResponse] = await db.insert(promptResponsesTable).values({
      userId,
      promptId,
      videoId: video.id,
    }).returning();

    return NextResponse.json({ success: true, promptResponseId: promptResponse.id });
  } catch (error) {
    console.error('Failed to create prompt response:', error);
    return NextResponse.json({ error: 'Failed to create prompt response' }, { status: 500 });
  }
}