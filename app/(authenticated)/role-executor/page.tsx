'use server';

import { Suspense } from 'react';
import { createClient } from '@/utils/supabase/server';
import { notFound } from 'next/navigation';
import ExecutorView from './components/executor-view';
import { InvitationStatus } from '@/types/models';

interface Profile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  avatarUrl: string | null;
}

interface ProfileSharer {
  id: string;
  profile: Profile;
}

interface ExecutorRelationship {
  id: string;
  sharerId: string;
  createdAt: string;
  sharer: ProfileSharer;
}

interface Invitation {
  id: string;
  token: string;
  createdAt: string;
  sharerId: string;
  inviteeEmail: string;
  role: string;
  status: InvitationStatus;
  sharer: ProfileSharer;
}

type DatabaseInvitation = {
  id: string;
  token: string;
  createdAt: string;
  sharerId: string;
  inviteeEmail: string;
  role: string;
  status: InvitationStatus;
  sharer: {
    id: string;
    profile: Profile;
  };
};

type DatabaseExecutorRelationship = {
  id: string;
  sharerId: string;
  createdAt: string;
  sharer: {
    id: string;
    profile: Profile;
  };
};

export default async function RoleExecutorPage() {
  const supabase = createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    notFound();
  }

  // Fetch pending executor invitations
  const { data: rawInvitations, error: invitationsError } = await supabase
    .from('Invitation')
    .select(`
      id,
      token,
      createdAt,
      sharerId,
      inviteeEmail,
      role,
      status,
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

  const pendingInvitations = ((rawInvitations || []) as unknown as DatabaseInvitation[]).map(item => ({
    id: item.id,
    token: item.token,
    createdAt: item.createdAt,
    sharerId: item.sharerId,
    inviteeEmail: item.inviteeEmail,
    role: item.role,
    status: item.status,
    sharer: {
      id: item.sharer.id,
      profile: item.sharer.profile
    }
  })) as Invitation[];

  if (invitationsError) {
    console.error('Error fetching invitations:', invitationsError);
  }

  // Fetch executor relationships and sharer details
  const { data: rawRelationships, error: relationshipsError } = await supabase
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

  const executorRelationships = ((rawRelationships || []) as unknown as DatabaseExecutorRelationship[]).map(item => ({
    id: item.id,
    sharerId: item.sharerId,
    createdAt: item.createdAt,
    sharer: {
      id: item.sharer.id,
      profile: item.sharer.profile
    }
  })) as ExecutorRelationship[];

  if (relationshipsError) {
    console.error('Error fetching relationships:', relationshipsError);
    notFound();
  }

  return (
    <div className="container max-w-7xl mx-auto px-4 py-6">
      <Suspense fallback={<div>Loading...</div>}>
        <ExecutorView 
          executorRelationships={executorRelationships} 
          pendingInvitations={pendingInvitations} 
        />
      </Suspense>
    </div>
  );
}

