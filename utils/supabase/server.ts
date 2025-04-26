// utils/supabase/server.ts
// Server-side Supabase client with SSR support

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { createAdminClient } from './admin';
import { cache } from 'react';
import { redirect } from 'next/navigation';
import { getCookie, setCookie, deleteCookie } from '@/utils/next-cookies-helper';

// Add type for role checking
export type UserRole = 'SHARER' | 'EXECUTOR' | 'LISTENER' | 'ADMIN';

// Type for user role data returned by the SQL function
export type UserRoleData = {
  roles: UserRole[];
  is_sharer: boolean;
  sharerId: string | null;
  has_executor_relationship: boolean;
  timestamp: string;
};

// Create a cached client for server components
export const createClient = cache(async () => {
  try {
    console.log('[SERVER] Creating Supabase server client');
    
    // Handle cookies directly instead of through helper functions
    // This ensures better control over segmented cookies
    return createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          flowType: 'pkce',
          autoRefreshToken: true,
          detectSessionInUrl: false,
        },
        cookies: {
          async get(name) {
            try {
              // Get a fresh cookieStore each time
              const cookieStore = await cookies();
              
              // Use await here
              const cookie = await cookieStore.get(name); // Await the promise
              // console.log(`[SERVER COOKIE GET] ${name}: ${cookie ? 'found' : 'not found'}`);
              return cookie?.value;
            } catch (error) {
              console.error(`[SERVER COOKIE GET] Error getting cookie ${name}:`, error);
              return undefined;
            }
          },
          set(name: string, value: string, options: CookieOptions) {
            try {
              // console.log(`[SERVER COOKIE SET] ${name}`);
              cookieStore.set({ name, value, ...options });
            } catch (error) {
              // The `set` method was called from a Server Component.
              // This can be ignored if you have middleware refreshing
              // user sessions.
            }
          },
          remove(name: string, options: CookieOptions) {
            try {
              // console.log(`[SERVER COOKIE REMOVE] ${name}`);
              cookieStore.set({ name, value: '', ...options });
            } catch (error) {
              // The `delete` method was called from a Server Component.
              // This can be ignored if you have middleware refreshing
              // user sessions.
            }
          },
        },
      }
    );
  } catch (error) {
    console.error('[SERVER] Error creating Supabase client:', error);
    throw new Error(`Failed to create Supabase client: ${error}`);
  }
});

/**
 * Gets the authenticated user or redirects to login
 * @returns The authenticated user or redirects
 */
export async function getAuthUser() {
  const supabase = createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error || !user) {
    console.log('[AUTH] No authenticated user found, redirecting to login');
    redirect('/login');
  }
  
  return user;
}

/**
 * Cached helper to get comprehensive user role data from SQL function
 * This provides roles, sharer status, and executor status in one call
 * @returns User role data or null if error/not authenticated
 */
export const getUserRoleData = cache(async (): Promise<UserRoleData | null> => {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.log('[getUserRoleData] No authenticated user found');
      return null;
    }
    
    // Use our new SQL function
    const { data: roleData, error: roleError } = await supabase.rpc('get_user_role_data');
    
    if (roleError) {
      console.error(`[getUserRoleData] Error getting role data: ${roleError.message}`);
      return null;
    }
    
    console.log(`[getUserRoleData] Got role data for user ${user.id.substring(0, 8)}`);
    return roleData as UserRoleData;
  } catch (error) {
    console.error('[getUserRoleData] Unexpected error:', error);
    return null;
  }
});

/**
 * Cached helper to get user roles directly from JWT via RPC
 * This version first tries the get_user_role_data RPC which uses JWT claims
 * before falling back to the emergency admin method
 */
export const getUserRoles = cache(async (): Promise<UserRole[]> => {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.log('[getUserRoles] No authenticated user found');
      return [];
    }
    
    // First attempt: Use our new comprehensive role data function
    const roleData = await getUserRoleData();
    if (roleData?.roles && Array.isArray(roleData.roles)) {
      console.log(`[getUserRoles] Got roles from getUserRoleData: ${roleData.roles.join(', ')}`);
      return roleData.roles;
    }
    
    // Second attempt: Use JWT-based RPC to get roles efficiently
    const { data: jwtRoleData, error: roleError } = await supabase.rpc('get_user_role_data');
    
    if (!roleError && jwtRoleData?.roles) {
      console.log(`[getUserRoles] Got roles from JWT: ${jwtRoleData.roles.join(', ')}`);
      return jwtRoleData.roles;
    }
    
    // Fallback: Try to get from JWT directly
    if (Array.isArray(user.app_metadata?.roles) && user.app_metadata.roles.length > 0) {
      console.log(`[getUserRoles] Using roles from JWT metadata: ${user.app_metadata.roles.join(', ')}`);
      return user.app_metadata.roles;
    }
    
    // Last resort: Get roles from admin client (most expensive)
    console.log(`[getUserRoles] Falling back to admin client for user ${user.id.substring(0, 8)}`);
    const adminClient = createAdminClient();
    
    const { data: emergencyRoleInfo, error: emergencyError } = await adminClient.rpc(
      'get_user_role_emergency',
      { user_id: user.id }
    );
    
    if (emergencyError) {
      console.error(`[getUserRoles] Emergency role check failed: ${emergencyError.message}`);
      return [];
    }
    
    return emergencyRoleInfo?.roles || [];
  } catch (error) {
    console.error('[getUserRoles] Unexpected error:', error);
    return [];
  }
});

