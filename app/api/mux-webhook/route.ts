import { NextRequest, NextResponse } from 'next/server';
import * as Mux from '@mux/mux-node'; // Use namespace import
import { updateVideoWithMuxInfo } from '@/actions/videos-actions';

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get('mux-signature');
  const webhookSigningSecret = process.env.MUX_WEBHOOK_SIGNING_SECRET;

  if (!signature) {
    return NextResponse.json({ error: 'Signature missing' }, { status: 400 });
  }

  if (!webhookSigningSecret) {
    console.error('MUX_WEBHOOK_SIGNING_SECRET is not set');
    return NextResponse.json(
      { error: 'Server configuration error' },
      { status: 500 }
    );
  }

  try {
    // Verify the signature
    Mux.Webhooks.verifyHeader(rawBody, signature, webhookSigningSecret);

    // Parse the event data
    const event = JSON.parse(rawBody);
    const { type, data } = event;

    console.log('Received webhook data:', JSON.stringify(event, null, 2));

    // Process the event as before
    if (type === 'video.upload.created') {
      const { id: uploadId } = data;
      console.log('Updating video with Mux upload ID:', uploadId);
      const updateResult = await updateVideoWithMuxInfo(uploadId, {
        muxUploadId: uploadId,
        status: 'waiting',
      });
      console.log('Update result:', updateResult);
    } else if (type === 'video.asset.created') {
      const { id: assetId, upload_id: uploadId, playback_ids } = data;
      const playbackId = playback_ids?.[0]?.id;

      console.log('Updating video with Mux asset info:', uploadId);
      const updateResult = await updateVideoWithMuxInfo(uploadId, {
        muxAssetId: assetId,
        muxPlaybackId: playbackId,
        status: 'preparing',
      });
      console.log('Update result:', updateResult);
    } else if (type === 'video.asset.ready') {
      const {
        id: assetId,
        upload_id: uploadId,
        playback_ids,
        duration,
        aspect_ratio,
      } = data;
      const playbackId = playback_ids?.[0]?.id;

      console.log('Updating video with ready status:', uploadId);
      const updateResult = await updateVideoWithMuxInfo(uploadId, {
        muxAssetId: assetId,
        muxPlaybackId: playbackId,
        status: 'ready',
        duration,
        aspectRatio: aspect_ratio,
      });
      console.log('Update result:', updateResult);
    }

    return NextResponse.json({ message: 'Webhook processed successfully' });
  } catch (error) {
    console.error('Error verifying webhook signature:', error);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }
}