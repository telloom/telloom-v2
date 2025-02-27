import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import TopicsClientWrapper from './TopicsClientWrapper';
import { PromptCategory } from '@/types/models';

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
  
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Verify executor relationship
  const { data: executorRelationship, error: relationshipError } = await supabase
    .from('ProfileExecutor')
    .select(`
      id,
      sharerId,
      sharer:ProfileSharer!sharerId (
        id,
        profileId,
        Profile:profileId (
          firstName,
          lastName
        )
      )
    `)
    .eq('executorId', user.id)
    .eq('sharerId', sharerId)
    .single();

  if (relationshipError || !executorRelationship) {
    redirect('/role-executor');
  }

  // Access the profile data correctly
  const sharerProfile = executorRelationship.sharer.Profile;
  const sharerName = `${sharerProfile.firstName || ''} ${sharerProfile.lastName || ''}`.trim();

  // Fetch prompt categories with responses
  const { data: promptCategories } = await supabase
    .from('PromptCategory')
    .select(`
      *,
      Prompt!inner (
        id,
        promptText,
        PromptResponse (
          id,
          profileSharerId
        )
      )
    `)
    .order('sortOrder', { ascending: true });

  // Fetch favorites and queue items
  const [{ data: favorites }, { data: queueItems }] = await Promise.all([
    supabase
      .from('TopicFavorite')
      .select('promptCategoryId')
      .eq('profileId', user.id)
      .eq('role', 'EXECUTOR')
      .eq('sharerId', sharerId),
    supabase
      .from('TopicQueueItem')
      .select('promptCategoryId')
      .eq('profileId', user.id)
      .eq('role', 'EXECUTOR')
      .eq('sharerId', sharerId)
  ]);

  // Create Sets for efficient lookup
  const favoritedIds = new Set(favorites?.map(f => f.promptCategoryId) || []);
  const queuedIds = new Set(queueItems?.map(q => q.promptCategoryId) || []);

  // Transform the data
  const transformedCategories = promptCategories?.map(category => ({
    ...category,
    prompts: category.prompts || [], // Ensure prompts is always an array
    isFavorite: favoritedIds.has(category.id),
    isInQueue: queuedIds.has(category.id)
  })) || [];

  return (
    <TopicsClientWrapper 
      initialPromptCategories={transformedCategories}
      currentRole="EXECUTOR"
      relationshipId={executorRelationship.id}
      sharerId={sharerId}
      sharerName={sharerName}
    />
  );
} 