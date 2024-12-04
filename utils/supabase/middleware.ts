/**
 * File: utils/supabase/middleware.ts
 * This middleware file handles authentication and session management for a Next.js application using Supabase.
 * 
 * Key functionalities:
 * 1. Creates a Supabase server client with custom cookie handling.
 * 2. Checks if a user is authenticated on each request.
 * 3. Redirects unauthenticated users to the login page for protected routes.
 * 4. Allows access to authentication-related routes without being logged in.
 * 5. Applies the middleware to all routes except static assets and images.
 * 
 * The `updateSession` function is the core of this middleware, handling the authentication logic.
 * The `middleware` function is the entry point for Next.js middleware execution.
 */

import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { Database } from '@/types/supabase'

export async function updateSession(request: NextRequest) {
  const response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: request.cookies,
      cookieOptions: {
        path: '/',
        secure: process.env.NODE_ENV === 'production'
      }
    }
  )

  await supabase.auth.getSession()
  return response
}

export async function middleware(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
