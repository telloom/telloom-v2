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
          // If the cookie is being set, update the response
          response.cookies.set({
            name,
            value,
            ...options,
          });
        },
        remove(name: string, options: CookieOptions) {
          // If the cookie is being removed, update the response
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
        // Redirect to login if there's no authenticated user
        const redirectUrl = new URL('/login', request.url);
        redirectUrl.searchParams.set('redirectedFrom', request.nextUrl.pathname);
        return NextResponse.redirect(redirectUrl);
      }

      // If it's a role-specific route, verify the role
      const requiredRole = isProtectedRoute[1].toUpperCase() as Role;
      
      // Get all roles for the user
      const { data: userRoles } = await supabase
        .from('ProfileRole')
        .select('role')
        .eq('profileId', user.id);

      if (!userRoles?.length) {
        return NextResponse.redirect(new URL('/unauthorized', request.url));
      }

      // Check if user has either the required role or is an admin
      const hasRequiredRole = userRoles.some(
        ({ role }) => role === requiredRole || role === Role.ADMIN
      );

      if (!hasRequiredRole) {
        // Redirect to unauthorized if the user doesn't have the required role or admin
        return NextResponse.redirect(new URL('/unauthorized', request.url));
      }
    }

    return response;
  } catch (error) {
    console.error('Middleware error:', error);
    // Return the response even if there's an error to maintain the session
    return response;
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