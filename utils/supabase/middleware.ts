/**
 * File: utils/supabase/middleware.ts
 * This middleware file handles authentication and session management for a Next.js application using Supabase.
 */

import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: CookieOptions) {
          response.cookies.delete({
            name,
            ...options,
          })
        },
      },
    }
  )

  // Verify authentication and role for protected routes
  if (request.nextUrl.pathname.startsWith('/role-sharer')) {
    console.log('Checking auth for protected route:', request.nextUrl.pathname)
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    console.log('Auth check:', { userId: user?.id, error: authError })
    
    if (authError || !user) {
      console.log('Auth failed, redirecting to login')
      return NextResponse.redirect(new URL('/login', request.url))
    }

    // Check if user has SHARER role
    const { data: roleData, error: roleError } = await supabase
      .from('ProfileRole')
      .select('*')  // Select all fields to see what we're getting back
      .eq('profileId', user.id)
      
    console.log('Role check:', { 
      roleData,
      error: roleError,
      userId: user.id 
    })

    const hasSharerRole = roleData?.some(role => role.role === 'SHARER')
    if (!hasSharerRole) {
      console.log('No SHARER role found, redirecting to unauthorized')
      return NextResponse.redirect(new URL('/unauthorized', request.url))
    }
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     * - public files with extensions (.svg, .jpg, etc)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
