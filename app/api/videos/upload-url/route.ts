// app/api/videos/upload-url/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createUploadUrl } from '@/utils/muxClient';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    // Check if the user is authenticated
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Generate the upload URL
    const uploadUrl = await createUploadUrl();

    // Return the upload URL
    return NextResponse.json({ uploadUrl });
  } catch (error) {
    console.error('Failed to create upload URL:', error);
    return NextResponse.json({ error: 'Failed to create upload URL' }, { status: 500 });
  }
}