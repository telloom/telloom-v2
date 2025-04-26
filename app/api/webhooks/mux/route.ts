import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { supabaseAdmin } from '@/utils/supabase/service-role';

export async function POST(request: Request) {
  try {
    // Get Mux signature headers
    const headersList = await headers();
    const muxSignature = headersList.get('mux-signature');

    // Verify webhook signature in production
    if (process.env.NODE_ENV === 'production' && process.env.MUX_VIDEO_WEBHOOK_SECRET) {
      if (!muxSignature) {
        return NextResponse.json(
          { error: 'Missing Mux signature' },
          { status: 401 }
        );
      }
      // TODO: Implement signature verification
    }

    const body = await request.json();
    const { type: eventType, data: eventData } = body;
    console.log('Processing webhook event:', { eventType, eventData });

    // Parse passthrough data
    let passthrough;
    try {
      passthrough = JSON.parse(eventData.passthrough || '{}');
    } catch (error) {
      console.error('Error parsing passthrough:', error);
      return NextResponse.json({ error: 'Invalid passthrough data' }, { status: 400 });
    }

    // Initialize videoId
    let videoId = passthrough.videoId;

    // For track.ready events, we'll handle video lookup in the case itself
    if (eventType === 'video.asset.track.ready') {
      // Skip initial video lookup for track ready events
      // We'll look up the video by muxAssetId in the track ready case
      videoId = null; // We'll set this in the track ready case
    } else {
      // Try to find by muxUploadId if not in passthrough
      if (!videoId && eventData.id) {
        console.log('No videoId in passthrough, trying to find by muxUploadId:', eventData.id);
        const { data: videos, error: findError } = await supabaseAdmin
          .from('Video')
          .select('id')
          .eq('muxUploadId', eventData.id)
          .limit(1);

        if (findError) {
          console.error('Error finding video by muxUploadId:', findError);
          return NextResponse.json({ error: 'Error finding video' }, { status: 500 });
        }

        if (videos && videos.length > 0) {
          videoId = videos[0].id;
        }
      }

      if (!videoId) {
        console.error('Could not find videoId');
        return NextResponse.json({ error: 'Video not found' }, { status: 404 });
      }
    }

    // Handle different event types
    switch (eventType) {
      case 'video.upload.asset_created': {
        const { asset_id } = eventData;
        console.log('Processing asset created event:', { asset_id, videoId });

        // Update video record with asset ID
        const { error: updateError } = await supabaseAdmin
          .from('Video')
          .update({
            muxAssetId: asset_id,
            status: 'ASSET_CREATED'
          })
          .eq('id', videoId);

        if (updateError) {
          console.error('Error updating video record:', updateError);
          throw updateError;
        }
        break;
      }

      case 'video.asset.track.ready': {
        const {
          text_source,
          text_type,
          status,
          id: text_track_id,
          asset_id,
          name,
          language_code
        } = eventData;

        console.log('Received track ready event:', {
          text_source,
          text_type,
          status,
          text_track_id,
          asset_id,
          name,
          language_code,
          eventData
        });

        // Only process generated captions
        if (text_source !== 'generated_vod' || text_type !== 'subtitles' || status !== 'ready') {
          console.log('Skipping track event - not a ready generated subtitle:', {
            text_source,
            text_type,
            status
          });
          break;
        }

        // Check if this asset ID exists in the Video table before proceeding
        const { data: checkVideoData, error: checkVideoError } = await supabaseAdmin
          .from('Video')
          .select('id')
          .eq('muxAssetId', asset_id)
          .maybeSingle(); // Use maybeSingle to handle 0 or 1 result

        if (checkVideoError) {
            console.error(`[Main Webhook - Track Ready] Error checking Video table for asset ${asset_id}:`, checkVideoError);
            throw checkVideoError; // Propagate DB errors
        }

        if (!checkVideoData) {
            console.log(`[Main Webhook - Track Ready] Asset ${asset_id} not found in Video table. Assuming TopicVideo event. Ignoring.`);
            return NextResponse.json({ message: 'Event ignored (handled by topic video webhook)' }, { status: 200 });
        }

        // Get video by muxAssetId (We already confirmed it exists)
        const { data: video, error: videoError } = await supabaseAdmin
          .from('Video')
          .select('id, muxPlaybackId')
          .eq('muxAssetId', asset_id)
          .single(); // Safe to use single() now

        if (videoError || !video?.muxPlaybackId) {
          // This case should be less likely now, but kept for safety
          console.error('Error getting video by asset ID (after check):', { videoError, asset_id });
          throw videoError || new Error('Video not found or missing playback ID (after check)');
        }

        // Set videoId for the rest of the function
        videoId = video.id;
        console.log('Found video for transcript:', { videoId, muxPlaybackId: video.muxPlaybackId });

        // Fetch the transcript with retries
        const MAX_RETRIES = 3;
        let transcript = null;
        let lastError = null;

        for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
          try {
            const transcriptUrl = `https://stream.mux.com/${video.muxPlaybackId}/text/${text_track_id}.txt`;
            console.log(`Fetching transcript (attempt ${attempt}/${MAX_RETRIES}):`, transcriptUrl);

            const transcriptResponse = await fetch(transcriptUrl);
            if (!transcriptResponse.ok) {
              throw new Error(`Failed to fetch transcript: ${transcriptResponse.statusText}`);
            }

            transcript = await transcriptResponse.text();
            console.log('Successfully fetched transcript, length:', transcript.length);
            break; // Success, exit retry loop
          } catch (error) {
            lastError = error;
            console.error(`Transcript fetch attempt ${attempt}/${MAX_RETRIES} failed:`, error);

            if (attempt === MAX_RETRIES) {
              console.error('All transcript fetch attempts failed');
              throw lastError;
            }

            // Wait before retrying (exponential backoff)
            await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
          }
        }

        if (!transcript) {
          throw new Error('Failed to fetch transcript after all retries');
        }

        // Store the transcript with metadata
        const { error: transcriptError } = await supabaseAdmin
          .from('VideoTranscript')
          .upsert({
            videoId: video.id,
            transcript,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            source: text_source,
            type: text_type,
            language: language_code,
            name,
            muxTrackId: text_track_id,
            muxAssetId: asset_id
          });

        if (transcriptError) {
          console.error('Error storing transcript:', transcriptError);
          throw transcriptError;
        }

        console.log('Successfully stored transcript for video:', {
          videoId: video.id,
          transcriptLength: transcript.length,
          muxAssetId: asset_id,
          muxTrackId: text_track_id,
          language: language_code
        });
        break;
      }

      case 'video.asset.ready': {
        const { id: asset_id, playback_ids, duration, aspect_ratio, max_stored_resolution, max_stored_frame_rate, video_quality, resolution_tier } = eventData;
        console.log('Processing asset ready event:', { videoId, asset_id });

        // Ensure videoId is available (it should be from earlier logic or passthrough)
        if (!videoId) {
            console.error('[Main Webhook - Asset Ready] videoId is missing at the start of the case. Cannot proceed.');
            // Returning 400 as this indicates a logic flaw earlier or bad passthrough
            return NextResponse.json({ error: 'Internal state error: videoId missing' }, { status: 400 });
        }

        // Check if this videoId exists in the Video table before proceeding
        const { data: checkVideoData, error: checkVideoError } = await supabaseAdmin
          .from('Video')
          .select('id')
          .eq('id', videoId)
          .maybeSingle(); // Use maybeSingle to handle 0 or 1 result

        if (checkVideoError) {
            console.error(`[Main Webhook - Asset Ready] Error checking Video table for video ${videoId}:`, checkVideoError);
            throw checkVideoError; // Propagate DB errors
        }

        if (!checkVideoData) {
            console.log(`[Main Webhook - Asset Ready] Video ${videoId} not found in Video table. Assuming TopicVideo event. Ignoring.`);
            return NextResponse.json({ message: 'Event ignored (handled by topic video webhook)' }, { status: 200 });
        }

        // Get the playback ID
        const playbackId = playback_ids?.[0]?.id;
        if (!playbackId) {
          throw new Error('No playback ID found');
        }

        // First update just the playback ID
        const { error: playbackError } = await supabaseAdmin
          .from('Video')
          .update({ muxPlaybackId: playbackId, muxAssetId: asset_id }) // Also update asset ID here
          .eq('id', videoId);

        if (playbackError) {
          console.error('Error updating playback ID and Asset ID:', playbackError);
          throw playbackError;
        }

        // Then update the rest of the metadata
        const { error: updateError } = await supabaseAdmin
          .from('Video')
          .update({
            status: 'READY',
            duration,
            aspectRatio: aspect_ratio,
            maxWidth: max_stored_resolution === 'UHD' ? 3840 : max_stored_resolution === 'FHD' ? 1920 : 1280,
            maxHeight: max_stored_resolution === 'UHD' ? 2160 : max_stored_resolution === 'FHD' ? 1080 : 720,
            maxFrameRate: max_stored_frame_rate,
            videoQuality: video_quality,
            resolutionTier: resolution_tier
          })
          .eq('id', videoId);

        if (updateError) {
          console.error('Error updating video metadata:', updateError);
          throw updateError;
        }

        // Get the video record to get promptId and profileSharerId
        const { data: video, error: videoError } = await supabaseAdmin
          .from('Video')
          .select('promptId, profileSharerId')
          .eq('id', videoId) // Use the verified videoId
          .single();

        if (videoError || !video) {
          console.error('Error getting video record:', videoError);
          throw videoError || new Error('Video not found');
        }

        // Create PromptResponse record
        const { error: responseError } = await supabaseAdmin
          .from('PromptResponse')
          .insert({
            profileSharerId: video.profileSharerId,
            promptId: video.promptId,
            videoId: videoId,
            privacyLevel: 'Private'
          });

        if (responseError) {
          console.error('Error creating prompt response:', responseError);
          throw responseError;
        }

        console.log('Successfully updated video record to READY:', { videoId, playbackId });
        break;
      }

      case 'video.asset.errored': {
        const { errors } = eventData;
        console.log('Processing asset error event:', { videoId, errors });

        // Update video record with error status
        const { error: updateError } = await supabaseAdmin
          .from('Video')
          .update({
            status: 'ERRORED',
            errorMessage: errors?.messages?.join(', ') || 'Unknown error'
          })
          .eq('id', videoId);

        if (updateError) {
          console.error('Error updating video record:', updateError);
          throw updateError;
        }
        break;
      }

      case 'video.asset.static_renditions.ready': {
        const muxAssetId = eventData.id;
        console.log('Processing static renditions ready:', { muxAssetId });
        
        await supabaseAdmin
          .from('VideoDownload')
          .update({ status: 'ready' })
          .eq('muxAssetId', muxAssetId);
        break;
      }

      case 'video.asset.master.ready': {
        const muxAssetId = eventData.id;
        console.log('Processing master ready event:', { muxAssetId });
        
        await supabaseAdmin
          .from('TopicVideoDownload')
          .update({ status: 'ready' })
          .eq('muxAssetId', muxAssetId);
        break;
      }

      default: {
        console.log('Ignoring unhandled event type:', eventType);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 