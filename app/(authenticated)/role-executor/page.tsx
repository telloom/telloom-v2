'use server';

import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import ExecutorView from './components/executor-view';

export default async function RoleExecutorPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Fetch pending executor invitations
  const { data: pendingInvitations, error: invitationsError } = await supabase
    .from('Invitation')
    .select(`
      id,
      token,
      createdAt,
      sharerId,
      sharer:ProfileSharer!sharerId (
        id,
        profile:Profile!profileId (
          id,
          firstName,
          lastName,
          email,
          avatarUrl
        )
      )
    `)
    .eq('inviteeEmail', user.email)
    .eq('role', 'EXECUTOR')
    .eq('status', 'PENDING')
    .order('createdAt', { ascending: false });

  if (invitationsError) {
    console.error('Error fetching invitations:', invitationsError);
  }

  // Fetch executor relationships and sharer details
  const { data: executorRelationships, error: relationshipsError } = await supabase
    .from('ProfileExecutor')
    .select(`
      id,
      sharerId,
      createdAt,
      sharer:ProfileSharer!sharerId (
        id,
        profile:Profile!profileId (
          id,
          firstName,
          lastName,
          email,
          avatarUrl
        )
      )
    `)
    .eq('executorId', user.id)
    .order('createdAt', { ascending: false });

  if (relationshipsError) {
    console.error('Error fetching executor relationships:', relationshipsError);
  }

  return (
    <div className="container max-w-7xl mx-auto px-4 py-6">
      <ExecutorView
        executorRelationships={executorRelationships || []}
        pendingInvitations={pendingInvitations || []}
      />
    </div>
  );
}

