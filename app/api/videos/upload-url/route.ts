// app/api/videos/upload-url/route.ts

import { createMuxUpload } from '@/actions/videos-actions';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { Database } from '@/types/supabase';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const supabase = createServerComponentClient<Database>({ cookies });
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { prompt_id } = await request.json();

  try {
    const uploadUrl = await createMuxUpload(user.id, prompt_id, supabase);
    return NextResponse.json({ url: uploadUrl });
  } catch (error) {
    return NextResponse.json({ error: 'Mux upload creation failed' }, { status: 500 });
  }
}