import { NextResponse } from 'next/server';
import { headers, cookies } from 'next/headers';
import Mux from '@mux/mux-node';
import { supabaseAdmin } from '@/utils/supabase/service-role';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

if (!process.env.MUX_TOKEN_ID || !process.env.MUX_TOKEN_SECRET) {
  throw new Error('Missing required Mux environment variables');
}

// Initialize Mux client globally for potential reuse
const muxClient = new Mux({
  tokenId: process.env.MUX_TOKEN_ID,
  tokenSecret: process.env.MUX_TOKEN_SECRET
});

export async function POST(request: Request) {
  console.log('[API /mux/topic-upload-url] Received POST request');
  let supabase;
  let cookieStore;

  // --- Initialize Supabase Client (SSR Route Handler method) ---
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
          set(name: string, value: string, options: CookieOptions) {
            console.warn('[API /mux/topic-upload-url] Attempted to set cookie in Route Handler (noop for request)', name);
          },
          remove(name: string, options: CookieOptions) {
            console.warn('[API /mux/topic-upload-url] Attempted to remove cookie in Route Handler (noop for request)', name);
            cookieStore.set({ name, value: '', ...options });
          },
        },
      }
    );
    console.log('[API /mux/topic-upload-url] Supabase server client created successfully');
  } catch (clientError) {
    console.error('[API /mux/topic-upload-url] FATAL: Failed to create Supabase client:', clientError);
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to initialize backend service.' },
      { status: 500 }
    );
  }

  // --- Main Logic --- 
  try {
    console.log('[API /mux/topic-upload-url] Starting topic video upload request');
    
    // Get user session using the Supabase client
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    console.log('[API /mux/topic-upload-url] User fetched:', { userId: user?.id, error: userError?.message });

    if (userError || !user) {
      console.error('[API /mux/topic-upload-url] Authentication failed:', userError);
      return NextResponse.json({ error: 'Authentication failed' }, { status: 401 });
    }

    // Verify user is a sharer using admin client and user.id
    const { data: sharerProfile, error: sharerError } = await supabaseAdmin
      .from('ProfileSharer')
      .select('id')
      .eq('profileId', user.id)
      .single();

    if (sharerError || !sharerProfile) {
      console.error('[API /mux/topic-upload-url] Failed to find ProfileSharer for user:', { userId: user.id, error: sharerError });
      // THIS is where the 403 originates if the DB check fails
      return NextResponse.json(
        { error: 'User is not registered as a sharer or fetch failed.' }, 
        { status: 403 } 
      );
    }
    const profileSharerId = sharerProfile.id;
    console.log('[API /mux/topic-upload-url] Verified user is a sharer:', { userId: user.id, profileSharerId });

    // Get CORS headers
    const headersList = await headers();
    const origin = headersList.get('origin');
    const corsOrigin = origin || process.env.NEXT_PUBLIC_APP_URL || '*';
    
    // Get request body
    const body = await request.json();
    console.log('[API /mux/topic-upload-url] Request body:', body);
    
    const { promptCategoryId } = body;
    if (!promptCategoryId) {
      console.warn('[API /mux/topic-upload-url] Missing promptCategoryId');
      return NextResponse.json({ error: 'Missing promptCategoryId' }, { status: 400 });
    }

    // --- Check for and Handle Existing Video --- 
    const { data: existingVideos, error: existingError } = await supabaseAdmin
      .from('TopicVideo')
      // Select muxAssetId as well for deletion
      .select('id, muxAssetId') 
      .eq('promptCategoryId', promptCategoryId)
      .eq('profileSharerId', profileSharerId);

    if (existingError) {
      console.error('[API /mux/topic-upload-url] Error checking for existing videos:', existingError);
      throw existingError;
    }

    // If existing video(s) found, delete them first
    if (existingVideos && existingVideos.length > 0) {
      console.log(`[API /mux/topic-upload-url] Found ${existingVideos.length} existing video(s) for category. Deleting...`);
      for (const existingVideo of existingVideos) {
        // 1. Attempt to delete Mux Asset
        if (existingVideo.muxAssetId) {
          try {
            console.log(`[API /mux/topic-upload-url] Attempting to delete Mux asset: ${existingVideo.muxAssetId}`);
            await muxClient.video.assets.delete(existingVideo.muxAssetId);
            console.log(`[API /mux/topic-upload-url] Successfully deleted Mux asset: ${existingVideo.muxAssetId}`);
          } catch (muxDeleteError: any) {
            // Log Mux deletion errors but don't necessarily block DB deletion
            console.error(`[API /mux/topic-upload-url] Failed to delete Mux asset ${existingVideo.muxAssetId}:`, muxDeleteError.message || muxDeleteError);
            // Continue to DB deletion even if Mux asset deletion fails
          }
        }

        // 2. Delete TopicVideo record from DB
        console.log(`[API /mux/topic-upload-url] Deleting TopicVideo record from DB: ${existingVideo.id}`);
        const { error: deleteDbError } = await supabaseAdmin
          .from('TopicVideo')
          .delete()
          .eq('id', existingVideo.id);

        if (deleteDbError) {
          console.error(`[API /mux/topic-upload-url] Failed to delete DB record ${existingVideo.id}:`, deleteDbError);
          // Throw an error here to stop the process if DB deletion fails
          throw new Error(`Failed to delete existing video record: ${deleteDbError.message}`);
        }
        console.log(`[API /mux/topic-upload-url] Successfully deleted DB record: ${existingVideo.id}`);
      }
      // ** IMPORTANT: Do NOT return 409 here. Continue to create the new video. **
    }

    // --- Proceed with Creating New Video --- 
    // Create a new video record
    const { data: videoRecord, error: insertError } = await supabaseAdmin
      .from('TopicVideo')
      .insert({ promptCategoryId, profileSharerId, title: 'Topic Video', status: 'WAITING' })
      .select('id')
      .single();

    if (insertError) {
      console.error('[API /mux/topic-upload-url] Error creating new video record:', insertError);
      throw insertError;
    }
    console.log('[API /mux/topic-upload-url] Created new topic video record:', videoRecord);

    // Create Mux upload
    const uploadConfig = {
      cors_origin: corsOrigin,
      new_asset_settings: {
        playback_policy: ['public'],
        static_renditions: [
          { name: "high.mp4", resolution: "high" },
          { name: "audio.m4a", resolution: "audio-only" }
        ],
        input: [{
          generated_subtitles: [{
            language_code: 'en',
            name: 'English CC'
          }]
        }],
        passthrough: JSON.stringify({
          videoId: videoRecord.id,
          promptCategoryId,
          profileSharerId: profileSharerId
        })
      }
    };
    console.log('[API /mux/topic-upload-url] Creating Mux upload with config:', uploadConfig);
    const upload = await muxClient.video.uploads.create(uploadConfig as any);
    console.log('[API /mux/topic-upload-url] Created Mux upload:', { uploadId: upload.id });

    // Update video record with upload ID
    const { error: updateError } = await supabaseAdmin
      .from('TopicVideo')
      .update({ muxUploadId: upload.id })
      .eq('id', videoRecord.id);

    if (updateError) {
      console.error('[API /mux/topic-upload-url] Error updating video record with upload ID:', updateError);
      // Attempt to clean up Mux upload if DB update fails?
      throw updateError;
    }

    // Return success response
    return NextResponse.json({
      uploadUrl: upload.url,
      uploadId: upload.id,
      videoId: videoRecord.id
    }, {
      headers: { 'Access-Control-Allow-Origin': corsOrigin }
    });

  } catch (error) {
    console.error('[API /mux/topic-upload-url] Error during POST handler (main logic):', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error processing request.';
    return NextResponse.json(
      { error: 'Internal Server Error', message: errorMessage },
      { status: 500 }
    );
  }
} 