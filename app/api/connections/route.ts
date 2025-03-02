import { createRouteHandlerClient } from '@/utils/supabase/route-handler';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sharerId = searchParams.get('sharerId');

    if (!sharerId) {
      return NextResponse.json({ error: 'Missing sharerId parameter' }, { status: 400 });
    }

    // Verify user is authenticated and authorized
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Use admin client to bypass RLS
    const adminClient = createAdminClient();

    // Fetch listeners
    const { data: listeners, error: listenersError } = await adminClient
      .from('ProfileListener')
      .select(`
        id,
        sharedSince,
        hasAccess,
        Profile:listenerId (
          id,
          email,
          firstName,
          lastName,
          avatarUrl
        )
      `)
      .eq('sharerId', sharerId);

    if (listenersError) {
      console.error('Error fetching listeners:', listenersError);
      return NextResponse.json({ error: 'Failed to fetch listeners' }, { status: 500 });
    }

    // Fetch executors
    const { data: executors, error: executorsError } = await adminClient
      .from('ProfileExecutor')
      .select(`
        id,
        Profile:executorId (
          id,
          email,
          firstName,
          lastName,
          avatarUrl
        )
      `)
      .eq('sharerId', sharerId);

    if (executorsError) {
      console.error('Error fetching executors:', executorsError);
      return NextResponse.json({ error: 'Failed to fetch executors' }, { status: 500 });
    }

    // Format connections
    const formattedConnections = [
      ...(listeners?.map(l => ({
        id: l.id,
        role: 'LISTENER' as const,
        profile: l.Profile,
        sharedSince: l.sharedSince,
        hasAccess: l.hasAccess,
        isCurrentUser: l.Profile?.id === user.id
      })) || []),
      ...(executors?.map(e => ({
        id: e.id,
        role: 'EXECUTOR' as const,
        profile: e.Profile,
        isCurrentUser: e.Profile?.id === user.id
      })) || [])
    ];

    return NextResponse.json({ connections: formattedConnections });
  } catch (error) {
    console.error('Error in GET /api/connections:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const connectionId = searchParams.get('connectionId');
    const sharerId = searchParams.get('sharerId');

    if (!connectionId || !sharerId) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    // Verify user is authenticated and authorized
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Use admin client to bypass RLS
    const adminClient = createAdminClient();

    // Delete the connection from ProfileListener
    const { error: deleteError } = await adminClient
      .from('ProfileListener')
      .delete()
      .eq('id', connectionId)
      .eq('sharerId', sharerId);

    if (deleteError) {
      console.error('Error deleting connection:', deleteError);
      return NextResponse.json({ error: 'Failed to delete connection' }, { status: 500 });
    }

    // Create a notification for the sharer
    await adminClient
      .from('Notification')
      .insert({
        userId: user.id,
        type: 'CONNECTION_REMOVED',
        message: 'A connection has been removed',
        data: { connectionId, sharerId }
      });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/connections:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 