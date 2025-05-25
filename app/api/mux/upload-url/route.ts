import { NextResponse } from 'next/server';
import { headers, cookies } from 'next/headers';
import Mux from '@mux/mux-node';
import { supabaseAdmin } from '@/utils/supabase/service-role';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

if (!process.env.MUX_TOKEN_ID || !process.env.MUX_TOKEN_SECRET) {
  throw new Error('Missing required Mux environment variables');
}

// Initialize Mux client
const muxClient = new Mux({
  tokenId: process.env.MUX_TOKEN_ID,
  tokenSecret: process.env.MUX_TOKEN_SECRET
});

export async function POST(request: Request) {
  console.log('[API /mux/upload-url] Received POST request');
  let supabase;
  let cookieStore;

  try {
    cookieStore = cookies();
    supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          async get(name: string) {
            return cookieStore.get(name)?.value;
          },
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          set(name: string, _value: string, options: CookieOptions) {
            console.warn('[API /mux/upload-url] Attempted to set cookie in Route Handler (noop for request)', name);
          },
          remove(name: string, options: CookieOptions) {
            console.warn('[API /mux/upload-url] Attempted to remove cookie in Route Handler (noop for request)', name);
            cookieStore.set({ name, value: '', ...options });
          },
        },
      }
    );
    console.log('[API /mux/upload-url] Supabase server client created successfully');
  } catch (clientError) {
    console.error('[API /mux/upload-url] FATAL: Failed to create Supabase client:', clientError);
    // Immediately return JSON error if client creation fails
    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message: 'Failed to initialize backend service. Please try again later.',
        // Optionally include more detail in dev
        // details: clientError instanceof Error ? clientError.message : 'Unknown client creation error'
      },
      { status: 500 }
    );
  }

  // --- Main try block for the rest of the logic ---
  try {
    // Get user session using the successfully created client
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    console.log('[API /mux/upload-url] User fetched:', { userId: user?.id, error: userError?.message });

    if (userError || !user) {
      console.error('[API /mux/upload-url] Authentication failed:', userError);
      return NextResponse.json({ error: 'Authentication failed' }, { status: 401 });
    }

    // Get headers for CORS
    const headersList = await headers();
    const origin = headersList.get('origin');
    const corsOrigin = origin || process.env.NEXT_PUBLIC_APP_URL || '*';
    
    // Get request body - Now expect targetSharerId as well
    const { promptId, targetSharerId } = await request.json();

    if (!promptId || !targetSharerId) {
      console.warn('[API /mux/upload-url] Missing promptId or targetSharerId in request body');
      return NextResponse.json(
        { error: 'Missing required promptId or targetSharerId' },
        { status: 400 }
      );
    }
    console.log('[API /mux/upload-url] Received:', { promptId, targetSharerId });

    // --- CORRECTED PERMISSION CHECK LOGIC ---
    // Use the *provided* targetSharerId for checks
    console.log('[API /mux/upload-url] Checking permissions for user:', user.id, 'against targetSharerId:', targetSharerId);

    const { data: ownerCheck, error: ownerError } = await supabaseAdmin
      .from('ProfileSharer')
      .select('id')
      .eq('id', targetSharerId)      // Check against the targetSharerId
      .eq('profileId', user.id)    // Is the current user the owner?
      .maybeSingle();

    const { data: executorCheck, error: executorError } = await supabaseAdmin
      .from('ProfileExecutor')
      .select('id')
      .eq('sharerId', targetSharerId) // Check against the targetSharerId
      .eq('executorId', user.id)   // Is the current user an executor for this sharer?
      .maybeSingle();

    if (ownerError || executorError) {
      console.error('[API /mux/upload-url] Error checking permissions:', { ownerError, executorError });
      return NextResponse.json({ error: 'Permission check failed' }, { status: 500 });
    }

    const isOwner = !!ownerCheck;
    const isExecutor = !!executorCheck;

    if (!isOwner && !isExecutor) {
      console.warn('[API /mux/upload-url] Permission denied for user:', { userId: user.id, targetSharerId, isOwner, isExecutor });
      return NextResponse.json(
        { error: 'You do not have permission to upload videos for this sharer.' },
        { status: 403 }
      );
    }

    console.log('[API /mux/upload-url] User permission granted:', { userId: user.id, targetSharerId, isOwner, isExecutor });
    // Use the validated targetSharerId for subsequent operations
    const profileSharerId = targetSharerId;
    // --- END CORRECTED PERMISSION CHECK LOGIC ---

    // Check if a video already exists for this prompt and *this specific sharer*
    const { data: existingVideos, error: existingError } = await supabaseAdmin
      .from('Video')
      .select('id, status')
      .eq('promptId', promptId)
      .eq('profileSharerId', profileSharerId); // Use the validated sharerId

    if (existingError) {
      console.error('[API /mux/upload-url] Error checking for existing videos:', existingError);
      throw existingError;
    }

    // If there's an existing video that's not in WAITING or ERRORED state, return conflict
    const activeVideo = existingVideos?.find(v => !['WAITING', 'ERRORED'].includes(v.status));
    if (activeVideo) {
      console.log('Found existing active video for prompt:', {
        promptId,
        profileSharerId,
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

    // Create a new video record for the correct sharer
    const { data: videoRecord, error: insertError } = await supabaseAdmin
      .from('Video')
      .insert({
        promptId,
        profileSharerId: profileSharerId, // Use the validated sharerId
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
        static_renditions: [
          { resolution: 'highest' }
        ],
        input: [{
          generated_subtitles: [{
            language_code: 'en',
            name: 'English CC'
          }]
        }],
        passthrough: JSON.stringify({
          videoId: videoRecord.id,
          promptId,
          profileSharerId: profileSharerId
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
      console.error('Error updating video record with upload ID:', updateError);
      throw updateError;
    }

    console.log('[API /mux/upload-url] Successfully updated video record with Mux upload ID');

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
    // --- Catch block for errors *after* successful client creation ---
    console.error('[API /mux/upload-url] Error during POST handler (main logic):', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred during processing.';
    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message: errorMessage,
      },
      { status: 500 }
    );
  }
} 