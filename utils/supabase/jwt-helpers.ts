/**
 * JWT Role Helpers
 * 
 * This file contains utility functions for extracting role information from
 * Supabase JWT tokens in server components/middleware.
 */

import { createClient } from './server';
import { User } from '@supabase/supabase-js';
import { createAdminClient } from './admin';

export interface JwtRoleData {
  roles: string[];
  isSharer: boolean;
  sharerId: string | null;
  hasExecutor: boolean;
  executorCount: number;
}

/**
 * Parse JWT metadata from a user object
 * @param user The Supabase user object
 * @returns Role information extracted from the JWT
 */
export function parseJwtRoleData(user: User | null): JwtRoleData {
  if (!user || !user.app_metadata) {
    return {
      roles: [],
      isSharer: false,
      sharerId: null,
      hasExecutor: false,
      executorCount: 0
    };
  }

  return {
    roles: Array.isArray(user.app_metadata.roles) ? user.app_metadata.roles : [],
    isSharer: !!user.app_metadata.is_sharer,
    sharerId: user.app_metadata.sharer_id || null,
    hasExecutor: !!user.app_metadata.has_executor,
    executorCount: typeof user.app_metadata.executor_count === 'number' ? user.app_metadata.executor_count : 0
  };
}

/**
 * Get the authenticated user with role data from JWT
 * @returns The user object with parsed role data
 */
export async function getUserWithRoleData(): Promise<{ user: User | null, roleData: JwtRoleData }> {
  try {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    
    // --- START LOGGING ---
    console.log('[JWT_HELPERS] User object fetched:', JSON.stringify(user, null, 2));
    if (user) {
      console.log('[JWT_HELPERS] User app_metadata:', JSON.stringify(user.app_metadata, null, 2));
      console.log('[JWT_HELPERS] User user_metadata:', JSON.stringify(user.user_metadata, null, 2));
    }
    // --- END LOGGING ---
    
    if (error || !user) {
      console.error('[JWT_HELPERS] No authenticated user found:', error?.message);
      return { user: null, roleData: { roles: [], isSharer: false, sharerId: null, hasExecutor: false, executorCount: 0 } };
    }
    
    // Get comprehensive role data from the RPC function
    const { data: roleInfo, error: roleError } = await supabase.rpc('get_user_role_data');
    
    if (roleError) {
      console.error('[JWT_HELPERS] Error getting role data:', roleError);
      // Fall back to parsing JWT directly
      const parsedRoleData = parseJwtRoleData(user);
      return { user, roleData: parsedRoleData };
    }
    
    // Transform the RPC response into our standard JwtRoleData format
    const roleData: JwtRoleData = {
      roles: roleInfo?.roles || [],
      isSharer: roleInfo?.is_sharer || false,
      sharerId: roleInfo?.sharerId || null,
      hasExecutor: roleInfo?.has_executor_relationship || false,
      executorCount: roleInfo?.executor_count || 0
    };
    
    console.log('User role info in server component:', roleInfo);
    
    return { user, roleData };
  } catch (error) {
    console.error('[JWT_HELPERS] Unexpected error in getUserWithRoleData:', error);
    return { 
      user: null, 
      roleData: { 
        roles: [], 
        isSharer: false, 
        sharerId: null, 
        hasExecutor: false, 
        executorCount: 0 
      } 
    };
  }
}

/**
 * Check if a user has a specific role based on JWT claims
 * @param user The Supabase user object
 * @param role The role to check for
 * @returns True if the user has the specified role
 */
export function hasRoleFromJwt(user: User | null, role: string): boolean {
  if (!user || !user.app_metadata || !Array.isArray(user.app_metadata.roles)) {
    return false;
  }
  
  return user.app_metadata.roles.includes(role);
}

/**
 * Check if the current authenticated user has a specific role
 * @param role The role to check for
 * @returns True if the authenticated user has the specified role
 */
export async function checkRoleFromJwt(role: string): Promise<boolean> {
  const { user } = await getUserWithRoleData();
  return hasRoleFromJwt(user, role);
}

/**
 * Get the effective context for a user based on their JWT claims and active role
 * @param activeRole The active role from cookie (if any)
 * @returns The appropriate context ID and role for the user
 */
export async function getEffectiveUserContext(activeRole?: string | null): Promise<{
  contextId: string | null;
  effectiveRole: string | null;
}> {
  const { user, roleData } = await getUserWithRoleData();
  
  if (!user) {
    return { contextId: null, effectiveRole: null };
  }
  
  // If activeRole is specified and user has that role, prioritize it
  if (activeRole && roleData.roles.includes(activeRole)) {
    // For SHARER role, return the user's sharer ID
    if (activeRole === 'SHARER' && roleData.isSharer) {
      return { contextId: roleData.sharerId, effectiveRole: 'SHARER' };
    }
    
    // For other roles, we just know they have the role but not context IDs
    // These would need to be fetched separately if needed
    return { contextId: null, effectiveRole: activeRole };
  }
  
  // If no active role specified or invalid, determine based on priority
  // Priority: SHARER > EXECUTOR > LISTENER
  if (roleData.isSharer) {
    return { contextId: roleData.sharerId, effectiveRole: 'SHARER' };
  }
  
  if (roleData.hasExecutor) {
    return { contextId: null, effectiveRole: 'EXECUTOR' };
  }
  
  if (roleData.roles.includes('LISTENER')) {
    return { contextId: null, effectiveRole: 'LISTENER' };
  }
  
  return { contextId: null, effectiveRole: null };
}

/**
 * Debug function to check if JWT claims match database role information
 * Useful for diagnosing issues with JWT claims
 */
export async function validateJwtClaims(): Promise<{
  jwtRoles: string[];
  dbRoles: string[];
  match: boolean;
  jwtData: any;
  dbData: any;
}> {
  // Get role data from JWT
  const { user, roleData } = await getUserWithRoleData();
  
  if (!user) {
    return {
      jwtRoles: [],
      dbRoles: [],
      match: false,
      jwtData: null, 
      dbData: null
    };
  }
  
  // Get role data directly from database for comparison
  const adminClient = createAdminClient();
  const { data: dbRoleInfo, error } = await adminClient.rpc(
    'get_user_role_emergency',
    { user_id: user.id }
  );
  
  if (error) {
    console.error('Error validating JWT claims:', error);
    return {
      jwtRoles: roleData.roles,
      dbRoles: [],
      match: false,
      jwtData: roleData,
      dbData: null
    };
  }
  
  const dbRoles = dbRoleInfo?.roles || [];
  
  // Check if roles match
  const rolesMatch = roleData.roles.length === dbRoles.length && 
    roleData.roles.every(role => dbRoles.includes(role));
    
  return {
    jwtRoles: roleData.roles,
    dbRoles: dbRoles,
    match: rolesMatch,
    jwtData: {
      ...roleData,
      user_metadata: user.user_metadata,
      app_metadata: user.app_metadata
    },
    dbData: dbRoleInfo
  };
} 