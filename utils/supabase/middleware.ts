/**
 * This middleware file handles authentication and session management for a Next.js application using Supabase.
 * 
 * Key functionalities:
 * 1. Creates a Supabase server client with custom cookie handling.
 * 2. Checks if a user is authenticated on each request.
 * 3. Redirects unauthenticated users to the login page for protected routes.
 * 4. Applies the middleware to all routes except static assets and images.
 * 
 * The `updateSession` function is the core of this middleware, handling the authentication logic.
 * The `middleware` function is the entry point for Next.js middleware execution.
 */

import { createServerClient } from '@supabase/ssr';
import { NextResponse, NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Important: Avoid writing logic between client creation and auth.getUser()

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (
    !user &&
    !request.nextUrl.pathname.startsWith('/login') &&
    !request.nextUrl.pathname.startsWith('/auth')
  ) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
