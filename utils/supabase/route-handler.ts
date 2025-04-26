// utils/supabase/route-handler.ts
// Server-side Supabase client for API Route Handlers

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { UserRoleData } from './server';

// Define UserRole type to match other files
export type UserRole = 'LISTENER' | 'SHARER' | 'EXECUTOR' | 'ADMIN';

/**
 * Creates a Supabase client for API Route Handlers
 * Compatible with Next.js 15
 */
export async function createRouteHandlerClient() {
  try {
    console.log('[ROUTE_HANDLER] Creating Supabase route handler client');
    
    // Create a new Supabase client for API route handlers
    return createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          async get(name) {
            try {
              // Get a fresh cookieStore each time
              const cookieStore = await cookies();
              
              // First try to get the main cookie
              const cookie = cookieStore.get(name);
              const value = cookie?.value;
              
              // If this is already a segmented cookie request (e.g., name ends with .0, .1),
              // just return the value directly
              if (name.match(/\.\d+$/)) {
                console.log(`[ROUTE_HANDLER] Segmented cookie ${name}: ${value ? 'found' : 'not found'}`);
                return value;
              }
              
              // Log that we got the main cookie
              console.log(`[ROUTE_HANDLER] Main cookie ${name}: ${value ? 'found' : 'not found'}, length: ${value?.length || 0}`);
              
              // Check if we need to look for segments
              if (!value || value.length < 4000) {
                return value;
              }
              
              // Log that we found a potentially segmented cookie
              console.log(`[ROUTE_HANDLER] Found large cookie ${name} (${value.length} bytes), checking for segments`);
              
              // Cookie might be segmented, return the value but let Supabase handle reassembly
              return value;
            } catch (error) {
              console.error(`[ROUTE-HANDLER] Error getting cookie ${name}:`, error);
              return undefined;
            }
          },
          async set(name, value, options) {
            try {
              // Get a fresh cookieStore each time
              const cookieStore = await cookies();
              
              console.log(`[ROUTE_HANDLER] Setting cookie ${name}, value length: ${value?.length || 0}`);
              
              // Set the cookie directly
              cookieStore.set({ name, value, ...options });
            } catch (error) {
              console.error(`[ROUTE-HANDLER] Error setting cookie ${name}:`, error);
            }
          },
          async remove(name, options) {
            try {
              // Get a fresh cookieStore each time
              const cookieStore = await cookies();
              
              console.log(`[ROUTE_HANDLER] Removing cookie ${name}`);
              
              // Attempt to also remove segmented cookies
              const isMainCookie = !name.match(/\.\d+$/);
              if (isMainCookie) {
                // For the main cookie, try to clear segments as well
                for (let i = 0; i < 10; i++) {
                  const segmentName = `${name}.${i}`;
                  try {
                    cookieStore.set({ name: segmentName, value: '', ...options });
                    console.log(`[ROUTE_HANDLER] Removed cookie segment ${segmentName}`);
                  } catch (e) {
                    // Ignore errors for segments that don't exist
                  }
                }
              }
              
              // Remove the requested cookie itself
              cookieStore.set({ name, value: '', ...options });
            } catch (error) {
              console.error(`[ROUTE-HANDLER] Error removing cookie ${name}:`, error);
            }
          },
        },
      }
    );
  } catch (error) {
    console.error('[ROUTE-HANDLER] Error creating route handler client:', error);
    throw error;
  }
}

/**
 * Helper to get comprehensive user role data from SQL function for route handlers
 * This provides roles, sharer status, and executor status in one call
 * @returns User role data or null if error/not authenticated
 */
export async function getUserRoleData(): Promise<UserRoleData | null> {
  try {
    const supabase = await createRouteHandlerClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.log('[ROUTE_HANDLER] [getUserRoleData] No authenticated user found');
      return null;
    }
    
    // Use our SQL function
    const { data: roleData, error: roleError } = await supabase.rpc('get_user_role_data');
    
    if (roleError) {
      console.error(`[ROUTE_HANDLER] [getUserRoleData] Error getting role data: ${roleError.message}`);
      return null;
    }
    
    console.log(`[ROUTE_HANDLER] [getUserRoleData] Got role data for user ${user.id.substring(0, 8)}`);
    return roleData as UserRoleData;
  } catch (error) {
    console.error('[ROUTE_HANDLER] [getUserRoleData] Unexpected error:', error);
    return null;
  }
}

