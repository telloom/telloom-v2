// app/api/auth/login/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function POST(request: NextRequest) {
  const { email, password } = await request.json();
  const supabase = createClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.session) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: error?.message || 'Invalid credentials' },
      { status: 400 }
    );
  }

  // Set the access token and refresh token as HTTP-only cookies
  const response = NextResponse.json({ success: true });

  const { access_token, refresh_token, expires_in } = data.session;

  response.cookies.set('supabase-access-token', access_token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: expires_in,
    path: '/',
    sameSite: 'lax',
  });

  response.cookies.set('supabase-refresh-token', refresh_token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/',
    sameSite: 'lax',
  });

  return response;
}