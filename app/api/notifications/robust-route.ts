import { createRouteHandlerClient } from '@/utils/supabase/route-handler';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';

/**
 * Enhanced notifications API with robustness against RLS recursion
 * This route handles fetching notifications with improved error handling
 * and multiple fallback mechanisms for dealing with potential RLS issues
 */
export async function GET(req: NextRequest) {
  try {
    // Create the Supabase client
    const supabase = await createRouteHandlerClient();
    
    // Ensure the user is authenticated
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Parse query parameters
    const url = new URL(req.url);
    const countOnly = url.searchParams.get('countOnly') === 'true';
    const limit = parseInt(url.searchParams.get('limit') || '10', 10);
    
    console.log('[Notifications API] Fetching notifications for user:', user.id);
    console.log('[Notifications API] Parameters:', { countOnly, limit });
    
    // Determine the sharerId through multiple methods with fallback mechanisms
    let sharerId: string | null = null;
    let fallbackUsed = false;
    
    // --------- STEP 1: Try getting roles from ProfileRole ----------
    try {
      const { data: roles, error: rolesError } = await supabase
        .from('ProfileRole')
        .select('role');
      
      if (rolesError) {
        console.error('[Notifications API] Error fetching roles:', rolesError);
      } else {
        console.log('[Notifications API] User roles:', roles?.map(r => r.role));
      }
    } catch (error) {
      console.error('[Notifications API] Exception fetching roles:', error);
    }
    
    // --------- STEP 2: Try getting sharerId from ProfileSharer ----------
    try {
      const { data: sharer, error: sharerError } = await supabase
        .from('ProfileSharer')
        .select('id')
        .single();
      
      if (!sharerError && sharer) {
        sharerId = sharer.id;
        console.log('[Notifications API] Found user\'s sharerId:', sharerId);
      } else if (sharerError && !sharerError.message.includes('No rows found')) {
        console.error('[Notifications API] Error fetching sharer profile:', sharerError);
      }
    } catch (error) {
      console.error('[Notifications API] Exception fetching sharer profile:', error);
    }
    
    // --------- STEP 3: If not found, try getting executor relationship ----------
    if (!sharerId) {
      try {
        const { data: executorRelationships, error: executorError } = await supabase.rpc(
          'get_executor_for_user',
          { user_id: user.id }
        );
        
        if (!executorError && executorRelationships && executorRelationships.length > 0) {
          sharerId = executorRelationships[0].sharerId;
          console.log('[Notifications API] Found executor relationship, using sharerId:', sharerId);
        } else if (executorError) {
          console.error('[Notifications API] Error fetching executor relationships:', executorError);
        }
      } catch (error) {
        console.error('[Notifications API] Exception fetching executor relationships:', error);
      }
    }
    
    // --------- STEP 4: If still not found, use admin client as last resort ----------
    if (!sharerId) {
      try {
        console.log('[Notifications API] Using admin client as fallback');
        const adminClient = createAdminClient();
        
        // Try to find sharer profile first
        const { data: adminSharer } = await adminClient
          .from('ProfileSharer')
          .select('id')
          .eq('profileId', user.id)
          .single();
        
        if (adminSharer) {
          sharerId = adminSharer.id;
          fallbackUsed = true;
          console.log('[Notifications API] Found sharerId via admin client:', sharerId);
        } else {
          // Try to find executor relationship
          const { data: adminExecutor } = await adminClient
            .from('ProfileExecutor')
            .select('sharerId')
            .eq('executorId', user.id)
            .limit(1);
          
          if (adminExecutor && adminExecutor.length > 0) {
            sharerId = adminExecutor[0].sharerId;
            fallbackUsed = true;
            console.log('[Notifications API] Found executor relationship via admin client, using sharerId:', sharerId);
          }
        }
      } catch (error) {
        console.error('[Notifications API] Exception using admin client:', error);
      }
    }
    
    // --------- STEP 5: Build and execute the notification query ----------
    let query = supabase
      .from('Notification')
      .select(countOnly ? 'id' : '*')
      .eq('read', false);
    
    // Add filters based on what we found
    if (sharerId) {
      // This means the user is either a SHARER or an EXECUTOR
      console.log('[Notifications API] Querying notifications for sharerId:', sharerId);
      query = query.eq('sharerId', sharerId);
    } else {
      // Default to user's own notifications if we couldn't determine a sharerId
      console.log('[Notifications API] Falling back to user-specific notifications');
      query = query.eq('userId', user.id);
    }
    
    // Execute the query differently based on what we're returning
    let result;
    if (countOnly) {
      const { data, error, count } = await query.count();
      
      if (error) {
        console.error('[Notifications API] Error counting notifications:', error);
        return NextResponse.json(
          { error: 'Failed to count notifications', details: error.message },
          { status: 500 }
        );
      }
      
      result = { count, fallbackUsed };
    } else {
      const { data, error } = await query
        .order('createdAt', { ascending: false })
        .limit(limit);
      
      if (error) {
        console.error('[Notifications API] Error fetching notifications:', error);
        return NextResponse.json(
          { error: 'Failed to fetch notifications', details: error.message },
          { status: 500 }
        );
      }
      
      result = { notifications: data, fallbackUsed };
    }
    
    console.log('[Notifications API] Successfully retrieved notifications');
    return NextResponse.json(result);
  } catch (error) {
    console.error('[Notifications API] Unhandled exception:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    );
  }
} 