// Default export for backward compatibility
export default createRouteHandlerClient;

/**
 * Get all roles for the currently authenticated user
 * Uses getUserRoleData first for efficiency
 * @returns Array of roles or empty array if error or none found
 */
export async function getUserRoles(): Promise<string[]> {
  try {
    // First try to get from the SQL function for efficiency
    const roleData = await getUserRoleData();
    if (roleData?.roles?.length) {
      console.log(`[ROUTE_HANDLER] [getUserRoles] Found ${roleData.roles.length} roles via SQL function`);
      return roleData.roles;
    }
    
    // Fallback to direct database query
    const supabase = await createRouteHandlerClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.log('[ROUTE_HANDLER] [getUserRoles] No authenticated user found');
      return [];
    }
  
    const { data, error } = await supabase
      .from('ProfileRole')
      .select('role')
      .eq('profileId', user.id);
    
    if (error) {
      console.error(`[ROUTE_HANDLER] [getUserRoles] Error getting roles: ${error.message}`);
      return [];
    }
    
    const roles = data.map(r => r.role);
    console.log(`[ROUTE_HANDLER] [getUserRoles] Found ${roles.length} roles for user ${user.id.substring(0, 8)}`);
    return roles;
  } catch (error) {
    console.error('[ROUTE_HANDLER] [getUserRoles] Unexpected error:', error);
    return [];
  }
}

/**
 * Gets the user's active role from cookies
 * @returns The active role or null if not found
 */
export async function getActiveRole(): Promise<UserRole | null> {
  try {
    console.log('[ROUTE-HANDLER] Getting active role from cookie');
    
    // Get the cookieStore
    const cookieStore = await cookies();
    
    // Access the cookie directly
    const activeRole = cookieStore.get('activeRole')?.value;
    
    console.log(`[ROUTE-HANDLER] Active role cookie: ${activeRole || 'not found'}`);
    
    return activeRole as UserRole || null;
  } catch (error) {
    console.error('[ROUTE-HANDLER] Error getting active role:', error);
    return null;
  }
}

/**
 * Sets the active role in cookies
 * @param role The role to set as active
 */
export async function setActiveRole(role: UserRole): Promise<void> {
  try {
    console.log(`[ROUTE-HANDLER] Setting activeRole cookie to ${role}`);
    
    // Get the cookieStore
    const cookieStore = await cookies();
    
    cookieStore.set({
      name: 'activeRole',
      value: role,
      path: '/',
      maxAge: 60 * 60 * 24 * 30, // 30 days
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production'
    });
    
    console.log(`[ROUTE-HANDLER] Successfully set activeRole cookie`);
  } catch (error) {
    console.error('[ROUTE-HANDLER] Error setting activeRole cookie:', error);
  }
}

/**
 * Clears the active role from cookies
 */
export async function clearActiveRole(): Promise<void> {
  try {
    console.log('[ROUTE-HANDLER] Clearing activeRole cookie');
    
    // Get the cookieStore
    const cookieStore = await cookies();
    
    cookieStore.set({
      name: 'activeRole',
      value: '',
      path: '/',
      expires: new Date(0)
    });
    
    console.log('[ROUTE-HANDLER] Successfully cleared activeRole cookie');
  } catch (error) {
    console.error('[ROUTE-HANDLER] Error clearing activeRole cookie:', error);
  }
}

/**
 * Gets the access code from cookies for email signup invitations
 */
export async function getAccessCode(): Promise<string | undefined> {
  try {
    // Get a cookieStore and await it (important in Next.js 15)
    const cookieStore = await cookies();
    return cookieStore.get('accessCode')?.value;
  } catch (error) {
    console.error('[ROUTE-HANDLER] Error getting access code:', error);
    return undefined;
  }
}