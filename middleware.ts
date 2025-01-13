import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { Role } from './types/models';
import { updateSession } from '@/utils/supabase/middleware';

// Create a singleton instance for the server client
let serverClient: ReturnType<typeof createServerClient> | null = null;

// Only enable debug logging in development when explicitly enabled
const isDebug = process.env.NODE_ENV === 'development' && process.env.DEBUG_AUTH === 'true';

function getServerClient(request: NextRequest) {
  if (!serverClient) {
    serverClient = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value;
          },
          set(name: string, value: string, options: { path: string; maxAge: number; }) {
            request.cookies.set({
              name,
              value,
              ...options,
            });
          },
          remove(name: string, options: { path: string }) {
            request.cookies.set({
              name,
              value: '',
              ...options,
            });
          },
        },
        auth: {
          debug: false
        }
      }
    );
  }
  return serverClient;
}

export async function middleware(request: NextRequest) {
  try {
    // First, handle session update
    const res = await updateSession(request);
    const supabase = getServerClient(request);

    // Get authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = '/login';
      redirectUrl.searchParams.set('redirectedFrom', request.nextUrl.pathname);
      return NextResponse.redirect(redirectUrl);
    }

    // Check for role-specific routes
    const path = request.nextUrl.pathname;
    let requiredRole: Role | null = null;

    if (path.startsWith('/role-sharer')) {
      requiredRole = Role.SHARER;
    } else if (path.startsWith('/role-listener')) {
      requiredRole = Role.LISTENER;
    } else if (path.startsWith('/role-executor')) {
      requiredRole = Role.EXECUTOR;
    } else if (path.startsWith('/role-admin')) {
      requiredRole = Role.ADMIN;
    }

    if (requiredRole) {
      // Get user's roles from ProfileRole table
      const { data: roles, error: rolesError } = await supabase
        .from('ProfileRole')
        .select('role')
        .eq('profileId', user.id);

      if (rolesError) {
        throw rolesError;
      }

      const userRoles = roles?.map((r: { role: Role }) => r.role) || [];
      
      if (!roles?.length || !roles.some((r: { role: Role }) => r.role === requiredRole)) {
        const redirectUrl = request.nextUrl.clone();
        redirectUrl.pathname = '/unauthorized';
        return NextResponse.redirect(redirectUrl);
      }
    }

    return res;
  } catch (error) {
    if (isDebug) {
      console.error(`[Middleware] Critical error:`, error);
    }
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = '/error';
    return NextResponse.redirect(redirectUrl);
  }
}

export const config = {
  matcher: [
    '/role-sharer/:path*',
    '/role-listener/:path*',
    '/role-executor/:path*',
    '/role-admin/:path*',
    '/role-sharer',
    '/role-listener',
    '/role-executor',
    '/role-admin',
  ],
}; 