// app/api/sharer/connections/active/route.ts
// API route to fetch active connections (Listeners and Executors) for the logged-in Sharer

import { createServerClient } from '@supabase/ssr'; // Correct import for SSR clients
import { cookies } from 'next/headers'; // Import cookies helper
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  console.log('[API sharer/connections/active] GET request received');
  
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
        // Note: Route Handlers are recommended to be read-only for cookies
        // unless specific actions require setting/removing them.
        // For GET requests, setting/removing might not be needed.
        set(name: string, value: string, options: any) {
          // Handle setting cookies if necessary for your logic
          // cookieStore.set({ name, value, ...options });
        },
        remove(name: string, options: any) {
          // Handle removing cookies if necessary
          // cookieStore.set({ name, value: '', ...options });
        },
      },
    }
  );

  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('[API sharer/connections/active] Auth error:', authError);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.log('[API sharer/connections/active] Authenticated user:', user.id);

    // --- Get Sharer ID directly from user metadata ---
    const sharerId = user.app_metadata?.sharer_id;
    const isSharer = user.app_metadata?.is_sharer;

    // Validate that the user is a sharer and has a sharerId in metadata
    if (!isSharer || !sharerId) {
      console.error('[API sharer/connections/active] User is not a Sharer or Sharer ID not found in metadata. Metadata:', user.app_metadata);
      return NextResponse.json({ error: 'User is not a Sharer or Sharer ID not found' }, { status: 403 });
    }
    console.log('[API sharer/connections/active] Sharer ID from metadata:', sharerId);
    // -----------------------------------------------------

    // --- Fetch connections using RPC function ---
    console.log(`[API sharer/connections/active] Calling RPC get_sharer_active_connections for sharer: ${sharerId}`);
    const { data: rpcData, error: rpcError } = await supabase.rpc(
      'get_sharer_active_connections',
      { p_sharer_id: sharerId } // Pass sharerId to the RPC function
    );

    if (rpcError) {
      console.error('[API sharer/connections/active] RPC error fetching connections:', rpcError);
      return NextResponse.json({ error: rpcError.message || 'Failed to fetch connections via RPC' }, { status: 500 });
    }

    // The RPC function should return a JSONB object like { connections: [...] }
    const connections = rpcData?.connections || [];

    console.log(`[API sharer/connections/active] Found ${connections.length} connections via RPC.`);
    // Return the connections directly from the RPC result
    return NextResponse.json({ connections: connections });
    // --- End RPC fetch ---

  } catch (error) {
    console.error('[API sharer/connections/active] General error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}