import { createClient } from '@/utils/supabase/server';
import { Card } from '@/components/ui/card';
import { Users, Video } from 'lucide-react';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { BackButton } from '@/components/ui/BackButton';
import { ExecutorSharerHeader } from '@/components/executor/ExecutorSharerHeader';

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
    console.error('[getSharerProfile ExecutorPage] RPC Error fetching sharer details:', rpcError);
    return null;
  }
  if (!sharerDetailsData) {
    console.warn(`[getSharerProfile ExecutorPage] Sharer profile not found or access denied for sharerId: ${sharerId}`);
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

export default async function RoleExecutorPage({ params }: Props) {
  const resolvedParams = await Promise.resolve(params);
  const sharerId = resolvedParams.id;
  
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    console.error('[RoleExecutorPage] Auth error or no user');
    redirect('/login');
  }

  // Fetch Sharer profile using the helper
  const sharerProfile = await getSharerProfile(sharerId);
  if (!sharerProfile) {
    console.error(`[RoleExecutorPage] Failed to get sharer profile for ${sharerId}`);
    notFound();
  }

  return (
    <div className="container max-w-7xl mx-auto px-4 py-8">
      <BackButton />
      <ExecutorSharerHeader sharerProfile={sharerProfile} />

      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
        <Link href={`/role-executor/${sharerId}/connections`}>
          <Card className="p-6 hover:shadow-lg transition-shadow border-2 border-[#1B4332] shadow-[6px_6px_0_0_#8fbc55] hover:shadow-[8px_8px_0_0_#8fbc55]">
            <div className="flex flex-col items-center text-center space-y-4">
              <Users className="h-8 w-8 text-[#1B4332]" />
              <div>
                <h2 className="text-lg font-semibold">Manage Connections</h2>
                <p className="text-sm text-gray-600">Manage listeners and invitations on behalf of {sharerProfile.firstName}</p>
              </div>
            </div>
          </Card>
        </Link>

        <Link href={`/role-executor/${sharerId}/topics`}>
          <Card className="p-6 hover:shadow-lg transition-shadow border-2 border-[#1B4332] shadow-[6px_6px_0_0_#8fbc55] hover:shadow-[8px_8px_0_0_#8fbc55]">
            <div className="flex flex-col items-center text-center space-y-4">
              <Video className="h-8 w-8 text-[#1B4332]" />
              <div>
                <h2 className="text-lg font-semibold">Manage Content</h2>
                <p className="text-sm text-gray-600">Manage and create video content on behalf of {sharerProfile.firstName}</p>
              </div>
            </div>
          </Card>
        </Link>
      </div>
    </div>
  );
} 