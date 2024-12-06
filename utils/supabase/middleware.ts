/**
 * File: utils/supabase/middleware.ts
 * This middleware file handles authentication and session management for a Next.js application using Supabase.
 */

import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  console.log('Middleware - Starting session update');
  
  try {
    const accessToken = request.cookies.get('supabase-access-token')?.value;
    const refreshToken = request.cookies.get('supabase-refresh-token')?.value;
    
    console.log('Middleware - Tokens present:', { 
      hasAccessToken: !!accessToken,
      hasRefreshToken: !!refreshToken 
    });

    const response = NextResponse.next({
      request: {
        headers: request.headers,
      },
    });

    if (!accessToken || !refreshToken) {
      console.log('Middleware - No tokens found, skipping auth check');
      return response;
    }

    const supabase = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          persistSession: false,
          detectSessionInUrl: false,
        },
        global: {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      }
    );

    console.log('Middleware - Checking user session');
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error) {
      console.error('Middleware - Auth error:', error);
      response.cookies.delete('supabase-access-token');
      response.cookies.delete('supabase-refresh-token');
      console.log('Middleware - Cleared invalid session cookies');
    } else if (user) {
      console.log('Middleware - Valid user session:', user.id);
    }

    return response;
  } catch (error) {
    console.error('Middleware - Unexpected error:', error);
    return NextResponse.next({
      request: {
        headers: request.headers,
      },
    });
  }
}

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
