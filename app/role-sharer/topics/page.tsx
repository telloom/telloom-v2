import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import TopicsTableAll from '@/components/TopicsTableAll';
import BackButton from '@/components/BackButton';

export default async function SharerTopicsPage() {
  const supabase = createClient();
  
  // Check authentication and role
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  
  if (!session || sessionError) {
    redirect('/login');
  }

  // Verify user has SHARER role
  const { data: roles } = await supabase
    .from('ProfileRole')
    .select('role')
    .eq('profileId', session.user.id);

  if (!roles?.some(r => r.role === 'SHARER')) {
    redirect('/select-role');
  }

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
          Video:Video (
            id
          ),
          PromptResponse:PromptResponse (
            id
          )
        )
      `)
      .order('category');

    if (fetchError) {
      console.error('Fetch error:', fetchError);
      throw fetchError;
    }

    // Transform the data to match the expected format
    const transformedCategories = promptCategories.map(category => ({
      ...category,
      prompts: category.Prompt.map(prompt => ({
        ...prompt,
        videos: prompt.Video || [],
        promptResponses: prompt.PromptResponse || []
      }))
    }));

    return (
      <div className="container mx-auto px-4 py-8">
        <BackButton href="/role-sharer" />
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
          <TopicsTableAll promptCategories={transformedCategories} />
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
