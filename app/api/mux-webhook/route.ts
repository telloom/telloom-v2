import { NextRequest, NextResponse } from 'next/server';
import { updateVideoWithMuxInfo } from '@/actions/videos-actions';

// ... (keep existing interfaces)

export async function POST(req: NextRequest) {
  console.log('Webhook endpoint hit');
  const webhookData = await req.json();
  console.log('Received webhook data:', JSON.stringify(webhookData, null, 2));

  const { type, data } = webhookData;

  try {
    if (type === 'video.upload.created') {
      const { id: uploadId } = data;
      console.log('Updating video with Mux upload ID:', uploadId);
      const updateResult = await updateVideoWithMuxInfo(uploadId, { 
        muxUploadId: uploadId,
        status: 'waiting',
      });
      console.log('Update result:', updateResult);
      
      return NextResponse.json({ message: 'Upload creation logged' });
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

      return NextResponse.json({ message: 'Asset creation logged' });
    } else if (type === 'video.asset.ready') {
      const { id: assetId, upload_id: uploadId, playback_ids, duration, aspect_ratio } = data;
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

      return NextResponse.json({ message: 'Asset ready logged' });
    }

    return NextResponse.json({ message: 'Webhook received' });
  } catch (error) {
    console.error('Error processing webhook:', error);
    return NextResponse.json({ error: 'Failed to process webhook' }, { status: 500 });
  }
}

// ... (keep GET function as is)