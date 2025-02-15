/**
 * File: app/api/invitations/accept/route.ts
 * Description: API route for accepting invitations and creating necessary relationships
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  try {
    const cookieStore = cookies();
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { invitationId, token } = await request.json();

    if (!invitationId || !token) {
      return NextResponse.json(
        { error: 'Invitation ID and token are required' },
        { status: 400 }
      );
    }

    console.log('Processing invitation acceptance for token:', token);

    // Verify the invitation exists and is for this user
    const { data: invitation, error: invitationError } = await supabase
      .from('Invitation')
      .select(`
        *,
        sharer:ProfileSharer!sharerId (
          profile:Profile!profileId (
            firstName,
            lastName,
            email
          )
        )
      `)
      .eq('id', invitationId)
      .eq('token', token)
      .eq('inviteeEmail', user.email)
      .eq('status', 'PENDING')
      .single();

    console.log('Invitation lookup result:', { invitation, error: invitationError });

    if (invitationError || !invitation) {
      return NextResponse.json(
        { error: 'Invalid invitation' },
        { status: 404 }
      );
    }

    const now = new Date().toISOString();

    // Create executor relationship
    console.log('Creating executor relationship');
    const { error: executorError } = await supabase
      .from('ProfileExecutor')
      .insert([{
        id: crypto.randomUUID(),
        sharerId: invitation.sharerId,
        executorId: user.id,
        createdAt: now,
        updatedAt: now
      }]);

    if (executorError) {
      console.error('Error creating executor relationship:', executorError);
      return NextResponse.json(
        { error: 'Failed to create executor relationship' },
        { status: 500 }
      );
    }

    // Add executor role if not exists
    const { error: roleError } = await supabase
      .from('ProfileRole')
      .insert([{
        id: crypto.randomUUID(),
        profileId: user.id,
        role: 'EXECUTOR',
        createdAt: now,
        updatedAt: now
      }])
      .match(['profileId', 'role']);

    if (roleError) {
      console.error('Error adding executor role:', roleError);
      // Don't return error here as the role might already exist
    }

    // Update invitation status
    const { error: updateError } = await supabase
      .from('Invitation')
      .update({
        status: 'ACCEPTED',
        acceptedAt: now,
        updatedAt: now
      })
      .eq('id', invitationId);

    if (updateError) {
      console.error('Error updating invitation:', updateError);
      return NextResponse.json(
        { error: 'Failed to update invitation status' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error accepting invitation:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 