import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { supabaseAdmin } from '@/utils/supabase/service-role';
import Mux from '@mux/mux-node'; // Import Mux SDK for webhook verification

export async function POST(request: Request) {
  try {
    // Get Mux signature headers
    const headersList = await headers();
    const muxSignature = headersList.get('mux-signature');
    const rawBody = await request.text(); // Read the raw request body ONCE

    // Verify webhook signature in production
    if (process.env.NODE_ENV === 'production' && process.env.MUX_TOPIC_VIDEO_WEBHOOK_SECRET) {
      if (!muxSignature) {
        console.warn('[Webhook /mux/topic-video] Missing Mux signature in production.');
        return NextResponse.json(
          { error: 'Missing Mux signature' },
          { status: 401 }
        );
      }
      try {
        // Use Mux.Webhooks.verifyHeader
        Mux.Webhooks.verifyHeader(rawBody, muxSignature, process.env.MUX_TOPIC_VIDEO_WEBHOOK_SECRET);
        console.log('[Webhook /mux/topic-video] Mux signature verified successfully.');
      } catch (err) {
        console.error('[Webhook /mux/topic-video] Invalid Mux signature:', err);
        return NextResponse.json({ error: 'Invalid Mux signature' }, { status: 401 });
      }
    }

    const body = JSON.parse(rawBody); // Parse the raw body after verification
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

    // Initialize videoId directly from passthrough
    let videoId = passthrough.videoId;

    // --- VALIDATE videoId EARLY (except for events that might not have it yet) ---
    // We expect videoId for asset.ready, asset.errored. For others, it might be missing.
    if (!videoId && ['video.asset.ready', 'video.asset.errored'].includes(eventType)) {
      console.error(`Could not find videoId in passthrough for critical event: ${eventType}`);
      return NextResponse.json({ error: 'Video ID missing in passthrough' }, { status: 400 });
    }

    // Handle different event types
    switch (eventType) {
      case 'video.asset.ready': {
        const { id: asset_id, playback_ids, tracks } = eventData; // Destructure tracks
        const playbackId = playback_ids?.[0]?.id;

        if (!videoId) {
           console.error('videoId is missing for video.asset.ready event.');
           return NextResponse.json({ error: 'Missing videoId for asset ready' }, { status: 400 });
        }

        if (!playbackId) {
          console.warn('No playback ID found in asset ready event for videoId:', videoId);
          // Continue processing status update and transcript even without playbackId initially
        }

        console.log('Processing asset ready event:', { videoId, asset_id, playbackId, hasTracks: !!tracks });

        // --- Update Video Status ---
        const { error: updateError } = await supabaseAdmin
          .from('TopicVideo')
          .update({
            status: 'READY',
            muxPlaybackId: playbackId, // Update playback ID if available
            muxAssetId: asset_id,      // Ensure asset ID is stored
          })
          .eq('id', videoId);

        if (updateError) {
          console.error('Error updating video status to READY:', updateError);
          // Don't throw yet, try to process transcript first
        } else {
           console.log('Successfully updated video status to READY for videoId:', videoId);
        }

        // --- Process Transcript ---
        const transcriptTrack = tracks?.find(
          (track: any) => track.type === 'text' && track.text_type === 'subtitles' && track.status === 'ready'
        );

        if (transcriptTrack) {
          console.log('Found transcript track:', { trackId: transcriptTrack.id, language: transcriptTrack.language_code });

          // TODO: Fetch actual transcript text. Mux VTT URL might require signed access or separate API call.
          // For now, let's assume we need to fetch it (implement fetching logic if needed)
          // Placeholder: Insert dummy transcript text for now until fetching is implemented
          const transcriptText = `Transcript for track ${transcriptTrack.id} - needs fetching`;

          const { error: transcriptError } = await supabaseAdmin
            .from('TopicVideoTranscript')
            .upsert({
              topicVideoId: videoId,
              muxAssetId: asset_id,
              muxTrackId: transcriptTrack.id,
              transcript: transcriptText, // Replace with fetched text
              source: 'mux', // Or 'generated_vod' based on track details
              type: transcriptTrack.text_type, // 'subtitles'
              language: transcriptTrack.language_code,
            }, {
              onConflict: 'topicVideoId, muxTrackId', // Upsert based on video and track ID
              ignoreDuplicates: false, // Ensure we update if needed (e.g., status change) - adjust if needed
            });

          if (transcriptError) {
            console.error('Error saving transcript to DB:', transcriptError);
            // Log error but don't fail the webhook response necessarily
          } else {
            console.log('Successfully saved transcript placeholder for videoId:', videoId, 'trackId:', transcriptTrack.id);
          }
        } else {
           console.log('No ready subtitle track found in asset.ready event for videoId:', videoId);
        }

        // If status update failed earlier, throw now
        if (updateError) {
          throw updateError;
        }

        break;
      }

      case 'video.asset.errored': {
        console.error('Asset processing errored:', eventData);
        const { error } = await supabaseAdmin
          .from('TopicVideo')
          .update({ status: 'ERRORED' })
          .eq('id', videoId); // Use videoId from passthrough

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