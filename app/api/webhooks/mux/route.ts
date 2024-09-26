// app/api/webhooks/mux/route.ts
import { Webhooks } from '@mux/mux-node';  // Import the Webhooks helper
import { PrismaClient } from '@prisma/client';
import { headers } from 'next/headers';
import { NextResponse } from 'next/server';

const prisma = new PrismaClient();

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

  switch (type) {
    case 'video.asset.created': {
      const video = await prisma.video.findUnique({
        where: { passthrough: data.passthrough }
      });

      if (!video) {
        console.error('Video not found');
        return new NextResponse('Video not found!', { status: 400 });
      }

      if (video.status !== 'READY') {
        await prisma.video.update({
          where: { id: video.id },
          data: {
            status: data.status,
            muxAssetId: data.id,
            muxPlaybackId: data.playback_ids[0].id
          }
        });
      }
      break;
    }
    case 'video.asset.ready': {
      const video = await prisma.video.findUnique({
        where: { passthrough: data.passthrough }
      });

      if (!video) {
        console.error('Video not found');
        return new NextResponse('Video not found!', { status: 400 });
      }

      await prisma.video.update({
        where: { id: video.id },
        data: {
          status: data.status,
          duration: data.duration,
          aspectRatio: data.aspect_ratio
        }
      });
      break;
    }
    case 'video.upload.cancelled': {
      const video = await prisma.video.findUnique({
        where: { passthrough: data.passthrough }
      });

      if (!video) {
        console.error('Video not found');
        return new NextResponse('Video not found!', { status: 400 });
      }

      await prisma.video.update({
        where: { id: video.id },
        data: { status: 'CANCELLED' }
      });
      break;
    }
    default:
      console.log('Unhandled event type:', type);
  }

  return new NextResponse('Webhook processed', { status: 200 });
}