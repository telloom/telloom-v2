// app/api/sharer/connections/invitations/route.ts
// API route to fetch pending invitations SENT BY the logged-in Sharer

import { createServerClient } from '@supabase/ssr'; // Correct import for SSR clients
import { cookies } from 'next/headers'; // Import cookies helper
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  console.log('[API sharer/connections/invitations] GET request received');

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
      console.error('[API sharer/connections/invitations] Auth error:', authError);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.log('[API sharer/connections/invitations] Authenticated user:', user.id);

    // --- Get Sharer ID directly from user metadata ---
    const sharerId = user.app_metadata?.sharer_id;
    const isSharer = user.app_metadata?.is_sharer;

    // Validate that the user is a sharer and has a sharerId in metadata
    if (!isSharer || !sharerId) {
      console.error('[API sharer/connections/invitations] User is not a Sharer or Sharer ID not found in metadata. Metadata:', user.app_metadata);
      return NextResponse.json({ error: 'User is not a Sharer or Sharer ID not found' }, { status: 403 });
    }
    console.log('[API sharer/connections/invitations] Sharer ID from metadata:', sharerId);
    // -----------------------------------------------------

    // --- Fetch invitations using RPC function ---
    console.log(`[API sharer/connections/invitations] Calling RPC get_sharer_sent_invitations for sharer: ${sharerId}`);
    const { data: rpcData, error: rpcError } = await supabase.rpc(
      'get_sharer_sent_invitations',
      { p_sharer_id: sharerId } // Pass sharerId to the RPC function
    );

    if (rpcError) {
      console.error('[API sharer/connections/invitations] RPC error fetching invitations:', rpcError);
      return NextResponse.json({ error: rpcError.message || 'Failed to fetch invitations via RPC' }, { status: 500 });
    }

    // The RPC function should return a JSONB object like { invitations: [...] }
    const invitations = rpcData?.invitations || [];

    console.log(`[API sharer/connections/invitations] Found ${invitations.length} pending invitations via RPC.`);
    return NextResponse.json({ invitations: invitations });
    // --- End RPC fetch ---

  } catch (error) {
    console.error('[API sharer/connections/invitations] General error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

// Add DELETE, POST (resend) handlers here if needed, ensuring they also check
// auth.uid() == inviterId and correct sharerId based on RLS or explicit checks. 