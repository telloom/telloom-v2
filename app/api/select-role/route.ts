// app/api/select-role/route.ts
// This component handles the API route for selecting a user role

import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/utils/supabase/route-handler';
import { createAdminClient } from '@/utils/supabase/admin';
import { UUID } from 'crypto';
import { setCookie } from '@/utils/next-cookies-helper';
import { z } from 'zod';

// Define role type for better type checking
export type UserRole = 'LISTENER' | 'SHARER' | 'EXECUTOR' | 'ADMIN';

const roleSchema = z.object({
  role: z.enum(['LISTENER', 'SHARER', 'EXECUTOR', 'ADMIN']),
});

// Make sure all route handlers use dynamic execution
export const dynamic = 'force-dynamic';

/**
 * POST handler for setting the active role
 * First tries to use JWT claims before falling back to DB queries
 */
export async function POST(request: Request) {
  try {
    const supabase = await createRouteHandlerClient();
    const adminClient = await createAdminClient();

    // Get the authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('[API] Auth error:', authError);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const parseResult = roleSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.errors[0].message },
        { status: 400 }
      );
    }

    const { role } = parseResult.data;
    
    // First try to get roles directly from JWT claims
    const rolesFromJWT = Array.isArray(user?.app_metadata?.roles) ? user.app_metadata.roles : [];
    
    let userRoles: UserRole[] = [];
    
    // If JWT has role data, use it directly (faster)
    if (rolesFromJWT.length > 0) {
      userRoles = rolesFromJWT;
      console.log('[API] Using roles from JWT claims:', userRoles);
    } else {
      // Fallback to RPC function if JWT doesn't have roles
      console.log('[API] JWT missing roles, falling back to DB query');
      
      // Use RPC function to get role information
      const { data: roleInfo, error: roleError } = await adminClient.rpc(
        'get_user_role_emergency',
        { user_id: user.id }
      );

      if (roleError) {
        console.error('[API] Error getting role info:', roleError);
        return NextResponse.json({ error: 'Failed to verify role access' }, { status: 500 });
      }

      userRoles = roleInfo?.roles || [];
    }

    // Check if user has access to the requested role
    const hasRole = userRoles.includes(role as UserRole);
    
    if (!hasRole) {
      console.error('[API] User does not have the requested role:', { 
        userId: user.id.substring(0, 8), 
        requestedRole: role, 
        availableRoles: userRoles 
      });
      return NextResponse.json(
        { error: 'You do not have access to this role' },
        { status: 403 }
      );
    }

    // Update user metadata with the active role - this will be included in the JWT
    // for future requests, making role checks more efficient
    await supabase.auth.updateUser({
      data: { activeRole: role }
    });

    // Also set a cookie for non-authenticated contexts and to ensure consistent state
    console.log(`[API] Setting activeRole cookie to ${role}`);
    
    try {
      await setCookie('activeRole', role, {
        path: '/',
        maxAge: 60 * 60 * 24 * 30, // 30 days
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production'
      });
      console.log(`[API] Successfully set activeRole cookie`);
    } catch (cookieError) {
      console.error('[API] Error setting activeRole cookie:', cookieError);
      // Continue anyway as we've also set the role in user metadata
    }

    // Determine the appropriate redirect URL based on the role
    let redirectUrl = `/role-${role.toLowerCase()}`;

    // For EXECUTOR role, check if user has any executor relationships
    if (role === 'EXECUTOR') {
      try {
        // First try a fast RPC function that uses JWT claims
        const { data: jwtRoleData, error: jwtError } = await supabase.rpc('get_user_role_data');
        
        if (!jwtError && jwtRoleData?.executorRelationships) {
          // Use JWT data if available
          const hasRelationships = jwtRoleData.executorRelationships.length > 0;
          console.log('[API] Using JWT data for executor relationships:', { 
            hasRelationships,
            count: jwtRoleData.executorRelationships.length
          });
          
          if (!hasRelationships) {
            return NextResponse.json(
              { error: 'You do not have any executor relationships' },
              { status: 403 }
            );
          }
          
          // If we have a single relationship, redirect directly to it
          if (jwtRoleData.executorRelationships.length === 1) {
            const relationship = jwtRoleData.executorRelationships[0];
            redirectUrl = `/role-executor/${relationship.sharerId}`;
          }
        } else {
          // Fallback to admin RPC function
          console.log('[API] JWT data unavailable, using admin RPC for executor relationships');
          const { data: executorInfo, error: executorError } = await adminClient.rpc(
            'get_executor_for_user',
            { user_id: user.id }
          );

          if (executorError) {
            console.error('[API] Error getting executor info:', executorError);
            return NextResponse.json({ error: 'Failed to verify executor status' }, { status: 500 });
          }

          if (!executorInfo?.has_executor_relationship) {
            console.error('[API] User has EXECUTOR role but no executor relationship:', {
              userId: user.id.substring(0, 8)
            });
            return NextResponse.json(
              { error: 'You do not have an executor relationship' },
              { status: 403 }
            );
          }
          
          // If we have a single relationship, redirect directly to it
          if (executorInfo.relationships?.length === 1) {
            redirectUrl = `/role-executor/${executorInfo.relationships[0].sharerId}`;
          }
        }
      } catch (error) {
        console.error('[API] Error checking executor relationships:', error);
        // Continue with default redirectUrl
      }
    }

    return NextResponse.json({ 
      success: true, 
      redirectUrl
    });
  } catch (error) {
    console.error('[API] Error in select-role route:', error);
    return NextResponse.json({ error: 'Failed to set role' }, { status: 500 });
  }
}

