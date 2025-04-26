import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * Creates a Supabase client for middleware with Next.js 15 compatibility
 * Optimized for cookie handling with proper segmentation support
 */
export function createClient(request: NextRequest) {
  // Create a response object that we can modify
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  // Track if we've already logged cookie details to avoid repeating
  const loggedCookies = new Set<string>();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        detectSessionInUrl: false,
        flowType: 'pkce',
      },
      cookies: {
        get(name: string) {
          try {
            // Get the cookie directly from the request
            const cookie = request.cookies.get(name);
            
            // Handle logs intelligently to reduce spam
            if (name.includes('auth-token')) {
              // Only log the main auth cookie details once
              if (!name.includes('.') && !loggedCookies.has('auth-main')) {
                console.log(`[MIDDLEWARE] Auth cookie: ${name} ${cookie ? 'found' : 'not found'}, length: ${cookie?.value?.length || 0}`);
                loggedCookies.add('auth-main');
              } 
              // Only log segment lookups once
              else if (name.includes('.') && !loggedCookies.has('auth-segments')) {
                // If we're looking for segments, only log the cookie name
                console.log(`[MIDDLEWARE] Looking for auth segment: ${name}`);
                loggedCookies.add('auth-segments');
              }
            } 
            // For other cookies, log them normally but avoid repetition
            else if (!loggedCookies.has(name)) {
              console.log(`[MIDDLEWARE] Cookie: ${name} ${cookie ? 'found' : 'not found'}`);
              loggedCookies.add(name);
            }
            
            return cookie?.value;
          } catch (error) {
            console.error(`[MIDDLEWARE] Error getting cookie ${name}:`, error);
            return undefined;
          }
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            // Log what we're setting
            console.log(`[MIDDLEWARE] Setting cookie: ${name}, length: ${value?.length || 0}`);
            
            // Set in both request and response
            request.cookies.set({
              name,
              value,
              ...options,
            })
            
            // Create fresh response with updated headers
            response = NextResponse.next({
              request: {
                headers: request.headers,
              },
            })
            
            // Set in response cookies too
            response.cookies.set({
              name,
              value,
              ...options,
            })
          } catch (error) {
            console.error(`[MIDDLEWARE] Error setting cookie ${name}:`, error);
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            console.log(`[MIDDLEWARE] Removing cookie: ${name}`);
            
            // For auth tokens, clear possible segments too
            if (name.includes('auth-token') && !name.includes('.')) {
              // Try to clear potential segments
              for (let i = 0; i < 5; i++) {
                const segmentName = `${name}.${i}`;
                try {
                  request.cookies.set({
                    name: segmentName,
                    value: '',
                    ...options,
                  });
                  console.log(`[MIDDLEWARE] Cleared potential segment: ${segmentName}`);
                } catch (segErr) {
                  // Ignore errors for non-existent segments
                }
              }
            }
            
            // Clear the requested cookie
            request.cookies.set({
              name,
              value: '',
              ...options,
            })
            
            // Create fresh response
            response = NextResponse.next({
              request: {
                headers: request.headers,
              },
            })
            
            // Also clear the cookie in the response
            response.cookies.set({
              name,
              value: '',
              ...options,
            })
          } catch (error) {
            console.error(`[MIDDLEWARE] Error removing cookie ${name}:`, error);
          }
        },
      },
    }
  )

  return { supabase, response }
}

export async function updateSession(request: NextRequest) {
  const { supabase, response } = createClient(request)
  await supabase.auth.getUser()
  return response
} 