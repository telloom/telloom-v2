import { createRouteHandlerClient } from '@/utils/supabase/route-handler';
import { createAdminClient } from '@/utils/supabase/admin';
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

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
    const adminClient = createAdminClient();
    
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
    console.log('[NOTIFICATIONS_API] User metadata:', user.app_metadata);
    
    // Use RPC function to get role information
    const { data: roleInfo, error: roleError } = await adminClient.rpc(
      'get_user_role_emergency',
      { user_id: user.id }
    );

    if (roleError) {
      console.error('[NOTIFICATIONS_API] Error getting role info:', roleError);
      return NextResponse.json({ error: 'Failed to check user roles' }, { status: 500 });
    }
    
    console.log('[NOTIFICATIONS_API] User roles:', roleInfo?.roles || []);
    
    // Build the base query using admin client to bypass RLS
    const query = adminClient
      .from('Notification')
      .select(countOnly ? 'id' : '*')
      .eq('userId', user.id)
      .order('createdAt', { ascending: false });
    
    // If we're only counting unread notifications, add that filter
    if (countOnly) {
      // Get unread notifications
      const { data: unreadNotifications, error: countError } = await query
        .eq('isRead', false);
      
      if (countError) {
        console.error('[NOTIFICATIONS_API] Error counting notifications:', countError);
        return NextResponse.json({ error: 'Failed to count notifications' }, { status: 500 });
      }
      
      const count = unreadNotifications?.length || 0;
      console.log('[NOTIFICATIONS_API] Returning unread count:', count);
      return NextResponse.json({ count });
    } else {
      // Return all notifications with pagination
      const { data: notifications, error: notificationsError } = await query
        .limit(50);
      
      if (notificationsError) {
        console.error('[NOTIFICATIONS_API] Error fetching notifications:', notificationsError);
        return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 });
      }
      
      console.log('[NOTIFICATIONS_API] Found notifications:', notifications?.length || 0);
      return NextResponse.json(notifications || []);
    }
  } catch (error) {
    console.error('[NOTIFICATIONS_API] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const cookieStore = cookies();
    const supabase = await createRouteHandlerClient();
    const adminClient = createAdminClient();
    
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

    // Use admin client to bypass RLS
    const { error: updateError } = await adminClient
      .from('Notification')
      .update({ isRead: true })
      .in('id', ids)
      .eq('userId', user.id);

    if (updateError) {
      console.error('Database error:', updateError);
      return NextResponse.json(
        { error: 'Failed to update notifications' },
        { status: 500 }
      );
    }

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

    const adminClient = createAdminClient();
    const { error } = await adminClient
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