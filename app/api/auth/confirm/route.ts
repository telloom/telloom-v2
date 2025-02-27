// app/api/auth/confirm/route.ts
import type { EmailOtpType } from '@supabase/supabase-js';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const token_hash = requestUrl.searchParams.get('token_hash');
  const type = requestUrl.searchParams.get('type') as EmailOtpType | null;
  const next = requestUrl.searchParams.get('next') || '/select-role';

  if (!token_hash || !type) {
    console.error('[AUTH CONFIRM] Missing token_hash or type in confirm route');
    return NextResponse.redirect(new URL('/(auth)/error', request.url));
  }

  console.log(`[AUTH CONFIRM] Processing ${type} confirmation with token_hash: ${token_hash.substring(0, 10)}...`);

  try {
    const supabase = await createClient();

    // For password recovery, we need to handle it differently
    if (type === 'recovery') {
      console.log('[AUTH CONFIRM] Handling password recovery flow');
      
      // For password recovery, we should redirect to the reset-password page with the token_hash
      // This allows the user to set a new password
      const resetPasswordUrl = new URL('/reset-password', request.url);
      resetPasswordUrl.searchParams.set('token_hash', token_hash);
      resetPasswordUrl.searchParams.set('type', type);
      
      console.log(`[AUTH CONFIRM] Redirecting to reset password page: ${resetPasswordUrl.pathname}${resetPasswordUrl.search}`);
      return NextResponse.redirect(resetPasswordUrl);
    }

    // For other types (signup, invite, etc.), verify the OTP
    console.log(`[AUTH CONFIRM] Verifying OTP for ${type}`);
    const { error: verifyError } = await supabase.auth.verifyOtp({
      type,
      token_hash,
    });

    if (verifyError) {
      console.error('[AUTH CONFIRM] Error verifying OTP:', verifyError);
      return NextResponse.redirect(new URL('/(auth)/error', request.url));
    }

    // Get the user to confirm the session was created
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.error('[AUTH CONFIRM] Error getting user after verification:', userError);
      return NextResponse.redirect(new URL('/(auth)/error', request.url));
    }

    console.log('[AUTH CONFIRM] Email verified successfully for user:', user.id);

    // After successful confirmation, redirect with success message
    const redirectUrl = new URL(next, request.url);
    redirectUrl.searchParams.set('message', 'Email verified successfully!');
    
    const response = NextResponse.redirect(redirectUrl);
    
    // Set cookies to help with the flow
    response.cookies.set('email_verified', 'true', {
      path: '/',
      maxAge: 60 * 5, // 5 minutes
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    });

    return response;
  } catch (error) {
    console.error('[AUTH CONFIRM] Unexpected error in confirm route:', error);
    return NextResponse.redirect(new URL('/(auth)/error', request.url));
  }
}