// utils/supabase/client-helpers.ts
// Client-side helper functions that use RPC calls to avoid RLS infinite recursion

import { supabase } from '@/utils/supabase/client';
import { type SupabaseClient } from '@supabase/supabase-js';

/**
 * Safely gets a user's profile information using an RPC function instead of 
 * querying the Profile table directly (which can cause infinite recursion)
 */
export async function getProfileSafely(userId: string, supabaseClient?: SupabaseClient) {
  const client = supabaseClient || supabase;
  
  try {
    console.log('[client-helpers] Getting profile safely for:', userId);
    const { data, error } = await client.rpc('get_profile_safe', {
      target_user_id: userId
    });
    
    if (error) {
      console.error('[client-helpers] Error getting profile:', error);
      
      // Fallback to a simpler approach if RPC fails
      const { data: authUser } = await client.auth.getUser();
      if (authUser.user) {
        // Return minimal profile info from auth user
        return {
          id: authUser.user.id,
          email: authUser.user.email,
          displayName: authUser.user.user_metadata?.full_name || authUser.user.email
        };
      }
      return null;
    }
    
    return data;
  } catch (error) {
    console.error('[client-helpers] Unexpected error getting profile:', error);
    return null;
  }
}

/**
 * Safely gets a user's roles using an RPC function instead of 
 * querying the ProfileRole table directly (which can cause infinite recursion)
 */
export async function getUserRolesSafely(userId: string, supabaseClient?: SupabaseClient) {
  const client = supabaseClient || supabase;
  
  try {
    console.log('[client-helpers] Getting roles safely for:', userId);
    const { data, error } = await client.rpc('get_user_role_emergency', {
      user_id: userId
    });
    
    if (error) {
      console.error('[client-helpers] Error getting roles:', error);
      return { roles: [] };
    }
    
    return data;
  } catch (error) {
    console.error('[client-helpers] Unexpected error getting roles:', error);
    return { roles: [] };
  }
}

/**
 * Safely checks if the current user has executor relationship with any sharer
 */
export async function hasExecutorRelationship(userId: string, supabaseClient?: SupabaseClient) {
  const client = supabaseClient || supabase;
  
  try {
    console.log('[client-helpers] Checking executor relationship for:', userId);
    const { data, error } = await client.rpc('get_executor_for_user', {
      user_id: userId
    });
    
    if (error) {
      console.error('[client-helpers] Error checking executor relationship:', error);
      return false;
    }
    
    return data?.has_executor_relationship || false;
  } catch (error) {
    console.error('[client-helpers] Unexpected error checking executor relationship:', error);
    return false;
  }
}

/**
 * Safely gets all roles and profile information in one call
 */
export async function getUserInfoSafely(supabaseClient?: SupabaseClient) {
  const client = supabaseClient || supabase;
  
  try {
    const { data: { user } } = await client.auth.getUser();
    
    if (!user) {
      console.log('[client-helpers] No authenticated user found');
      return { user: null, roles: [], profile: null };
    }
    
    const userId = user.id;
    
    // Get roles using RPC
    const roleData = await getUserRolesSafely(userId, client);
    
    // Get profile using RPC or fallback
    const profile = await getProfileSafely(userId, client);
    
    return {
      user,
      roles: roleData?.roles || [],
      profile,
      hasExecutorRelationship: roleData?.has_executor_relationship || false,
      isSharer: roleData?.is_sharer || false,
      sharerId: roleData?.sharerId || null,
      executorRelationships: roleData?.executor_relationships || []
    };
  } catch (error) {
    console.error('[client-helpers] Unexpected error in getUserInfoSafely:', error);
    return { user: null, roles: [], profile: null };
  }
}

/**
 * Checks if the current user has a specific role
 */
export async function hasRole(role: string, supabaseClient?: SupabaseClient) {
  const client = supabaseClient || supabase;
  
  try {
    const { data: { user } } = await client.auth.getUser();
    
    if (!user) {
      console.log('[client-helpers] No authenticated user found when checking role:', role);
      return false;
    }
    
    const roleData = await getUserRolesSafely(user.id, client);
    return Array.isArray(roleData?.roles) && roleData.roles.includes(role);
  } catch (error) {
    console.error('[client-helpers] Unexpected error checking role:', error);
    return false;
  }
} 