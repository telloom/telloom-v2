import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { supabaseAdmin } from '@/utils/supabase/service-role';

export async function POST(request: Request) {
  try {
    // Get Mux signature headers
    const headersList = await headers();
    const muxSignature = headersList.get('mux-signature');

    // Verify webhook signature in production
    if (process.env.NODE_ENV === 'production' && process.env.MUX_TOPIC_VIDEO_WEBHOOK_SECRET) {
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
    console.log('[TopicVideo Webhook] Processing event:', { eventType, eventData });

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
          .from('TopicVideo')
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
        // **IGNORE**: This event is handled by the main webhook for prompt videos
        console.log('[TopicVideo Webhook] Ignoring event type (handled elsewhere): ', eventType);
        return NextResponse.json({ message: 'Event ignored by this handler' }, { status: 200 });
        /* Original logic commented out:
        const { asset_id } = eventData;
        console.log('Processing asset created event:', { asset_id, videoId });

        // Update video record with asset ID
        const { error: updateError } = await supabaseAdmin
          .from('TopicVideo')
          .update({
            muxAssetId: asset_id,
            status: 'ASSET_CREATED'
          })
          .eq('id', videoId);

        if (updateError) {
          console.error('Error updating video record:', updateError);
          throw updateError;
        }
        */
        break;
      }

      case 'video.asset.track.ready': {
        // **IGNORE**: This event is handled by the main webhook for prompt videos
        console.log('[TopicVideo Webhook] Ignoring event type (handled elsewhere): ', eventType);
        return NextResponse.json({ message: 'Event ignored by this handler' }, { status: 200 });
        /* Original logic commented out:
        const { 
          text_source, 
          text_type, 
          status, 
          id: text_track_id, 
          asset_id,
          name,
          language_code 
        } = eventData;
        
        console.log('Received track ready event:', { ... });

        // Only process generated captions
        if (text_source !== 'generated_vod' || text_type !== 'subtitles' || status !== 'ready') {
          console.log('Skipping track event - not a ready generated subtitle:', { ... });
          break;
        }

        // Get video by muxAssetId
        const { data: video, error: videoError } = await supabaseAdmin
          .from('TopicVideo')
          .select('id, muxPlaybackId')
          .eq('muxAssetId', asset_id)
          .single();

        if (videoError || !video?.muxPlaybackId) {
          console.error('Error getting video by asset ID:', { videoError, asset_id });
          throw videoError || new Error('Video not found or missing playback ID');
        }

        // Set videoId for the rest of the function
        videoId = video.id;
        console.log('Found video for transcript:', { videoId, muxPlaybackId: video.muxPlaybackId });

        // Fetch the transcript with retries
        // ... (transcript fetching logic)

        // Store the transcript with metadata
        const { error: transcriptError } = await supabaseAdmin
          .from('TopicVideoTranscript')
          .upsert({ ... });

        if (transcriptError) {
          console.error('Error storing transcript:', transcriptError);
          throw transcriptError;
        }

        console.log('Successfully stored transcript for video:', { ... });
        */
        break;
      }

      case 'video.asset.ready': {
        // Assuming this handler *might* need to handle this for TopicVideo specifically
        const { id: asset_id, playback_ids } = eventData;
        const playbackId = playback_ids?.[0]?.id;

        if (!playbackId) {
          console.error('No playback ID found in asset ready event');
          break;
        }

        console.log('Processing asset ready event:', { videoId, playbackId });

        const { error } = await supabaseAdmin
          .from('TopicVideo')
          .update({
            status: 'READY',
            muxPlaybackId: playbackId,
            muxAssetId: asset_id, // Ensure asset ID is also stored here
          })
          .eq('id', videoId);

        if (error) {
          console.error('Error updating video status to READY:', error);
          throw error;
        }
        break;
      }

      case 'video.asset.errored': {
        // Assuming this handler *might* need to handle this for TopicVideo specifically
        console.error('Asset processing errored:', eventData);
        const { error } = await supabaseAdmin
          .from('TopicVideo')
          .update({ status: 'ERRORED' })
          .eq('id', videoId);

        if (error) {
          console.error('Error updating video status to ERRORED:', error);
          // Don't throw, just log, as the primary error is from Mux
        }
        break;
      }

      default:
        console.log('Ignoring unhandled event type:', eventType);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Webhook handler failed', details: errorMessage },
      { status: 500 }
    );
  }
} 