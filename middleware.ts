import { NextRequest, NextResponse } from 'next/server';
import { updateSession } from '@/utils/supabase/middleware';

export async function middleware(request: NextRequest) {
  // Allow public access to authentication-related routes
  if (
    request.nextUrl.pathname.startsWith('/auth/confirm') ||
    request.nextUrl.pathname.startsWith('/auth/error') ||
    request.nextUrl.pathname.startsWith('/auth/confirmed') ||
    request.nextUrl.pathname.startsWith('/auth/check-email')
  ) {
    return NextResponse.next();
  }

  return await updateSession(request);
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};