/**
 * Client-safe JWT Role Helpers
 * 
 * This file contains utility functions for extracting role information from
 * Supabase JWT tokens in client components.
 */

import { User } from '@supabase/supabase-js';

export interface JwtRoleData {
  roles: string[];
  isSharer: boolean;
  sharerId: string | null;
  hasExecutor: boolean;
  executorCount: number;
}

/**
 * Parse JWT metadata from a user object - client-safe version
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