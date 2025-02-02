/**
 * File: app/invitation/accept/page.tsx
 * Description: Page component for handling invitation acceptance, supporting both authenticated and unauthenticated users
 */

import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import AcceptInvitationForm from '@/components/invite/AcceptInvitationForm';

export default async function AcceptInvitationPage({
  searchParams,
}: {
  searchParams: { token?: string };
}) {
  const cookieStore = cookies();
  const supabase = createClient();

  // Check if we have a token
  const { token } = searchParams;
  if (!token) {
    redirect('/');
  }

  // Fetch the invitation details
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
    .eq('token', token)
    .eq('status', 'PENDING')
    .single();

  if (invitationError || !invitation) {
    // If the invitation is not found or not pending, redirect to home
    redirect('/?error=invalid-invitation');
  }

  // Check if user is authenticated
  const { data: { session } } = await supabase.auth.getSession();
  const isAuthenticated = !!session?.user;

  // If user is not authenticated, we'll show them a sign up form
  // If they are authenticated, we'll show them the acceptance confirmation
  return (
    <div className="container max-w-2xl mx-auto p-4">
      <div className="border-2 border-[#1B4332] shadow-[6px_6px_0_0_#8fbc55] p-6 rounded-lg">
        <h1 className="text-2xl font-semibold mb-4">Accept Invitation</h1>
        
        <div className="mb-6">
          <p className="text-gray-600">
            You've been invited by{' '}
            <span className="font-semibold">
              {invitation.sharer.profile.firstName} {invitation.sharer.profile.lastName}
            </span>{' '}
            to join Telloom as a{' '}
            <span className="font-semibold">{invitation.role.toLowerCase()}</span>.
          </p>
        </div>

        <AcceptInvitationForm
          invitation={invitation}
          isAuthenticated={isAuthenticated}
          userEmail={session?.user?.email}
        />
      </div>
    </div>
  );
} 