import { createClient } from '@supabase/supabase-js';
import { createAdminClient, getUserRoleInfoAdmin } from './admin';
import { Database } from '@/types/supabase';

// Type definition for the effective role
type EffectiveRole = 'SHARER' | 'EXECUTOR' | 'LISTENER' | 'ADMIN' | null;

/**
 * Improved helpers for role-based access in Telloom
 * 
 * These functions provide a more robust way to handle roles and permissions,
 * with better error handling and fallback mechanisms to prevent issues related
 * to circular dependencies or database errors.
 */

/**
 * Get the effective sharer ID for the current user.
 * This handles all possible cases:
 * 1. The user is a SHARER (returns their own sharerId)
 * 2. The user is an EXECUTOR (returns the sharerId they're managing)
 * 3. No valid sharer ID is found (returns null)
 * 
 * Includes robust error handling and fallback mechanisms
 */
export async function getEffectiveSharerId(
  supabase: ReturnType<typeof createClient<Database>>,
  currentSharerId?: string | null
): Promise<string | null> {
  try {
    console.log('[Role Helpers] Getting effective sharerId, current:', currentSharerId);
    
    // Step 1: If sharerId is provided and not null, validate it first
    if (currentSharerId) {
      try {
        // Attempt to first check if this is a valid sharerId the user has access to
        const { data: hasAccess, error: accessError } = await supabase.rpc(
          'has_sharer_access_check',
          { 
            user_id: (await supabase.auth.getUser()).data.user?.id,
            sharer_id: currentSharerId 
          }
        );

        if (!accessError && hasAccess) {
          console.log('[Role Helpers] Validated current sharerId access:', currentSharerId);
          return currentSharerId;
        }
        
        if (accessError) {
          console.error('[Role Helpers] Error validating sharerId access:', accessError);
        }
      } catch (err) {
        console.error('[Role Helpers] Exception checking sharer access:', err);
      }
    }

    // Step 2: If no valid sharer ID, check if user has their own sharer profile
    try {
      const { data: sharer, error: sharerError } = await supabase
        .from('ProfileSharer')
        .select('id')
        .single();
      
      if (!sharerError && sharer?.id) {
        console.log('[Role Helpers] Found user\'s own sharer profile:', sharer.id);
        return sharer.id;
      }
      
      if (sharerError && !sharerError.message.includes('No rows found')) {
        console.error('[Role Helpers] Error getting sharer profile:', sharerError);
      }
    } catch (err) {
      console.error('[Role Helpers] Exception finding sharer profile:', err);
    }
    
    // Step 3: Check if user is an executor with relationships
    try {
      const { data: executorRelationships, error: executorError } = await supabase.rpc(
        'get_executor_for_user',
        { user_id: (await supabase.auth.getUser()).data.user?.id }
      );
      
      if (!executorError && executorRelationships && executorRelationships.length > 0) {
        // Use the first executor relationship's sharer ID
        const firstRelation = executorRelationships[0];
        console.log('[Role Helpers] Found executor relationship with sharerId:', firstRelation.sharerId);
        return firstRelation.sharerId;
      }
      
      if (executorError) {
        console.error('[Role Helpers] Error getting executor relationships:', executorError);
      }
    } catch (err) {
      console.error('[Role Helpers] Exception finding executor relationships:', err);
    }
    
    // Step 4: Last resort - use admin client to bypass RLS
    try {
      const userId = (await supabase.auth.getUser()).data.user?.id;
      if (userId) {
        const roleInfo = await getUserRoleInfoAdmin(userId);
        
        if (roleInfo.sharerId) {
          console.log('[Role Helpers] Found sharerId via admin client:', roleInfo.sharerId);
          return roleInfo.sharerId;
        }
        
        if (roleInfo.executorRelationships && roleInfo.executorRelationships.length > 0) {
          const firstRelation = roleInfo.executorRelationships[0];
          console.log('[Role Helpers] Found executor relationship via admin client, sharerId:', firstRelation.sharerId);
          return firstRelation.sharerId;
        }
      }
    } catch (err) {
      console.error('[Role Helpers] Exception using admin client:', err);
    }
    
    // No valid sharer ID found
    console.log('[Role Helpers] No valid sharerId found');
    return null;
  } catch (err) {
    console.error('[Role Helpers] Unexpected error in getEffectiveSharerId:', err);
    return null;
  }
}

/**
 * Check if the user has a SHARER profile.
 * Includes error handling and returns false if any error occurs.
 */
