// utils/next-cookies-helper.ts
// Helper functions for cookie management in Next.js 15

import { cookies, headers } from 'next/headers';

/**
 * Safely gets a cookie using Next.js cookies() API
 * Compatible with Next.js 15 edge and node.js runtimes
 * 
 * @param cookieName The name of the cookie to retrieve
 * @returns The cookie value or undefined if not found
 */
export async function getCookie(cookieName: string): Promise<string | undefined> {
  try {
    console.log(`[COOKIE_HELPER] Getting cookie: ${cookieName}`);
    
    // Create a new cookies instance each time to ensure we get the most current value
    const cookieStore = await cookies();
    
    // Log all environment information to help debug
    console.log(`[COOKIE_HELPER] Runtime env: ${process.env.NEXT_RUNTIME || 'unknown'}`);
    
    // Access the cookie by name
    const cookie = cookieStore.get(cookieName);
    
    // Special handling for Supabase auth cookies which might be segmented
    if (cookieName.includes('auth-token') && !cookieName.includes('.')) {
      console.log(`[COOKIE_HELPER] Cookie ${cookieName}: ${cookie ? 'found' : 'not found'}, value length: ${cookie?.value?.length || 0}`);
      
      // Check for large cookies that might need segmentation
      if (cookie?.value && cookie.value.length > 3500) {
        console.log(`[COOKIE_HELPER] Found large auth cookie (${cookie.value.length} bytes), checking segments`);
        
        // Log that we're also checking for segment cookies
        for (let i = 0; i < 5; i++) {
          const segmentCookie = cookieStore.get(`${cookieName}.${i}`);
          if (segmentCookie) {
            console.log(`[COOKIE_HELPER] Found segment cookie ${cookieName}.${i}, length: ${segmentCookie.value.length}`);
          }
        }
      }
    } else {
      console.log(`[COOKIE_HELPER] Cookie ${cookieName}: ${cookie ? 'found' : 'not found'}, value length: ${cookie?.value?.length || 0}`);
    }
    
    return cookie?.value;
  } catch (error) {
    console.error(`[COOKIE_HELPER] Error getting cookie ${cookieName}:`, error);
    return undefined;
  }
}

/**
 * Safely gets all cookies
 * @returns All cookies
 */
export async function getAllCookies() {
  try {
    console.log('[COOKIE_HELPER] Getting all cookies');
    const cookieStore = await cookies();
    const allCookies = cookieStore.getAll();
    console.log(`[COOKIE_HELPER] Found ${allCookies.length} cookies`);
    
    // Group cookies by base name (for segmented cookies)
    const groupedCookies = allCookies.reduce((acc, cookie) => {
      // Extract base name (for segmented cookies like name.0, name.1)
      const baseName = cookie.name.replace(/\.\d+$/, '');
      if (!acc[baseName]) {
        acc[baseName] = [];
      }
      acc[baseName].push(cookie);
      return acc;
    }, {} as Record<string, typeof allCookies>);
    
    // Log cookie info grouped by base name
    Object.entries(groupedCookies).forEach(([baseName, cookies]) => {
      const totalLength = cookies.reduce((sum, c) => sum + (c.value?.length || 0), 0);
      console.log(`[COOKIE_HELPER] Cookie group ${baseName}: ${cookies.length} segments, total length: ${totalLength}`);
    });
    
    return allCookies;
  } catch (error) {
    console.error('[COOKIE_HELPER] Error getting all cookies:', error);
    return [];
  }
}

/**
 * Safely gets a header using Next.js headers() API
 * 
 * @param headerName The name of the header to retrieve
 * @returns The header value or undefined if not found
 */
export async function getHeader(headerName: string): Promise<string | undefined> {
  try {
    const headersList = await headers();
    return headersList.get(headerName) || undefined;
  } catch (error) {
    console.error(`[COOKIE_HELPER] Error getting header ${headerName}:`, error);
    return undefined;
  }
}

/**
 * Sets a cookie using Next.js cookies() API
 * 
 * @param name Cookie name
 * @param value Cookie value
 * @param options Cookie options
 */
export async function setCookie(
  name: string, 
  value: string, 
  options?: { 
    expires?: Date;
    maxAge?: number;
    path?: string; 
    domain?: string;
    secure?: boolean;
    httpOnly?: boolean;
    sameSite?: 'strict' | 'lax' | 'none';
  }
) {
  try {
    console.log(`[COOKIE_HELPER] Setting cookie ${name}, value length: ${value?.length || 0}`);
    const cookieStore = await cookies();
    cookieStore.set({
      name,
      value,
      ...options
    });
    console.log(`[COOKIE_HELPER] Successfully set cookie ${name}`);
  } catch (error) {
    console.error(`[COOKIE_HELPER] Error setting cookie ${name}:`, error);
  }
}

/**
 * Deletes a cookie using Next.js cookies() API
 * 
 * @param name Cookie name
 * @param options Cookie options
 */
export async function deleteCookie(
  name: string,
  options?: {
    path?: string;
    domain?: string;
  }
) {
  try {
    console.log(`[COOKIE_HELPER] Deleting cookie ${name}`);
    const cookieStore = await cookies();
    
    // For Supabase auth cookies, also try to delete segments
    if (name.includes('auth-token') && !name.includes('.')) {
      // Delete possible segments
      for (let i = 0; i < 10; i++) {
        try {
          cookieStore.set({
            name: `${name}.${i}`,
            value: '',
            expires: new Date(0),
            ...options
          });
        } catch (e) {
          // Ignore errors for segments that don't exist
        }
      }
    }
    
    // Delete the main cookie
    cookieStore.set({
      name,
      value: '',
      expires: new Date(0),
      ...options
    });
    
    console.log(`[COOKIE_HELPER] Successfully deleted cookie ${name}`);
  } catch (error) {
    console.error(`[COOKIE_HELPER] Error deleting cookie ${name}:`, error);
  }
} 