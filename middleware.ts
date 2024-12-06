import { createClient } from '@/utils/supabase/server';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  console.log('Root middleware - Starting');
  
  try {
    // Skip auth check for public routes
    if (request.nextUrl.pathname.startsWith('/_next') ||
        request.nextUrl.pathname.startsWith('/api/auth') ||
        request.nextUrl.pathname === '/login' ||
        request.nextUrl.pathname === '/signup' ||
        request.nextUrl.pathname === '/forgot-password') {
      console.log('Root middleware - Public route, skipping auth check');
      return NextResponse.next();
    }

    const accessToken = request.cookies.get('supabase-access-token')?.value;
    const refreshToken = request.cookies.get('supabase-refresh-token')?.value;
    
    console.log('Root middleware - Tokens present:', { 
      hasAccessToken: !!accessToken,
      hasRefreshToken: !!refreshToken 
    });

    // Redirect to login if no tokens
    if (!accessToken || !refreshToken) {
      console.log('Root middleware - No tokens found, redirecting to login');
      // Clear any stale tokens
      const response = NextResponse.redirect(new URL('/login', request.url));
      response.cookies.delete('supabase-access-token');
      response.cookies.delete('supabase-refresh-token');
      return response;
    }

    // Create Supabase client and verify session
    const supabase = createClient(accessToken);
    console.log('Root middleware - Checking session');
    
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      console.error('Root middleware - Invalid session:', error);
      const response = NextResponse.redirect(new URL('/login', request.url));
      response.cookies.delete('supabase-access-token');
      response.cookies.delete('supabase-refresh-token');
      return response;
    }

    console.log('Root middleware - Valid session for user:', user.id);
    return NextResponse.next();
  } catch (error) {
    console.error('Root middleware - Unexpected error:', error);
    // On error, redirect to login and clear tokens
    const response = NextResponse.redirect(new URL('/login', request.url));
    response.cookies.delete('supabase-access-token');
    response.cookies.delete('supabase-refresh-token');
    return response;
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
