/**
 * File: app/api/invitations/send-email/route.ts
 * Description: API route for sending invitation emails using Loops
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { loops, TRANSACTIONAL_EMAIL_IDS } from '@/utils/loops';
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

    const { invitationId } = await request.json();

    // Fetch the invitation details with the sharer's profile information
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
      .single();

    if (invitationError || !invitation) {
      console.error('Error fetching invitation:', invitationError);
      return NextResponse.json(
        { error: 'Invitation not found' },
        { status: 404 }
      );
    }

    // Verify the user has permission to send this invitation
    if (invitation.inviterId !== user.id) {
      return NextResponse.json(
        { error: 'Not authorized to send this invitation' },
        { status: 403 }
      );
    }

    // Generate the invitation URL with the token
    const inviteUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/invitation/accept?token=${invitation.token}`;

    // Get the sharer's name and email from the joined data
    const inviterName = invitation.sharer?.profile?.firstName && invitation.sharer?.profile?.lastName
      ? `${invitation.sharer.profile.firstName} ${invitation.sharer.profile.lastName}`
      : 'Someone';
    const inviterEmail = invitation.sharer?.profile?.email || '';

    try {
      // Send the email using Loops
      await loops.sendTransactionalEmail({
        transactionalId: TRANSACTIONAL_EMAIL_IDS.INVITATION,
        email: invitation.inviteeEmail,
        dataVariables: {
          inviterName,
          inviterEmail,
          role: invitation.role,
          inviteUrl,
        },
      });

      // Update the invitation status
      const { error: updateError } = await supabase
        .from('Invitation')
        .update({ updatedAt: new Date().toISOString() })
        .eq('id', invitationId);

      if (updateError) {
        console.error('Error updating invitation:', updateError);
      }

      return NextResponse.json({ success: true });
    } catch (emailError) {
      console.error('Error sending email:', emailError);
      return NextResponse.json(
        { error: 'Failed to send email through Loops' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error in invitation email route:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 