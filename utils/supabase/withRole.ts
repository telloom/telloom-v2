// app/_utils/supabase/withRole.ts

/**
 * This utility function provides role-based access control for Next.js routes.
 * It checks if the authenticated user has any of the required roles or is an admin.
 * If the user is not authenticated, it redirects to the login page.
 * If the user doesn't have the required role or admin, it redirects to an unauthorized page.
 */
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { type NextRequest, NextResponse } from 'next/server'
import { Role } from '@/types/models'

export async function withRole(
  request: NextRequest,
  response: NextResponse,
  requiredRoles: Role[]
) {
  let res = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  try {
    // Create a Supabase client configured to use cookies
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value
          },
          set(name: string, value: string, options: CookieOptions) {
            res.cookies.set({
              name,
              value,
              ...options,
            })
          },
          remove(name: string, options: CookieOptions) {
            res.cookies.delete({
              name,
              ...options,
            })
          },
        },
      }
    )

    // Get authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      const redirectUrl = new URL('/login', request.url)
      redirectUrl.searchParams.set('redirectedFrom', request.nextUrl.pathname)
      return NextResponse.redirect(redirectUrl)
    }

    // Get all roles for the user
    const { data: userRoles, error: rolesError } = await supabase
      .from('ProfileRole')
      .select('role')
      .eq('profileId', user.id)

    if (rolesError || !userRoles?.length) {
      console.error('Role fetch error:', rolesError)
      return NextResponse.redirect(new URL('/unauthorized', request.url))
    }

    // Check if user has any of the required roles or is an admin
    const hasRequiredRole = userRoles.some(
      ({ role }) => requiredRoles.includes(role as Role) || role === Role.ADMIN
    )

    if (!hasRequiredRole) {
      console.debug('User lacks required role. Has:', userRoles.map(r => r.role), 'Needs one of:', requiredRoles)
      return NextResponse.redirect(new URL('/unauthorized', request.url))
    }

    return res
  } catch (error) {
    console.error('withRole middleware error:', error)
    // On error, redirect to login for security
    return NextResponse.redirect(new URL('/login', request.url))
  }
}