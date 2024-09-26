import { PrismaClient } from '@prisma/client';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import Mux from '@mux/mux-node';
import { NextResponse } from 'next/server';

const prisma = new PrismaClient();
const muxClient = new Mux();

export async function POST() {
  console.log('Initiating upload...');
  const supabase = createServerSupabaseClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session?.user?.id) {
    console.log('No authenticated user found');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = session.user.id;
  console.log('Authenticated user ID:', userId);
  
  try {
    // Initiate Mux upload
    const upload = await muxClient.video.uploads.create({
      new_asset_settings: { playback_policy: ['public'] },
      cors_origin: 'http://localhost:3000',
    });

    console.log('Mux upload created:', JSON.stringify(upload, null, 2));

    // Store the upload info
    const uploadInfo = await prisma.uploadInfo.create({
      data: {
        muxUploadId: upload.id,
        userId: userId,
      },
    });

    console.log('Upload info stored:', JSON.stringify(uploadInfo, null, 2));

    // Verify the upload info was stored
    const storedInfo = await prisma.uploadInfo.findUnique({
      where: { muxUploadId: upload.id },
    });
    console.log('Verified stored upload info:', JSON.stringify(storedInfo, null, 2));

    return NextResponse.json({ ...upload, uploadInfo }, { status: 200 });
  } catch (error) {
    console.error('Error initiating upload:', error);
    return NextResponse.json({ error: 'Failed to initiate upload' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}