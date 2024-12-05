// app/api/auth/set/route.ts

import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const { event, session } = await request.json();

  const response = NextResponse.json({ success: true });

  if (event === 'SIGNED_IN' && session) {
    const { access_token, refresh_token, expires_in } = session;

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
  }

  if (event === 'SIGNED_OUT') {
    response.cookies.delete('supabase-access-token');
    response.cookies.delete('supabase-refresh-token');
  }

  return response;
}