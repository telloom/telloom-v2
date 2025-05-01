// app/api/mux/delete-asset/route.ts
// API route to securely delete a Mux video asset.

import { NextResponse } from 'next/server';
import Mux from '@mux/mux-node';
import { createServerClient, type CookieOptions } from '@supabase/ssr'; // Import CookieOptions
import { cookies } from 'next/headers'; // Import cookies

// Ensure Mux credentials are available
if (!process.env.MUX_TOKEN_ID || !process.env.MUX_TOKEN_SECRET) {
  throw new Error('MUX_TOKEN_ID and MUX_TOKEN_SECRET must be set in environment variables');
}

const mux = new Mux({
  tokenId: process.env.MUX_TOKEN_ID,
  tokenSecret: process.env.MUX_TOKEN_SECRET,
});

export async function POST(request: Request) {
  console.log('[API /mux/delete-asset] Received POST request');
  // --- Correctly initialize Supabase client for Route Handler ---
  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          // Route Handlers cannot set cookies directly on the request
          // If needed, set them in the response
          // cookieStore.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          // Route Handlers cannot remove cookies directly from the request
          // If needed, clear them in the response
          // cookieStore.set({ name, value: '', ...options });
        },
      },
    }
  );
  // --- End client initialization ---

  try {
    // 1. Authentication Check: Ensure the user is logged in.
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.warn('[API /mux/delete-asset] Authentication failed:', authError?.message);
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    console.log(`[API /mux/delete-asset] Authenticated user: ${user.id}`);

    // 2. Get Asset ID from request body
    const body = await request.json();
    const { assetId } = body;

    if (!assetId || typeof assetId !== 'string') {
      console.warn('[API /mux/delete-asset] Missing or invalid assetId in request body');
      return NextResponse.json({ error: 'Missing or invalid assetId' }, { status: 400 });
    }
    console.log(`[API /mux/delete-asset] Request to delete assetId: ${assetId}`);

    // 3. Authorization (Optional but recommended):
    // Add checks here if needed to verify if *this specific user* should be allowed
    // to delete *this specific asset*. For now, we rely on the page-level check
    // that happened before this API was called. A more robust check might involve
    // looking up the assetId in our DB (e.g., TopicVideo) and verifying ownership/permissions.

    // 4. Delete the asset using Mux SDK
    console.log(`[API /mux/delete-asset] Calling Mux API to delete asset: ${assetId}`);
    await mux.video.assets.delete(assetId);
    console.log(`[API /mux/delete-asset] Successfully deleted Mux asset: ${assetId}`);

    // 5. Return success response
    return NextResponse.json({ message: 'Asset deleted successfully' }, { status: 200 });

  } catch (error: any) {
    console.error('[API /mux/delete-asset] Error processing request:', error);

    // Handle potential Mux API errors (e.g., asset not found)
    if (error?.type === 'invalid_request_error' && error?.messages?.includes('Asset not found')) {
       console.warn(`[API /mux/delete-asset] Mux asset ${assetId} not found (already deleted?). Continuing.`);
       // Optionally return success if asset already gone, or specific status code
       return NextResponse.json({ message: 'Asset already deleted or not found' }, { status: 200 }); // Or 404 if preferred
    }

    return NextResponse.json({ error: 'Internal Server Error', details: error.message || 'Unknown error' }, { status: 500 });
  }
} 