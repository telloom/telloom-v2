import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';
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

    if (!invitationId) {
      return NextResponse.json(
        { error: 'Invitation ID is required' },
        { status: 400 }
      );
    }

    // Verify the invitation exists and is for this user
    const { data: invitation, error: invitationError } = await supabase
      .from('Invitation')
      .select('*')
      .eq('id', invitationId)
      .eq('inviteeEmail', user.email)
      .eq('status', 'PENDING')
      .single();

    if (invitationError || !invitation) {
      return NextResponse.json(
        { error: 'Invalid invitation' },
        { status: 404 }
      );
    }

    // Update the invitation status
    const { error: updateError } = await supabase
      .from('Invitation')
      .update({
        status: 'DECLINED',
        updatedAt: new Date().toISOString()
      })
      .eq('id', invitationId);

    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to decline invitation' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in decline invitation route:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 