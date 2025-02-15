import { createClient } from '@/utils/supabase/server';
import { notFound } from 'next/navigation';
import TopicsTableAll from '@/components/TopicsTableAll';
import BackButton from '@/components/BackButton';
import { PromptCategory } from '@/types/models';

type DBPromptResponse = {
  id: string;
  profileSharerId: string;
  summary: string | null;
  createdAt: string;
  Video: {
    id: string;
    muxPlaybackId: string;
    muxAssetId: string;
  } | null;
  PromptResponseAttachment: Array<{
    id: string;
    fileUrl: string;
    fileType: string;
    fileName: string;
    description: string | null;
    dateCaptured: string | null;
    yearCaptured: number | null;
  }>;
};

type DBPromptCategory = {
  id: string;
  category: string | null;
  description: string | null;
  theme: string | null;
  Prompt: Array<{
    id: string;
    promptText: string;
    promptType: string | null;
    isContextEstablishing: boolean | null;
    promptCategoryId: string | null;
    PromptResponse: DBPromptResponse[];
  }>;
};

export default async function ExecutorTopicsPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const sharerId = await Promise.resolve(params.id);

  // First verify the executor relationship
  const { data: executorRelationship, error: relationshipError } = await supabase
    .from('ProfileExecutor')
    .select(`
      id,
      sharerId,
      sharer:ProfileSharer!sharerId (
        id,
        profile:Profile!profileId (
          id,
          firstName,
          lastName,
          email
        )
      )
    `)
    .eq('executorId', user.id)
    .eq('sharerId', sharerId)
    .single();

  if (relationshipError || !executorRelationship) {
    notFound();
  }

  // Fetch executor's favorites and queue items
  const [{ data: favorites }, { data: queueItems }] = await Promise.all([
    supabase
      .from('TopicFavorite')
      .select('promptCategoryId')
      .eq('role', 'EXECUTOR')
      .eq('executorId', executorRelationship.id),
    supabase
      .from('TopicQueueItem')
      .select('promptCategoryId')
      .eq('role', 'EXECUTOR')
      .eq('executorId', executorRelationship.id)
  ]);

  // Create Sets for efficient lookup
  const favoritedIds = new Set(favorites?.map(f => f.promptCategoryId) || []);
  const queuedIds = new Set(queueItems?.map(q => q.promptCategoryId) || []);

  try {
    const { data: promptCategories, error: fetchError } = await supabase
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

    if (fetchError) {
      console.error('Fetch error:', fetchError);
      throw fetchError;
    }

    // Transform the data to match the expected format
    const transformedCategories = (promptCategories as DBPromptCategory[]).map(category => ({
      id: category.id,
      category: category.category || '',
      description: category.description || '',
      theme: category.theme,
      isFavorite: favoritedIds.has(category.id),
      isInQueue: queuedIds.has(category.id),
      prompts: category.Prompt.map(prompt => ({
        id: prompt.id,
        promptText: prompt.promptText,
        promptType: prompt.promptType || 'default',
        isContextEstablishing: prompt.isContextEstablishing || false,
        promptCategoryId: prompt.promptCategoryId || category.id,
        PromptResponse: prompt.PromptResponse
          .filter(response => response.profileSharerId === executorRelationship.sharerId)
          .map(response => ({
            id: response.id,
            profileSharerId: response.profileSharerId,
            summary: response.summary,
            createdAt: response.createdAt,
            Video: response.Video,
            PromptResponseAttachment: response.PromptResponseAttachment
          }))
      }))
    })) satisfies PromptCategory[];

    const sharer = executorRelationship.sharer.profile;

    return (
      <div className="container mx-auto px-4 py-8">
        <BackButton href={`/role-executor/${sharerId}`} />
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">All Topics</h1>
            <p className="text-muted-foreground mt-2">
              Managing content for {sharer.firstName} {sharer.lastName}
            </p>
          </div>
        </div>

        {(!transformedCategories || transformedCategories.length === 0) ? (
          <div className="text-center py-8">
            <p className="text-lg text-gray-600">
              No topics available at the moment. Please try again later.
            </p>
          </div>
        ) : (
          <TopicsTableAll 
            initialPromptCategories={transformedCategories}
            currentRole="EXECUTOR"
            relationshipId={executorRelationship.id}
            sharerId={sharerId}
          />
        )}
      </div>
    );
  } catch (error) {
    console.error('Topics page - Unexpected error:', error);
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">All Topics</h1>
        <p className="text-lg text-gray-600 text-center">
          Something went wrong. Please try again later.
        </p>
      </div>
    );
  }
} 