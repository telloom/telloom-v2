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
    console.log('Starting topic video upload request');
    
    // Get headers for auth and CORS
    const headersList = await headers();
    const authHeader = headersList.get('authorization');
    const origin = headersList.get('origin');
    const corsOrigin = origin || process.env.NEXT_PUBLIC_APP_URL || '*';
    
    console.log('Headers received:', { 
      hasAuth: !!authHeader,
      origin,
      corsOrigin 
    });

    if (!authHeader) {
      return NextResponse.json(
        { error: 'Missing authorization header' },
        { status: 401 }
      );
    }

    // Get the profile with sharer data
    const profile = await getProfile(authHeader);
    console.log('Profile retrieved:', { 
      hasProfile: !!profile,
      hasSharerId: !!profile?.sharerId 
    });

    if (!profile || !profile.sharerId) {
      return NextResponse.json(
        { error: 'User is not a sharer' },
        { status: 403 }
      );
    }

    // Get request body
    const body = await request.json();
    console.log('Request body:', body);
    
    const { promptCategoryId } = body;
    if (!promptCategoryId) {
      return NextResponse.json(
        { error: 'Missing promptCategoryId' },
        { status: 400 }
      );
    }

    // Check if a video already exists for this category using admin client
    const { data: existingVideos, error: existingError } = await supabaseAdmin
      .from('TopicVideo')
      .select('id')
      .eq('promptCategoryId', promptCategoryId)
      .eq('profileSharerId', profile.sharerId);

    if (existingError) {
      console.error('Error checking for existing videos:', existingError);
      throw existingError;
    }

    // If there's an existing video, return conflict
    if (existingVideos?.length > 0) {
      console.log('Found existing video for category:', {
        promptCategoryId,
        profileSharerId: profile.sharerId,
        existingVideos
      });
      return NextResponse.json(
        { error: 'You have already uploaded a video for this topic' },
        { status: 409 }
      );
    }

    // Create a new video record first using admin client
    const { data: videoRecord, error: insertError } = await supabaseAdmin
      .from('TopicVideo')
      .insert({
        promptCategoryId,
        profileSharerId: profile.sharerId,
        title: 'Topic Video',
        url: 'https://stream.mux.com/pending/low.mp4',
        status: 'WAITING'
      })
      .select('id')
      .single();

    if (insertError) {
      console.error('Error creating video record:', insertError);
      throw insertError;
    }

    console.log('Created topic video record:', videoRecord);

    // Create a new direct upload using Mux SDK
    const uploadConfig = {
      cors_origin: corsOrigin,
      new_asset_settings: {
        playback_policy: ['public'],
        mp4_support: 'capped-1080p',
        master_access: 'temporary',
        input: [{
          generated_subtitles: [{
            language_code: 'en',
            name: 'English CC'
          }]
        }],
        passthrough: JSON.stringify({
          videoId: videoRecord.id,
          promptCategoryId,
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
      .from('TopicVideo')
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
    console.error('Error creating upload:', {
      error,
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 