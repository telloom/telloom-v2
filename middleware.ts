import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { Role } from '@/types/models';

export async function middleware(request: NextRequest) {
  // Create a response object that we can modify
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  // Create a Supabase client configured to use cookies
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          response.cookies.set({
            name,
            value,
            ...options,
          });
        },
        remove(name: string, options: CookieOptions) {
          response.cookies.delete({
            name,
            ...options,
          });
        },
      },
    }
  );

  try {
    // Get authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    // Handle authentication for protected routes
    const isProtectedRoute = request.nextUrl.pathname.match(
      /^\/role-(sharer|listener|executor|admin)/
    );

    if (isProtectedRoute) {
      if (userError || !user) {
        // Store the URL they were trying to visit
        const redirectUrl = new URL('/login', request.url);
        redirectUrl.searchParams.set('redirectedFrom', request.nextUrl.pathname);
        return NextResponse.redirect(redirectUrl);
      }

      // Get the required role from the URL
      const requiredRole = isProtectedRoute[1].toUpperCase() as Role;
      
      // Get all roles for the user
      const { data: userRoles, error: roleError } = await supabase
        .from('ProfileRole')
        .select('role')
        .eq('profileId', user.id);

      if (roleError || !userRoles?.length) {
        console.error('Role fetch error:', roleError);
        return NextResponse.redirect(new URL('/select-role', request.url));
      }

      // Check if user has the required role or is admin
      const hasRequiredRole = userRoles.some(
        ({ role }) => role === requiredRole || role === Role.ADMIN
      );

      if (!hasRequiredRole) {
        console.debug('User lacks required role. Has:', userRoles.map(r => r.role), 'Needs:', requiredRole);
        return NextResponse.redirect(new URL('/select-role', request.url));
      }

      // Get active role from cookie
      const activeRole = request.cookies.get('activeRole')?.value;

      // If no active role or different role, set it to the required role
      if (!activeRole || activeRole !== requiredRole) {
        response.cookies.set({
          name: 'activeRole',
          value: requiredRole,
          path: '/',
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 60 * 60 * 24 * 30, // 30 days
        });
      }
    }

    return response;
  } catch (error) {
    console.error('Middleware error:', error);
    // On error, redirect to login
    return NextResponse.redirect(new URL('/login', request.url));
  }
}

// Update config to include all protected routes
export const config = {
  matcher: [
    '/role-sharer/:path*',
    '/role-listener/:path*',
    '/role-executor/:path*',
    '/role-admin/:path*',
  ],
}; 