export async function hasSharerProfile(
  supabase: ReturnType<typeof createClient<Database>>
): Promise<boolean> {
  try {
    // Check if user has a sharer profile
    const { data, error } = await supabase
      .from('ProfileSharer')
      .select('id')
      .single();
    
    if (error) {
      if (!error.message.includes('No rows found')) {
        console.error('[Role Helpers] Error checking sharer profile:', error);
      }
      return false;
    }
    
    return !!data;
  } catch (err) {
    console.error('[Role Helpers] Exception checking sharer profile:', err);
    return false;
  }
}

/**
 * Check if the user has an EXECUTOR relationship.
 * Includes error handling and returns false if any error occurs.
 */
export async function hasExecutorRelationship(
  supabase: ReturnType<typeof createClient<Database>>
): Promise<boolean> {
  try {
    // First try the regular query
    try {
      const { data, error } = await supabase
        .from('ProfileExecutor')
        .select('id')
        .limit(1);
      
      if (!error && data && data.length > 0) {
        return true;
      }
      
      if (error) {
        console.error('[Role Helpers] Error checking executor relationship:', error);
      }
    } catch (err) {
      console.error('[Role Helpers] Exception checking executor relationship:', err);
    }
    
    // Try the RPC function as a fallback
    try {
      const userId = (await supabase.auth.getUser()).data.user?.id;
      if (userId) {
        const { data, error } = await supabase.rpc(
          'get_executor_for_user',
          { user_id: userId }
        );
        
        if (!error && data && data.length > 0) {
          return true;
        }
        
        if (error) {
          console.error('[Role Helpers] Error in RPC executor check:', error);
        }
      }
    } catch (err) {
      console.error('[Role Helpers] Exception in RPC executor check:', err);
    }
    
    // Last resort - try admin client
    try {
      const userId = (await supabase.auth.getUser()).data.user?.id;
      if (userId) {
        const roleInfo = await getUserRoleInfoAdmin(userId);
        return roleInfo.executorRelationships && roleInfo.executorRelationships.length > 0;
      }
    } catch (err) {
      console.error('[Role Helpers] Exception using admin client for executor check:', err);
    }
    
    return false;
  } catch (err) {
    console.error('[Role Helpers] Unexpected error in hasExecutorRelationship:', err);
    return false;
  }
}

/**
 * Determine the appropriate role route for the user.
 * Includes robust error handling and fallback mechanisms.
 */
export async function getAppropriateRoleRoute(
  supabase: ReturnType<typeof createClient<Database>>
): Promise<string> {
  try {
    console.log('[Role Helpers] Determining appropriate role route');
    
    // Check if user is an admin
    if (await isAdmin(supabase)) {
      return '/admin';
    }
    
    // Try to use emergency role function first, which bypasses RLS
    try {
      const userId = (await supabase.auth.getUser()).data.user?.id;
      if (userId) {
        const { data: roleData, error: roleError } = await supabase.rpc(
          'get_user_role_emergency',
          { user_id: userId }
        );
        
        if (!roleError && roleData) {
          const roles = roleData.roles || [];
          const hasSharer = roleData.sharerId !== null;
          const hasExecutor = (roleData.executorRelationships || []).length > 0;
          
          if (hasSharer) {
            return '/role-sharer';
          } else if (hasExecutor) {
            return '/role-executor';
          } else if (roles.includes('LISTENER')) {
            return '/role-listener';
          }
        }
        
        if (roleError) {
          console.error('[Role Helpers] Error getting emergency role info:', roleError);
        }
      }
    } catch (err) {
      console.error('[Role Helpers] Exception getting emergency role info:', err);
    }
    
    // Fallback to regular queries with proper error handling
    // Check for sharer profile
    const isSharer = await hasSharerProfile(supabase);
    if (isSharer) {
      return '/role-sharer';
    }
    
    // Check for executor relationship
    const isExecutor = await hasExecutorRelationship(supabase);
    if (isExecutor) {
      return '/role-executor';
    }
    
    // Check for role assignments as fallback
    try {
      const { data: roles, error: rolesError } = await supabase
        .from('ProfileRole')
        .select('role');
      
      if (!rolesError && roles) {
        const roleValues = roles.map(r => r.role);
        
        if (roleValues.includes('LISTENER')) {
          return '/role-listener';
        }
        
        if (roleValues.includes('EXECUTOR')) {
          // Role exists but relationship may not - send to executor anyway
          return '/role-executor';
        }
        
        if (roleValues.includes('SHARER')) {
          // Role exists but profile may not - send to sharer anyway
          return '/role-sharer';
        }
      }
      
      if (rolesError) {
        console.error('[Role Helpers] Error checking role assignments:', rolesError);
      }
    } catch (err) {
      console.error('[Role Helpers] Exception checking role assignments:', err);
    }
    
    // Default fallback - send to onboarding
    return '/dashboard/onboarding';
  } catch (err) {
    console.error('[Role Helpers] Unexpected error in getAppropriateRoleRoute:', err);
    return '/error?type=role_determination';
  }
}

