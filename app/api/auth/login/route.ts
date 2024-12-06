// app/api/auth/login/route.ts

import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    console.log('Login route - Starting login process');
    const { email, password } = await request.json();

    if (!email || !password) {
      console.error('Login route - Missing email or password');
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Clear any existing cookies first
    const cookieStore = cookies();
    cookieStore.delete('supabase-access-token');
    cookieStore.delete('supabase-refresh-token');

    console.log('Login route - Creating Supabase client');
    const supabase = createClient();

    console.log('Login route - Attempting sign in');
    const { data: { session }, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError || !session) {
      console.error('Login route - Sign in error:', signInError);
      return NextResponse.json(
        { error: signInError?.message || 'Authentication failed' },
        { status: 401 }
      );
    }

    console.log('Login route - Sign in successful, setting cookies');
    
    // Set cookies with proper configuration
    const response = NextResponse.json({ user: session.user }, { status: 200 });
    
    response.cookies.set('supabase-access-token', session.access_token, {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 // 1 hour
    });

    response.cookies.set('supabase-refresh-token', session.refresh_token!, {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7 // 1 week
    });

    console.log('Login route - Cookies set successfully');
    return response;

  } catch (error) {
    console.error('Login route - Unexpected error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}