/**
 * Checks if the authenticated user has a specific role
 * Uses cached getUserRoles function for efficiency
 * 
 * @param role The role to check for (SHARER, EXECUTOR, LISTENER, or ADMIN)
 * @returns True if the user has the role, false otherwise
 */
export async function checkRole(role: UserRole): Promise<boolean> {
  try {
    const roles = await getUserRoles();
    const hasRole = roles.includes(role);
    
    console.log(`[checkRole] User has ${role} role: ${hasRole}`);
    return hasRole;
  } catch (error) {
    console.error(`[checkRole] Unexpected error checking ${role} role:`, error);
    return false;
  }
}

// Get sharer profile for a user using admin client to avoid recursion
export async function getSharerProfile(userId: string) {
  try {
    const adminClient = createAdminClient();
    
    // Use the RPC function to get role information
    const { data: roleInfo, error: roleError } = await adminClient.rpc(
      'get_user_role_emergency',
      { user_id: userId }
    );

    if (roleError) {
      console.error('[getSharerProfile] Error getting role info:', roleError);
      return null;
    }

    return roleInfo?.sharerId || null;
  } catch (error) {
    console.error('[getSharerProfile] Unexpected error:', error);
    return null;
  }
}

// Check if user has an executor relationship using admin client
export async function hasExecutorRelationship(userId: string) {
  try {
    const adminClient = createAdminClient();
    
    // Use the RPC function to get executor information
    const { data: executorInfo, error: executorError } = await adminClient.rpc(
      'get_executor_for_user',
      { user_id: userId }
    );

    if (executorError) {
      console.error('[hasExecutorRelationship] Error getting executor info:', executorError);
      return false;
    }

    return executorInfo?.has_executor_relationship || false;
  } catch (error) {
    console.error('[hasExecutorRelationship] Unexpected error:', error);
    return false;
  }
}

// Get the effective sharer ID for a user using admin client
export async function getEffectiveSharerId(userId: string) {
  try {
    const adminClient = createAdminClient();
    
    // Check if user is a sharer
    const { data: roleInfo, error: roleError } = await adminClient.rpc(
      'get_user_role_emergency',
      { user_id: userId }
    );

    if (roleError) {
      console.error('[getEffectiveSharerId] Error getting role info:', roleError);
      return null;
    }

    // If user is a sharer, return their sharer ID
    if (roleInfo?.is_sharer) {
      return roleInfo.sharerId;
    }

    // If not a sharer, check if they're an executor
    const { data: executorInfo, error: executorError } = await adminClient.rpc(
      'get_executor_for_user',
      { user_id: userId }
    );

    if (executorError) {
      console.error('[getEffectiveSharerId] Error getting executor info:', executorError);
      return null;
    }

    // If user has executor relationships, return the first one's sharerId
    if (executorInfo?.has_executor_relationship && executorInfo.relationships?.length > 0) {
      return executorInfo.relationships[0].sharerId;
    }

    return null;
  } catch (error) {
    console.error('[getEffectiveSharerId] Unexpected error:', error);
    return null;
  }
}

/**
 * Safely get completed prompts for a sharer using admin client to bypass RLS recursion
 * @param sharerId The ID of the sharer to get completed prompts for
 * @returns Array of prompt responses
 */
export async function getCompletedPromptsForSharer(sharerId: string) {
  try {
    // Use the admin client to bypass RLS policies
    const adminClient = await import('@/utils/supabase/admin').then(mod => mod.createAdminClient());
    
    console.log('[SERVER] Getting completed prompts for sharer:', sharerId?.substring(0, 8));
    
    const { data, error } = await adminClient
      .from('PromptResponse')
      .select(`
        promptId, 
        videoId,
        prompt:Prompt (promptCategoryId)
      `)
      .eq('profileSharerId', sharerId)
      .not('videoId', 'is', null);
      
    if (error) {
      console.error('[SERVER] Error fetching completed prompts:', error);
      return [];
    }
    
    // Transform the data to include the promptCategoryId at the top level
    const transformedData = (data || []).map(item => ({
      promptId: item.promptId,
      videoId: item.videoId,
      promptCategoryId: item.prompt?.promptCategoryId
    }));
    
    return transformedData;
  } catch (error) {
    console.error('[SERVER] Unexpected error in getCompletedPromptsForSharer:', error);
    return [];
  }
}