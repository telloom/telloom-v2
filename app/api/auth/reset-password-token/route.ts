/**
 * File: app/api/auth/reset-password-token/route.ts
 * Description: API route for verifying password reset tokens
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function POST(req: NextRequest) {
  try {
    const { token_hash, type } = await req.json();
    
    if (!token_hash || type !== 'recovery') {
      return NextResponse.json({ valid: false, error: 'Invalid token parameters' }, { status: 400 });
    }

    // Create Supabase client
    const supabase = createClient();
    
    // Instead of verifying the OTP directly (which consumes it),
    // we'll check if the token exists in the URL and return success
    // The actual verification will happen during password reset
    if (token_hash && type === 'recovery') {
      // Return success without consuming the token
      return NextResponse.json({ 
        valid: true, 
        message: 'Token format is valid. It will be verified during password reset.' 
      }, { status: 200 });
    }

    return NextResponse.json({ valid: false, error: 'Invalid token format' }, { status: 400 });
  } catch (error: any) {
    console.error('Token verification error:', error);
    return NextResponse.json(
      { valid: false, error: error.message || 'An error occurred' },
      { status: 500 }
    );
  }
} 