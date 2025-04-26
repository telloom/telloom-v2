import { createRouteHandlerClient } from '@/utils/supabase/route-handler';
import { NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';

export async function GET(request: Request) {
  try {
    console.log('[API_INVITATIONS] GET request received');
    const { searchParams } = new URL(request.url);
    const sharerId = searchParams.get('sharerId');
    const status = searchParams.get('status') || 'PENDING';

    console.log('[API_INVITATIONS] Request params:', { sharerId, status });

    if (!sharerId) {
      console.log('[API_INVITATIONS] Missing sharerId parameter');
      return NextResponse.json({ error: 'Missing sharerId parameter' }, { status: 400 });
    }

    // Verify user is authenticated using Route Handler Client (reads cookies)
    console.log('[API_INVITATIONS] Creating route handler client');
    const supabase = await createRouteHandlerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser(); // Reads from cookies

    if (authError || !user) {
      console.error('[API_INVITATIONS] Auth error:', authError);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[API_INVITATIONS] Authenticated user:', user.id);

    // Check if user has executor access to this sharer
    const { data: executorData } = await supabase
      .rpc('get_executor_for_user', { user_id: user.id });

    const executorRelationships = executorData?.executor_relationships || [];
    const hasAccess = executorRelationships.some(
      (rel: any) => rel.sharerId === sharerId
    );

    if (!hasAccess) {
      return NextResponse.json({ error: 'Unauthorized access to sharer data' }, { status: 403 });
    }

    // Use admin client to bypass RLS
    const adminClient = createAdminClient();

    // Fetch invitations
    const { data: invitations, error: invitationsError } = await adminClient
      .from('Invitation')
      .select(`
        id,
        inviteeEmail,
        role,
        status,
        createdAt,
        inviter:Profile!inviterId (
          id,
          firstName,
          lastName,
          email
        )
      `)
      .eq('sharerId', sharerId)
      .eq('status', status)
      .order('createdAt', { ascending: false });

    if (invitationsError) {
      console.error('Error fetching invitations:', invitationsError);
      return NextResponse.json({ error: 'Failed to fetch invitations' }, { status: 500 });
    }

    return NextResponse.json({ invitations });
  } catch (error) {
    console.error('Error in GET /api/connections/invitations:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const invitationId = searchParams.get('invitationId');
    const sharerId = searchParams.get('sharerId');

    if (!invitationId || !sharerId) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    // Verify user is authenticated using Route Handler Client (reads cookies)
    const supabase = await createRouteHandlerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser(); // Reads from cookies

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has executor access to this sharer
    const { data: executorData } = await supabase
      .rpc('get_executor_for_user', { user_id: user.id });

    const executorRelationships = executorData?.executor_relationships || [];
    const hasAccess = executorRelationships.some(
      (rel: any) => rel.sharerId === sharerId
    );

    if (!hasAccess) {
      return NextResponse.json({ error: 'Unauthorized access to sharer data' }, { status: 403 });
    }

    // Use admin client to bypass RLS
    const adminClient = createAdminClient();

    // Get the invitation details first
    const { data: invitation, error: getError } = await adminClient
      .from('Invitation')
      .select('inviteeEmail, role')
      .eq('id', invitationId)
      .single();

    if (getError || !invitation) {
      console.error('Error getting invitation:', getError);
      return NextResponse.json({ error: 'Failed to get invitation details' }, { status: 500 });
    }

    // Delete the invitation
    const { error: deleteError } = await adminClient
      .from('Invitation')
      .delete()
      .eq('id', invitationId);

    if (deleteError) {
      console.error('Error deleting invitation:', deleteError);
      return NextResponse.json({ error: 'Failed to delete invitation' }, { status: 500 });
    }

    // Create notification for the sharer
    await adminClient.from('Notification').insert({
      userId: sharerId,
      type: 'INVITATION_CANCELLED',
      message: `Executor cancelled invitation to ${invitation.inviteeEmail}`,
      data: {
        inviteeEmail: invitation.inviteeEmail,
        role: invitation.role,
        executorAction: true
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/connections/invitations:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 