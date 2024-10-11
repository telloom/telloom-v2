// app/auth/callback/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');

  if (code) {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      return NextResponse.redirect(
        `/auth/login?error=${encodeURIComponent(error.message)}`
      );
    }

    const { session } = data;

    if (session) {
      const response = NextResponse.redirect('/');
      response.cookies.set('sb-access-token', session.access_token, {
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        path: '/',
        maxAge: session.expires_in,
      });
      response.cookies.set('sb-refresh-token', session.refresh_token, {
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 7, // 7 days
      });
      return response;
    } else {
      return NextResponse.redirect('/auth/error');
    }
  } else {
    return NextResponse.redirect('/auth/error');
  }
}