/**
 * GET handler for retrieving available roles
 * First tries to use JWT claims before falling back to DB queries
 */
export async function GET(request: NextRequest) {
  try {
    console.log('[API_SELECT_ROLE] GET request received');
    
    // Create Supabase client with proper authentication
    console.log('[API_SELECT_ROLE] Creating Supabase client');
    const supabase = await createRouteHandlerClient();
    
    console.log('[API_SELECT_ROLE] Getting user auth data');
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error('[API_SELECT_ROLE] Auth error:', authError);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    console.log('[API_SELECT_ROLE] Authenticated user:', user.id);

    let roles: UserRole[] = [];
    let activeRole: UserRole | null = null;
    
    // Try to get roles from JWT first (most efficient)
    const rolesFromJWT = Array.isArray(user?.app_metadata?.roles) ? user.app_metadata.roles : [];
    
    if (rolesFromJWT.length > 0) {
      // We have roles in the JWT, use them directly
      roles = rolesFromJWT;
      activeRole = user?.user_metadata?.activeRole || null;
      console.log('[API] Using roles from JWT:', roles);
    } else {
      // Fallback to RPC function
      console.log('[API] JWT missing roles, falling back to RPC');
      
      // Try JWT-based RPC first (uses auth.jwt())
      const { data: jwtRoleData, error: jwtError } = await supabase.rpc('get_user_role_data');
      
      if (!jwtError && jwtRoleData?.roles) {
        // We got roles from the JWT-based RPC
        roles = jwtRoleData.roles;
        activeRole = jwtRoleData.activeRole || null;
        console.log('[API] Using roles from get_user_role_data RPC:', roles);
      } else {
        // Final fallback to admin RPC (most expensive, but most reliable)
        console.log('[API] JWT RPC failed, using admin client as final fallback');
        const adminClient = await createAdminClient();
        
        const { data: roleInfo, error: roleError } = await adminClient.rpc(
          'get_user_role_emergency',
          { user_id: user.id }
        );

        if (roleError) {
          console.error('[API] Error getting role info from admin RPC:', roleError);
          return NextResponse.json({ error: 'Failed to fetch roles' }, { status: 500 });
        }

        roles = roleInfo?.roles || [];
        console.log('[API] Using roles from admin RPC:', roles);
      }
    }
    
    // If no active role in JWT, try cookie as fallback
    if (!activeRole) {
      activeRole = request.cookies.get('activeRole')?.value as UserRole || null;
    }

    return NextResponse.json({ 
      roles,
      activeRole
    });
  } catch (error) {
    console.error('[API] Error in get role route:', error);
    return NextResponse.json({ error: 'Failed to fetch roles' }, { status: 500 });
  }
}