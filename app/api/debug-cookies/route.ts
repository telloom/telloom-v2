import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    console.log('[DEBUG_COOKIES] Starting test');
    
    // Get the authorization header from the request
    const authHeader = request.headers.get('Authorization');
    console.log('[DEBUG_COOKIES] Authorization header:', authHeader ? 'present' : 'missing');
    
    // Check for cookies directly in the request
    const cookieHeader = request.headers.get('Cookie');
    console.log('[DEBUG_COOKIES] Cookie header:', cookieHeader ? 'present' : 'missing');
    
    // Test Next.js cookies() API
    let directCookies;
    try {
      console.log('[DEBUG_COOKIES] Testing Next.js cookies API');
      const cookieStore = cookies();
      directCookies = cookieStore.getAll();
      console.log(`[DEBUG_COOKIES] Found ${directCookies.length} cookies with Next.js API`);
    } catch (cookieError) {
      console.error('[DEBUG_COOKIES] Error accessing cookies:', cookieError);
      directCookies = [];
    }
    
    // Return all the debug information
    return NextResponse.json({
      requestHasAuthHeader: !!authHeader,
      requestHasCookieHeader: !!cookieHeader,
      cookieHeaderLength: cookieHeader?.length || 0,
      nextJsCookiesCount: directCookies?.length || 0,
      nextJsCookieNames: directCookies?.map(c => c.name) || [],
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[DEBUG_COOKIES] Error:', error);
    return NextResponse.json({
      error: 'Error testing cookies',
      message: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
} 