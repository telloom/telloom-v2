// app/api/videos/upload-url/route.ts

import { createMuxUpload } from '@/actions/videos-actions';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { Database } from '@/types/supabase';
import { NextResponse } from 'next/server';
import { createUploadUrl } from '@/utils/muxClient';
import { PrismaClient } from '@prisma/client';
import Mux from '@mux/mux-node';

const prisma = new PrismaClient();
const { Video } = new Mux();

export async function GET() {
  console.log('MUX_ACCESS_TOKEN_ID:', process.env.MUX_ACCESS_TOKEN_ID ? 'Set' : 'Not set');
  console.log('MUX_SECRET_KEY:', process.env.MUX_SECRET_KEY ? 'Set' : 'Not set');
  
  try {
    const { url: uploadUrl, id: uploadId } = await Video.Uploads.create({
      new_asset_settings: { playback_policy: 'public' },
      cors_origin: '*',
    });

    // Create a new Video record in the database
    const video = await prisma.video.create({
      data: {
        muxUploadId: uploadId,
        status: 'WAITING',
      },
    });

    return NextResponse.json({ uploadUrl, uploadId: video.id });
  } catch (error) {
    return NextResponse.json({ error: 'Mux upload creation failed' }, { status: 500 });
  }
}