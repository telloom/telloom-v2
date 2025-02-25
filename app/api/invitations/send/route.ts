import { createAdminClient } from '@/utils/supabase/admin';
import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  try {
    const cookieStore = cookies();
    const supabase = createClient();
    const adminClient = createAdminClient();

    // Verify the user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      invitationId,
      inviteeEmail,
      role,
      token,
      sharerId,
      executorName,
      sharerName,
      executorDetails,
    } = body;

    // Create notification using admin client (bypasses RLS)
    const { error: notificationError } = await adminClient
      .from('Notification')
      .insert({
        userId: sharerId,
        type: 'INVITATION_SENT',
        message: `Executor (${executorName}) sent an invitation to ${inviteeEmail} for the role of ${role.toLowerCase()}`,
        data: {
          inviteeEmail,
          role,
          executorAction: true,
          invitationToken: token,
          ...(executorDetails && { executorDetails }),
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isRead: false,
      });

    if (notificationError) {
      console.error('Error creating notification:', notificationError);
      return NextResponse.json(
        { error: 'Failed to create notification' },
        { status: 500 }
      );
    }

    // Send invitation email
    // TODO: Implement email sending using your email service
    // For now, we'll just log it
    console.log('Would send email to:', inviteeEmail, {
      role,
      token,
      sharerName,
      executorName,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in invitation send route:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 