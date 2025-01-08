import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import Mux from '@mux/mux-node';
import { supabaseAdmin } from '@/utils/supabase/service-role';
import { getProfile } from '@/lib/auth/profile';

if (!process.env.MUX_TOKEN_ID || !process.env.MUX_TOKEN_SECRET) {
  throw new Error('Missing required Mux environment variables');
}

// Initialize Mux client
const muxClient = new Mux({
  tokenId: process.env.MUX_TOKEN_ID,
  tokenSecret: process.env.MUX_TOKEN_SECRET
});

export async function POST(request: Request) {
  try {
    // Get headers for auth and CORS
    const headersList = await headers();
    const authHeader = headersList.get('authorization');
    const origin = headersList.get('origin');
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
      .select('id, status')
      .eq('promptId', promptId)
      .eq('profileSharerId', profile.sharerId);

    if (existingError) {
      console.error('Error checking for existing videos:', existingError);
      throw existingError;
    }

    // If there's an existing video that's not in WAITING or ERRORED state, return conflict
    const activeVideo = existingVideos?.find(v => !['WAITING', 'ERRORED'].includes(v.status));
    if (activeVideo) {
      console.log('Found existing active video for prompt:', {
        promptId,
        profileSharerId: profile.sharerId,
        existingVideos
      });
      return NextResponse.json(
        { error: 'You have already uploaded a video for this prompt' },
        { status: 409 }
      );
    }

    // If there are any videos in WAITING or ERRORED state, delete them
    if (existingVideos?.length > 0) {
      const { error: deleteError } = await supabaseAdmin
        .from('Video')
        .delete()
        .in('id', existingVideos.map(v => v.id));

      if (deleteError) {
        console.error('Error deleting stale videos:', deleteError);
        throw deleteError;
      }
    }

    // Create a new video record first using admin client
    const { data: videoRecord, error: insertError } = await supabaseAdmin
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

    console.log('Created video record:', videoRecord);

    // Create a new direct upload using Mux SDK
    const uploadConfig = {
      cors_origin: corsOrigin,
      new_asset_settings: {
        playback_policy: ['public'],
        input: [{
          generated_subtitles: [{
            language_code: 'en',
            name: 'English CC'
          }]
        }],
        passthrough: JSON.stringify({
          videoId: videoRecord.id,
          promptId,
          profileSharerId: profile.sharerId
        })
      }
    };

    console.log('Creating Mux upload with config:', uploadConfig);
    const upload = await muxClient.video.uploads.create(uploadConfig as any);

    console.log('Created Mux upload:', {
      uploadId: upload.id,
      config: uploadConfig
    });

    // Update video record with upload ID using admin client
    const { error: updateError } = await supabaseAdmin
      .from('Video')
      .update({
        muxUploadId: upload.id
      })
      .eq('id', videoRecord.id);

    if (updateError) {
      console.error('Error updating video record:', updateError);
      throw updateError;
    }

    // Return the response in the format expected by the frontend
    return NextResponse.json({
      uploadUrl: upload.url,
      uploadId: upload.id,
      videoId: videoRecord.id
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