import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

interface RouteContext {
  params: {
    id: string;
  };
}

export async function POST(
  request: Request,
  context: RouteContext
) {
  const resolvedParams = await Promise.resolve(context.params);
  const notificationId = resolvedParams.id;
  
  const supabase = createClient();
  
  // Get the current user
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  
  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    // Mark the notification as read
    const { error } = await supabase
      .from('Notification')
      .update({ isRead: true })
      .eq('id', notificationId)
      .eq('profileId', user.id);
    
    if (error) {
      console.error('Error marking notification as read:', error);
      return NextResponse.json({ error: 'Failed to mark notification as read' }, { status: 500 });
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in mark-read route:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 