/**
 * Check if the user has admin privileges.
 * Includes robust error handling.
 */
export async function isAdmin(
  supabase: ReturnType<typeof createClient<Database>>
): Promise<boolean> {
  try {
    // Try the direct is_admin RPC first
    try {
      const userId = (await supabase.auth.getUser()).data.user?.id;
      if (userId) {
        const { data: isAdminResult, error: adminError } = await supabase.rpc(
          'is_admin',
          { user_id: userId }
        );
        
        if (!adminError) {
          return !!isAdminResult;
        }
        
        if (adminError) {
          console.error('[Role Helpers] Error checking admin status via RPC:', adminError);
        }
      }
    } catch (err) {
      console.error('[Role Helpers] Exception checking admin status via RPC:', err);
    }
    
    // Check by querying user roles
    try {
      const { data: roles, error: rolesError } = await supabase
        .from('ProfileRole')
        .select('role')
        .eq('role', 'ADMIN');
      
      if (!rolesError) {
        return roles && roles.length > 0;
      }
      
      if (rolesError) {
        console.error('[Role Helpers] Error checking admin role:', rolesError);
      }
    } catch (err) {
      console.error('[Role Helpers] Exception checking admin role:', err);
    }
    
    // Last resort - check via auth metadata
    const { data: { user } } = await supabase.auth.getUser();
    const appMetadata = user?.app_metadata;
    
    return (
      appMetadata?.role === 'admin' || 
      appMetadata?.is_super_admin === true
    );
  } catch (err) {
    console.error('[Role Helpers] Unexpected error in isAdmin:', err);
    return false;
  }
}

/**
 * Check if the user has access to a sharer's content.
 * This is true if:
 * 1. The user is an admin
 * 2. The user is the owner of the sharer profile
 * 3. The user is an executor for the sharer
 * 
 * Includes fallback mechanisms if the primary RPC call fails.
 */
export async function hasSharerAccess(
  supabase: ReturnType<typeof createClient<Database>>,
  sharerId: string
): Promise<boolean> {
  try {
    if (!sharerId) {
      return false;
    }
    
    // First check: Use the RPC function
    try {
      const userId = (await supabase.auth.getUser()).data.user?.id;
      if (userId) {
        const { data: hasAccess, error: accessError } = await supabase.rpc(
          'has_sharer_access_check',
          { user_id: userId, sharer_id: sharerId }
        );
        
        if (!accessError) {
          return !!hasAccess;
        }
        
        if (accessError) {
          console.error('[Role Helpers] Error in has_sharer_access_check RPC:', accessError);
        }
      }
    } catch (err) {
      console.error('[Role Helpers] Exception in has_sharer_access_check RPC:', err);
    }
    
    // Second check: Check admin status
    if (await isAdmin(supabase)) {
      return true;
    }
    
    // Third check: Check if user is the owner
    try {
      const { data: sharer, error: sharerError } = await supabase
        .from('ProfileSharer')
        .select('profileId')
        .eq('id', sharerId)
        .single();
      
      if (!sharerError && sharer) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user && sharer.profileId === user.id) {
          return true;
        }
      }
    } catch (err) {
      console.error('[Role Helpers] Exception checking sharer ownership:', err);
    }
    
    // Fourth check: Check if user is an executor
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: executor, error: executorError } = await supabase
          .from('ProfileExecutor')
          .select('id')
          .eq('sharerId', sharerId)
          .eq('executorId', user.id)
          .limit(1);
        
        if (!executorError && executor && executor.length > 0) {
          return true;
        }
      }
    } catch (err) {
      console.error('[Role Helpers] Exception checking executor relationship:', err);
    }
    
    // Last resort: Admin client
    try {
      const adminClient = createAdminClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        // Check if admin via admin client
        const { data: isAdminData } = await adminClient.rpc('is_admin', {
          user_id: user.id
        });
        
        if (isAdminData) {
          return true;
        }
        
        // Check if owner via admin client
        const { data: sharer } = await adminClient
          .from('ProfileSharer')
          .select('profileId')
          .eq('id', sharerId)
          .single();
        
        if (sharer && sharer.profileId === user.id) {
          return true;
        }
        
        // Check if executor via admin client
        const { data: executor } = await adminClient
          .from('ProfileExecutor')
          .select('id')
          .eq('sharerId', sharerId)
          .eq('executorId', user.id)
          .limit(1);
        
        if (executor && executor.length > 0) {
          return true;
        }
      }
    } catch (err) {
      console.error('[Role Helpers] Exception using admin client for access check:', err);
    }
    
    return false;
  } catch (err) {
    console.error('[Role Helpers] Unexpected error in hasSharerAccess:', err);
    return false;
  }
} 