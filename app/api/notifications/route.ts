import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getUser } from '@/utils/supabase/server';

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
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const sharerId = searchParams.get('sharerId');
    const countOnly = searchParams.get('count') === 'true';

    console.log('Fetching notifications for user:', user.id, 'sharerId:', sharerId);

    let query = createClient()
      .from('Notification')
      .select(countOnly ? 'id' : '*')
      .order('createdAt', { ascending: false });

    if (sharerId) {
      // When viewing notifications for a specific sharer:
      // 1. Get notifications where they are the direct recipient (userId)
      // 2. Get notifications that reference them in the data.sharerId field
      query = query.or(`userId.eq.${sharerId},data->>'sharerId'.eq.${sharerId}`);
    } else {
      // When viewing your own notifications, just get ones where you're the recipient
      query = query.eq('userId', user.id);
    }

    // Add filter for unread notifications if counting
    if (countOnly) {
      query = query.eq('isRead', false);
    }

    console.log('Query:', query.toString());

    const { data: notifications, error } = await query;

    if (error) {
      console.error('Error fetching notifications:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Return count if requested
    if (countOnly) {
      return NextResponse.json({ unreadCount: notifications?.length || 0 });
    }

    console.log('Found notifications:', notifications?.length || 0);
    if (notifications?.length) {
      console.log('First notification:', notifications[0]);
    }

    return NextResponse.json({ notifications: notifications || [] });
  } catch (error) {
    console.error('Error in notifications GET:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const cookieStore = cookies();
    const supabase = createClient();
    
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

    const { error: updateError } = await supabase
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
    const user = await getUser();
    if (!user) {
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