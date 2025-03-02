/**
 * File: app/api/invitations/accept/route.ts
 * Description: API route for accepting invitations, supporting both authenticated and unauthenticated users
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { z } from 'zod';
import crypto from 'crypto';

// Validation schema for the request body
const acceptInvitationSchema = z.object({
  invitationId: z.string().uuid(),
  token: z.string()
});

export async function POST(request: Request) {
  try {
    console.log('Received invitation acceptance request');
    
    // Parse and validate the request body
    const body = await request.json();
    console.log('Request body:', body);
    
    const validationResult = acceptInvitationSchema.safeParse(body);
    if (!validationResult.success) {
      console.log('Validation error:', validationResult.error.errors);
      return NextResponse.json({ error: 'Invalid request data', details: validationResult.error.errors }, { status: 400 });
    }
    
    const { invitationId, token } = validationResult.data;
    
    // Track if the invitation was successfully accepted
    let invitationAccepted = false;
    
    // Create Supabase clients
    const supabase = createClient();
    const adminSupabase = createAdminClient();
    
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError) {
      console.log('Error getting user:', userError);
      return NextResponse.json({ 
        error: 'Authentication error', 
        details: userError.message,
        code: 'AUTH_ERROR'
      }, { status: 401 });
    }
    
    if (!user) {
      console.log('User not authenticated');
      return NextResponse.json({ 
        error: 'Authentication required', 
        code: 'AUTH_REQUIRED'
      }, { status: 401 });
    }
    
    console.log('Authenticated user:', user.email);
    
    // Find the invitation using admin client to bypass RLS with direct SQL
    // First create a function to find invitation by ID
    const { data: invitationResult, error: invitationError } = await adminSupabase
      .rpc('find_invitation_by_id', { invitation_id: invitationId, invitation_token: token });
      
    if (invitationError || !invitationResult?.invitation) {
      console.log('Invitation not found:', invitationError || 'No invitation found with this ID and token');
      return NextResponse.json({ 
        error: 'Invitation not found',
        code: 'INVITATION_NOT_FOUND'
      }, { status: 404 });
    }
    
    const invitation = invitationResult.invitation;
    console.log('Found invitation:', invitation);
    
    // Check if invitation is still valid
    if (invitation.status !== 'PENDING') {
      console.log('Invalid invitation status:', invitation.status);
      return NextResponse.json({ 
        error: `Invitation is ${invitation.status.toLowerCase()}`,
        code: `INVITATION_${invitation.status}`
      }, { status: 400 });
    }
    
    // Check if the user's email matches the invitee email
    if (user.email?.toLowerCase() !== invitation.inviteeEmail.toLowerCase()) {
      console.log('Email mismatch:', { userEmail: user.email, inviteeEmail: invitation.inviteeEmail });
      return NextResponse.json({ 
        error: 'This invitation was sent to a different email address',
        code: 'EMAIL_MISMATCH',
        inviteeEmail: invitation.inviteeEmail
      }, { status: 403 });
    }
    
    // Get or create profile for the user
    const { data: existingProfile } = await adminSupabase
      .from('Profile')
      .select('id, firstName, lastName')
      .eq('userId', user.id)
      .single();
      
    let profileId = existingProfile?.id;
    let firstName = existingProfile?.firstName || user.user_metadata.firstName || '';
    let lastName = existingProfile?.lastName || user.user_metadata.lastName || '';
    
    if (!profileId) {
      // Create a new profile
      const { data: newProfile, error: profileError } = await adminSupabase
        .from('Profile')
        .insert({
          userId: user.id,
          email: user.email,
          firstName: firstName,
          lastName: lastName,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        })
        .select('id')
        .single();
        
      if (profileError || !newProfile) {
        console.log('Error creating profile:', profileError);
        return NextResponse.json({ 
          error: 'Failed to create user profile',
          code: 'PROFILE_CREATION_ERROR'
        }, { status: 500 });
      }
      
      profileId = newProfile.id;
    }
    
    // Check if relationship already exists
    if (invitation.role === 'LISTENER') {
      const { data: existingListener } = await adminSupabase
        .from('ProfileListener')
        .select('id')
        .eq('profileId', profileId)
        .eq('sharerId', invitation.sharerId)
        .maybeSingle();
        
      if (existingListener) {
        console.log('Listener relationship already exists');
        
        // Update invitation status even if relationship exists
        const now = new Date().toISOString();
        await adminSupabase
          .from('Invitation')
          .update({
            status: 'ACCEPTED',
            acceptedAt: now,
            updatedAt: now
          })
          .eq('id', invitationId);
          
        return NextResponse.json({ 
          success: true, 
          message: 'You are already a listener for this sharer',
          role: invitation.role,
          code: 'ALREADY_CONNECTED'
        });
      }
    } else if (invitation.role === 'EXECUTOR') {
      // Check if the ProfileExecutor relationship already exists
      const { data: existingExecutor, error: existingExecutorError } = await adminSupabase
        .from('ProfileExecutor')
        .select('id')
        .eq('executorId', profileId)
        .eq('sharerId', invitation.sharerId)
        .single();
        
      if (existingExecutor) {
        console.log('[AcceptInvitation] Executor relationship already exists:', existingExecutor);
        invitationAccepted = true;
      } else {
        // Create ProfileExecutor relationship
        const now = new Date().toISOString();
        console.log('[AcceptInvitation] Creating ProfileExecutor with data:', {
          executorId: profileId,
          sharerId: invitation.sharerId,
          createdAt: now,
          updatedAt: now
        });
        
        // First, verify the sharerId exists in ProfileSharer
        const { data: sharerData, error: sharerError } = await adminSupabase
          .from('ProfileSharer')
          .select('id, profileId')
          .eq('id', invitation.sharerId)
          .single();
          
        if (sharerError) {
          console.log('[AcceptInvitation] Error verifying sharer:', sharerError);
          throw new Error('Failed to verify sharer');
        }
        
        console.log('[AcceptInvitation] Verified sharer exists:', sharerData);
        
        // Use RPC to bypass RLS completely
        const { data: newExecutor, error: executorError } = await adminSupabase
          .rpc('create_profile_executor', {
            p_executor_id: profileId,
            p_sharer_id: invitation.sharerId
          });
          
        if (executorError) {
          console.log('[AcceptInvitation] Error creating executor relationship via RPC:', executorError);
          console.log('[AcceptInvitation] Error details:', JSON.stringify(executorError, null, 2));
          
          // Fallback to direct insert with admin client
          console.log('[AcceptInvitation] Attempting direct insert with admin client as fallback');
          const { data: directInsertExecutor, error: directInsertError } = await adminSupabase
            .from('ProfileExecutor')
            .insert({
              executorId: profileId,
              sharerId: invitation.sharerId,
              createdAt: now,
              updatedAt: now
            })
            .select('id')
            .single();
            
          if (directInsertError) {
            console.log('[AcceptInvitation] Error with direct insert fallback:', directInsertError);
            console.log('[AcceptInvitation] Error details:', JSON.stringify(directInsertError, null, 2));
            // Continue with signup even if relationship creation fails
            console.log('[AcceptInvitation] Continuing with signup despite executor relationship creation failure');
          } else {
            console.log('[AcceptInvitation] Executor relationship created successfully via direct insert:', directInsertExecutor);
            invitationAccepted = true;
          }
        } else {
          console.log('[AcceptInvitation] Executor relationship created successfully via RPC:', newExecutor);
          invitationAccepted = true;
        }
        
        // ADDED: Also create a LISTENER role and ProfileListener record for the executor
        console.log('[AcceptInvitation] Also creating LISTENER role for executor');
        
        // Check if the ProfileListener relationship already exists
        const { data: existingListener, error: existingListenerError } = await adminSupabase
          .from('ProfileListener')
          .select('id')
          .eq('listenerId', profileId)
          .eq('sharerId', invitation.sharerId)
          .single();
          
        if (existingListener) {
          console.log('[AcceptInvitation] Listener relationship already exists for executor:', existingListener);
        } else {
          // Try to create the ProfileListener relationship
          try {
            // First try RPC if available
            console.log('[AcceptInvitation] Attempting to create ProfileListener for executor with RPC');
            const { data: newListener, error: listenerError } = await adminSupabase
              .rpc('create_profile_listener', {
                p_listener_id: profileId,
                p_sharer_id: invitation.sharerId,
                p_shared_since: now,
                p_has_access: true
              });
              
            if (listenerError) {
              console.log('[AcceptInvitation] Error creating listener relationship for executor via RPC:', listenerError);
              console.log('[AcceptInvitation] Error details:', JSON.stringify(listenerError, null, 2));
              throw listenerError;
            } else {
              console.log('[AcceptInvitation] Successfully created listener relationship for executor via RPC:', newListener);
            }
          } catch (rpcError) {
            // Fallback to direct insert with admin client
            console.log('[AcceptInvitation] Attempting direct insert of listener relationship for executor with admin client as fallback');
            
            // Create the ProfileListener record with direct insert
            const listenerData = {
              listenerId: profileId,
              sharerId: invitation.sharerId,
              sharedSince: now,
              hasAccess: true,
              notifications: true,
              createdAt: now,
              updatedAt: now
            };
            
            console.log('[AcceptInvitation] Creating ProfileListener for executor with data:', listenerData);
            
            const { data: directInsertListener, error: directInsertError } = await adminSupabase
              .from('ProfileListener')
              .insert(listenerData)
              .select('id')
              .single();
              
            if (directInsertError) {
              console.log('[AcceptInvitation] Error with direct insert of listener for executor:', directInsertError);
              console.log('[AcceptInvitation] Error details:', JSON.stringify(directInsertError, null, 2));
              console.log('[AcceptInvitation] Continuing despite listener relationship creation failure for executor');
            } else {
              console.log('[AcceptInvitation] Successfully created listener relationship for executor via direct insert:', directInsertListener);
            }
          }
          
          // Add LISTENER role for the executor
          const { data: existingListenerRole, error: existingListenerRoleError } = await adminSupabase
            .from('ProfileRole')
            .select('id, role')
            .eq('profileId', profileId)
            .eq('role', 'LISTENER')
            .single();
            
            if (existingListenerRole) {
              console.log('[AcceptInvitation] Listener role already exists for executor:', existingListenerRole);
            } else {
              const now = new Date().toISOString();
              const listenerRoleId = crypto.randomUUID();
              console.log('[AcceptInvitation] Generated UUID for listener role:', listenerRoleId);
              
              const { data: newListenerRole, error: listenerRoleError } = await adminSupabase
                .from('ProfileRole')
                .insert({
                  id: listenerRoleId, // Explicitly provide UUID
                  profileId: profileId,
                  role: 'LISTENER',
                  createdAt: now,
                  updatedAt: now
                })
                .select('id, role')
                .single();
                
              if (listenerRoleError) {
                console.log('[AcceptInvitation] Error creating listener role for executor:', listenerRoleError);
                console.log('[AcceptInvitation] Error details:', JSON.stringify(listenerRoleError, null, 2));
                
                // Log the ProfileRole schema if there's an error
                console.log('[AcceptInvitation] Checking ProfileRole schema');
                const { data: profileRoleSchema, error: schemaError } = await adminSupabase
                  .from('_metadata')
                  .select('*')
                  .eq('table', 'ProfileRole')
                  .single();
                  
                if (schemaError) {
                  console.log('[AcceptInvitation] Error fetching ProfileRole schema:', schemaError);
                } else {
                  console.log('[AcceptInvitation] ProfileRole schema:', profileRoleSchema);
                }
              } else {
                console.log('[AcceptInvitation] Successfully created listener role for executor:', newListenerRole);
              }
            }
        }
      }
    }
    
    // Add EXECUTOR role if it doesn't exist
    const { data: existingExecutorRole, error: existingExecutorRoleError } = await adminSupabase
      .from('ProfileRole')
      .select('id, role')
      .eq('profileId', profileId)
      .eq('role', 'EXECUTOR')
      .single();
      
    if (existingExecutorRole) {
      console.log('[AcceptInvitation] Executor role already exists:', existingExecutorRole);
    } else {
      const now = new Date().toISOString();
      const executorRoleId = crypto.randomUUID();
      console.log('[AcceptInvitation] Generated UUID for executor role:', executorRoleId);
      
      const { data: newExecutorRole, error: executorRoleError } = await adminSupabase
        .from('ProfileRole')
        .insert({
          id: executorRoleId, // Explicitly provide UUID
          profileId: profileId,
          role: 'EXECUTOR',
          createdAt: now,
          updatedAt: now
        })
        .select('id, role')
        .single();
        
      if (executorRoleError) {
        console.log('[AcceptInvitation] Error creating executor role:', executorRoleError);
        console.log('[AcceptInvitation] Error details:', JSON.stringify(executorRoleError, null, 2));
      } else {
        console.log('[AcceptInvitation] Executor role created successfully:', newExecutorRole);
      }
    }
    
    // Update invitation status
    const now = new Date().toISOString();
    console.log('Updating invitation status to ACCEPTED for invitation ID:', invitationId);
    
    try {
      // First try using the RPC function
      console.log('Attempting to update invitation status with RPC');
      const { data: updatedInvitation, error: updateError } = await adminSupabase
        .rpc('update_invitation_status', {
          p_invitation_id: invitationId,
          p_status: 'ACCEPTED',
          p_accepted_at: now
        });
        
      if (updateError) {
        console.log('Error updating invitation status via RPC:', updateError);
        console.log('Error details:', JSON.stringify(updateError, null, 2));
        // Continue with the process even if invitation status update fails
        console.log('Continuing with invitation acceptance despite status update failure');
      } else {
        console.log('Successfully updated invitation status via RPC:', updatedInvitation);
      }
    } catch (rpcError) {
      // Fallback to direct update with admin client
      console.log('Falling back to direct update with admin client');
      const { data: updatedInvitation, error: updateError } = await adminSupabase
        .from('Invitation')
        .update({
          status: 'ACCEPTED',
          acceptedAt: now,
          updatedAt: now
        })
        .eq('id', invitationId)
        .select('id, status')
        .single();
        
      if (updateError) {
        console.log('Error updating invitation status:', updateError);
        console.log('Error details:', JSON.stringify(updateError, null, 2));
        // Continue with the process even if invitation status update fails
        console.log('Continuing with invitation acceptance despite status update failure');
      } else {
        console.log('Successfully updated invitation status:', updatedInvitation);
      }
    }
    
    // Create notification for the sharer
    try {
      // Get sharer profile info
      const { data: sharerData } = await adminSupabase
        .from('ProfileSharer')
        .select(`
          profileId,
          Profile (
            firstName,
            lastName
          )
        `)
        .eq('id', invitation.sharerId)
        .single();
        
      if (sharerData) {
        // Create notification
        await adminSupabase
          .from('Notification')
          .insert({
            profileId: sharerData.profileId,
            type: 'INVITATION_ACCEPTED',
            title: 'Invitation Accepted',
            message: `${firstName || user.email} has accepted your invitation to be a ${invitation.role.toLowerCase()}.`,
            read: false,
            createdAt: now,
            updatedAt: now,
            metadata: {
              invitationId: invitation.id,
              inviteeEmail: invitation.inviteeEmail,
              role: invitation.role
            }
          });
      }
    } catch (error) {
      // Don't fail the whole request if notification creation fails
      console.log('Error creating notification:', error);
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'Invitation accepted successfully',
      role: invitation.role,
      code: 'SUCCESS'
    });
  } catch (error) {
    console.error('Error accepting invitation:', error);
    return NextResponse.json({ 
      error: 'An unexpected error occurred',
      code: 'UNKNOWN_ERROR'
    }, { status: 500 });
  }
} 