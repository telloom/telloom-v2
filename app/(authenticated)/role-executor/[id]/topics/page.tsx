import { createClient } from '@/utils/supabase/server';
import { redirect, notFound } from 'next/navigation';
import TopicsClientWrapper from './TopicsClientWrapper';
import { PromptCategory, Prompt } from '@/types/models';
import { BackButton } from '@/components/ui/BackButton';
import { ExecutorSharerHeader } from '@/components/executor/ExecutorSharerHeader';
import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';

// Define a type for the data returned by the RPC function for better type safety
// Based on the RETURNS TABLE definition in the SQL migration
interface ExecutorTopicListData {
  id: string;
  category: string;
  description: string | null;
  theme: string | null; // Assuming theme is text or null
  prompts: any[]; // JSONB parsed as array
  completed_prompt_count: number;
  total_prompt_count: number;
  is_favorite: boolean;
  is_in_queue: boolean;
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
    console.error('[getSharerProfile TopicsPage] RPC Error fetching sharer details:', rpcError);
    return null;
  }
  if (!sharerDetailsData) {
    console.warn(`[getSharerProfile TopicsPage] Sharer profile not found or access denied for sharerId: ${sharerId}`);
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

export default async function ExecutorTopicsPage({ 
  params 
}: { 
  params: { 
    id: string 
  } 
}) {
  // Resolve params first
  const resolvedParams = await Promise.resolve(params);
  const sharerId = resolvedParams.id;
  
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    console.error('[ExecutorTopicsPage] No authenticated user found');
    redirect('/login');
  }

  // Fetch Sharer details using the helper function
  const sharerProfile = await getSharerProfile(sharerId);
  if (!sharerProfile) {
    console.error(`[ExecutorTopicsPage] Failed to get sharer profile for ${sharerId}`);
    notFound(); // Or handle error appropriately
  }

  // Fetch topic data using the RPC function (keep this)
  const { data: topicListData, error: rpcError } = await supabase
    .rpc('get_executor_topic_list', { 
      p_executor_id: user.id, 
      p_sharer_id: sharerId 
    });

  if (rpcError) {
    console.error('[ExecutorTopicsPage] Error calling get_executor_topic_list RPC:', rpcError);
    throw new Error(`Failed to fetch topic list: ${rpcError.message}`);
  }

  // Transform data (keep this)
  const transformedCategories: PromptCategory[] = (topicListData as ExecutorTopicListData[] || []).map(rpcData => {
    const prompts: Prompt[] = (Array.isArray(rpcData.prompts) ? rpcData.prompts : []).map((p: any) => ({
      id: p.id,
      promptText: p.promptText,
      promptType: p.promptType,
      isContextEstablishing: p.isContextEstablishing,
      promptCategoryId: p.promptCategoryId,
      PromptResponse: [] 
    }));
    return {
      id: rpcData.id,
      category: rpcData.category,
      description: rpcData.description,
      theme: rpcData.theme,
      Prompt: prompts, 
      isFavorite: rpcData.is_favorite,
      isInQueue: rpcData.is_in_queue,
      completedPromptCount: rpcData.completed_prompt_count,
      totalPromptCount: rpcData.total_prompt_count,
    };
  });

  // Render the new structure
  return (
    <div className="container mx-auto px-4 py-8">
      <BackButton />
      <ExecutorSharerHeader sharerProfile={sharerProfile} />
      
      {/* Wrap client component in div with negative margin and Suspense */}
      <Suspense fallback={
          <div className="flex justify-center items-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
            <span className="ml-2 text-gray-500">Loading topics...</span>
          </div>
        }
      >
        <div className="-mt-4">
    <TopicsClientWrapper 
      initialPromptCategories={transformedCategories}
      currentRole="EXECUTOR"
      sharerId={sharerId}
            // Note: TopicsClientWrapper might need adjustment if it expects a signed URL
            // For now, passing the raw URL. Consider signing within the client wrapper if needed.
            sharerAvatarUrl={sharerProfile.avatarUrl}
    />
        </div>
      </Suspense>
    </div>
  );
} 