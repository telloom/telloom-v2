/**
 * File: app/api/invitations/find/route.ts
 * Description: API endpoint for finding PENDING invitation details by token (publicly accessible).
 */

import { NextResponse } from 'next/server';
// Use the standard route handler client, not admin
import createRouteHandlerClient from '@/utils/supabase/route-handler'; 

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const token = url.searchParams.get('token');

    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 });
    }

    console.log(`[API /invitations/find] Finding PENDING invitation with token: ${token}`);

    // Create a standard route handler client (will operate as 'anon' if no user is logged in)
    const supabase = await createRouteHandlerClient();
    
    // Call the new secure RPC function
    console.log(`[API /invitations/find] Calling RPC get_pending_invitation_details_by_token for token: ${token}`);
    const { data: result, error: rpcError } = await supabase
      .rpc('get_pending_invitation_details_by_token', { token_value: token });

    if (rpcError) {
      console.error(`[API /invitations/find] RPC error finding invitation: ${rpcError.message}`);
      return NextResponse.json({ 
        error: 'Failed to query invitation', 
        details: rpcError.message 
      }, { status: 500 });
    }

    if (!result || !result.invitation) {
      console.log(`[API /invitations/find] No PENDING invitation found for token: ${token}`);
      return NextResponse.json({ 
        error: 'Invitation not found or already processed'
      }, { status: 404 });
    }

    console.log(`[API /invitations/find] Successfully found PENDING invitation: ${result.invitation.id}`);
    // The RPC function already structures the data with 'invitation' and 'sharer' keys
    return NextResponse.json(result);

  } catch (error: any) {
    console.error('[API /invitations/find] Unexpected error:', error);
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error.message 
    }, { status: 500 });
  }
} 