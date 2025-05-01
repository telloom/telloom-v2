import { NextResponse } from 'next/server';
import { headers, cookies } from 'next/headers';
import Mux from '@mux/mux-node';
import { supabaseAdmin } from '@/utils/supabase/service-role';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { getEffectiveSharerId } from '@/utils/supabase/role-helpers'; // Import helper if needed

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
            // No-op for setting cookies in read-only Route Handler context
            // console.warn('[API /mux/topic-upload-url] Attempted to set cookie (noop for request)', name);
          },
          remove(name: string, options: CookieOptions) {
            // Handle removal if necessary, though less common in POST
            // console.warn('[API /mux/topic-upload-url] Attempted to remove cookie (noop for request)', name);
            // cookieStore.set({ name, value: '', ...options }); // Potential way to handle removal if needed
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

    // Get request body
    const body = await request.json();
    console.log('[API /mux/topic-upload-url] Request body:', body);

    const { promptCategoryId, targetSharerId: requestedTargetSharerId } = body; // Expect targetSharerId from executor requests
    if (!promptCategoryId) {
      console.warn('[API /mux/topic-upload-url] Missing promptCategoryId');
      return NextResponse.json({ error: 'Missing promptCategoryId' }, { status: 400 });
    }

    // --- Determine the Effective Sharer ID and Validate Access ---
    let effectiveSharerId: string;

    // 1. Get the authenticated user's own sharer ID (if they are one)
    const { data: selfSharerProfile, error: selfSharerError } = await supabaseAdmin
        .from('ProfileSharer')
        .select('id')
        .eq('profileId', user.id)
        .maybeSingle(); // Use maybeSingle as user might not be a sharer

    if (selfSharerError) {
        console.error(`[API /mux/topic-upload-url] Error fetching self sharer profile for user ${user.id}:`, selfSharerError);
        return NextResponse.json({ error: 'Failed to verify user identity.' }, { status: 500 });
    }
    const currentUserSharerId = selfSharerProfile?.id;
    console.log(`[API /mux/topic-upload-url] Current user ${user.id} sharer ID check result: ${currentUserSharerId}`);

    if (requestedTargetSharerId) {
        // targetSharerId was provided in the request body

        if (currentUserSharerId && requestedTargetSharerId === currentUserSharerId) {
            // Case 1: User is a Sharer uploading for themselves (targetSharerId matches own sharerId)
            console.log(`[API /mux/topic-upload-url] Sharer ${user.id} uploading for self (targetSharerId matched own).`);
            effectiveSharerId = currentUserSharerId;
        } else {
            // Case 2: User is potentially an Executor/Admin uploading for someone else
            console.log(`[API /mux/topic-upload-url] Request has targetSharerId ${requestedTargetSharerId}, validating executor/admin access for user ${user.id}.`);

            // Check if the user is an executor for the target sharer
            const { data: relationship, error: execError } = await supabaseAdmin
                .from('ProfileExecutor')
                .select('id')
                .eq('executorId', user.id) // Current authenticated user
                .eq('sharerId', requestedTargetSharerId) // The sharer they claim to represent
                .maybeSingle();

            if (execError) {
                console.error(`[API /mux/topic-upload-url] Error checking executor relationship:`, execError);
                return NextResponse.json({ error: 'Failed to verify access rights.' }, { status: 500 });
            }

            // Add admin check here if needed in the future

            if (!relationship) { // If not an executor (and not admin if check added)
                console.warn(`[API /mux/topic-upload-url] Access Denied: User ${user.id} is not an authorized executor/admin for sharer ${requestedTargetSharerId}.`);
                return NextResponse.json({ error: 'Forbidden: You do not have permission to upload for this sharer.' }, { status: 403 });
            }

            console.log(`[API /mux/topic-upload-url] Access confirmed: User ${user.id} is authorized executor/admin for sharer ${requestedTargetSharerId}.`);
            effectiveSharerId = requestedTargetSharerId; // Use the validated targetSharerId
        }

    } else {
        // targetSharerId was NOT provided in the request body - User MUST be a sharer

        if (!currentUserSharerId) {
            // User is not a sharer and didn't provide a targetSharerId
            console.warn(`[API /mux/topic-upload-url] Access Denied: User ${user.id} is not a sharer and no targetSharerId provided.`);
            // Consider if a different error/status is more appropriate, but 403 seems reasonable
            return NextResponse.json({ error: 'Forbidden: Sharer identity not found or target not specified.' }, { status: 403 });
        }

        // Case 3: User is a Sharer uploading for themselves (no targetSharerId provided)
        console.log(`[API /mux/topic-upload-url] User ${user.id} is a sharer uploading for self (no targetSharerId provided).`);
        effectiveSharerId = currentUserSharerId;
    }

    // At this point, 'effectiveSharerId' should be correctly set and validated.
    console.log(`[API /mux/topic-upload-url] Using effectiveSharerId: ${effectiveSharerId} for subsequent operations.`);

    // --- Role Check Removed - Replaced by validation above ---
    /*
    // Old logic removed/commented out
    */

    // Get CORS headers
    const headersList = await headers();
    const origin = headersList.get('origin');
    const corsOrigin = origin || process.env.NEXT_PUBLIC_APP_URL || '*';

    // --- Check for and Handle Existing Video ---
    // Use the now correctly determined profileSharerId
    console.log(`[API /mux/topic-upload-url] Checking for existing video for promptCategoryId: ${promptCategoryId}, profileSharerId: ${effectiveSharerId}`);
    const { data: existingVideos, error: existingError } = await supabaseAdmin
      .from('TopicVideo')
      // Select muxAssetId as well for deletion
      .select('id, muxAssetId')
      .eq('promptCategoryId', promptCategoryId)
      .eq('profileSharerId', effectiveSharerId); // Use the validated profileSharerId

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
    // Create a new video record using the validated profileSharerId
    console.log(`[API /mux/topic-upload-url] Creating new TopicVideo record for promptCategoryId: ${promptCategoryId}, profileSharerId: ${effectiveSharerId}`);
    const { data: videoRecord, error: insertError } = await supabaseAdmin
      .from('TopicVideo')
      .insert({ promptCategoryId, profileSharerId: effectiveSharerId, title: 'Topic Video', status: 'WAITING' }) // Use validated profileSharerId
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
          { resolution: 'highest' }
        ],
        input: [{
          generated_subtitles: [{
            language_code: 'en',
            name: 'English CC'
          }]
        }],
        // Ensure the correct profileSharerId is in the passthrough data
        passthrough: JSON.stringify({
          videoId: videoRecord.id,
          promptCategoryId,
          profileSharerId: effectiveSharerId // Use validated profileSharerId
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