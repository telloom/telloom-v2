import { Suspense } from 'react';
import { createClient } from '@/utils/supabase/server';
import { notFound, redirect } from 'next/navigation';
import ConnectionsPageContent from '@/components/executor/connections/ConnectionsPageContent';
import { getSignedAvatarUrl } from '@/utils/avatar';
import { BackButton } from '@/components/ui/BackButton';
import { ExecutorSharerHeader } from '@/components/executor/ExecutorSharerHeader';
import { Loader2 } from 'lucide-react';

interface Props {
  params: {
    id: string;
  };
}

// Define RPC result type for get_sharer_details_for_executor
interface SharerDetailsRpcResult {
  sharer_id: string;
  profile_id: string;
  created_at: string;
  subscription_status: boolean | null;
  profile_first_name: string | null;
  profile_last_name: string | null;
  profile_avatar_url: string | null;
}

// Reusable function to get sharer profile (copied from [topicId]/page.tsx for now)
// TODO: Move to a shared lib file
async function getSharerProfile(sharerId: string): Promise<any | null> {
  const supabase = await createClient(); 
  const { data: sharerDetailsData, error: rpcError } = await supabase
    .rpc('get_sharer_details_for_executor', { p_sharer_id: sharerId })
    .maybeSingle();
  if (rpcError) {
    console.error('[getSharerProfile ConnectionsPage] RPC Error fetching sharer details:', rpcError);
    return null;
  }
  if (!sharerDetailsData) {
    console.warn(`[getSharerProfile ConnectionsPage] Sharer profile not found or access denied for sharerId: ${sharerId}`);
    return null;
  }
  const sharerDetails = sharerDetailsData as SharerDetailsRpcResult;
  return {
    id: sharerDetails.sharer_id,
    profileId: sharerDetails.profile_id,
    subscriptionStatus: sharerDetails.subscription_status,
    createdAt: sharerDetails.created_at,
    updatedAt: null,
    firstName: sharerDetails.profile_first_name,
    lastName: sharerDetails.profile_last_name,
    avatarUrl: sharerDetails.profile_avatar_url,
  };
}

export default async function SharerExecutorConnectionsPage({ params }: Props) {
  try {
    const supabase = await createClient();
    const resolvedParams = await Promise.resolve(params);
    const sharerId = resolvedParams.id;

    // Get the current authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error('[ConnectionsPage] Auth error or no user:', userError);
      redirect('/login');
    }

    // Fetch Sharer profile using the helper
    const sharerProfile = await getSharerProfile(sharerId);
    if (!sharerProfile) {
      console.error(`[ConnectionsPage] Failed to get sharer profile for ${sharerId}`);
      notFound();
    }

    const sharerName = `${sharerProfile.firstName || ''} ${sharerProfile.lastName || ''}`.trim();

    return (
      <div className="container mx-auto px-4 py-8">
        <BackButton />
        <ExecutorSharerHeader sharerProfile={sharerProfile} />

        <Suspense fallback={
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
              <span className="ml-2 text-gray-500">Loading connections...</span>
            </div>
          }
        >
          <div className="-mt-4">
            <ConnectionsPageContent 
              sharerId={sharerId} 
              sharerName={sharerName} 
              sharerAvatarUrl={sharerProfile.avatarUrl} 
            />
          </div>
        </Suspense>
      </div>
    );
  } catch (error) {
    console.error('Error in SharerExecutorConnectionsPage:', error);
    notFound();
  }
} 