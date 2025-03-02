/**
 * File: app/api/invitations/find/route.ts
 * Description: API endpoint for finding an invitation by token using admin privileges
 */

import { NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const token = url.searchParams.get('token');

    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 });
    }

    console.log(`[API] Finding invitation with token: ${token}`);

    // Create a Supabase client with the service role key for admin operations
    const supabase = createAdminClient();
    
    // Use direct SQL query to bypass RLS completely
    console.log(`[API] Attempting direct SQL query for token: ${token}`);
    const { data: invitation, error: invitationError } = await supabase
      .rpc('find_invitation_by_token', { token_value: token });

    if (invitationError || !invitation?.invitation) {
      console.log(`[API] Error finding invitation with direct SQL: ${invitationError?.message || 'No invitation found'}`);
      
      // Try case insensitive match as fallback
      console.log(`[API] Attempting case insensitive SQL match for token: ${token}`);
      const { data: caseInsensitiveResult, error: caseInsensitiveError } = await supabase
        .rpc('find_invitation_by_token_case_insensitive', { token_value: token });

      if (caseInsensitiveError || !caseInsensitiveResult?.invitation) {
        console.log(`[API] Error finding invitation with case insensitive SQL: ${caseInsensitiveError?.message || 'No invitation found'}`);
        return NextResponse.json({ 
          error: 'Failed to find invitation', 
          details: caseInsensitiveError || 'No invitation found with this token' 
        }, { status: 404 });
      }

      const matchedInvitation = caseInsensitiveResult.invitation;
      console.log(`[API] Found invitation with case insensitive SQL match: ${matchedInvitation.id}`);
      
      // Get sharer information
      const { data: sharer, error: sharerError } = await supabase
        .from('ProfileSharer')
        .select(`
          id,
          Profile (
            id,
            firstName,
            lastName,
            fullName,
            email
          )
        `)
        .eq('id', matchedInvitation.sharerId)
        .single();

      if (sharerError) {
        console.log(`[API] Error finding sharer: ${sharerError.message}`);
        return NextResponse.json({ 
          invitation: matchedInvitation,
          error: 'Failed to find sharer information',
          details: sharerError
        });
      }

      // Extract profile data from the nested structure
      const sharerProfile = sharer.Profile;

      // Ensure executor information is included in the response
      const invitationWithExecutorInfo = {
        ...matchedInvitation,
        executorFirstName: matchedInvitation.executorFirstName || null,
        executorLastName: matchedInvitation.executorLastName || null,
        executorPhone: matchedInvitation.executorPhone || null,
        executorRelation: matchedInvitation.executorRelation || null
      };

      return NextResponse.json({ 
        invitation: invitationWithExecutorInfo,
        sharer: sharerProfile
      });
    }

    const foundInvitation = invitation.invitation;
    console.log(`[API] Found invitation with direct SQL: ${foundInvitation.id}`);
    
    // Get sharer information
    const { data: sharer, error: sharerError } = await supabase
      .from('ProfileSharer')
      .select(`
        id,
        Profile (
          id,
          firstName,
          lastName,
          fullName,
          email
        )
      `)
      .eq('id', foundInvitation.sharerId)
      .single();

    if (sharerError) {
      console.log(`[API] Error finding sharer: ${sharerError.message}`);
      return NextResponse.json({ 
        invitation: foundInvitation,
        error: 'Failed to find sharer information',
        details: sharerError
      });
    }

    // Extract profile data from the nested structure
    const sharerProfile = sharer.Profile;

    // Ensure executor information is included in the response
    const invitationWithExecutorInfo = {
      ...foundInvitation,
      executorFirstName: foundInvitation.executorFirstName || null,
      executorLastName: foundInvitation.executorLastName || null,
      executorPhone: foundInvitation.executorPhone || null,
      executorRelation: foundInvitation.executorRelation || null
    };

    return NextResponse.json({ 
      invitation: invitationWithExecutorInfo,
      sharer: sharerProfile
    });
  } catch (error) {
    console.error('[API] Unexpected error finding invitation:', error);
    return NextResponse.json({ 
      error: 'Failed to find invitation', 
      details: error 
    }, { status: 500 });
  }
} 