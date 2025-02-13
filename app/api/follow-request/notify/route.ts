import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { loops, TRANSACTIONAL_EMAIL_IDS } from '@/utils/loops'
import { createFollowRequestNotification } from '@/utils/notifications'

export async function POST(request: Request) {
  try {
    console.log('[Follow Request Notify] Starting notification process');
    const cookieStore = cookies()
    const supabase = createClient()

    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    console.log('[Follow Request Notify] Auth check:', { userId: user?.id, error: authError });

    if (authError || !user) {
      console.error('[Follow Request Notify] Auth error:', authError);
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { requestId } = await request.json()
    console.log('[Follow Request Notify] Request ID:', requestId);

    // Fetch the follow request details with the requestor's profile information
    const { data: followRequest, error: requestError } = await supabase
      .from('FollowRequest')
      .select(`
        *,
        requestor:Profile!requestorId (
          firstName,
          lastName,
          email
        ),
        sharer:ProfileSharer!sharerId (
          profileId,
          profile:Profile!profileId (
            firstName,
            lastName,
            email
          )
        )
      `)
      .eq('id', requestId)
      .single()

    console.log('[Follow Request Notify] Follow request data:', { followRequest, error: requestError });

    if (requestError || !followRequest) {
      console.error('[Follow Request Notify] Error fetching follow request:', requestError)
      return NextResponse.json(
        { error: 'Follow request not found' },
        { status: 404 }
      )
    }

    try {
      // Create notification first
      const sharerId = followRequest.sharer.profileId;
      console.log('[Follow Request Notify] Creating notification for sharer:', sharerId);
      
      if (!sharerId) {
        throw new Error('Could not find sharer profile ID');
      }

      await createFollowRequestNotification(
        sharerId,
        {
          firstName: followRequest.requestor.firstName || '',
          lastName: followRequest.requestor.lastName || '',
          email: followRequest.requestor.email
        }
      );
      console.log('[Follow Request Notify] Notification created successfully');

      // Try to send email, but don't fail if it doesn't work
      try {
        console.log('[Follow Request Notify] Attempting to send email');
        const followRequestsUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/role-sharer/connections?tab=requests`
        
        await loops.sendTransactionalEmail({
          transactionalId: TRANSACTIONAL_EMAIL_IDS.FOLLOW_REQUEST,
          email: followRequest.sharer.profile.email,
          dataVariables: {
            sharerName: followRequest.sharer.profile.firstName || '',
            requestorName: `${followRequest.requestor.firstName || ''} ${followRequest.requestor.lastName || ''}`.trim(),
            requestorEmail: followRequest.requestor.email,
            followRequestsUrl
          }
        })
        console.log('[Follow Request Notify] Email sent successfully');
      } catch (emailError) {
        // Log but don't fail if email fails
        console.error('[Follow Request Notify] Email sending failed:', emailError)
      }

      return NextResponse.json({ success: true })
    } catch (error) {
      console.error('[Follow Request Notify] Error in notification/email process:', error)
      return NextResponse.json(
        { error: 'Failed to process notification' },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('[Follow Request Notify] Error in notify route:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 