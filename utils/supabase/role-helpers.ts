import { SupabaseClient } from '@supabase/supabase-js';

/**
 * Returns the effective sharer ID for the current user.
 *
 * Under the updated approach:
 * - If the user has a SHARER profile (i.e. a record in ProfileSharer), that record's ID is used.
 * - Otherwise, if the user has an EXECUTOR relationship (i.e. a record in ProfileExecutor),
 *   the associated sharer ID is returned.
 *
 * Note: In our new RLS policies the executor check is handled inline; this helper is used only for client-side routing.
 *
 * @param userId The authenticated user ID.
 * @param supabase The Supabase client instance.
 * @returns The effective sharer ID or null if not found.
 */
export async function getEffectiveSharerId(userId: string, supabase: SupabaseClient): Promise<string | null> {
  // First, try to get a ProfileSharer record (direct SHARER role)
  const { data: sharer } = await supabase
    .from('ProfileSharer')
    .select('id')
    .eq('profileId', userId)
    .single();

  if (sharer) {
    return sharer.id;
  }

  // Otherwise, try to get an executor relationship which gives a sharerId.
  // (RLS now handles executor access explicitly, so this helper is used for UI routing only.)
  const { data: executor } = await supabase
    .from('ProfileExecutor')
    .select('sharerId')
    .eq('executorId', userId)
    .single();

  return executor?.sharerId || null;
}

/**
 * Checks if the user has a SHARER profile (i.e. a record in ProfileSharer).
 *
 * @param userId The authenticated user ID.
 * @param supabase The Supabase client instance.
 * @returns True if the user has a ProfileSharer record, false otherwise.
 */
export async function hasSharerProfile(userId: string, supabase: SupabaseClient): Promise<boolean> {
  const { data: sharer } = await supabase
    .from('ProfileSharer')
    .select('id')
    .eq('profileId', userId)
    .single();
  
  return !!sharer;
}

/**
 * Checks if the user has an EXECUTOR relationship (i.e. a record in ProfileExecutor).
 *
 * Note: While the new RLS policies embed executor checks inline, this helper is still useful for client-side decisions.
 *
 * @param userId The authenticated user ID.
 * @param supabase The Supabase client instance.
 * @returns True if the user has a ProfileExecutor relationship, false otherwise.
 */
export async function hasExecutorRelationship(userId: string, supabase: SupabaseClient): Promise<boolean> {
  const { data: executor } = await supabase
    .from('ProfileExecutor')
    .select('id')
    .eq('executorId', userId)
    .single();
  
  return !!executor;
}

/**
 * Determines the appropriate role route for the user.
 *
 * Based on the updated approach:
 * - If the user has a SHARER profile, they should be routed to `/role-sharer`.
 * - If they don't have a SHARER profile but have an EXECUTOR relationship,
 *   they should be routed to `/role-executor`.
 *
 * Remember: With the new RLS policies, the executor check is done inline in SQL, and these
 * helper functions are used solely for client-side routing decisions.
 *
 * @param userId The authenticated user ID.
 * @param supabase The Supabase client instance.
 * @returns The appropriate role route ('/role-sharer' or '/role-executor') or null if neither applies.
 */
export async function getAppropriateRoleRoute(userId: string, supabase: SupabaseClient): Promise<string | null> {
  try {
    // Check if the user has a sharer profile.
    const isSharer = await hasSharerProfile(userId, supabase);
    if (isSharer) {
      return '/role-sharer';
    }
    
    // Otherwise, if they have an executor relationship, route accordingly.
    const isExecutor = await hasExecutorRelationship(userId, supabase);
    if (isExecutor) {
      return '/role-executor';
    }
    
    return null;
  } catch (error) {
    console.error('Error determining appropriate role route:', error);
    // Return a fallback route or error indication
    return '/error/role-determination';
  }
}