import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { loops, TRANSACTIONAL_EMAIL_IDS } from '@/utils/loops'

export async function POST(request: Request) {
  try {
    const cookieStore = cookies()
    const supabase = await createClient()

    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { requestId } = await request.json()

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
          profile:Profile!profileId (
            firstName,
            lastName,
            email
          )
        )
      `)
      .eq('id', requestId)
      .single()

    if (requestError || !followRequest) {
      console.error('Error fetching follow request:', requestError)
      return NextResponse.json(
        { error: 'Follow request not found' },
        { status: 404 }
      )
    }

    // Compose the follow requests URL
    const followRequestsUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/role-sharer/follow-requests`

    // Send email via Loops
    await loops.sendTransactionalEmail({
      transactionalId: TRANSACTIONAL_EMAIL_IDS.FOLLOW_REQUEST,
      email: followRequest.sharer.profile.email,
      dataVariables: {
        sharerName: `${followRequest.sharer.profile.firstName}`,
        requestorName: `${followRequest.requestor.firstName} ${followRequest.requestor.lastName}`,
        requestorEmail: followRequest.requestor.email,
        followRequestsUrl
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error sending notification:', error)
    return NextResponse.json(
      { error: 'Failed to send notification' },
      { status: 500 }
    )
  }
} 