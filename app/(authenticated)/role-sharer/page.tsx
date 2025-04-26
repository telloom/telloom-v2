// app/role-sharer/page.tsx
import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import TopicsList from '@/components/TopicsList';
import RandomPrompt from '@/components/RandomPrompt';
import TopicsAllButton from '@/components/TopicsAllButton';
import { Prompt, PromptCategory } from '@/types/models';
import { getEffectiveSharerId, getCompletedPromptsForSharer } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';

// We need to create a modified version of the PromptCategory that includes
// the completion information needed for the dashboard
interface ExtendedPromptCategory extends PromptCategory {
  totalPrompts?: number;
  completedPrompts?: number;
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
          <h1 className="text-3xl font-bold mb-8">Sharer Dashboard</h1>
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
            <h1 className="text-3xl font-bold mb-8">Sharer Dashboard</h1>
            <p className="text-lg text-amber-600 text-center">
              Your sharer profile is incomplete. Please contact support.
            </p>
          </div>
        );
      }
    }

    console.log('[SERVER PAGE] Role and sharer ID checks passed. Continuing with data fetching.');
    console.log('[SERVER PAGE] Effective sharerId:', effectiveSharerId);

    // Skip UserPreference table query since it doesn't exist
    console.log('[SERVER PAGE] Skipping user preferences fetch (table does not exist)');
    
    // Defaults for user preferences
    const userPreferences = {
      theme: 'light',
      notifications: true
    };

    // Get user's favorited topics and queued topics with error handling
    console.log('[SERVER PAGE] Fetching favorite and queued topics');
    let favorites = [];
    let queueItems = [];
    
    try {
      const [favoritesResult, queueItemsResult] = await Promise.all([
        supabase
          .from('TopicFavorite')
          .select('promptCategoryId')
          .eq('profileId', user.id),
        supabase
          .from('TopicQueueItem')
          .select('promptCategoryId')
          .eq('profileId', user.id)
      ]);
      
      favorites = favoritesResult.data || [];
      queueItems = queueItemsResult.data || [];
    } catch (error) {
      console.error('[SERVER] Error fetching favorites/queue:', error);
      // Continue with empty arrays
    }

    // Create Sets for efficient lookup
    const favoritedIds = new Set(favorites?.map(f => f.promptCategoryId) || []);
    const queuedIds = new Set(queueItems?.map(q => q.promptCategoryId) || []);

    // First, fetch all prompt categories 
    console.log('[SERVER PAGE] Fetching prompt categories');
    let categories = [];
    
    try {
      // Query to get categories
      const { data: categoriesData, error: categoryError } = await supabase
        .from('PromptCategory')
        .select(`
          id,
          category,
          description,
          theme
        `)
        .order('category');  // Order by category name instead of orderIndex

      if (categoryError) {
        console.error('[SERVER] Error fetching prompt categories:', categoryError);
      } else {
        categories = categoriesData || [];
        console.log('[SERVER] Found', categories.length, 'categories');
      }
    } catch (error) {
      console.error('[SERVER] Unexpected error fetching categories:', error);
    }

    // Then, fetch all prompts for these categories
    console.log('[SERVER PAGE] Fetching prompts for categories');
    let allPrompts = [];

    try {
      // Get all prompt IDs as an array
      const categoryIds = categories.map(c => c.id);
      if (categoryIds.length > 0) {
        const { data: promptsData, error: promptsError } = await supabase
          .from('Prompt')
          .select(`
            id,
            promptText,
            promptType,
            isContextEstablishing,
            promptCategoryId
          `)
          .in('promptCategoryId', categoryIds);

        if (promptsError) {
          console.error('[SERVER] Error fetching prompts:', promptsError);
        } else {
          allPrompts = promptsData || [];
          console.log('[SERVER] Found', allPrompts.length, 'prompts across all categories');
        }
      }
    } catch (error) {
      console.error('[SERVER] Unexpected error fetching prompts:', error);
    }

    // Use the safe helper function to get completed prompts
    console.log('[SERVER PAGE] Fetching completed prompts using safe helper function');
    const completedPromptsData = await getCompletedPromptsForSharer(effectiveSharerId);
    console.log('[SERVER] Found', completedPromptsData.length, 'completed prompts');
    
    // Create a lookup map for completed prompt responses
    const completedPromptMap = new Map();
    completedPromptsData.forEach(cp => {
      if (cp.promptId && cp.promptCategoryId) {
        completedPromptMap.set(cp.promptId, {
          videoId: cp.videoId,
          promptCategoryId: cp.promptCategoryId
        });
      }
    });

    // Transform categories data to adapt to the expected PromptCategory format
    const transformedCategories: PromptCategory[] = categories.map(category => {
      // Filter prompts that belong to this category
      const categoryPrompts = allPrompts.filter(p => p.promptCategoryId === category.id);
      
      // Transform each prompt to include PromptResponse array
      const enhancedPrompts = categoryPrompts.map(prompt => {
        // Create the base prompt object
        const promptWithResponses = {
          id: prompt.id,
          promptText: prompt.promptText,
          promptType: prompt.promptType || 'standard',
          isContextEstablishing: prompt.isContextEstablishing || false,
          promptCategoryId: prompt.promptCategoryId,
          PromptCategory: {
            id: category.id,
            category: category.category
          },
          PromptResponse: [] // Default empty array
        };
        
        // If this prompt has a completed response, add it
        if (completedPromptMap.has(prompt.id)) {
          const completionData = completedPromptMap.get(prompt.id);
          promptWithResponses.PromptResponse = [{
            id: `resp-${prompt.id}`, // Mock ID since we don't have the actual response ID
            profileSharerId: effectiveSharerId,
            summary: null,
            createdAt: new Date().toISOString(),
            Video: completionData.videoId ? {
              id: completionData.videoId,
              muxPlaybackId: "mock-playback-id", // Mock ID
              muxAssetId: "mock-asset-id" // Mock ID
            } : null,
            PromptResponseAttachment: []
          }];
        }
        
        return promptWithResponses;
      });

      return {
        id: category.id,
        category: category.category,
        description: category.description || '',
        theme: category.theme,
        Prompt: enhancedPrompts,
        isFavorite: favoritedIds.has(category.id),
        isInQueue: queuedIds.has(category.id)
      };
    });

    // Log detailed info about what we're passing to the component
    console.log('[SERVER] Transformed', transformedCategories.length, 'categories for rendering');
    if (transformedCategories.length > 0) {
      const sampleCategory = transformedCategories[0];
      console.log('[SERVER] Sample category structure:', {
        id: sampleCategory.id,
        category: sampleCategory.category,
        promptCount: sampleCategory.Prompt?.length || 0,
        hasCompletedPrompts: sampleCategory.Prompt?.some(p => p.PromptResponse?.length > 0) || false
      });
    }
    
    // Skip fetching random prompt since function doesn't exist
    console.log('[SERVER PAGE] Skipping random prompt (function does not exist)');
    const randomPrompt = null;

    console.log('[SERVER] Data fetching complete, rendering page');
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Sharer Dashboard</h1>
          <TopicsAllButton />
        </div>
        
        {(!transformedCategories || transformedCategories.length === 0) && !randomPrompt && (
          <div className="text-center py-8">
            <p className="text-lg text-gray-600">
              No data available at the moment. Please try again later.
            </p>
          </div>
        )}

        {transformedCategories && transformedCategories.length > 0 && (
          <div className="mb-8">
            <TopicsList promptCategories={transformedCategories} />
          </div>
        )}

        {randomPrompt && (
          <div className="mt-8">
            <RandomPrompt prompt={randomPrompt} />
          </div>
        )}
      </div>
    );
  } catch (error) {
    console.error('[SERVER] Dashboard - Unexpected error:', error);
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Sharer Dashboard</h1>
        <p className="text-lg text-gray-600 text-center">
          Something went wrong. Please try again later.
        </p>
      </div>
    );
  }
}

