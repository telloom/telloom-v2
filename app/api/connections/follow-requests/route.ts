import { createRouteHandlerClient } from '@/utils/supabase/route-handler';
import { NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sharerId = searchParams.get('sharerId');
    const status = searchParams.get('status') || 'PENDING';

    console.log('[FOLLOW_REQUESTS_API] Processing GET request with params:', { sharerId, status });

    if (!sharerId) {
      return NextResponse.json({ error: 'Missing sharerId parameter' }, { status: 400 });
    }

    // Verify sharerId format (should be UUID)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(sharerId)) {
      console.error('[FOLLOW_REQUESTS_API] Invalid sharerId format:', sharerId);
      return NextResponse.json({ error: 'Invalid sharerId format' }, { status: 400 });
    }

    // Verify user is authenticated using Route Handler Client (reads cookies)
    const supabase = await createRouteHandlerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser(); // Reads from cookies

    if (authError || !user) {
      console.error('[FOLLOW_REQUESTS_API GET] Auth error:', authError);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[FOLLOW_REQUESTS_API] Authenticated user:', user.id);

    // Check if user has executor access to this sharer
    const { data: executorData, error: rpcError } = await supabase
      .rpc('get_executor_for_user', { user_id: user.id });

    if (rpcError) {
      console.error('[FOLLOW_REQUESTS_API] RPC error:', rpcError);
      return NextResponse.json({ error: 'Failed to verify executor access' }, { status: 500 });
    }

    const executorRelationships = executorData?.executor_relationships || [];
    const hasAccess = executorRelationships.some(
      (rel: any) => rel.sharerId === sharerId
    );

    console.log('[FOLLOW_REQUESTS_API] Executor relationships found:', executorRelationships.length);
    console.log('[FOLLOW_REQUESTS_API] Has access to sharer:', hasAccess);

    if (!hasAccess) {
      return NextResponse.json({ error: 'Unauthorized access to sharer data' }, { status: 403 });
    }

    // Use admin client to bypass RLS
    const adminClient = createAdminClient();
    console.log('[FOLLOW_REQUESTS_API] Admin client created successfully');
    
    // Always use the correct table name (FollowRequest - PascalCase)
    // to avoid confusion and table not found errors
    const tableName = 'FollowRequest';
    console.log(`[FOLLOW_REQUESTS_API] Using table name: ${tableName}`);
    
    try {
      // Use explicit join syntax to avoid foreign key relationship issues
      const { data: requestsData, error: requestsError } = await adminClient
        .from(tableName)
        .select(`
          id,
          createdAt,
          requestorId
        `)
        .eq('sharerId', sharerId)
        .eq('status', status)
        .order('createdAt', { ascending: false });
  
      if (requestsError) {
        console.error('[FOLLOW_REQUESTS_API] Error fetching follow requests:', requestsError);
        
        if (requestsError.code === '42501') { // Permission denied
          return NextResponse.json({ 
            error: 'Database permission denied',
            errorType: 'PERMISSION_DENIED',
            message: 'The service account does not have permission to access the follow requests table'
          }, { status: 403 });
        }
        
        return NextResponse.json({ 
          error: 'Failed to fetch follow requests', 
          details: requestsError.message 
        }, { status: 500 });
      }
      
      // If we have follow requests, fetch the associated profiles separately
      if (!requestsData || requestsData.length === 0) {
        console.log('[FOLLOW_REQUESTS_API] No follow requests found');
        return NextResponse.json({ requests: [] });
      }
      
      // Get all requestor IDs
      const requestorIds = requestsData.map(request => request.requestorId);
      
      // Fetch the profile data separately
      const { data: profilesData, error: profilesError } = await adminClient
        .from('Profile')
        .select('id, email, firstName, lastName')
        .in('id', requestorIds);
        
      if (profilesError) {
        console.error('[FOLLOW_REQUESTS_API] Error fetching profiles:', profilesError);
        return NextResponse.json({ 
          error: 'Failed to fetch requestor profiles', 
          details: profilesError.message 
        }, { status: 500 });
      }
      
      // Create a map of profiles by ID for easy lookup
      const profilesMap = new Map();
      profilesData?.forEach(profile => {
        profilesMap.set(profile.id, profile);
      });
      
      // Combine follow requests with their requestor profiles
      const requests = requestsData.map(request => {
        const requestorProfile = profilesMap.get(request.requestorId) || {
          id: request.requestorId,
          email: 'Unknown',
          firstName: null,
          lastName: null
        };
        
        return {
          id: request.id,
          createdAt: request.createdAt,
          requestor: {
            id: requestorProfile.id,
            email: requestorProfile.email,
            firstName: requestorProfile.firstName,
            lastName: requestorProfile.lastName
          }
        };
      });
      
      console.log(`[FOLLOW_REQUESTS_API] Successfully fetched ${requests.length} requests`);
      return NextResponse.json({ requests });
      
    } catch (error) {
      console.error('[FOLLOW_REQUESTS_API] Error accessing follow requests table:', error);
      return NextResponse.json({ 
        error: 'Database error', 
        details: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 });
    }
  } catch (error) {
    console.error('[FOLLOW_REQUESTS_API GET] Unhandled error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const requestId = searchParams.get('requestId');
    const sharerId = searchParams.get('sharerId');
    const action = searchParams.get('action');

    console.log('[FOLLOW_REQUESTS_API] Processing PATCH request with params:', { requestId, sharerId, action });

    if (!requestId || !sharerId || !action || (action !== 'approve' && action !== 'deny')) {
      return NextResponse.json({ error: 'Missing or invalid required parameters' }, { status: 400 });
    }

    // Verify user is authenticated using Route Handler Client (reads cookies)
    const supabase = await createRouteHandlerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser(); // Reads from cookies

    if (authError || !user) {
      console.error('[FOLLOW_REQUESTS_API PATCH] Auth error:', authError);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[FOLLOW_REQUESTS_API] Authenticated user:', user.id);

    // Check if user has executor access to this sharer
    const { data: executorData, error: rpcError } = await supabase
      .rpc('get_executor_for_user', { user_id: user.id });

    if (rpcError) {
      console.error('[FOLLOW_REQUESTS_API] RPC error:', rpcError);
      return NextResponse.json({ error: 'Failed to verify executor access' }, { status: 500 });
    }

    const executorRelationships = executorData?.executor_relationships || [];
    const hasAccess = executorRelationships.some(
      (rel: any) => rel.sharerId === sharerId
    );

    console.log('[FOLLOW_REQUESTS_API] Executor relationships found:', executorRelationships.length);
    console.log('[FOLLOW_REQUESTS_API] Has access to sharer:', hasAccess);

    if (!hasAccess) {
      return NextResponse.json({ error: 'Unauthorized access to sharer data' }, { status: 403 });
    }

    // Use admin client to bypass RLS
    const adminClient = createAdminClient();
    console.log('[FOLLOW_REQUESTS_API] Admin client created successfully');
    
    // Always use the correct table name (FollowRequest - PascalCase)
    const tableName = 'FollowRequest';
    console.log(`[FOLLOW_REQUESTS_API] Using table name: ${tableName}`);

    try {
      // First get the follow request details without using the relationship
      const { data: followRequestData, error: getError } = await adminClient
        .from(tableName)
        .select('id, requestorId')
        .eq('id', requestId)
        .single();

      if (getError) {
        console.error('[FOLLOW_REQUESTS_API] Error getting follow request:', getError);
        
        if (getError.code === '42501') { // Permission denied
          return NextResponse.json({ 
            error: 'Database permission denied',
            errorType: 'PERMISSION_DENIED',
            message: 'The service account does not have permission to access the follow requests table'
          }, { status: 403 });
        }
        
        return NextResponse.json({ error: 'Failed to get follow request details' }, { status: 500 });
      }
      
      if (!followRequestData) {
        return NextResponse.json({ error: 'Follow request not found' }, { status: 404 });
      }
      
      // Get requestor details separately
      const { data: requestorProfile, error: profileError } = await adminClient
        .from('Profile')
        .select('id, firstName, lastName, email')
        .eq('id', followRequestData.requestorId)
        .single();
        
      if (profileError) {
        console.error('[FOLLOW_REQUESTS_API] Error getting requestor profile:', profileError);
        return NextResponse.json({ error: 'Failed to get requestor details' }, { status: 500 });
      }

      // Get sharer details
      const { data: sharer, error: sharerError } = await adminClient
        .from('ProfileSharer')
        .select(`
          Profile (
            id,
            firstName,
            lastName
          )
        `)
        .eq('id', sharerId)
        .single();

      if (sharerError || !sharer) {
        console.error('[FOLLOW_REQUESTS_API] Error getting sharer details:', sharerError);
        return NextResponse.json({ error: 'Failed to get sharer details' }, { status: 500 });
      }

      // Get executor details
      const { data: executor, error: executorError } = await adminClient
        .from('Profile')
        .select('firstName, lastName')
        .eq('id', user.id)
        .single();

      if (executorError) {
        console.error('[FOLLOW_REQUESTS_API] Error getting executor details:', executorError);
        return NextResponse.json({ error: 'Failed to get executor details' }, { status: 500 });
      }

      // Combine the follow request with requestor data
      const followRequest = {
        id: followRequestData.id,
        requestor: requestorProfile
      };

      if (action === 'approve') {
        // Create ProfileListener record
        const { error: listenerError } = await adminClient
          .from('ProfileListener')
          .insert({
            sharerId: sharerId,
            listenerId: followRequest.requestor.id,
            hasAccess: true
          });

        if (listenerError) {
          console.error('[FOLLOW_REQUESTS_API] Error creating listener record:', listenerError);
          return NextResponse.json({ error: 'Failed to create listener record' }, { status: 500 });
        }
      }

      // Update FollowRequest status
      const newStatus = action === 'approve' ? 'APPROVED' : 'DENIED';
      const { error: updateError } = await adminClient
        .from(tableName)
        .update({ status: newStatus })
        .eq('id', requestId);

      if (updateError) {
        console.error('[FOLLOW_REQUESTS_API] Error updating follow request:', updateError);
        return NextResponse.json({ error: 'Failed to update follow request' }, { status: 500 });
      }

      // Create notifications
      const sharerName = `${sharer.Profile.firstName || ''} ${sharer.Profile.lastName || ''}`.trim();
      const executorName = `${executor.firstName || ''} ${executor.lastName || ''}`.trim();
      
      // Notification for requestor
      await adminClient.from('Notification').insert({
        userId: followRequest.requestor.id,
        type: action === 'approve' ? 'FOLLOW_REQUEST_APPROVED' : 'FOLLOW_REQUEST_DENIED',
        message: action === 'approve' 
          ? `Your request to follow ${sharerName} has been approved by ${executorName}`
          : `Your request to follow ${sharerName} has been denied by ${executorName}`,
        data: {
          sharerId,
          requestId,
          sharerName,
          action
        }
      });

      // Notification for sharer
      await adminClient.from('Notification').insert({
        userId: sharerId,
        type: action === 'approve' ? 'FOLLOW_REQUEST_APPROVED_BY_EXECUTOR' : 'FOLLOW_REQUEST_DENIED_BY_EXECUTOR',
        message: action === 'approve'
          ? `${executorName} approved follow request from ${followRequest.requestor.email}`
          : `${executorName} denied follow request from ${followRequest.requestor.email}`,
        data: {
          requestorId: followRequest.requestor.id,
          requestorEmail: followRequest.requestor.email,
          action
        }
      });

      console.log('[FOLLOW_REQUESTS_API] Successfully processed follow request action:', action);
      return NextResponse.json({ success: true });
      
    } catch (error) {
      console.error('[FOLLOW_REQUESTS_API] Error processing follow request action:', error);
      return NextResponse.json({ error: 'Internal server error processing action' }, { status: 500 });
    }
  } catch (error) {
    console.error('[FOLLOW_REQUESTS_API] Unhandled error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ... existing code continues ...