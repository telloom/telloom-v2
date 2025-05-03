import { createRouteHandlerClient } from '@/utils/supabase/route-handler';
import { NextRequest, NextResponse } from 'next/server';

interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  data: Record<string, any>;
  isRead: boolean;
  createdAt: string;
}

export async function GET(request: NextRequest) {
  console.log('[NOTIFICATIONS_API] Starting GET request');
  
  try {
    const supabase = await createRouteHandlerClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error('[NOTIFICATIONS_API] Authentication error:', authError);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    console.log(`[NOTIFICATIONS_API] Fetching notifications for user: ${user.id}`);
    
    // Get the count parameter from URL
    const url = new URL(request.url);
    const countOnly = url.searchParams.get('count') === 'true';
    
    // Log user metadata for debugging
    // console.log('[NOTIFICATIONS_API] User metadata:', user.app_metadata);
    
    // Call the new safe RPC function
    console.log(`[NOTIFICATIONS_API] Calling RPC get_notifications_safe for user: ${user.id}, countOnly: ${countOnly}`);
    const { data: result, error: rpcError } = await supabase
      .rpc('get_notifications_safe', {
          p_user_id: user.id,
          p_count_only: countOnly,
          p_limit: 50 // Pass limit even if counting, function ignores if needed
       });

    if (rpcError) {
      console.error('[NOTIFICATIONS_API] Error calling get_notifications_safe RPC:', rpcError);
      const errorMessage = rpcError.message || 'Failed to fetch notifications via RPC';
      // Check if the error object from RPC has an 'error' field
      const detailedError = (result as any)?.error || errorMessage;
      return NextResponse.json({ error: detailedError }, { status: 500 });
    }

    // The RPC now returns the data in the correct format
    console.log(`[NOTIFICATIONS_API] Successfully fetched notifications via RPC. Result keys: ${Object.keys(result || {}).join(', ')}`);
    return NextResponse.json(result || (countOnly ? { count: 0 } : { notifications: [] }));

    // Remove old query logic
    /*
    const query = supabase
      .from('Notification')
      // ... old query logic ...
    */
    
  } catch (error) {
    console.error('[NOTIFICATIONS_API] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const supabase = await createRouteHandlerClient();
    // Remove adminClient if no longer needed
    // const adminClient = createAdminClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error('Authentication error:', authError);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { ids } = body;

    if (!ids || !Array.isArray(ids) || !ids.every(id => typeof id === 'string')) {
      return NextResponse.json(
        { error: 'Invalid request body. Expected array of notification IDs' },
        { status: 400 }
      );
    }

    // Call the safe RPC to mark notifications as read
    console.log(`[NOTIFICATIONS_API PATCH] Calling RPC mark_notifications_read_safe for user ${user.id} with ${ids.length} IDs`);
    const { data: success, error: rpcError } = await supabase
      .rpc('mark_notifications_read_safe', { p_notification_ids: ids });

    // Remove direct update logic
    /*
    const { error: updateError } = await adminClient
      .from('Notification')
      .update({ isRead: true })
      .in('id', ids)
      .eq('userId', user.id);
    */

    if (rpcError || !success) {
      console.error('[NOTIFICATIONS_API PATCH] Error calling RPC or RPC failed:', rpcError);
      return NextResponse.json(
        { error: 'Failed to update notifications via RPC' },
        { status: 500 }
      );
    }

    console.log(`[NOTIFICATIONS_API PATCH] Successfully marked ${ids.length} notifications as read via RPC for user ${user.id}`);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Unexpected error in notifications PATCH:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    // Use createRouteHandlerClient to get the authenticated user
    const supabase = await createRouteHandlerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('Authentication error in POST:', authError);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { userId, type, message, data } = body;

    if (!userId || !type || !message) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('Notification')
      .insert({
        userId,
        type,
        message,
        data,
        isRead: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

    if (error) {
      console.error('Error creating notification:', error);
      return NextResponse.json(
        { error: 'Failed to create notification' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in notifications POST:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 