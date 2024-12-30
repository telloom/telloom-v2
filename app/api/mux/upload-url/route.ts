import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import Mux from '@mux/mux-node';
import { supabaseAdmin } from '@/utils/supabase/service-role';
import { getProfile } from '@/lib/auth/profile';

const { Video } = new Mux({
  tokenId: process.env.MUX_TOKEN_ID!,
  tokenSecret: process.env.MUX_TOKEN_SECRET!,
});

export async function POST(request: Request) {
  try {
    // Get headers for auth and CORS
    const headersList = headers();
    const authHeader = await headersList.get('authorization');
    const origin = await headersList.get('origin');
    const corsOrigin = origin || process.env.NEXT_PUBLIC_APP_URL || '*';
    
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Missing authorization header' },
        { status: 401 }
      );
    }

    // Get the profile with sharer data
    const profile = await getProfile(authHeader);
    if (!profile || !profile.sharerId) {
      return NextResponse.json(
        { error: 'User is not a sharer' },
        { status: 403 }
      );
    }

    // Get request body
    const { promptId } = await request.json();
    if (!promptId) {
      return NextResponse.json(
        { error: 'Missing promptId' },
        { status: 400 }
      );
    }

    // Check if a video already exists for this prompt using admin client
    const { data: existingVideos, error: existingError } = await supabaseAdmin
      .from('Video')
      .select('id')
      .eq('promptId', promptId)
      .not('status', 'eq', 'ERRORED');

    if (existingError) {
      console.error('Error checking for existing videos:', existingError);
      throw existingError;
    }

    if (existingVideos && existingVideos.length > 0) {
      return NextResponse.json(
        { error: 'A video already exists for this prompt' },
        { status: 409 }
      );
    }

    // Create a new video record first using admin client
    const { data: video, error: insertError } = await supabaseAdmin
      .from('Video')
      .insert({
        promptId,
        profileSharerId: profile.sharerId,
        status: 'WAITING'
      })
      .select('id')
      .single();

    if (insertError) {
      console.error('Error creating video record:', insertError);
      throw insertError;
    }

    console.log('Created video record:', video);

    // Create a new direct upload
    const upload = await Video.Uploads.create({
      cors_origin: corsOrigin,
      new_asset_settings: {
        playback_policy: ['public'],
        passthrough: JSON.stringify({
          videoId: video.id,
          promptId,
          profileSharerId: profile.sharerId
        })
      }
    });

    console.log('Created Mux upload:', upload);

    // Update video record with upload ID using admin client
    const { error: updateError } = await supabaseAdmin
      .from('Video')
      .update({
        muxUploadId: upload.id
      })
      .eq('id', video.id);

    if (updateError) {
      console.error('Error updating video record:', updateError);
      throw updateError;
    }

    // Return the response in the format expected by the frontend
    return NextResponse.json({
      uploadUrl: upload.url,
      uploadId: upload.id,
      videoId: video.id
    }, {
      headers: {
        'Access-Control-Allow-Origin': corsOrigin
      }
    });
  } catch (error) {
    console.error('Error creating upload:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 