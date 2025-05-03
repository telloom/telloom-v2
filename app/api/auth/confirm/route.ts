// app/api/auth/confirm/route.ts
import type { EmailOtpType } from '@supabase/supabase-js';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
// Use the route handler client which is designed for API routes and cookie setting
import createRouteHandlerClient from '@/utils/supabase/route-handler';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const token_hash = requestUrl.searchParams.get('token_hash');
  const type = requestUrl.searchParams.get('type') as EmailOtpType | null;
  const next = requestUrl.searchParams.get('next') || '/select-role'; // Default redirect
  let redirectToUrl = new URL(next, request.url);

  console.log(`[AUTH CONFIRM] Received confirmation request with params:`, {
    token_hash: token_hash ? `${token_hash.substring(0, 10)}...` : 'missing',
    type,
    next
  });

  if (!token_hash || !type) {
    console.error('[AUTH CONFIRM] Missing token_hash or type');
    // Redirect to login with error for simplicity, or a dedicated error page
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('error', 'Confirmation link invalid or expired.');
    return NextResponse.redirect(loginUrl);
  }

  console.log(`[AUTH CONFIRM] Processing ${type} confirmation with token_hash: ${token_hash.substring(0, 10)}...`);

  // Use the route handler client
  const supabase = await createRouteHandlerClient();

  // Handle password recovery separately
    if (type === 'recovery') {
      console.log('[AUTH CONFIRM] Handling password recovery flow');
      const resetPasswordUrl = new URL('/reset-password', request.url);
      resetPasswordUrl.searchParams.set('token_hash', token_hash);
      resetPasswordUrl.searchParams.set('type', type); // Pass type too
      console.log(`[AUTH CONFIRM] Redirecting to reset password page: ${resetPasswordUrl.toString()}`);
      // No session needs to be set here
      return NextResponse.redirect(resetPasswordUrl);
    }

  // Verify OTP for other types (signup, invite, etc.)
    console.log(`[AUTH CONFIRM] Verifying OTP for ${type}`);
  // Call verifyOtp WITHOUT redirectTo initially, so we can handle invitation logic *before* redirect
  const { data: { user, session }, error: verifyError } = await supabase.auth.verifyOtp({
      type,
      token_hash,
    // Remove redirectTo here, we will handle redirect manually
    });

    if (verifyError) {
      console.error('[AUTH CONFIRM] Error verifying OTP:', verifyError);
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('error', `Email verification failed: ${verifyError.message}`);
    return NextResponse.redirect(loginUrl);
    }

  console.log('[AUTH CONFIRM] OTP verification successful.');

  // --- Check for and process Invitation Token --- 
  let invitationToken: string | null = null;
  let acceptanceResult: any = null;
  let finalMessage = 'Email verified successfully!'; // Default message

  if (user?.user_metadata?.invitationToken) {
    invitationToken = user.user_metadata.invitationToken;
    console.log(`[AUTH CONFIRM] Found invitation token in user metadata: ${invitationToken}`);

    try {
      // Call the RPC function to accept the invitation *as the user*
      const { data: rpcData, error: rpcError } = await supabase.rpc(
        'finalize_invitation_acceptance',
        { p_token: invitationToken }
      );
    
      if (rpcError) {
        console.error(`[AUTH CONFIRM] RPC Error accepting invitation ${invitationToken}:`, rpcError);
        // Add error to redirect URL, but still proceed
        redirectToUrl.searchParams.set('error', `Failed to accept invitation: ${rpcError.message}`);
      } else if (rpcData && rpcData.success) {
        console.log(`[AUTH CONFIRM] Invitation ${invitationToken} accepted successfully via RPC:`, rpcData);
        finalMessage = 'Email verified and invitation accepted!'; // Update success message
        // Optionally redirect based on accepted role
        // if (rpcData.acceptedRole === 'EXECUTOR') redirectToUrl = new URL('/role-executor/dashboard', request.url);
        // else if (rpcData.acceptedRole === 'LISTENER') redirectToUrl = new URL('/role-listener/dashboard', request.url);
      } else {
        console.warn(`[AUTH CONFIRM] RPC for invitation ${invitationToken} did not report success:`, rpcData);
        redirectToUrl.searchParams.set('error', `Invitation processing issue: ${rpcData?.error || 'Unknown error'}`);
      }
      acceptanceResult = rpcData; // Store result for logging
    } catch (e: any) {
      console.error(`[AUTH CONFIRM] Unexpected error calling finalize_invitation_acceptance for ${invitationToken}:`, e);
       redirectToUrl.searchParams.set('error', `Unexpected error processing invitation: ${e.message}`);
    }
  } else {
      console.log('[AUTH CONFIRM] No invitation token found in user metadata.');
  }
  // --- End Invitation Token Handling ---

  // Set the final success/error message for the redirect
  if (!redirectToUrl.searchParams.has('error')) {
       redirectToUrl.searchParams.set('message', finalMessage);
  }

  console.log(`[AUTH CONFIRM] Final redirect URL: ${redirectToUrl.toString()}`);
  return NextResponse.redirect(redirectToUrl);
}