import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(request: Request) {
  const cookieStore = cookies();
  const supabase = createClient();
  
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Retrieve notifications for the current user
  const { data: notifications, error } = await supabase
    .from('Notification')
    .select('*')
    .eq('userId', user.id)
    .order('createdAt', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // If query parameter 'count' is provided, return only the unread count.
  const { searchParams } = new URL(request.url);
  if (searchParams.get('count') === 'true') {
    const unreadCount = notifications?.filter((n: any) => !n.isRead).length || 0;
    return NextResponse.json({ unreadCount });
  }

  return NextResponse.json({ notifications });
}

export async function PATCH(request: Request) {
  const cookieStore = cookies();
  const supabase = createClient();
  
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { ids } = await request.json();

  if (!ids || !Array.isArray(ids)) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { error } = await supabase
    .from('Notification')
    .update({ isRead: true })
    .in('id', ids)
    .eq('userId', user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
} 