import { NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';

export async function GET(request: Request) {
  try {
    // Only allow in development mode
    if (process.env.NODE_ENV !== 'development') {
      return NextResponse.json({ error: 'This endpoint is only available in development mode' }, { status: 403 });
    }
    
    const url = new URL(request.url);
    const token = url.searchParams.get('token') || 'e90f9741-714f-4874-a457-5d986d99b90d';
    
    // Create a Supabase client with the service role key for admin operations
    const supabase = createAdminClient();
    
    const results: Record<string, any> = {};
    
    // Direct SQL query to find invitation by token
    const { data: exactMatch, error: exactMatchError } = await supabase
      .rpc('find_invitation_by_token', { token_value: token });
      
    results.exactMatch = {
      data: exactMatch,
      error: exactMatchError
    };
    
    // Try case-insensitive search
    const { data: caseInsensitiveMatch, error: caseInsensitiveMatchError } = await supabase
      .rpc('find_invitation_by_token_case_insensitive', { token_value: token });
      
    results.caseInsensitiveMatch = {
      data: caseInsensitiveMatch,
      error: caseInsensitiveMatchError
    };
    
    // Try to create the invitation if it doesn't exist
    if (!exactMatch && !caseInsensitiveMatch) {
      const { data: createResult, error: createError } = await supabase
        .rpc('create_test_invitation', {
          token_value: token,
          invitee_email: 'test@example.com'
        });
        
      results.createResult = {
        data: createResult,
        error: createError
      };
    }
    
    return NextResponse.json(results);
  } catch (error) {
    console.error('Error finding invitation:', error);
    return NextResponse.json({ error: 'Failed to find invitation', details: error }, { status: 500 });
  }
} 