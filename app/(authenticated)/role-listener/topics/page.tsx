import { createClient } from '@/utils/supabase/server';
import TopicsList from '@/components/TopicsList';
import { PromptCategory } from '@/types/models';

export default async function ListenerTopicsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Fetch user's favorites and queue items
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

  // Create Sets for efficient lookup
  const favoritedIds = new Set(favorites?.map(f => f.promptCategoryId) || []);
  const queuedIds = new Set(queueItems?.map(q => q.promptCategoryId) || []);

  // Fetch prompt categories
  const { data: promptCategories } = await supabase
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
        promptCategoryId
      )
    `)
    .order('category');

  // Transform the data
  const transformedCategories: PromptCategory[] = promptCategories?.map(category => ({
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
      PromptResponse: []
    }))
  })) || [];

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Topics to Listen</h1>
      {transformedCategories.length > 0 ? (
        <TopicsList promptCategories={transformedCategories} />
      ) : (
        <p className="text-center text-gray-600">No topics available at the moment.</p>
      )}
    </div>
  );
}
