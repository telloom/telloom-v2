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
    console.error('Missing token_hash or type in confirm route');
    return NextResponse.redirect(new URL('/error', request.url));
  }

  try {
    const supabase = await createClient();

    // First, exchange the code for a session
    const { error: verifyError } = await supabase.auth.verifyOtp({
      type,
      token_hash,
    });

    if (verifyError) {
      console.error('Error verifying OTP:', verifyError);
      return NextResponse.redirect(new URL('/error', request.url));
    }

    // Get the user to confirm the session was created
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.error('Error getting user after verification:', userError);
      return NextResponse.redirect(new URL('/error', request.url));
    }

    console.log('Email verified successfully for user:', user.id);

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
    console.error('Unexpected error in confirm route:', error);
    return NextResponse.redirect(new URL('/error', request.url));
  }
}