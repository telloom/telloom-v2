import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createFollowRequestNotification } from '@/utils/notifications';

export async function POST(request: Request) {
  try {
    console.log('[Follow Request] Starting follow request creation');
    const cookieStore = cookies();
    const supabase = createClient();

    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    console.log('[Follow Request] Current user:', { userId: user?.id, authError });

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { sharerId } = await request.json();
    console.log('[Follow Request] Received sharerId:', sharerId);

    // Get the sharer's profile information
    const { data: sharer, error: sharerError } = await supabase
      .from('ProfileSharer')
      .select(`
        id,
        profile:Profile!profileId (
          id,
          firstName,
          lastName,
          email
        )
      `)
      .eq('id', sharerId)
      .single();

    console.log('[Follow Request] Sharer info:', { 
      sharer: sharer ? {
        id: sharer.id,
        profileId: sharer.profile?.id,
        email: sharer.profile?.email
      } : null, 
      error: sharerError 
    });

    if (sharerError || !sharer) {
      return NextResponse.json(
        { error: 'Sharer not found' },
        { status: 404 }
      );
    }

    // Get the requestor's profile information
    const { data: requestor, error: requestorError } = await supabase
      .from('Profile')
      .select('firstName, lastName, email')
      .eq('id', user.id)
      .single();

    console.log('[Follow Request] Requestor info:', { 
      requestor: requestor ? {
        email: requestor.email,
        name: `${requestor.firstName} ${requestor.lastName}`
      } : null, 
      error: requestorError 
    });

    if (requestorError || !requestor) {
      return NextResponse.json(
        { error: 'Requestor profile not found' },
        { status: 404 }
      );
    }

    // Create the follow request
    const { data: followRequest, error: createError } = await supabase
      .from('FollowRequest')
      .insert({
        requestorId: user.id,
        sharerId: sharerId,
        status: 'PENDING',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })
      .select()
      .single();

    console.log('[Follow Request] Created follow request:', { 
      followRequest: followRequest ? { id: followRequest.id } : null, 
      error: createError 
    });

    if (createError) {
      return NextResponse.json(
        { error: createError.message },
        { status: 500 }
      );
    }

    // Create in-app notification
    console.log('[Follow Request] Attempting to create notification for:', {
      userId: sharer.profile.id,
      requestorInfo: {
        firstName: requestor.firstName || '',
        lastName: requestor.lastName || '',
        email: requestor.email
      }
    });

    try {
      const notificationResult = await createFollowRequestNotification(
        sharer.profile.id,
        {
          firstName: requestor.firstName || '',
          lastName: requestor.lastName || '',
          email: requestor.email
        }
      );
      console.log('[Follow Request] Notification created successfully:', notificationResult);
    } catch (notificationError) {
      console.error('[Follow Request] Failed to create notification:', notificationError);
      // Continue execution even if notification fails
    }

    // Trigger email notification in the background
    console.log('[Follow Request] Triggering email notification for request:', followRequest.id);
    try {
      fetch('/api/follow-request/notify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requestId: followRequest.id,
        }),
      }).catch(error => {
        console.error('[Follow Request] Failed to trigger email notification:', error);
        // Email failure doesn't affect the response
      });
    } catch (error) {
      console.error('[Follow Request] Failed to trigger email notification:', error);
      // Email failure doesn't affect the response
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Follow Request] Error creating follow request:', error);
    return NextResponse.json(
      { error: 'Failed to create follow request' },
      { status: 500 }
    );
  }
} 