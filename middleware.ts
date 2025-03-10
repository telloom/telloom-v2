// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createClient } from '@/utils/supabase/middleware';

export async function middleware(request: NextRequest) {
  console.log('[MIDDLEWARE] Processing request for:', request.url);
  
  // Check if the request is for the reset-password page with token parameters
  const url = new URL(request.url);
  const isResetPasswordPage = url.pathname === '/reset-password';
  const hasTokenParams = url.searchParams.has('token_hash') || url.searchParams.has('access_token');

  // Add the current URL as a header for debugging
  const responseHeaders = new Headers();
  responseHeaders.set('x-url', request.url);

  // For reset-password requests with token_hash, set a custom header on the request
  if (isResetPasswordPage && hasTokenParams) {
    console.log('[MIDDLEWARE] Detected reset-password page with token parameters. Adding x-reset-password header.');
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-reset-password', 'true');
    const response = NextResponse.next({ request: { headers: requestHeaders } });
    response.headers.set('x-url', request.url);
    return response;
  }

  try {
    console.log('[MIDDLEWARE] Creating Supabase client and checking session');
    const { supabase, response: supabaseResponse } = createClient(request);
    
    // Call getSession() for potential side effects even though we don't use the session value
    const { data: { session } } = await supabase.auth.getSession();
    console.log('[MIDDLEWARE] Session check result:', { hasSession: !!session });
    
    supabaseResponse.headers.set('x-url', request.url);
    
    // Check if this is the root path and there's a session
    if (url.pathname === '/' && session) {
      console.log('[MIDDLEWARE] Root path with authenticated user, redirecting to /select-role');
      return NextResponse.redirect(new URL('/select-role', request.url));
    }
    
    return supabaseResponse;
  } catch (error) {
    console.error('[MIDDLEWARE] Error in middleware:', error);
    return NextResponse.next();
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api/auth).*)',
  ],
};