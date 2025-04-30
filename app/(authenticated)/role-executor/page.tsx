import { Suspense } from 'react';
import { createClient } from '@/utils/supabase/server';
import { notFound, redirect } from 'next/navigation';
import { InvitationStatus } from '@/types/models';
import Link from 'next/link';
import ExecutorSharingCard from '@/components/profile/ExecutorSharingCard';
import ExecutorDashboardLoading from '@/components/loading/ExecutorDashboardLoading';
import ExecutorInvitationCard from '@/components/profile/ExecutorInvitationCard';
import { Button } from '@/components/ui/button';
import { AlertCircle, Users } from 'lucide-react';
import { getSignedAvatarUrl } from '@/utils/avatar';
import { BackButton } from '@/components/ui/BackButton';

// Define any additional types needed for local use
type ExecutorRelationship = {
  id: string;
  sharerId: string;
  executorId: string;
  sharer: {
    id: string;
    profileId: string;
    profile: {
      id: string;
      firstName: string;
      lastName: string;
      email: string;
      avatarUrl: string | null;
      createdAt?: string;
    }
  };
};

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
    profile: {
      id: string;
      firstName: string;
      lastName: string;
      email: string;
      avatarUrl: string | null;
    }
  };
};

export default async function RoleExecutorPage() {
  return (
    <Suspense fallback={<ExecutorDashboardLoading />}>
      <RoleExecutorPageContent />
    </Suspense>
  );
}

async function RoleExecutorPageContent() {
  try {
    // Get our regular authenticated client
    const supabase = await createClient();
    
    // Get the authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error('[role-executor/page] Error getting user:', userError);
      notFound();
    }

    // Get executor relationships
    let executorRelationships: ExecutorRelationship[] = [];
    let executorInvitations: DatabaseInvitation[] = [];

    try {
      // Use the get_executor_for_user RPC function instead of directly querying tables
      // This avoids the infinite recursion in RLS policies
      const { data: executorData, error: executorError } = await supabase
        .rpc('get_executor_for_user', { user_id: user.id });

      if (executorError) {
        console.error('[role-executor/page] Error getting executor relationships:', executorError);
        // Instead of notFound, redirect to select-role to avoid infinite loop
        redirect('/select-role');
      }

      // Extract the relationships from the response
      executorRelationships = (executorData?.executor_relationships || []) as ExecutorRelationship[];

      // Process avatar URLs to get signed URLs
      for (const relationship of executorRelationships) {
        if (relationship.sharer.profile.avatarUrl) {
          relationship.sharer.profile.avatarUrl = await getSignedAvatarUrl(relationship.sharer.profile.avatarUrl);
        }
      }

      // Get pending invitations using a different approach
      try {
        // Call the get_pending_invitations RPC function
        // If this function doesn't exist, you'll need to create it in your database
        const { data: invitationsData, error: invitationsError } = await supabase
          .rpc('get_pending_invitations', { 
            email_param: user.email,
            role_type: 'EXECUTOR'
          });

        if (invitationsError) {
          console.error('[role-executor/page] Error getting executor invitations:', invitationsError);
          // Continue with execution, but with empty invitations
        } else {
          executorInvitations = invitationsData || [];
          
          // Process avatar URLs for invitations as well
          for (const invitation of executorInvitations) {
            if (invitation.sharer.profile.avatarUrl) {
              invitation.sharer.profile.avatarUrl = await getSignedAvatarUrl(invitation.sharer.profile.avatarUrl);
            }
          }
        }
      } catch (inviteError) {
        console.error('[role-executor/page] Error in invitation fetch:', inviteError);
        // Continue with execution, but with empty invitations
      }
    } catch (error) {
      console.error('[role-executor/page] Error getting executor data:', error);
      redirect('/select-role');
    }

    return (
      <div className="container mx-auto px-4 py-8">
        <BackButton />
        <div className="mb-6 mt-4">
          <h1 className="text-2xl md:text-3xl font-bold mb-2">Sharers You Represent</h1>
          <p className="text-muted-foreground">
            Manage content and connections for Sharers you represent.
          </p>
        </div>

        {/* Show active connections */}
        {executorRelationships.length > 0 && (
          <div className="mb-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {executorRelationships.map((relationship) => (
                <ExecutorSharingCard
                  key={relationship.id}
                  executorRelationship={relationship}
                />
              ))}
            </div>
          </div>
        )}

        {/* Show pending invitations */}
        {executorInvitations.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">Pending Invitations</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {executorInvitations.map((invitation) => (
                <ExecutorInvitationCard
                  key={invitation.id}
                  invitation={invitation}
                />
              ))}
            </div>
          </div>
        )}

        {/* Show message when no connections */}
        {executorRelationships.length === 0 && executorInvitations.length === 0 && (
          <div className="bg-white dark:bg-gray-950 p-6 rounded-lg border-2 border-gray-200 shadow-sm text-center">
            <div className="mb-4">
              <Users className="mx-auto h-12 w-12 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium mb-2">No Connections Yet</h3>
            <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto mb-6">
              You haven&apos;t been added as an executor by any account holders yet. You&apos;ll receive an invitation when someone adds you.
            </p>
            <div>
              <Button variant="outline" size="sm" asChild>
                <Link href="/select-role">Return to Role Selection</Link>
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  } catch (error) {
    console.error('[role-executor/page] Unexpected error in fetching executor data:', error);
    
    return (
      <div className="container max-w-7xl mx-auto px-4 py-8">
        <div className="bg-white dark:bg-gray-950 p-6 rounded-lg border-2 border-gray-200 shadow-sm text-center">
          <div className="mb-4">
            <AlertCircle className="mx-auto h-12 w-12 text-red-500" />
          </div>
          <h3 className="text-lg font-medium mb-2">Something went wrong</h3>
          <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto mb-6">
            We couldn&apos;t load your executor profile. Please try again or contact support if the problem persists.
          </p>
          <div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/select-role">Return to Role Selection</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }
}

