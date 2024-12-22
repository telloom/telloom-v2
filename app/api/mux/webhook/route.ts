// app/api/mux-webhook/route.ts

import { NextResponse } from 'next/server';
import Mux from '@mux/mux-node';
import { Database } from '@/_types/supabase';
import { createClient } from '@supabase/supabase-js';
import { Decimal } from '@prisma/client/runtime/library';

const webhookSecret = process.env.MUX_WEBHOOK_SECRET;
const isDevelopment = process.env.NODE_ENV === 'development';

// Helper function for consistent logging
function log(message: string, data?: any) {
  const timestamp = new Date().toISOString();
  const logMessage = data ? `${timestamp} - ${message}: ${JSON.stringify(data, null, 2)}` : `${timestamp} - ${message}`;
  console.log(logMessage);
}

export async function POST(request: Request) {
  log('Webhook request received');
  const body = await request.text();
  const signature = request.headers.get('mux-signature');
  
  let event;
  
  try {
    if (isDevelopment) {
      // In development, parse the body directly
      try {
        event = JSON.parse(body);
        log('Development mode: Parsed webhook data', event);
      } catch (parseError) {
        log('Failed to parse webhook body', parseError);
        return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
      }
    } else if (webhookSecret && signature) {
      // In production, verify the signature
      const mux = new Mux();
      event = mux.webhooks.verifyHeader(body, signature, webhookSecret);
    } else {
      return NextResponse.json({ error: 'Missing webhook secret or signature' }, { status: 400 });
    }
  } catch (err) {
    log('Webhook verification failed', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  // Initialize Supabase client with service role key
  log('Initializing Supabase client', {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    serviceRoleKeyLength: process.env.SUPABASE_SERVICE_ROLE_KEY?.length || 0
  });

  const supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    }
  );

  const eventType = event.type;
  log('Received Mux webhook event', { type: eventType, data: event.data });

  try {
    switch (eventType) {
      case 'video.upload.created': {
        log('Upload created', event.data);
        break;
      }

      case 'video.upload.asset_created': {
        const uploadId = event.data.id;
        const assetId = event.data.asset_id;

        log('Processing asset creation', { uploadId, assetId });

        // First, try to find the video record
        log('Querying for video record');
        const { data: video, error: selectError } = await supabase
          .from('Video')
          .select('*')
          .eq('muxUploadId', uploadId)
          .single();

        if (selectError) {
          log('Error finding video record', selectError);
          return NextResponse.json({ error: 'Video record not found' }, { status: 404 });
        }

        log('Found video record', video);

        // Then update it with the asset ID
        log('Updating video record');
        const { data: updateData, error: updateError } = await supabase
          .from('Video')
          .update({ 
            muxAssetId: assetId,
            updatedAt: new Date().toISOString()
          })
          .eq('muxUploadId', uploadId)
          .select()
          .single();

        if (updateError) {
          log('Error updating video with asset ID', updateError);
          return NextResponse.json({ error: 'Failed to update video record' }, { status: 500 });
        }

        log('Successfully updated video record', updateData);

        // Verify the update
        log('Verifying update');
        const { data: verifyData, error: verifyError } = await supabase
          .from('Video')
          .select('*')
          .eq('muxUploadId', uploadId)
          .single();

        if (verifyError) {
          log('Error verifying update', verifyError);
        } else {
          log('Verified video record', verifyData);
        }

        break;
      }

      case 'video.asset.created': {
        const assetId = event.data.id;

        log('Updating video timestamp for asset', assetId);
        const { data, error } = await supabase
          .from('Video')
          .update({ updatedAt: new Date().toISOString() })
          .eq('muxAssetId', assetId)
          .select()
          .single();

        if (error) {
          log('Error updating video timestamp', error);
        } else {
          log('Asset preparing', { assetId, record: data });
        }
        break;
      }

      case 'video.asset.ready': {
        const assetId = event.data.id;
        const uploadId = event.data.upload_id;
        const playbackId = event.data.playback_ids?.[0]?.id;
        
        const videoTrack = event.data.tracks?.find((track: any) => track.type === 'video');
        const audioTrack = event.data.tracks?.find((track: any) => track.type === 'audio');

        // Ensure all fields are included with correct types
        const updateData = {
          muxAssetId: assetId,
          muxPlaybackId: playbackId,
          duration: event.data.duration || null,
          aspectRatio: event.data.aspect_ratio || null,
          videoQuality: event.data.video_quality || null,
          maxWidth: videoTrack?.max_width ? Number(videoTrack.max_width) : null,
          maxHeight: videoTrack?.max_height ? Number(videoTrack.max_height) : null,
          maxFrameRate: videoTrack?.max_frame_rate ? Number(videoTrack.max_frame_rate) : null,
          languageCode: audioTrack?.language_code || null,
          resolutionTier: event.data.resolution_tier || null,
          updatedAt: new Date().toISOString()
        };

        log('Updating video with data', { assetId, uploadId, updateData });

        // Try to update by muxUploadId first
        let result;
        if (uploadId) {
          result = await supabase
            .from('Video')
            .update(updateData)
            .eq('muxUploadId', uploadId)
            .select()
            .single();
        }

        // If no result by uploadId, try by assetId
        if (!result?.data) {
          result = await supabase
            .from('Video')
            .update(updateData)
            .eq('muxAssetId', assetId)
            .select()
            .single();
        }

        if (result?.error) {
          log('Error updating video with ready state', result.error);
        } else {
          log('Asset ready', { assetId, record: result?.data });
        }
        break;
      }

      default: {
        log('Unhandled event type', eventType);
        break;
      }
    }

    return NextResponse.json({ message: 'Webhook processed' }, { status: 200 });
  } catch (error) {
    log('Error processing webhook', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}