// app/role-sharer/page.tsx
import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import RandomPrompt from '@/components/RandomPrompt';
import TopicsAllButton from '@/components/TopicsAllButton';
import { createAdminClient } from '@/utils/supabase/admin';
import { BackButton } from '@/components/ui/BackButton';
import SharerDashboardClient from '@/components/SharerDashboardClient';

// Define the expected structure from the RPC call get_sharer_topic_list
// This should align with what TopicsList/TopicCard expects
interface SharerTopicInfo {
  id: string;
  category: string;
  description: string | null;
  theme: string | null;
  completedPromptCount: number;
  totalPromptCount: number;
  isFavorite: boolean;
  isInQueue: boolean;
  // Add prompts if the RPC returns them, otherwise mock/remove
  Prompt?: any[]; // Adjust type based on actual RPC response if needed
}

export default async function RoleSharerPage() {
  console.log('[SERVER] Starting RoleSharerPage render');
  const supabase = await createClient();
  const adminClient = await createAdminClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    console.log('[SERVER] No authenticated user, redirecting to login');
    redirect('/login');
  }

  console.log('[SERVER] Authenticated user:', user.id);

  try {
    // Get role info directly from RPC function - this is more reliable
    const { data: roleInfo, error: roleError } = await adminClient.rpc(
      'get_user_role_emergency',
      { user_id: user.id }
    );

    if (roleError) {
      console.error('[SERVER] Error getting role info:', roleError);
      return (
        <div className="container mx-auto px-4 py-8">
          <BackButton />
          <h1 className="text-3xl font-bold mb-8 mt-4">Sharer Dashboard</h1>
          <p className="text-lg text-red-600 text-center">
            Error checking user role. Please try again later.
          </p>
        </div>
      );
    }

    console.log('[SERVER] User role info in server component:', roleInfo);

    // Get the effective sharer ID from the role info directly
    const effectiveSharerId = roleInfo?.sharerId;
    if (!effectiveSharerId) {
      console.error('[SERVER PAGE] Effective sharer ID not found. Role info:', roleInfo);
      // Only redirect if user has no sharer role at all
      if (!roleInfo?.is_sharer) {
        redirect('/select-role');
      } else {
        // If they have sharer role but no sharer ID, show an error instead of redirecting
        return (
          <div className="container mx-auto px-4 py-8">
            <BackButton />
            <h1 className="text-3xl font-bold mb-8 mt-4">Sharer Dashboard</h1>
            <p className="text-lg text-amber-600 text-center">
              Your sharer profile is incomplete. Please contact support.
            </p>
          </div>
        );
      }
    }

    console.log('[SERVER PAGE] Role and sharer ID checks passed. Using effective sharerId:', effectiveSharerId);

    // --- Topics Fetching (remains the same) ---
    console.log('[SERVER PAGE] Fetching sharer topic list via RPC for user:', user.id);
    let topicsData: any[] = []; // Use any[] for initial RPC data
    let topicsFetchError: any = null; 
    try {
      const { data: rpcData, error: rpcError } = await supabase
        .rpc('get_sharer_topic_list', { p_sharer_profile_id: user.id }); 
      if (rpcError) {
        topicsFetchError = rpcError; 
        console.error('[SERVER] Error fetching sharer topic list via RPC:', topicsFetchError);
        console.error('[SERVER] Stringified RPC Error:', JSON.stringify(topicsFetchError)); 
      } else {
        topicsData = rpcData || [];
        console.log('[SERVER] Found', topicsData.length, 'topics via RPC');
      }
    } catch (error) {
      topicsFetchError = error;
      console.error('[SERVER] Unexpected error during RPC fetch:', topicsFetchError);
      console.error('[SERVER] Stringified Unexpected Error:', JSON.stringify(topicsFetchError));
    }

    // --- Data Transformation ---
    let allCategories: SharerTopicInfo[] = []; 
    if (!topicsFetchError) {
        allCategories = topicsData.map(topic => ({
            id: topic.id,
            category: topic.category,
            description: topic.description || '',
            theme: topic.theme || '',
            completedPromptCount: topic.completed_prompt_count ?? 0, 
            totalPromptCount: topic.total_prompt_count ?? 0,       
            isFavorite: topic.is_favorite ?? false,                   
            isInQueue: topic.is_in_queue ?? false,                   
            Prompt: [] 
        }));
        console.log('[SERVER] Transformed', allCategories.length, 'categories from RPC data');
    }
    
    // Remove random prompt logic
    const randomPrompt = null;
    console.log('[SERVER] Data fetching complete, preparing to render client wrapper');

    return (
      <div className="container mx-auto px-4 py-8">
        <BackButton />
        
        <div className="flex justify-between items-center mb-8 mt-4">
          <h1 className="text-3xl font-bold">Sharer Dashboard</h1>
          <TopicsAllButton />
        </div>
        
        <p className="text-muted-foreground text-base mb-10 max-w-3xl">
          Explore topics and answer prompts about your life, stories, and perspectives. Add video responses, text summaries, and upload photos or other attachments to enrich your memories.
        </p>

        {/* --- UI Rendering Logic --- */}
        
        {topicsFetchError && (
          <div className="text-center py-8 px-4 border border-red-300 bg-red-50 rounded-md">
            <p className="text-lg text-red-700 font-semibold">Could not load topics</p>
            <p className="text-sm text-red-600 mt-1">
              There was an issue retrieving topic information. Please try refreshing the page.
            </p>
          </div>
        )}

        {!topicsFetchError && (
          <SharerDashboardClient 
            initialCategories={allCategories}
            sharerId={effectiveSharerId}
            userId={user.id}
          />
        )}
      </div>
    );
  } catch (error) {
    // This outer catch handles errors *before* the topics fetch (e.g., role check)
    console.error('[SERVER] Dashboard - Pre-fetch error:', error); 
    return (
      <div className="container mx-auto px-4 py-8">
        <BackButton />
        <h1 className="text-3xl font-bold mb-8">Sharer Dashboard</h1>
        <p className="text-lg text-gray-600 text-center">
          Something went wrong loading the dashboard. Please try again later.
        </p>
      </div>
    );
  }
}

