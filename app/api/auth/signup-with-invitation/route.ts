/**
 * File: app/api/auth/signup-with-invitation/route.ts
 * Description: API endpoint for signing up with an invitation and automatically accepting it
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { z } from 'zod';
import crypto from 'crypto';

// Validation schema
const signupSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
  phone: z.string().min(10, 'Phone number must be at least 10 digits'),
  invitationToken: z.string().optional()
});

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const data = {
      email: formData.get('email') as string,
      password: formData.get('password') as string,
      firstName: formData.get('firstName') as string,
      lastName: formData.get('lastName') as string,
      phone: formData.get('phone') as string,
      invitationToken: formData.get('invitationToken') as string || undefined
    };

    console.log('[Signup] Processing signup with invitation:', { 
      email: data.email, 
      hasToken: !!data.invitationToken 
    });

    // Validate the form data
    const validationResult = signupSchema.safeParse(data);
    if (!validationResult.success) {
      console.log('[Signup] Validation error:', validationResult.error.errors);
      return NextResponse.json(
        { error: 'Invalid form data', details: validationResult.error.errors },
        { status: 400 }
      );
    }

    // Create Supabase clients
    const supabase = createClient();
    const adminSupabase = createAdminClient();

    // Find invitation if token is provided
    let invitation = null;
    if (data.invitationToken) {
      console.log('[Signup] Finding invitation with token:', data.invitationToken);
      
      const { data: invitationData, error: invitationError } = await adminSupabase
        .rpc('find_invitation_by_token', { token_value: data.invitationToken });
        
      if (invitationError) {
        console.log('[Signup] Error finding invitation:', invitationError);
      } else if (invitationData?.invitation) {
        invitation = invitationData.invitation;
        console.log('[Signup] Found invitation:', invitation);
        
        // Check if the invitation email matches the signup email
        if (invitation.inviteeEmail.toLowerCase() !== data.email.toLowerCase()) {
          return NextResponse.json(
            { 
              error: 'The email address does not match the invitation', 
              code: 'EMAIL_MISMATCH',
              inviteeEmail: invitation.inviteeEmail
            },
            { status: 400 }
          );
        }
        
        // Check if invitation is still valid
        if (invitation.status !== 'PENDING') {
          return NextResponse.json(
            { 
              error: `Invitation is ${invitation.status.toLowerCase()}`,
              code: `INVITATION_${invitation.status}`
            },
            { status: 400 }
          );
        }
      }
    }

    // Sign up the user with Supabase Auth
    console.log('[Signup] Creating user with email:', data.email);
    
    // Create a fully qualified URL for the email confirmation redirect
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const redirectUrl = `${baseUrl}/api/auth/confirm?next=/select-role`;
    
    console.log('[Signup] Using email redirect URL:', redirectUrl);
    
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: {
          firstName: data.firstName,
          lastName: data.lastName,
          phone: data.phone,
          fullName: `${data.firstName} ${data.lastName}`
        },
        emailRedirectTo: redirectUrl
      }
    });

    if (authError) {
      console.log('[Signup] Auth error:', authError);
      return NextResponse.json(
        { error: authError.message },
        { status: authError.status || 400 }
      );
    }

    if (!authData.user) {
      console.log('[Signup] No user returned from auth');
      return NextResponse.json(
        { error: 'Failed to create user' },
        { status: 500 }
      );
    }

    console.log('[Signup] User created successfully:', authData.user.id);

    // Check if a profile already exists for this user
    const { data: existingProfile, error: existingProfileError } = await adminSupabase
      .from('Profile')
      .select('id')
      .eq('id', authData.user.id)
      .single();

    let profileData;
    
    if (existingProfile) {
      console.log('[Signup] Profile already exists:', existingProfile.id);
      profileData = existingProfile;
    } else {
      // Create a profile for the user
      const { data: newProfileData, error: profileError } = await adminSupabase
        .from('Profile')
        .insert({
          id: authData.user.id,
          email: data.email,
          firstName: data.firstName,
          lastName: data.lastName,
          fullName: `${data.firstName} ${data.lastName}`,
          phone: data.phone,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        })
        .select('id')
        .single();

      if (profileError) {
        console.log('[Signup] Profile creation error:', profileError);
        return NextResponse.json(
          { error: 'Failed to create user profile', details: profileError.message },
          { status: 500 }
        );
      }
      
      console.log('[Signup] Profile created successfully:', newProfileData.id);
      profileData = newProfileData;
    }

    // Create a ProfileRole entry for the user
    const role = invitation?.role || 'LISTENER'; // Default to LISTENER if no invitation
    
    // Check if a ProfileRole already exists for this user
    const { data: existingRole, error: existingRoleError } = await adminSupabase
      .from('ProfileRole')
      .select('id, role')
      .eq('profileId', profileData.id)
      .eq('role', role)
      .single();
      
    if (existingRole) {
      console.log('[Signup] ProfileRole already exists:', existingRole);
    } else {
      const roleId = crypto.randomUUID();
      console.log('[Signup] Generated UUID for role:', roleId);
      
      const { data: newRole, error: roleError } = await adminSupabase
        .from('ProfileRole')
        .insert({
          id: roleId, // Use a generated UUID
          profileId: profileData.id,
          role: role,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        })
        .select('id, role')
        .single();

      if (roleError) {
        console.log('[Signup] Error creating profile role:', roleError);
        // Continue with signup even if role creation fails
      } else {
        console.log('[Signup] Profile role created successfully:', newRole);
      }
    }

    // Create a ProfileSharer entry if the user is signing up as a sharer (not through an invitation)
    if (!invitation) {
      const { error: sharerError } = await adminSupabase
        .from('ProfileSharer')
        .insert({
          profileId: profileData.id,
          subscriptionStatus: false, // Default to false until they subscribe
          createdAt: new Date().toISOString()
        });

      if (sharerError) {
        console.log('[Signup] Error creating profile sharer:', sharerError);
        // Continue with signup even if sharer creation fails
      } else {
        console.log('[Signup] Profile sharer created successfully');
      }
    }

    // If there's an invitation, accept it
    let invitationAccepted = false;
    if (invitation) {
      try {
        console.log('[Signup] Accepting invitation for new user');
        
        // Ensure we have an admin client for operations that require bypassing RLS
        if (!adminSupabase) {
          console.error('[Signup] Admin client not available for invitation acceptance');
          throw new Error('Admin client not available');
        }
        
        // Create the appropriate relationship based on the role
        if (invitation.role === 'LISTENER') {
          // Check if the ProfileListener relationship already exists
          const { data: existingListener, error: existingListenerError } = await adminSupabase
            .from('ProfileListener')
            .select('id')
            .eq('listenerId', profileData.id)
            .eq('sharerId', invitation.sharerId)
            .single();
            
          if (existingListener) {
            console.log('[Signup] Listener relationship already exists:', existingListener);
            invitationAccepted = true;
          } else {
            // Create ProfileListener relationship
            const now = new Date().toISOString();
            console.log('[Signup] Creating ProfileListener with data:', {
              listenerId: profileData.id,
              sharerId: invitation.sharerId,
              sharedSince: now,
              hasAccess: true,
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
              console.log('[Signup] Error verifying sharer:', sharerError);
              throw new Error('Failed to verify sharer');
            }
            
            console.log('[Signup] Verified sharer exists:', sharerData);
            
            // Try to create the ProfileListener relationship
            try {
              // First try RPC if available
              console.log('[Signup] Attempting to create ProfileListener with RPC');
              const { data: newListener, error: listenerError } = await adminSupabase
                .rpc('create_profile_listener', {
                  p_listener_id: profileData.id,
                  p_sharer_id: invitation.sharerId,
                  p_shared_since: now,
                  p_has_access: true
                });
                
              if (listenerError) {
                console.log('[Signup] Error creating listener relationship via RPC:', listenerError);
                console.log('[Signup] Error details:', JSON.stringify(listenerError, null, 2));
                throw listenerError;
              } else {
                invitationAccepted = true;
                console.log('[Signup] Successfully created listener relationship via RPC:', newListener);
              }
            } catch (rpcError) {
              // Fallback to direct insert with admin client
              console.log('[Signup] Attempting direct insert with admin client as fallback');
              
              // Create the ProfileListener record with direct insert
              const listenerData = {
                listenerId: profileData.id,
                sharerId: invitation.sharerId,
                sharedSince: now,
                hasAccess: true,
                notifications: true,
                createdAt: now,
                updatedAt: now
              };
              
              console.log('[Signup] Creating ProfileListener with data:', listenerData);
              
              const { data: directInsertListener, error: directInsertError } = await adminSupabase
                .from('ProfileListener')
                .insert(listenerData)
                .select('id')
                .single();
                
              if (directInsertError) {
                console.log('[Signup] Error with direct insert:', directInsertError);
                console.log('[Signup] Error details:', JSON.stringify(directInsertError, null, 2));
                // Continue with signup even if relationship creation fails
                console.log('[Signup] Continuing with signup despite listener relationship creation failure');
              } else {
                invitationAccepted = true;
                console.log('[Signup] Successfully created listener relationship via direct insert:', directInsertListener);
              }
            }
          }
        } else if (invitation.role === 'EXECUTOR') {
          // Check if the ProfileExecutor relationship already exists
          const { data: existingExecutor, error: existingExecutorError } = await adminSupabase
            .from('ProfileExecutor')
            .select('id')
            .eq('executorId', profileData.id)
            .eq('sharerId', invitation.sharerId)
            .single();
            
          if (existingExecutor) {
            console.log('[Signup] Executor relationship already exists:', existingExecutor);
            invitationAccepted = true;
          } else {
            // Create ProfileExecutor relationship
            const now = new Date().toISOString();
            console.log('[Signup] Creating ProfileExecutor with data:', {
              executorId: profileData.id,
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
              console.log('[Signup] Error verifying sharer:', sharerError);
              throw new Error('Failed to verify sharer');
            }
            
            console.log('[Signup] Verified sharer exists:', sharerData);
            
            // Use RPC to bypass RLS completely
            const { data: newExecutor, error: executorError } = await adminSupabase
              .rpc('create_profile_executor', {
                p_executor_id: profileData.id,
                p_sharer_id: invitation.sharerId
              });
              
            if (executorError) {
              console.log('[Signup] Error creating executor relationship via RPC:', executorError);
              console.log('[Signup] Error details:', JSON.stringify(executorError, null, 2));
              
              // Fallback to direct insert with admin client
              console.log('[Signup] Attempting direct insert with admin client as fallback');
              const { data: directInsertExecutor, error: directInsertError } = await adminSupabase
                .from('ProfileExecutor')
                .insert({
                  executorId: profileData.id,
                  sharerId: invitation.sharerId,
                  createdAt: now,
                  updatedAt: now
                })
                .select('id')
                .single();
                
              if (directInsertError) {
                console.log('[Signup] Error with direct insert fallback:', directInsertError);
                console.log('[Signup] Error details:', JSON.stringify(directInsertError, null, 2));
                // Continue with signup even if relationship creation fails
                console.log('[Signup] Continuing with signup despite executor relationship creation failure');
              } else {
                console.log('[Signup] Executor relationship created successfully via direct insert:', directInsertExecutor);
                invitationAccepted = true;
              }
            } else {
              console.log('[Signup] Executor relationship created successfully via RPC:', newExecutor);
              invitationAccepted = true;
            }
          }
          
          // ADDED: Also create a LISTENER role and ProfileListener record for the executor
          if (invitationAccepted && invitation.role === 'EXECUTOR') {
            console.log('[Signup] Also creating LISTENER role for executor');
            
            // Add EXECUTOR role for the user if it doesn't exist
            const { data: existingExecutorRole, error: existingExecutorRoleError } = await adminSupabase
              .from('ProfileRole')
              .select('id, role')
              .eq('profileId', profileData.id)
              .eq('role', 'EXECUTOR')
              .single();
              
            if (existingExecutorRole) {
              console.log('[Signup] Executor role already exists:', existingExecutorRole);
            } else {
              const now = new Date().toISOString();
              const { data: newExecutorRole, error: executorRoleError } = await adminSupabase
                .from('ProfileRole')
                .insert({
                  profileId: profileData.id,
                  role: 'EXECUTOR',
                  createdAt: now,
                  updatedAt: now
                })
                .select('id, role')
                .single();
                
              if (executorRoleError) {
                console.log('[Signup] Error creating executor role:', executorRoleError);
                console.log('[Signup] Error details:', JSON.stringify(executorRoleError, null, 2));
              } else {
                console.log('[Signup] Executor role created successfully:', newExecutorRole);
              }
            }
            
            // Check if the ProfileListener relationship already exists
            const { data: existingListener, error: existingListenerError } = await adminSupabase
              .from('ProfileListener')
              .select('id')
              .eq('listenerId', profileData.id)
              .eq('sharerId', invitation.sharerId)
              .single();
              
            if (existingListener) {
              console.log('[Signup] Listener relationship already exists for executor:', existingListener);
            } else {
              // Try to create the ProfileListener relationship
              try {
                // Define now here to avoid the reference error
                const now = new Date().toISOString();
                
                // First try RPC if available
                console.log('[Signup] Attempting to create ProfileListener for executor with RPC');
                const { data: newListener, error: listenerError } = await adminSupabase
                  .rpc('create_profile_listener', {
                    p_listener_id: profileData.id,
                    p_sharer_id: invitation.sharerId,
                    p_shared_since: now,
                    p_has_access: true
                  });
                  
                if (listenerError) {
                  console.log('[Signup] Error creating listener relationship for executor via RPC:', listenerError);
                  console.log('[Signup] Error details:', JSON.stringify(listenerError, null, 2));
                  throw listenerError;
                } else {
                  console.log('[Signup] Successfully created listener relationship for executor via RPC:', newListener);
                }
              } catch (rpcError) {
                // Fallback to direct insert with admin client
                console.log('[Signup] Attempting direct insert of listener relationship for executor with admin client as fallback');
                
                // Define now here to avoid the reference error
                const now = new Date().toISOString();
                
                // Create the ProfileListener record with direct insert
                const listenerData = {
                  listenerId: profileData.id,
                  sharerId: invitation.sharerId,
                  sharedSince: now,
                  hasAccess: true,
                  notifications: true,
                  createdAt: now,
                  updatedAt: now
                };
                
                console.log('[Signup] Creating ProfileListener for executor with data:', listenerData);
                
                const { data: directInsertListener, error: directInsertError } = await adminSupabase
                  .from('ProfileListener')
                  .insert(listenerData)
                  .select('id')
                  .single();
                  
                if (directInsertError) {
                  console.log('[Signup] Error with direct insert of listener for executor:', directInsertError);
                  console.log('[Signup] Error details:', JSON.stringify(directInsertError, null, 2));
                  console.log('[Signup] Continuing despite listener relationship creation failure for executor');
                } else {
                  console.log('[Signup] Successfully created listener relationship for executor via direct insert:', directInsertListener);
                }
              }
              
              // Add LISTENER role for the executor
              const { data: existingListenerRole, error: existingListenerRoleError } = await adminSupabase
                .from('ProfileRole')
                .select('id, role')
                .eq('profileId', profileData.id)
                .eq('role', 'LISTENER')
                .single();
                
              if (existingListenerRole) {
                console.log('[Signup] Listener role already exists for executor:', existingListenerRole);
              } else {
                const now = new Date().toISOString();
                
                // Log the ProfileRole schema
                console.log('[Signup] Checking ProfileRole schema');
                const { data: profileRoleSchema, error: schemaError } = await adminSupabase
                  .from('_metadata')
                  .select('*')
                  .eq('table', 'ProfileRole')
                  .single();
                  
                if (schemaError) {
                  console.log('[Signup] Error fetching ProfileRole schema:', schemaError);
                } else {
                  console.log('[Signup] ProfileRole schema:', profileRoleSchema);
                }
                
                // Generate UUID explicitly
                const roleId = crypto.randomUUID();
                console.log('[Signup] Generated UUID for listener role:', roleId);
                
                const { data: newListenerRole, error: listenerRoleError } = await adminSupabase
                  .from('ProfileRole')
                  .insert({
                    id: roleId, // Explicitly provide UUID
                    profileId: profileData.id,
                    role: 'LISTENER',
                    createdAt: now,
                    updatedAt: now
                  })
                  .select('id, role')
                  .single();
                  
                if (listenerRoleError) {
                  console.log('[Signup] Error creating listener role for executor:', listenerRoleError);
                  console.log('[Signup] Error details:', JSON.stringify(listenerRoleError, null, 2));
                } else {
                  console.log('[Signup] Listener role created successfully for executor:', newListenerRole);
                }
              }
            }
          }
        }
        
        // Update invitation status
        if (invitationAccepted) {
          const now = new Date().toISOString();
          console.log('[Signup] Updating invitation status to ACCEPTED for invitation ID:', invitation.id);
          
          try {
            // First try using the RPC function
            console.log('[Signup] Attempting to update invitation status with RPC');
            const { data: updatedInvitation, error: updateError } = await adminSupabase
              .rpc('update_invitation_status', {
                p_invitation_id: invitation.id,
                p_status: 'ACCEPTED',
                p_accepted_at: now
              });
              
            if (updateError) {
              console.log('[Signup] Error updating invitation status via RPC:', updateError);
              console.log('[Signup] Error details:', JSON.stringify(updateError, null, 2));
              throw updateError;
            } else {
              console.log('[Signup] Successfully updated invitation status via RPC:', updatedInvitation);
            }
          } catch (rpcError) {
            // Fallback to direct update with admin client
            console.log('[Signup] Falling back to direct update with admin client');
            const { data: updatedInvitation, error: updateError } = await adminSupabase
              .from('Invitation')
              .update({
                status: 'ACCEPTED',
                acceptedAt: now,
                updatedAt: now
              })
              .eq('id', invitation.id)
              .select('id, status')
              .single();
              
            if (updateError) {
              console.log('[Signup] Error updating invitation status:', updateError);
              console.log('[Signup] Error details:', JSON.stringify(updateError, null, 2));
              // Continue with signup even if invitation status update fails
              console.log('[Signup] Continuing with signup despite invitation status update failure');
            } else {
              console.log('[Signup] Successfully updated invitation status:', updatedInvitation);
            }
          }
        } else {
          console.log('[Signup] Not updating invitation status because invitationAccepted is false');
        }
      } catch (error) {
        console.error('[Signup] Error accepting invitation:', error);
        invitationAccepted = false;
        // Continue with signup even if invitation acceptance fails
      }
    }

    return NextResponse.json({
      user: {
        id: authData.user.id,
        email: authData.user.email,
        firstName: data.firstName,
        lastName: data.lastName
      },
      message: 'Check your email to confirm your account',
      invitationAccepted,
      redirectTo: invitationAccepted ? null : '/check-email'
    });

  } catch (error) {
    console.error('[Signup] Unexpected error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
} 