import { createAdminClient } from '@/utils/supabase/admin';
import { createClient } from '@/utils/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Get authenticated user
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error('Authentication error:', authError);
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    // Get path from query params
    const searchParams = request.nextUrl.searchParams;
    const path = searchParams.get('path');
    
    if (!path) {
      console.error('Missing path parameter');
      return NextResponse.json(
        { error: 'Missing path parameter' },
        { status: 400 }
      );
    }
    
    console.log('Storage API: Fetching signed URL for path:', path);
    
    // Use admin client to bypass RLS
    const adminClient = createAdminClient();
    
    // Create signed URL
    const { data, error } = await adminClient
      .storage
      .from('attachments')
      .createSignedUrl(path, 3600);
    
    if (error) {
      console.error('Error creating signed URL:', error);
      return NextResponse.json(
        { error: 'Failed to create signed URL' },
        { status: 500 }
      );
    }
    
    if (!data?.signedUrl) {
      console.error('No signed URL returned');
      return NextResponse.json(
        { error: 'No signed URL returned' },
        { status: 500 }
      );
    }
    
    console.log('Storage API: Successfully created signed URL');
    
    return NextResponse.json({ url: data.signedUrl });
  } catch (error) {
    console.error('Unexpected error in storage API:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
} 