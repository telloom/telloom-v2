import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';
import Mux from '@mux/mux-node';
import { headers } from 'next/headers';

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

    // Validate Mux credentials
    const muxTokenId = process.env.MUX_TOKEN_ID;
    const muxTokenSecret = process.env.MUX_TOKEN_SECRET;

    if (!muxTokenId || !muxTokenSecret) {
      console.error('Missing Mux credentials');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    // Get origin for CORS
    const headersList = headers();
    const origin = headersList.get('origin') || process.env.NEXT_PUBLIC_APP_URL || '*';

    // Initialize Mux client
    const muxClient = new Mux({
      tokenId: muxTokenId,
      tokenSecret: muxTokenSecret,
    });

    // Create upload URL with proper CORS and test mode settings
    const upload = await muxClient.video.uploads.create({
      new_asset_settings: {
        playback_policy: ['public'],
        test: process.env.NODE_ENV !== 'production',
      },
      cors_origin: origin,
    });

    if (!upload?.url || !upload?.id) {
      console.error('Invalid Mux upload response:', upload);
      return NextResponse.json(
        { error: 'Failed to create upload URL' },
        { status: 500 }
      );
    }

    // Return the upload URL and ID
    return NextResponse.json({
      uploadUrl: upload.url,
      uploadId: upload.id,
    });
  } catch (error) {
    // Enhanced error logging
    console.error('Mux upload URL error:', {
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