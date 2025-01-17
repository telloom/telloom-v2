// app/role-sharer/page.tsx
import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import TopicsList from '@/components/TopicsList';
import RandomPrompt from '@/components/RandomPrompt';
import TopicsAllButton from '@/components/TopicsAllButton';
import { PromptCategory } from '@/types/models';

export default async function SharerPage() {
  const supabase = createClient();
  
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  
  if (userError || !user) {
    redirect('/login');
  }

  // Verify user has SHARER role
  const { data: roles } = await supabase
    .from('ProfileRole')
    .select('role')
    .eq('profileId', user.id);

  if (!roles?.some(r => r.role === 'SHARER')) {
    redirect('/select-role');
  }

  try {
    console.log('[SERVER] Fetching data for user:', user.id);

    // First, get the user's favorites and queue items
    const [{ data: favorites }, { data: queueItems }] = await Promise.all([
      supabase
        .from('TopicFavorite')
        .select('promptCategoryId')
        .eq('profileId', user.id),
      supabase
        .from('TopicQueueItem')
        .select('promptCategoryId')
        .eq('profileId', user.id)
    ]);

    console.log('[SERVER] User preferences:', {
      favorites: favorites?.map(f => f.promptCategoryId),
      queueItems: queueItems?.map(q => q.promptCategoryId)
    });

    // Create Sets for efficient lookup
    const favoritedIds = new Set(favorites?.map(f => f.promptCategoryId) || []);
    const queuedIds = new Set(queueItems?.map(q => q.promptCategoryId) || []);

    // Fetch prompt categories with proper data transformation
    const { data: promptCategories, error: categoriesError } = await supabase
      .from('PromptCategory')
      .select(`
        id,
        category,
        description,
        theme,
        Prompt:Prompt (
          id,
          promptText,
          promptType,
          isContextEstablishing,
          promptCategoryId,
          PromptResponse:PromptResponse (
            id,
            profileSharerId,
            summary,
            createdAt,
            Video:Video (
              id,
              muxPlaybackId,
              muxAssetId
            ),
            PromptResponseAttachment:PromptResponseAttachment (
              id,
              fileUrl,
              fileType,
              fileName,
              description,
              dateCaptured,
              yearCaptured
            )
          )
        )
      `)
      .order('category');

    if (categoriesError) throw categoriesError;

    console.log('[SERVER] Raw categories:', promptCategories);

    // Transform the data to match the PromptCategory type
    const transformedCategories: PromptCategory[] = promptCategories.map(category => ({
      id: category.id,
      category: category.category,
      description: category.description,
      theme: category.theme,
      isFavorite: favoritedIds.has(category.id),
      isInQueue: queuedIds.has(category.id),
      prompts: category.Prompt.map(prompt => ({
        id: prompt.id,
        promptText: prompt.promptText,
        promptType: prompt.promptType,
        isContextEstablishing: prompt.isContextEstablishing,
        promptCategoryId: prompt.promptCategoryId,
        PromptResponse: (prompt.PromptResponse || []).map(response => ({
          id: response.id,
          profileSharerId: response.profileSharerId,
          summary: response.summary,
          createdAt: response.createdAt,
          Video: response.Video ? {
            id: response.Video.id,
            muxPlaybackId: response.Video.muxPlaybackId,
            muxAssetId: response.Video.muxAssetId
          } : null,
          PromptResponseAttachment: (response.PromptResponseAttachment || []).map(attachment => ({
            id: attachment.id,
            fileUrl: attachment.fileUrl,
            fileType: attachment.fileType,
            fileName: attachment.fileName,
            description: attachment.description,
            dateCaptured: attachment.dateCaptured,
            yearCaptured: attachment.yearCaptured
          }))
        }))
      }))
    }));

    console.log('[SERVER] Transformed categories:', transformedCategories.map(c => ({
      id: c.id,
      category: c.category,
      isFavorite: c.isFavorite,
      isInQueue: c.isInQueue
    })));

    // Fetch random prompt
    const { data: randomPrompt, error: promptError } = await supabase
      .from('Prompt')
      .select('*')
      .limit(1)
      .single();

    if (promptError && promptError.code !== 'PGRST116') {
      throw promptError;
    }

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

