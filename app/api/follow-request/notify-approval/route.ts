import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createConnectionChangeNotification } from '@/utils/notifications'

export async function POST(request: Request) {
  try {
    console.log('[Follow Request Approval Notify] Starting notification process');
    const cookieStore = cookies()
    const supabase = createClient()

    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    console.log('[Follow Request Approval Notify] Auth check:', { userId: user?.id, error: authError });

    if (authError || !user) {
      console.error('[Follow Request Approval Notify] Auth error:', authError);
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { requestId, requestorId, sharerId } = await request.json()
    console.log('[Follow Request Approval Notify] Request data:', { requestId, requestorId, sharerId });

    // Get the sharer's profile information
    const { data: sharerProfile, error: sharerError } = await supabase
      .from('Profile')
      .select('firstName, lastName, email')
      .eq('id', user.id)
      .single()

    if (sharerError) {
      console.error('[Follow Request Approval Notify] Error fetching sharer profile:', sharerError);
      throw sharerError;
    }

    try {
      // Create notification for the requestor
      await createConnectionChangeNotification(
        requestorId,
        'ACCEPTED',
        {
          firstName: sharerProfile.firstName || '',
          lastName: sharerProfile.lastName || '',
          email: sharerProfile.email
        }
      );
      console.log('[Follow Request Approval Notify] Notification created successfully');

      return NextResponse.json({ success: true })
    } catch (error) {
      console.error('[Follow Request Approval Notify] Error in notification process:', error)
      return NextResponse.json(
        { error: 'Failed to process notification' },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('[Follow Request Approval Notify] Error in notify route:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 