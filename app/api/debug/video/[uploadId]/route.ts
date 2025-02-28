import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

interface RouteContext {
  params: {
    uploadId: string;
  };
}

export async function GET(
  request: Request,
  context: RouteContext
) {
  const resolvedParams = await Promise.resolve(context.params);
  const uploadId = resolvedParams.uploadId;
  
  const supabase = createClient();
  
  // Get the current user
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  
  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    // Get the video upload status
    const { data, error } = await supabase
      .from('VideoUpload')
      .select('*')
      .eq('id', uploadId)
      .single();
    
    if (error) {
      console.error('Error getting video upload:', error);
      return NextResponse.json({ error: 'Failed to get video upload' }, { status: 500 });
    }
    
    return NextResponse.json({ data });
  } catch (error) {
    console.error('Error in debug video route:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  context: RouteContext
) {
  const resolvedParams = await Promise.resolve(context.params);
  const uploadId = resolvedParams.uploadId;
  
  const supabase = createClient();
  
  // Get the current user
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  
  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    // Update the video upload status
    const body = await request.json();
    
    const { data, error } = await supabase
      .from('VideoUpload')
      .update(body)
      .eq('id', uploadId)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating video upload:', error);
      return NextResponse.json({ error: 'Failed to update video upload' }, { status: 500 });
    }
    
    return NextResponse.json({ data });
  } catch (error) {
    console.error('Error in debug video route:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 