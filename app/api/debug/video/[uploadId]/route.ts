import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(
  request: Request,
  { params }: { params: { uploadId: string } }
) {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Debug endpoints only available in development' }, { status: 403 });
  }

  console.log('Initializing Supabase client with:', {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    serviceRoleKeyLength: process.env.SUPABASE_SERVICE_ROLE_KEY?.length || 0
  });

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false
      }
    }
  );

  console.log('Querying video record...');
  const { data, error } = await supabase
    .from('Video')
    .select('*')
    .eq('muxUploadId', params.uploadId)
    .single();

  if (error) {
    console.error('Error fetching video:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  console.log('Found video record:', data);
  return NextResponse.json(data);
}

export async function POST(
  request: Request,
  { params }: { params: { uploadId: string } }
) {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Debug endpoints only available in development' }, { status: 403 });
  }

  console.log('Initializing Supabase client with:', {
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

  const body = await request.json();
  console.log('Updating video record with:', body);

  const { data, error } = await supabase
    .from('Video')
    .update(body)
    .eq('muxUploadId', params.uploadId)
    .select()
    .single();

  if (error) {
    console.error('Error updating video:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  console.log('Updated video record:', data);
  return NextResponse.json(data);
} 