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
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { invitationId } = await request.json();

    // Fetch the invitation details using the new RPC function
    console.log(`[API send-email] Calling RPC get_invitation_details_for_email for ID: ${invitationId}`);
    const { data: invitation, error: rpcError } = await supabase
      .rpc('get_invitation_details_for_email', { p_invitation_id: invitationId })
      .single(); // Assuming the RPC returns a single JSON object

    if (rpcError || !invitation) {
      console.error('Error fetching invitation via RPC:', rpcError);
      // If RPC raised an auth error or not found, it signals failure.
      // Check for a specific error message from the RPC if needed.
      const errorMessage = rpcError?.message || 'Invitation not found or access denied via RPC';
      const status = errorMessage.includes('not authorized') ? 403 : 404;
      return NextResponse.json(
        { error: errorMessage },
        { status: status }
      );
    }
    
    console.log('[API send-email] Successfully fetched invitation details via RPC:', invitation);


    // Optional: Verify the user ID fetched via RPC matches the current user if needed
    // (The RPC already performs this check, so this is redundant but safe)
    if (invitation.inviterId !== user.id) {
       console.warn(`[API send-email] Mismatch between inviterId from RPC (${invitation.inviterId}) and authenticated user (${user.id}). This shouldn't happen.`);
       return NextResponse.json(
         { error: 'Authorization mismatch after RPC call' },
         { status: 403 }
       );
    }


    // Generate the invitation URL with the token from RPC data
    const inviteUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/invitation/accept?token=${invitation.token}`;

    // Get the sharer's name and email from the RPC data
    const inviterName = invitation.sharerFirstName && invitation.sharerLastName
      ? `${invitation.sharerFirstName} ${invitation.sharerLastName}`
      : 'Someone';
    const inviterEmail = invitation.sharerEmail || ''; // Use the email fetched by RPC

    try {
      // Send the email using Loops
      console.log(`[API send-email] Sending transactional email to: ${invitation.inviteeEmail}`);
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