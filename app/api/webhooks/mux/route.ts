// app/api/webhooks/mux/route.ts
import { Webhooks } from '@mux/mux-node';  // Import the Webhooks helper
import { createClient } from '@/utils/supabase/server';
import { headers } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const WEBHOOK_SECRET = process.env.MUX_WEBHOOK_SECRET;
  
  if (!WEBHOOK_SECRET) {
    throw new Error('MUX_WEBHOOK_SECRET is missing');
  }

  const headerPayload = headers();
  const rawBody = await req.text();  // Get raw body as a string

  // Extract the `mux-signature` header from the headers
  const muxSignature = headerPayload.get('mux-signature');

  if (!muxSignature) {
    console.error('Missing mux-signature header');
    return new NextResponse('Missing mux-signature header', { status: 400 });
  }
  
  try {
    // Use Webhooks.verifyHeader for webhook verification, passing the muxSignature header
    Webhooks.verifyHeader(rawBody, muxSignature, WEBHOOK_SECRET);
  } catch (err) {
    console.error('Error verifying webhook:', err);
    return new NextResponse('Error occurred', { status: 400 });
  }

  const payload = JSON.parse(rawBody);  // Parse the body only after verification
  const { type, data } = payload;
  const supabase = createClient();

  switch (type) {
    case 'video.asset.created': {
      const { data: video, error } = await supabase
        .from('videos')
        .select('*')
        .eq('passthrough', data.passthrough)
        .single();

      if (error || !video) {
        console.error('Video not found:', error);
        return new NextResponse('Video not found!', { status: 400 });
      }

      if (video.status !== 'ready') {
        const { error: updateError } = await supabase
          .from('videos')
          .update({
            status: data.status,
            mux_asset_id: data.id,
            mux_playback_id: data.playback_ids[0].id
          })
          .eq('id', video.id);

        if (updateError) {
          console.error('Error updating video:', updateError);
          return new NextResponse('Error updating video', { status: 500 });
        }
      }
      break;
    }
    case 'video.asset.ready': {
      const { data: video, error } = await supabase
        .from('videos')
        .select('*')
        .eq('passthrough', data.passthrough)
        .single();

      if (error || !video) {
        console.error('Video not found:', error);
        return new NextResponse('Video not found!', { status: 400 });
      }

      const { error: updateError } = await supabase
        .from('videos')
        .update({
          status: data.status,
          duration: data.duration,
          aspect_ratio: data.aspect_ratio
        })
        .eq('id', video.id);

      if (updateError) {
        console.error('Error updating video:', updateError);
        return new NextResponse('Error updating video', { status: 500 });
      }
      break;
    }
    case 'video.upload.cancelled': {
      const { data: video, error } = await supabase
        .from('videos')
        .select('*')
        .eq('passthrough', data.passthrough)
        .single();

      if (error || !video) {
        console.error('Video not found:', error);
        return new NextResponse('Video not found!', { status: 400 });
      }

      const { error: updateError } = await supabase
        .from('videos')
        .update({ status: 'cancelled' })
        .eq('id', video.id);

      if (updateError) {
        console.error('Error updating video:', updateError);
        return new NextResponse('Error updating video', { status: 500 });
      }
      break;
    }
    default:
      console.log('Unhandled event type:', type);
  }

  return new NextResponse('Webhook processed', { status: 200 });
}