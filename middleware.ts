// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createClient } from '@/utils/supabase/middleware';

// Define user roles as a type for better type checking
type UserRole = 'SHARER' | 'EXECUTOR' | 'LISTENER' | 'ADMIN';

// Remove unused Role-related route maps
// const ROLE_PROTECTED_ROUTES: Record<UserRole, string[]> = {
//   'SHARER': ['/role-sharer'],
//   'EXECUTOR': ['/role-executor'],
//   'LISTENER': ['/role-listener'],
//   'ADMIN': ['/role-admin']
// };

const PUBLIC_ROUTES = [
  '/login',
  '/signup',
  '/forgot-password',
  '/reset-password',
  '/set-password',
  '/demo',
  '/how-it-works',
  '/api/debug-cookies',
  '/api/debug-jwt',
  '/debug-jwt',
  // Add Mux webhook routes here to bypass auth
  '/api/webhooks/mux',
  '/api/webhooks/mux/topic-video' // Add specific sub-routes if needed
];

export async function middleware(request: NextRequest) {
  // --- ADDED LOGGING --- 
  console.log(`[MIDDLEWARE_PATH_CHECK] Received path: ${request.nextUrl.pathname}`);
  // ---------------------
  
  console.log('[MIDDLEWARE] ⭐ Processing request for:', request.url);
  
  // Log cookie header to better understand issues
  const cookieHeader = request.headers.get('cookie');
  console.log('[MIDDLEWARE] Request cookie header exists:', !!cookieHeader);
  if (cookieHeader) {
    console.log('[MIDDLEWARE] Cookie header length:', cookieHeader.length);
  }
  
  // Extract the auth token from cookies directly
  const authCookie = request.cookies.get('sb-auth-token');
  console.log('[MIDDLEWARE] Auth cookie exists:', !!authCookie);
  
  const url = new URL(request.url);
  const pathname = url.pathname;
  console.log('[MIDDLEWARE] Path:', pathname);
  
  // Special handling for reset-password page with token parameters
  const isResetPasswordPage = pathname === '/reset-password';
  const hasTokenParams = url.searchParams.has('token_hash') || url.searchParams.has('access_token');

  if (isResetPasswordPage && hasTokenParams) {
    console.log('[MIDDLEWARE] Detected reset-password page with token parameters. Adding x-reset-password header.');
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-reset-password', 'true');
    const response = NextResponse.next({ request: { headers: requestHeaders } });
    response.headers.set('x-url', request.url);
    return response;
  }

  try {
    // Create Supabase client and get session
    const { supabase, response: supabaseResponse } = createClient(request);
    // Use getUser() instead of getSession() for validated user data
    console.log('[MIDDLEWARE] Calling getUser() for validated user data');
    const { data: { user }, error: getUserError } = await supabase.auth.getUser();
    
    if (getUserError) {
      console.error('[MIDDLEWARE] Error calling getUser():', getUserError);
      // Handle error case - perhaps allow request to proceed and let layout handle it?
      // Or redirect to an error page. For now, proceed.
    }

    // Add debugging and request timing headers
    const responseHeaders = new Headers(supabaseResponse.headers);
    responseHeaders.set('x-url', request.url);
    responseHeaders.set('x-middleware-time', new Date().toISOString());

    // Handle public routes - skip auth checks
    if (PUBLIC_ROUTES.some(route => pathname.startsWith(route))) {
       console.log(`[MIDDLEWARE] Path ${pathname} is public, skipping auth checks.`);
       // Allow webhook requests regardless of user authentication
       if (pathname.startsWith('/api/webhooks/mux')) {
           return NextResponse.next({ headers: responseHeaders });
       }

      // If user is authenticated on other public routes, redirect
      if (user) {
        if (pathname === '/debug-jwt' || pathname === '/api/debug-jwt') {
          return NextResponse.next({ headers: responseHeaders });
        }
        return NextResponse.redirect(new URL('/select-role', request.url));
      }
      
      // Allow access to public route for unauthenticated users
      return NextResponse.next({ headers: responseHeaders });
    }

    // Handle root path - redirect to select-role if authenticated
    if (pathname === '/' && user) {
      console.log('[MIDDLEWARE] Root path with authenticated user, redirecting to /select-role');
      return NextResponse.redirect(new URL('/select-role', request.url));
    }

    // For protected routes, verify authentication
    if (!user) {
      // If route requires authentication and user isn't logged in, redirect to login
      if (pathname !== '/' && !PUBLIC_ROUTES.some(route => pathname.startsWith(route))) {
        console.log('[MIDDLEWARE] Unauthenticated access attempt to protected route:', pathname);
        return NextResponse.redirect(new URL('/login', request.url));
      }
    } else {
      // We have an authenticated user - get their role data
      // user object is already validated from getUser()
      
      // Use JWT claims directly for role checking
      // Try to get roles via RPC function that uses JWT tokens
      const { data: roleData, error: roleError } = await supabase.rpc('get_user_role_data');
      
      if (roleError) {
        console.error('[MIDDLEWARE] Error getting role data from JWT/RPC:', roleError);
        // If the RPC fails, don't try to use potentially insecure fallback from getSession().
        // Let the layout/page handle the lack of role data.
        console.log('[MIDDLEWARE] RPC failed, proceeding without role data. Layout must handle.');
      } else {
        // We have role data from the validated RPC call
        const roles: UserRole[] = roleData?.roles || [];
        console.log('[MIDDLEWARE] User roles from validated JWT/RPC:', roles);
        
        // Check if the user is accessing a role-specific route they don't have
        if (pathname.startsWith('/role-')) {
          const requestedRoleMatch = pathname.match(/\/role-([^/]+)/);
          if (requestedRoleMatch) {
            const requestedRole = requestedRoleMatch[1].toUpperCase() as UserRole;
            
            // Route is role-specific but user doesn't have the role
            if (requestedRole && !roles.includes(requestedRole)) {
              console.log('[MIDDLEWARE] User without', requestedRole, 'role attempted to access', pathname);
              return NextResponse.redirect(new URL('/select-role', request.url));
            }
            
            // Dynamic route handling for executor routes with [id]
            if (requestedRole === 'EXECUTOR' && pathname.match(/\/role-executor\/[^/]+/)) {
              // Basic role check passed - detailed permission checks MUST be in the layout component
              if (!roles.includes('EXECUTOR')) {
                console.log('[MIDDLEWARE] User without EXECUTOR role attempted to access executor details (redundant check):', pathname);
                return NextResponse.redirect(new URL('/select-role', request.url));
              }
              // Note: Specific sharer access validation MUST happen in the RoleExecutorSharerLayout using getUser()
            }
          }
        }
      }
    }
    
    // Update headers and return response
    const response = NextResponse.next({
      request: {
        headers: request.headers
      },
      headers: responseHeaders
    });
    
    return response;
  } catch (error) {
    console.error('[MIDDLEWARE] Error in middleware:', error);
    // Add error details to response header for debugging
    const errorResponse = NextResponse.next({
      headers: { 
        'x-error': 'middleware-error',
        'x-error-details': error instanceof Error ? error.message : 'Unknown error'
      }
    });
    return errorResponse;
  }
}

export const config = {
  matcher: [
    // Add 'images' to the negative lookahead to exclude static image paths
    '/((?!_next/static|_next/image|images|favicon.ico|api/auth).*)',
  ],
};