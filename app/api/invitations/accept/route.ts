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

    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { token } = await request.json();

    // Start a transaction by using a single timestamp
    const now = new Date().toISOString();

    // Fetch the invitation
    const { data: invitation, error: invitationError } = await supabase
      .from('Invitation')
      .select('*')
      .eq('token', token)
      .eq('status', 'PENDING')
      .single();

    if (invitationError || !invitation) {
      return NextResponse.json(
        { error: 'Invalid or expired invitation' },
        { status: 404 }
      );
    }

    // Verify the email matches
    if (invitation.inviteeEmail.toLowerCase() !== user.email?.toLowerCase()) {
      return NextResponse.json(
        { error: 'Email mismatch' },
        { status: 403 }
      );
    }

    // Update the invitation status
    const { error: updateError } = await supabase
      .from('Invitation')
      .update({
        status: 'ACCEPTED',
        acceptedAt: now,
        updatedAt: now,
      })
      .eq('id', invitation.id);

    if (updateError) {
      throw updateError;
    }

    // Add the role to ProfileRole if it doesn't exist
    const { error: roleError } = await supabase
      .from('ProfileRole')
      .upsert({
        id: user.id,
        profileId: user.id,
        role: invitation.role,
      });

    if (roleError) {
      throw roleError;
    }

    // Create the appropriate relationship based on the role
    if (invitation.role === 'LISTENER') {
      const { error: listenerError } = await supabase
        .from('ProfileListener')
        .upsert({
          id: crypto.randomUUID(),
          listenerId: user.id,
          sharerId: invitation.sharerId,
          sharedSince: now,
          createdAt: now,
          updatedAt: now,
        });

      if (listenerError) {
        throw listenerError;
      }
    } else if (invitation.role === 'EXECUTOR') {
      const { error: executorError } = await supabase
        .from('ProfileExecutor')
        .upsert({
          id: crypto.randomUUID(),
          executorId: user.id,
          sharerId: invitation.sharerId,
          createdAt: now,
        });

      if (executorError) {
        throw executorError;
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error accepting invitation:', error);
    return NextResponse.json(
      { error: 'Failed to accept invitation' },
      { status: 500 }
    );
  }
} 