// app/_utils/supabase/withRole.ts

/**
 * This utility function provides role-based access control for Next.js routes.
 * It checks if the authenticated user has any of the required roles.
 * If the user is not authenticated, it redirects to the login page.
 * If the user doesn't have the required role, it redirects to an unauthorized page.
 * If the user has the required role, it executes the provided callback function.
 */
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { type NextRequest, NextResponse } from 'next/server'

export async function withRole(
  request: NextRequest,
  response: NextResponse,
  requiredRoles: string[]
) {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name: string) => request.cookies.get(name)?.value,
        set: (name: string, value: string, options: CookieOptions) => {
          request.cookies.set({
            name,
            value,
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove: (name: string, options: CookieOptions) => {
          request.cookies.set({
            name,
            value: '',
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  const { data: { user }, error: userError } = await supabase.auth.getUser()

  if (userError || !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Fetch the user's profile
  const { data: profile, error: profileError } = await supabase
    .from('Profile')
    .select('id')
    .eq('id', user.id)
    .single()

  if (profileError || !profile) {
    // Handle error or no profile found
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Fetch the user's roles from ProfileRole table
  const { data: profileRoles, error: rolesError } = await supabase
    .from('ProfileRole')
    .select('role')
    .eq('profileId', profile.id)

  if (rolesError) {
    // Handle error
    const url = request.nextUrl.clone()
    url.pathname = '/unauthorized'
    return NextResponse.redirect(url)
  }

  const userRoles = profileRoles?.map((roleEntry: { role: string }) => roleEntry.role) || []

  // Check if user has at least one of the required roles
  const hasRole = requiredRoles.some((requiredRole) =>
    userRoles.includes(requiredRole)
  )

  if (!hasRole) {
    const url = request.nextUrl.clone()
    url.pathname = '/unauthorized'
    return NextResponse.redirect(url)
  }

  return response
}