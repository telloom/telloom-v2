import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';
import Mux from '@mux/mux-node';

// Add GET handler to return 405 for non-POST requests
export async function GET() {
  return new NextResponse('Method not allowed', { status: 405 });
}

export async function POST() {
  try {
    // Check authentication
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Debug log environment variables (redacted for security)
    console.log('Environment check:', {
      hasMuxTokenId: !!process.env.MUX_TOKEN_ID,
      hasMuxTokenSecret: !!process.env.MUX_TOKEN_SECRET,
      muxTokenIdLength: process.env.MUX_TOKEN_ID?.length,
      muxTokenSecretLength: process.env.MUX_TOKEN_SECRET?.length,
    });

    // Initialize Mux client
    const muxClient = new Mux({
      tokenId: process.env.MUX_TOKEN_ID || '',
      tokenSecret: process.env.MUX_TOKEN_SECRET || '',
    });

    // Debug log Mux client
    console.log('Mux client check:', {
      hasMuxClient: !!muxClient,
      hasVideo: !!muxClient.video,
      videoType: typeof muxClient.video,
    });

    // Create upload URL using muxClient.video
    const upload = await muxClient.video.uploads.create({
      new_asset_settings: {
        playback_policy: ['public'],
        test: process.env.NODE_ENV !== 'production',
      },
      cors_origin: process.env.NEXT_PUBLIC_APP_URL || '*',
    });

    console.log('Upload response:', {
      hasUrl: !!upload?.url,
      hasId: !!upload?.id,
      uploadKeys: Object.keys(upload || {}),
    });

    if (!upload?.url || !upload?.id) {
      throw new Error('Invalid upload response from Mux');
    }

    return NextResponse.json({
      url: upload.url,
      uploadId: upload.id,
    });
  } catch (error) {
    // Enhanced error logging
    console.error('Error details:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create upload URL' },
      { status: 500 }
    );
  }
} 