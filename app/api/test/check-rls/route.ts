import { NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';

export async function GET(request: Request) {
  try {
    // Only allow in development mode
    if (process.env.NODE_ENV !== 'development') {
      return NextResponse.json({ error: 'This endpoint is only available in development mode' }, { status: 403 });
    }
    
    // Create a Supabase client with the service role key for admin operations
    const supabase = createAdminClient();
    
    const results: Record<string, any> = {};
    
    // Check RLS policies
    const { data: rlsPolicies, error: rlsError } = await supabase
      .rpc('get_policies_for_table', { table_name: 'Invitation' });
      
    results.rlsPolicies = {
      data: rlsPolicies,
      error: rlsError
    };
    
    // Try to directly insert an invitation using SQL
    const { data: insertResult, error: insertError } = await supabase
      .rpc('insert_test_invitation', { 
        token_value: 'e90f9741-714f-4874-a457-5d986d99b90d',
        invitee_email: 'test@example.com'
      });
      
    results.insertResult = {
      data: insertResult,
      error: insertError
    };
    
    return NextResponse.json(results);
  } catch (error) {
    console.error('Error checking RLS policies:', error);
    return NextResponse.json({ error: 'Failed to check RLS policies', details: error }, { status: 500 });
  }
} 