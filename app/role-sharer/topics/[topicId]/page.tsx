import { createClient } from '@/utils/supabase/server';
import { notFound, redirect } from "next/navigation";
import TopicsTableAll from "@/components/TopicsTableAll";

interface TopicPageProps {
  params: {
    topicId: string;
  };
}

export default async function TopicPage({ params }: TopicPageProps) {
  const supabase = createClient();

  // Check authentication and role
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

  // Fetch topic details
  const { data: promptCategory, error: fetchError } = await supabase
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
        Video:Video (
          id
        ),
        PromptResponse:PromptResponse (
          id
        )
      )
    `)
    .eq('id', params.topicId)
    .single();

  if (fetchError) {
    console.error('Error fetching topic:', fetchError);
    notFound();
  }

  // Transform the data to match the expected format
  const transformedCategory = {
    ...promptCategory,
    prompts: promptCategory.Prompt.map(prompt => ({
      ...prompt,
      videos: prompt.Video || [],
      promptResponses: prompt.PromptResponse || []
    }))
  };

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">{transformedCategory.category}</h1>
      <p className="text-gray-600 mb-8">{transformedCategory.description}</p>
      <TopicsTableAll promptCategories={[transformedCategory]} />
    </div>
  );
}

