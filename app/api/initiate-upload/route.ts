import { db } from '@/db/db';
import { uploadInfoTable } from '@/db/schema/uploadInfo';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import Mux from '@mux/mux-node';
import { NextResponse } from 'next/server';

const muxClient = new Mux();

export async function POST() {
  const supabase = createServerSupabaseClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = session.user.id;
  
  try {
    // Initiate Mux upload
    const upload = await muxClient.video.uploads.create({
      new_asset_settings: { playback_policy: ['public'] },
      cors_origin: 'http://localhost:3000',
    });

    // Store the upload info
    await db.insert(uploadInfoTable).values({
      muxUploadId: upload.id,
      userId: userId,
    });

    return NextResponse.json(upload, { status: 200 });
  } catch (error) {
    console.error('Error initiating upload:', error);
    return NextResponse.json({ error: 'Failed to initiate upload' }, { status: 500 });
  }
}