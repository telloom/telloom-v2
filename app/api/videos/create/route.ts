// app/api/videos/create/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createAsset } from '@/utils/muxClient';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  const { uploadId } = await request.json();

  try {
    const asset = await createAsset(uploadId);
    
    // Get the user ID from the session
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user.id;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Insert video information into the database
    const { data, error } = await supabase
      .from('videos')
      .insert({
        user_id: userId,
        mux_asset_id: asset.id,
        mux_playback_id: asset.playback_ids[0].id,
        status: 'processing',
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, videoId: data.id });
  } catch (error) {
    console.error('Failed to create video:', error);
    return NextResponse.json({ error: 'Failed to create video' }, { status: 500 });
  }
}