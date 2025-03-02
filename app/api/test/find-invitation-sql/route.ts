/**
 * File: app/api/test/find-invitation-sql/route.ts
 * Description: API endpoint to find an invitation by token using direct SQL
 */

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
    
    // Execute direct SQL to find the invitation
    const sql = `
      SELECT * FROM "Invitation" WHERE "token" = '${token}'
    `;
    
    try {
      const { data, error } = await supabase.rpc('exec_sql', { sql });
      
      if (error) {
        throw error;
      }
      
      return NextResponse.json({ 
        message: 'SQL executed successfully',
        data,
        token
      });
    } catch (error: any) {
      console.log('Error executing SQL:', error.message);
      
      // If exec_sql doesn't exist or other error occurred, try direct query
      if (error.message && error.message.includes('function exec_sql(text) does not exist')) {
        console.log('exec_sql function does not exist, trying direct query');
      }
      
      // Try a different approach - direct query
      const { data: directData, error: directError } = await supabase
        .from('Invitation')
        .select('*')
        .eq('token', token);
        
      if (directError) {
        return NextResponse.json({ 
          error: 'Failed to find invitation', 
          details: error,
          directError,
          token
        }, { status: 500 });
      }
      
      return NextResponse.json({ 
        message: 'Found invitation using direct query',
        invitation: directData,
        token
      });
    }
  } catch (error) {
    console.error('Error finding invitation:', error);
    return NextResponse.json({ 
      error: 'Failed to find invitation', 
      details: error 
    }, { status: 500 });
  }
} 