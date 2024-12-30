import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { supabaseAdmin } from '@/utils/supabase/service-role';

export async function POST(request: Request) {
  try {
    // Get Mux signature headers
    const headersList = headers();
    const muxSignature = await headersList.get('mux-signature');

    // Verify webhook signature in production
    if (process.env.NODE_ENV === 'production' && process.env.MUX_WEBHOOK_SECRET) {
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

    // Try to get videoId from passthrough, if not found, try to find by muxUploadId
    let videoId = passthrough.videoId;
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

      case 'video.asset.ready': {
        const { playback_ids, duration, aspect_ratio, max_stored_resolution, max_stored_frame_rate, video_quality, resolution_tier } = eventData;
        console.log('Processing asset ready event:', { videoId });
        
        // Get the playback ID
        const playbackId = playback_ids?.[0]?.id;
        if (!playbackId) {
          throw new Error('No playback ID found');
        }

        // First update just the playback ID
        const { error: playbackError } = await supabaseAdmin
          .from('Video')
          .update({ muxPlaybackId: playbackId })
          .eq('id', videoId);

        if (playbackError) {
          console.error('Error updating playback ID:', playbackError);
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
          .eq('id', videoId)
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