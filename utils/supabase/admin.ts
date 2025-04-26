// File: utils/supabase/admin.ts
// This module exports a function to create a Supabase admin client for server-side operations.

import { createClient as createClientBase } from '@supabase/supabase-js';
import { cache } from 'react';

// Create a cached admin client for server-side usage
export const createAdminClient = cache(() => {
  // Verify environment variables are available
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables for admin client');
  }
  
  // Create client with service role key for admin operations
  return createClientBase(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
});

/**
 * IMPORTANT: Use this client ONLY for:
 * 1. Admin operations that require service role permissions
 * 2. SECURITY DEFINER RPC functions that need to bypass RLS
 * 3. Operations that need to be performed regardless of the user's permissions
 * 
 * NEVER use this client for:
 * 1. Regular database operations where RLS should apply
 * 2. Operations that should respect user permissions
 * 3. Client-side operations
 */

/**
 * Safe wrapper for retrieving user's roles via admin client
 * Uses RPC to avoid infinite recursion in RLS policies
 */
export async function getUserRolesSafely(userId: string) {
  try {
    const adminClient = createAdminClient();
    console.log('[Admin Client] Getting roles safely for user:', userId?.substring(0, 8));
    
    const { data, error } = await adminClient.rpc('get_user_role_emergency', {
      user_id: userId
    });
    
    if (error) {
      console.error('[Admin Client] Error getting roles:', error.message);
      return [];
    }
    
    console.log('[Admin Client] Retrieved roles successfully:', data?.roles || []);
    return data?.roles || [];
  } catch (error) {
    console.error('[Admin Client] Unexpected error getting roles:', error);
    return [];
  }
}

/**
 * Safe wrapper for checking if user has profile sharer relationship
 * Uses RPC to avoid infinite recursion in RLS policies
 */
export async function getProfileSharerSafely(userId: string) {
  try {
    const adminClient = createAdminClient();
    console.log('[Admin Client] Getting profile sharer safely for:', userId?.substring(0, 8));
    
    const { data, error } = await adminClient.rpc('get_user_profile_sharer', {
      user_id: userId
    });
    
    if (error) {
      console.error('[Admin Client] Error getting profile sharer:', error.message);
      return null;
    }
    
    return data?.profile_sharer || null;
  } catch (error) {
    console.error('[Admin Client] Unexpected error getting profile sharer:', error);
    return null;
  }
}

/**
 * Safe wrapper for checking if user has executor relationships
 * Uses RPC to avoid infinite recursion in RLS policies
 */
export async function getExecutorRelationshipsSafely(userId: string) {
  try {
    const adminClient = createAdminClient();
    console.log('[Admin Client] Getting executor relationships for:', userId?.substring(0, 8));
    
    const { data, error } = await adminClient.rpc('get_executor_for_user', {
      user_id: userId
    });
    
    if (error) {
      console.error('[Admin Client] Error getting executor relationships:', error.message);
      return [];
    }
    
    return data?.relationships || [];
  } catch (error) {
    console.error('[Admin Client] Unexpected error getting executor relationships:', error);
    return [];
  }
}

/**
 * Safely get a user's role information bypassing RLS.
 * This should only be used when normal queries are failing due to RLS issues.
 */
export async function getUserRoleInfoAdmin(userId: string) {
  try {
    const adminClient = createAdminClient();

    // Get user roles from ProfileRole table
    const { data: roles, error: rolesError } = await adminClient
      .from('ProfileRole')
      .select('role')
      .eq('profileId', userId);

    if (rolesError) {
      console.error('[Admin Client] Error fetching roles:', rolesError);
    }

    // Get sharer profile if it exists
    const { data: sharer, error: sharerError } = await adminClient
      .from('ProfileSharer')
      .select('id')
      .eq('profileId', userId)
      .single();

    if (sharerError && !sharerError.message.includes('No rows found')) {
      console.error('[Admin Client] Error fetching sharer profile:', sharerError);
    }

    // Get executor relationships
    const { data: executorRelationships, error: executorError } = await adminClient
      .from('ProfileExecutor')
      .select('id, sharerId')
      .eq('executorId', userId);

    if (executorError) {
      console.error('[Admin Client] Error fetching executor relationships:', executorError);
    }

    // Return the complete role information
    return {
      roles: roles?.map(r => r.role) || [],
      sharerId: sharer?.id || null,
      executorRelationships: executorRelationships || []
    };
  } catch (error) {
    console.error('[Admin Client] Unexpected error in getUserRoleInfoAdmin:', error);
    return {
      roles: [],
      sharerId: null,
      executorRelationships: []
    };
  }
}

/**
 * Emergency function to fix permissions for a user if they have a role
 * in ProfileRole but are missing the corresponding relationship record.
 */
export async function repairUserRoleRelationships(userId: string) {
  try {
    const adminClient = createAdminClient();

    // Get user's current roles
    const { data: roles } = await adminClient
      .from('ProfileRole')
      .select('role')
      .eq('profileId', userId);

    const userRoles = roles?.map(r => r.role) || [];
    const results: Record<string, any> = {};

    // Check and fix SHARER role
    if (userRoles.includes('SHARER')) {
      const { data: sharer } = await adminClient
        .from('ProfileSharer')
        .select('id')
        .eq('profileId', userId)
        .single();

      if (!sharer) {
        // Create missing ProfileSharer record
        const { data: newSharer, error } = await adminClient
          .from('ProfileSharer')
          .insert({ 
            profileId: userId,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          })
          .select('id')
          .single();
        
        results.sharerId = error ? 'error creating' : newSharer.id;
      } else {
        results.sharerId = `already exists: ${sharer.id}`;
      }
    }

    // Check and fix EXECUTOR role
    if (userRoles.includes('EXECUTOR')) {
      const { data: executor } = await adminClient
        .from('ProfileExecutor')
        .select('id')
        .eq('executorId', userId);

      if (!executor || executor.length === 0) {
        results.executor = 'missing relationship but has role';
      } else {
        results.executor = `has ${executor.length} relationships`;
      }
    }

    // Check and fix LISTENER role
    if (userRoles.includes('LISTENER')) {
      const { data: listener } = await adminClient
        .from('ProfileListener')
        .select('id')
        .eq('listenerId', userId);

      if (!listener || listener.length === 0) {
        results.listener = 'missing relationship but has role';
      } else {
        results.listener = `has ${listener.length} relationships`;
      }
    }

    return {
      userId,
      roles: userRoles,
      repairs: results
    };
  } catch (error) {
    console.error('[Admin Client] Error in repairUserRoleRelationships:', error);
    return {
      userId,
      error: 'Failed to repair roles'
    };
  }
}