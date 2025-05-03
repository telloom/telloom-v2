// app/api/sharer/connections/requests/route.ts
// API route to fetch pending follow requests FOR the logged-in Sharer

import { createServerClient } from '@supabase/ssr'; // Correct import for SSR clients
import { cookies } from 'next/headers'; // Import cookies helper
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  console.log('[API sharer/connections/requests] GET request received');

  // Create client specifically for Route Handlers using createServerClient
  const cookieStore = cookies(); // Get cookie store
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          // Read-only for GET
        },
        remove(name: string, options: any) {
          // Read-only for GET
        },
      },
    }
  );

  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('[API sharer/connections/requests] Auth error:', authError);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.log('[API sharer/connections/requests] Authenticated user:', user.id);

    // --- Get Sharer ID directly from user metadata ---
    const sharerId = user.app_metadata?.sharer_id;
    const isSharer = user.app_metadata?.is_sharer;

    // Validate that the user is a sharer and has a sharerId in metadata
    if (!isSharer || !sharerId) {
      console.error('[API sharer/connections/requests] User is not a Sharer or Sharer ID not found in metadata. Metadata:', user.app_metadata);
      return NextResponse.json({ error: 'User is not a Sharer or Sharer ID not found' }, { status: 403 });
    }
    console.log('[API sharer/connections/requests] Sharer ID from metadata:', sharerId);
    // -----------------------------------------------------

    // --- Fetch follow requests using RPC function ---
    console.log(`[API sharer/connections/requests] Calling RPC get_sharer_received_follow_requests for sharer: ${sharerId}`);
    const { data: rpcData, error: rpcError } = await supabase.rpc(
      'get_sharer_received_follow_requests',
      { p_sharer_id: sharerId } // Pass sharerId to the RPC function
    );

    if (rpcError) {
      console.error('[API sharer/connections/requests] RPC error fetching follow requests:', rpcError);
      return NextResponse.json({ error: rpcError.message || 'Failed to fetch follow requests via RPC' }, { status: 500 });
    }

    // The RPC function should return a JSONB object like { followRequests: [...] }
    const followRequests = rpcData?.followRequests || [];

    console.log(`[API sharer/connections/requests] Found ${followRequests.length} pending follow requests via RPC.`);
    return NextResponse.json({ followRequests: followRequests });
    // --- End RPC fetch ---

  } catch (error) {
    console.error('[API sharer/connections/requests] General error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

// Add PATCH handler here for approve/deny actions, ensuring it also uses the
// server client and relies on RLS or RPC ('handle_follow_request_response') for authorization. 