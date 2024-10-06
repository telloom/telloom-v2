// app/api/mux-webhook/route.ts

import { NextResponse } from 'next/server';
import { Webhooks } from '@mux/mux-node';
import { Database } from '@/_types/supabase';
import { createClient } from '@supabase/supabase-js';

const webhookSecret = process.env.MUX_WEBHOOK_SECRET!; // Ensure this is set

export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get('mux-signature')!;

  let event;

  try {
    // Verify the webhook signature and parse the event
    event = Webhooks.verifyHeader(body, signature, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  // Initialize Supabase client with service role key
  const supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const eventType = event.type;

  switch (eventType) {
    case 'video.upload.created': {
      console.log('Upload created:', event.data);
      break;
    }

    case 'video.upload.asset_created': {
      const uploadId = event.data.id;
      const assetId = event.data.asset_id;

      // Update the video record where mux_upload_id matches uploadId
      await supabase
        .from('videos')
        .update({ mux_asset_id: assetId, status: 'asset_created' })
        .eq('mux_upload_id', uploadId);

      console.log('Asset created for upload:', uploadId);
      break;
    }

    case 'video.asset.created': {
      const assetIdCreated = event.data.id;

      // Update the video record where mux_asset_id matches assetIdCreated
      await supabase
        .from('videos')
        .update({ status: 'preparing' })
        .eq('mux_asset_id', assetIdCreated);

      console.log('Asset preparing:', assetIdCreated);
      break;
    }

    case 'video.asset.ready': {
      const assetIdReady = event.data.id;
      const playbackIds = event.data.playback_ids;
      const playbackId = playbackIds[0]?.id;
      const duration = event.data.duration;
      const aspectRatio = event.data.aspect_ratio;
      const videoQuality = event.data.video_quality;
      const maxWidth = event.data.max_stored_resolution;
      const maxFrameRate = event.data.max_stored_frame_rate;
      const tracks = event.data.tracks;
      const audioTrack = tracks.find((track: any) => track.type === 'audio');
      const languageCode = audioTrack?.language_code || null;
      const resolutionTier = event.data.resolution_tier;

      // Update the video record where mux_asset_id matches assetIdReady
      await supabase
        .from('videos')
        .update({
          mux_playback_id: playbackId,
          status: 'ready',
          duration,
          aspect_ratio: aspectRatio,
          video_quality: videoQuality,
          max_width: maxWidth,
          max_frame_rate: maxFrameRate,
          language_code: languageCode,
          resolution_tier: resolutionTier,
        })
        .eq('mux_asset_id', assetIdReady);

      console.log('Asset ready:', assetIdReady);
      break;
    }

    default: {
      console.log('Unhandled event type:', eventType);
      break;
    }
  }

  return NextResponse.json({ message: 'Webhook received' }, { status: 200 });
}