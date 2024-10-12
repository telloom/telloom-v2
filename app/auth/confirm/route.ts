// app/auth/confirm/route.ts
// This component handles email confirmation and OTP verification for user authentication

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  // Extract parameters from the URL
  const confirmationUrl = searchParams.get('confirmationUrl');

  if (confirmationUrl) {
    // Parse the confirmation URL to extract the token and other parameters
    const confirmationUrlObj = new URL(confirmationUrl);
    const token = confirmationUrlObj.searchParams.get('token');
    const type = confirmationUrlObj.searchParams.get('type');
    const email = confirmationUrlObj.searchParams.get('email');

    if (token && type && email) {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );

      const { error } = await supabase.auth.verifyOtp({
        email,
        token,
        type: type as 'signup' | 'invite',
      });

      if (error) {
        console.error('Error verifying OTP:', error);
        return NextResponse.redirect(
          `/auth/error?error=${encodeURIComponent(error.message)}`
        );
      }

      // Redirect to a success page
      return NextResponse.redirect('/auth/confirmed');
    } else {
      console.error('Missing token, type, or email in confirmation URL.');
      return NextResponse.redirect('/auth/error');
    }
  } else {
    console.error('Confirmation URL not found in query parameters.');
    return NextResponse.redirect('/auth/error');
  }
}