import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
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

export default async function TopicsPage() {
  const supabase = await createClient();
  console.log('[TopicsPage] Checking authentication...');
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  
  if (userError || !user) {
    console.error('[TopicsPage] Authentication error:', userError);
    redirect('/login');
  }

  console.log('[TopicsPage] Verifying SHARER role...');
  // Verify user has SHARER role
  const { data: roles, error: rolesError } = await supabase
    .from('ProfileRole')
    .select('role')
    .eq('profileId', user.id);

  if (rolesError) {
    console.error('[TopicsPage] Error fetching roles:', rolesError);
  }

  console.log('[TopicsPage] User roles:', roles);

  if (!roles?.some(r => r.role === 'SHARER')) {
    console.log('[TopicsPage] User does not have SHARER role, redirecting...');
    redirect('/select-role');
  }

  // Get the sharer's profile ID
  const { data: sharerProfile, error: sharerError } = await supabase
    .from('ProfileSharer')
    .select('id')
    .eq('profileId', user.id)
    .single();

  if (sharerError || !sharerProfile) {
    console.error('[TopicsPage] Error fetching sharer profile:', sharerError);
    redirect('/select-role');
  }

  try {
    console.log('[TopicsPage] Fetching prompt categories...');
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
      console.error('[TopicsPage] Fetch error:', fetchError);
      throw fetchError;
    }

    console.log('[TopicsPage] Raw prompt categories:', promptCategories);

    // Transform the data to match the expected format
    const transformedCategories = (promptCategories as DBPromptCategory[]).map(category => ({
      id: category.id,
      category: category.category || '',
      description: category.description || '',
      theme: category.theme,
      prompts: category.Prompt.map(prompt => ({
        id: prompt.id,
        promptText: prompt.promptText,
        promptType: prompt.promptType || 'default',
        isContextEstablishing: prompt.isContextEstablishing || false,
        promptCategoryId: prompt.promptCategoryId || category.id,
        PromptResponse: prompt.PromptResponse.map(response => ({
          id: response.id,
          profileSharerId: response.profileSharerId,
          summary: response.summary,
          createdAt: response.createdAt,
          Video: response.Video,
          PromptResponseAttachment: response.PromptResponseAttachment
        }))
      }))
    })) satisfies PromptCategory[];

    console.log('[TopicsPage] Transformed categories:', transformedCategories);

    return (
      <div className="container mx-auto px-4 py-8">
        <BackButton href="/role-sharer" label="Back" />
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">All Topics</h1>
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
            currentRole="SHARER"
            relationshipId={sharerProfile.id}
            sharerId={sharerProfile.id}
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
