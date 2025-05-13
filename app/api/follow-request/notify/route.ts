import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { loops, TRANSACTIONAL_EMAIL_IDS } from '@/utils/loops'
import { createFollowRequestNotification } from '@/utils/notifications'

// Define the expected structure for the request body
interface NotifyRequestBody {
  requestId: string; // Assuming the ID is passed as a string
}

// Define structure for Profile data needed (and RPC return)
interface ProfileInfo {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null; // Keep email for fallback
}

export async function POST(request: Request) {
  console.log('[API /follow-request/notify] Received POST request');
  const supabase = await createClient();

  try {
    // 1. Parse Request Body
    const body: NotifyRequestBody = await request.json();
    const { requestId } = body;
    console.log(`[API /follow-request/notify] Parsed requestId: ${requestId}`);

    if (!requestId) {
      console.error('[API /follow-request/notify] Missing requestId in body');
      return NextResponse.json({ error: 'Missing requestId' }, { status: 400 });
    }

    // 2. Fetch Follow Request Details
    console.log(`[API /follow-request/notify] Fetching FollowRequest details for ID: ${requestId}`);
    const { data: followRequest, error: requestError } = await supabase
      .from('FollowRequest')
      .select('id, sharerId, requestorId') // Select necessary IDs
      .eq('id', requestId)
      .single();

    if (requestError || !followRequest) {
      console.error(`[API /follow-request/notify] Error fetching FollowRequest details for ID ${requestId}:`, requestError);
      return NextResponse.json({ error: 'Follow request not found', details: requestError?.message }, { status: 404 });
    }
    console.log('[API /follow-request/notify] Found FollowRequest:', followRequest);

    const { sharerId, requestorId } = followRequest; // sharerId IS ProfileSharer.id

    // 3. Fetch Requestor Profile Details using RPC to avoid RLS recursion
    console.log(`[API /follow-request/notify] Fetching Requestor Profile details via RPC for ID: ${requestorId}`);
    const { data: requestorProfileData, error: requestorRpcError } = await supabase
      .rpc('get_profile_for_notification', { p_profile_id: requestorId })
      .single<ProfileInfo>(); // Apply type to the result of .single()

    // Adapt the fetched data structure
    const requestorProfile: ProfileInfo | null = requestorProfileData ? {
        id: requestorProfileData.id,
        firstName: requestorProfileData.firstName,
        lastName: requestorProfileData.lastName,
        email: requestorProfileData.email,
    } : null;

    if (requestorRpcError || !requestorProfile) {
      console.error(`[API /follow-request/notify] Error fetching requestor profile ${requestorId} via RPC:`, requestorRpcError);
      // Log error, proceed with default name
    }
    console.log('[API /follow-request/notify] Found Requestor Profile via RPC:', requestorProfile);

    // 4. Fetch Sharer's Profile ID using RPC
    console.log(`[API /follow-request/notify] Fetching Sharer's Profile ID via RPC for ProfileSharer ID: ${sharerId}`);
    const { data: rpcSharerProfileId, error: sharerRpcError } = await supabase
      .rpc('get_sharer_profile_id_from_profilesharer_id', { p_profilesharer_id: sharerId })
      .single(); // The RPC returns a single UUID or null

    if (sharerRpcError || !rpcSharerProfileId) {
      console.error(`[API /follow-request/notify] Error fetching sharer's Profile ID via RPC for ProfileSharer ID ${sharerId}:`, sharerRpcError);
      // It's possible the RPC returns null if not found, which is a valid scenario if data is somehow inconsistent
      return NextResponse.json({ error: 'Could not retrieve target sharer profile information', details: sharerRpcError?.message }, { status: 500 });
    }
    const sharerProfileId = rpcSharerProfileId; // The RPC directly returns the UUID (Profile.id)
    console.log(`[API /follow-request/notify] Found Sharer Profile ID (for Notification.userId) via RPC: ${sharerProfileId}`);

    // 5. Construct Notification Payload
    const requestorName = [requestorProfile?.firstName, requestorProfile?.lastName].filter(Boolean).join(' ') || requestorProfile?.email || 'Someone';
    const notificationMessage = `${requestorName} has requested to follow you.`;
    const notificationData = {
      followRequestId: requestId,
      requestorId: requestorId,
      requestorName: requestorName, // Include name used in message
    };

    console.log('[API /follow-request/notify] Constructed Notification Payload:', {
      userId: sharerProfileId, // The Sharer's Profile ID
      type: 'FOLLOW_REQUEST_RECEIVED',
      message: notificationMessage,
      data: notificationData,
      isRead: false,
    });

    // 6. Insert Notification
    console.log(`[API /follow-request/notify] Inserting Notification for user ID: ${sharerProfileId}`);
    const { data: notification, error: notificationError } = await supabase
      .from('Notification')
      .insert({
        userId: sharerProfileId, // Notify the Sharer (using their Profile.id)
        type: 'FOLLOW_REQUEST_RECEIVED', // Specific type for follow requests
        message: notificationMessage,
        data: notificationData, // Store relevant IDs
        isRead: false,
      })
      .select() // Optionally select the created notification
      .single();

    if (notificationError) {
      console.error(`[API /follow-request/notify] Error inserting notification for user ${sharerProfileId}:`, notificationError);
      // Log the error but still return success to the client, as the request itself was created.
      // The client already showed success, this API is best-effort.
      return NextResponse.json({ message: 'Follow request recorded, but notification failed.', error: notificationError.message }, { status: 500 }); // Return 500 to indicate partial failure
    }

    console.log(`[API /follow-request/notify] Notification successfully created:`, notification);
    return NextResponse.json({ message: 'Notification sent successfully', notificationId: notification?.id }, { status: 200 });

  } catch (error: any) {
    console.error('[API /follow-request/notify] Unhandled error:', error);
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 });
  }
} 