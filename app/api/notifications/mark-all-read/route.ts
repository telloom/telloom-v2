/**
 * File: app/api/notifications/mark-all-read/route.ts
 * Description: API route to mark all unread notifications as read for the current user.
 */

import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'; // Keep if needed, but prefer ssr
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import defaultCreateClient from '@/utils/supabase/route-handler'; 

export async function POST(request: Request) {
  try {
    // Use the route handler client for server-side operations
    const supabase = await defaultCreateClient(); 
    
    // Verify user authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error('[API mark-all-read] Authentication error:', authError);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log(`[API mark-all-read] User ${user.id} requesting to mark all notifications read.`);

    // Call the RPC function
    const { error: rpcError } = await supabase.rpc('mark_all_notifications_read_safe');

    if (rpcError) {
      console.error(`[API mark-all-read] RPC error for user ${user.id}:`, rpcError);
      // Check for specific errors if needed, e.g., 'User not authenticated' from the function itself
      return NextResponse.json({ error: `Database error: ${rpcError.message}` }, { status: 500 });
    }

    console.log(`[API mark-all-read] Successfully marked all notifications read for user ${user.id}.`);
    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('[API mark-all-read] Unexpected error:', error);
    return NextResponse.json({ error: `Internal server error: ${error.message}` }, { status: 500 });
  }
} 