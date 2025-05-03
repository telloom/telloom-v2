// app/api/sharer/connections/[connectionId]/route.ts
// API route to DELETE an active connection (Listener or Executor) for the logged-in Sharer

import { createServerClient } from '@supabase/ssr'; // Restore import
import { cookies } from 'next/headers'; // Restore import
import { NextResponse } from 'next/server';

export async function DELETE(
  request: Request,
  { params }: { params: { connectionId: string } }
) {
  // Properly await params before accessing properties
  const resolvedParams = await Promise.resolve(params);
  const connectionId = resolvedParams.connectionId; // Use resolved value

  const { searchParams } = new URL(request.url);
  const role = searchParams.get('role');

  console.log(`[API sharer/connections DELETE] Initial request received. connectionId: ${connectionId}, role: ${role}`);

  if (!connectionId) {
    console.error('[API sharer/connections DELETE] Missing connectionId');
    return NextResponse.json({ error: 'Connection ID is required' }, { status: 400 });
  }

  if (role !== 'LISTENER' && role !== 'EXECUTOR') {
    console.error(`[API sharer/connections DELETE] Invalid role received: ${role}`);
    return NextResponse.json({ error: 'Invalid role specified. Must be LISTENER or EXECUTOR.' }, { status: 400 });
  }

  // Await the cookie store before using its methods
  const cookieStore = await cookies(); 

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        // Now we can safely access methods on the resolved cookieStore
        get(name: string) { return cookieStore.get(name)?.value; },
        set(name: string, value: string, options: any) { 
          cookieStore.set({ name, value, ...options }); // Allow setting if needed
        },
        remove(name: string, options: any) { 
          cookieStore.set({ name, value: '', ...options }); // Allow removing if needed
        },
      },
    }
  );

  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('[API sharer/connections DELETE] Auth error:', authError);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const sharerId = user.app_metadata?.sharer_id;
    const isSharer = user.app_metadata?.is_sharer;

    console.log(`[API sharer/connections DELETE] Authenticated User ID: ${user.id}`);
    console.log(`[API sharer/connections DELETE] Processing DELETE for connectionId: ${connectionId}`);
    console.log(`[API sharer/connections DELETE] Role received: ${role}`);
    console.log(`[API sharer/connections DELETE] Sharer ID from metadata: ${sharerId}`);
    console.log(`[API sharer/connections DELETE] Is Sharer flag from metadata: ${isSharer}`);

    if (!isSharer || !sharerId) {
      console.error('[API sharer/connections DELETE] User is not a Sharer or Sharer ID missing.');
      return NextResponse.json({ error: 'Forbidden: User is not the Sharer' }, { status: 403 });
    }

    // Proceed with deletion based on role
    if (role === 'LISTENER') {
      console.log(`[API sharer/connections DELETE] Attempting to revoke LISTENER connection: ${connectionId} for sharer: ${sharerId}`);
      
      // 1. Fetch the Listener's Profile ID using the ProfileListener record ID (connectionId)
      const { data: listenerProfileData, error: listenerProfileError } = await supabase
        .from('ProfileListener')
        .select('listenerId') // Get the actual profile ID of the listener
        .eq('id', connectionId) // Use the PK of ProfileListener table
        .eq('sharerId', sharerId) // Ensure it belongs to the sharer
        .single();

      if (listenerProfileError || !listenerProfileData) {
        console.error('[API sharer/connections DELETE] Error fetching listener profile ID or not found:', listenerProfileError);
        const errorMsg = listenerProfileError?.code === 'PGRST116' ? 'Listener connection record not found for this sharer.' : 'Error fetching listener details.';
        return NextResponse.json({ error: errorMsg }, { status: 404 });
      }

      const listenerProfileId = listenerProfileData.listenerId;
      console.log(`[API sharer/connections DELETE] Found listenerProfileId: ${listenerProfileId} for connectionId: ${connectionId}`);

      // 2. Call the RPC function to revoke access
      console.log(`[API sharer/connections DELETE] Calling revoke_listener_access for listenerProfileId: ${listenerProfileId}, sharerId: ${sharerId}`);
      const { error: revokeError } = await supabase.rpc('revoke_listener_access', {
        p_listener_profile_id: listenerProfileId, // Pass the Listener's Profile ID
        p_sharer_id: sharerId,
      });

      if (revokeError) {
        console.error('[API sharer/connections DELETE] Error revoking listener access via RPC:', revokeError);
        return NextResponse.json({ error: 'Failed to revoke listener access' }, { status: 500 });
      }

      console.log(`[API sharer/connections DELETE] LISTENER connection for listener ${listenerProfileId} revoked successfully.`);
      return NextResponse.json({ message: 'Listener removed successfully' }, { status: 200 });

    } else if (role === 'EXECUTOR') {
      // The connectionId here IS the ID of the ProfileExecutor relationship record.
      const profileExecutorRecordId = connectionId;
      console.log(`[API sharer/connections DELETE] Attempting to revoke EXECUTOR connection using ProfileExecutor record ID: ${profileExecutorRecordId} for sharer: ${sharerId}`);

      // Directly call the new RPC function that handles authorization and deletion
      console.log(`[API sharer/connections DELETE] Calling RPC revoke_executor_connection_by_record_id with record ID: ${profileExecutorRecordId}, sharer ID: ${sharerId}`);
      const { error: revokeError } = await supabase.rpc('revoke_executor_connection_by_record_id', {
        p_profile_executor_id: profileExecutorRecordId, // Pass the ProfileExecutor record ID
        p_sharer_id: sharerId,                         // Pass the Sharer ID for authorization check within the RPC
      });

      if (revokeError) {
        console.error('[API sharer/connections DELETE] Error revoking executor connection via RPC revoke_executor_connection_by_record_id:', revokeError);
        // Check if the error is due to the record not being found or authorization failure within the RPC
        if (revokeError.message.includes('not found') || revokeError.message.includes('does not own')) {
           return NextResponse.json({ error: 'Executor connection record not found or access denied.' }, { status: 404 });
        }
        return NextResponse.json({ error: 'Failed to revoke executor connection' }, { status: 500 });
      }

      console.log(`[API sharer/connections DELETE] EXECUTOR connection record ${profileExecutorRecordId} removed successfully.`);
      return NextResponse.json({ message: 'Executor removed successfully' }, { status: 200 });
    }

  } catch (error) {
    console.error('[API sharer/connections DELETE] General error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
} 